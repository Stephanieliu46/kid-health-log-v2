import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEpisodeTitle, useEpisodes, type Episode } from "@/lib/episode-store";
import {
  formatClosedFeverEpisodeLabel,
  getFeverEpisodesForChild,
  getFeverTrendPoints,
  resolveDefaultFeverEpisodeId,
  type FeverTrendPoint,
} from "@/lib/fever-trend";
import { useLogs } from "@/lib/log-store";
import { convertTemp, getFeverChartDomain, getTempUnitSymbol } from "@/lib/temperature";
import { useTemperatureUnit } from "@/lib/temperature-unit-store";

const FEVER_CHART_CONFIG = {
  temp: {
    label: "Temperature",
    color: "#FA9E7B",
  },
};

type TooltipPayloadItem = {
  payload?: FeverTrendPoint & { temp?: number };
};

type ChartXTickProps = {
  x?: number;
  y?: number;
  index?: number;
};

function FeverEpisodeOption({ episode }: { episode: Episode }) {
  const title = formatEpisodeTitle(episode);

  if (episode.status === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: "var(--peach-deep)" }}
        />
        <span className="truncate">Current Fever Episode</span>
      </span>
    );
  }

  return <span className="truncate">{formatClosedFeverEpisodeLabel(episode, title)}</span>;
}

function FeverTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  unit: ReturnType<typeof useTemperatureUnit>;
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row?.temp) return null;

  return (
    <div className="rounded-xl border border-border bg-[var(--surface)] px-3 py-2 shadow-[var(--shadow-warm)] text-sm">
      <p className="font-semibold text-foreground">{row.fullLabel}</p>
      <p className="mt-0.5 tabular-nums text-foreground">
        {row.temp.toFixed(1)}
        {getTempUnitSymbol(unit)}
      </p>
    </div>
  );
}

function makeChartXTick(points: FeverTrendPoint[]) {
  return function ChartXTick({ x = 0, y = 0, index = 0 }: ChartXTickProps) {
    const point = points[index];
    // recharts requires the tick renderer to return an element, not null
    if (!point) return <g />;

    const lastIndex = points.length - 1;
    const textAnchor =
      index === 0 ? "start" : index === lastIndex && lastIndex > 0 ? "end" : "middle";
    const xNudge = index === 0 ? 2 : index === lastIndex && lastIndex > 0 ? -2 : 0;

    return (
      <g transform={`translate(${x},${y})`}>
        <text textAnchor={textAnchor} fill="var(--muted-foreground)" fontSize={9} fontWeight={600}>
          <tspan x={xNudge} dy={12}>
            {point.dateLabel}
          </tspan>
          <tspan x={xNudge} dy={10}>
            {point.timeLabel}
          </tspan>
        </text>
      </g>
    );
  };
}

export function FeverTrendTracker({ child }: { child: string }) {
  const episodes = useEpisodes();
  const logs = useLogs();
  const temperatureUnit = useTemperatureUnit();
  const [yMin, yMax] = getFeverChartDomain(temperatureUnit);

  const feverEpisodes = useMemo(
    () => getFeverEpisodesForChild(episodes, child),
    [episodes, child],
  );

  const defaultEpisodeId = useMemo(
    () => resolveDefaultFeverEpisodeId(feverEpisodes),
    [feverEpisodes],
  );

  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedEpisodeId(defaultEpisodeId);
  }, [child, defaultEpisodeId]);

  const activeEpisodeId =
    selectedEpisodeId && feverEpisodes.some((e) => e.id === selectedEpisodeId)
      ? selectedEpisodeId
      : defaultEpisodeId;

  const chartData = useMemo(() => {
    if (!activeEpisodeId) return [];
    return getFeverTrendPoints(logs, activeEpisodeId).map((point) => ({
      ...point,
      temp: convertTemp(point.temp, point.tempUnit, temperatureUnit),
    }));
  }, [logs, activeEpisodeId, temperatureUnit]);

  const ChartXTick = useMemo(() => makeChartXTick(chartData), [chartData]);

  if (feverEpisodes.length === 0) {
    return null;
  }

  const showEmptyReadings = chartData.length === 0;
  const activeEpisode = feverEpisodes.find((e) => e.id === activeEpisodeId);
  const isCurrentFever = activeEpisode?.status === "open";

  return (
    <section
      className="shrink-0 surface-card rounded-2xl p-4"
      style={
        isCurrentFever
          ? {
              borderLeftWidth: 4,
              borderLeftColor: "var(--episode-open)",
              background: "var(--episode-open-muted)",
            }
          : undefined
      }
    >
      <Select value={activeEpisodeId ?? undefined} onValueChange={setSelectedEpisodeId}>
        <SelectTrigger className="h-8 w-full border-border bg-muted text-xs font-semibold shadow-none">
          <SelectValue placeholder="Select episode">
            {activeEpisode ? <FeverEpisodeOption episode={activeEpisode} /> : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          {feverEpisodes.map((episode) => {
            const title = formatEpisodeTitle(episode);
            const textValue =
              episode.status === "open"
                ? "Current Fever Episode"
                : formatClosedFeverEpisodeLabel(episode, title);

            return (
              <SelectItem
                key={episode.id}
                value={episode.id}
                className="text-xs"
                textValue={textValue}
              >
                <FeverEpisodeOption episode={episode} />
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {showEmptyReadings ? (
        <p className="mt-2 rounded-xl bg-muted/40 px-3 py-5 text-center text-sm text-muted-foreground">
          No temperature readings in this fever episode yet.
        </p>
      ) : (
        <div className="h-[min(210px,28dvh)] min-h-[180px] overflow-visible">
          <ChartContainer
            config={FEVER_CHART_CONFIG}
            className="h-full w-full min-h-[180px] !aspect-auto overflow-visible [&_.recharts-wrapper]:overflow-visible"
          >
            <LineChart
              data={chartData}
              margin={{ top: 6, right: 4, left: 12, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis
                dataKey="dateLabel"
                tickLine={false}
                axisLine={false}
                tick={ChartXTick}
                interval={chartData.length > 6 ? "preserveStartEnd" : 0}
                height={48}
                padding={{ left: 20, right: 24 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[yMin, yMax]}
                tick={{ fontSize: 11, fontWeight: 700, fill: "var(--foreground)" }}
                tickFormatter={(v) => Number(v).toFixed(1)}
                width={40}
              >
                <Label
                  value={getTempUnitSymbol(temperatureUnit)}
                  angle={-90}
                  position="left"
                  offset={-8}
                  style={{ fontSize: 11, fontWeight: 700, fill: "var(--muted-foreground)" }}
                />
              </YAxis>
              <Tooltip content={<FeverTooltip unit={temperatureUnit} />} />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="var(--color-temp)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "var(--color-temp)", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}
    </section>
  );
}
