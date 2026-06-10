import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import {
  CHART_DISEASE_CATEGORIES,
  STACKED_CHART_CONFIG,
  type MonthlyStackedRow,
  type PeriodMonths,
} from "@/lib/dashboard-stats";

type Props = {
  data: MonthlyStackedRow[];
  periodMonths: PeriodMonths;
  className?: string;
};

type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string;
  value?: number;
  color?: string;
  payload?: MonthlyStackedRow;
};

const Y_LABEL_STYLE = { fontSize: 14, fontWeight: 700, fill: "var(--muted-foreground)" };

function StackedTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  const total = row?.totalDays ?? 0;
  const title = row?.fullLabel ?? row?.label ?? "";
  const items = CHART_DISEASE_CATEGORIES.map((cat) => ({
    ...cat,
    days: row?.[cat.key] ?? 0,
  })).filter((item) => item.days > 0);

  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-[var(--shadow-soft)] text-sm min-w-[168px]">
      <p className="text-base font-bold text-foreground">{title}</p>
      <p className="mt-1 text-muted-foreground">
        Total: <span className="font-semibold text-foreground">{total}</span>{" "}
        {total === 1 ? "day" : "days"}
      </p>
      {items.length > 0 ? (
        <ul className="mt-2.5 space-y-1.5">
          {items.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate font-medium text-foreground">{item.label}</span>
              </span>
              <span className="font-bold tabular-nums shrink-0 text-foreground">
                {item.days}d
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted-foreground">No sick days</p>
      )}
    </div>
  );
}

export function IllnessHistoryChart({ data, periodMonths, className }: Props) {
  const maxDays = Math.max(...data.map((d) => d.totalDays), 1);
  const yMax = Math.max(2, Math.ceil(maxDays));
  const isLongRange = periodMonths === 12;

  const xTick = {
    fontSize: isLongRange ? 12 : 15,
    fontWeight: 700,
    fill: "var(--foreground)",
  };

  return (
    <ChartContainer
      config={STACKED_CHART_CONFIG}
      className={`h-full w-full min-h-[200px] !aspect-auto ${className ?? ""}`}
    >
      <BarChart
        data={data}
        margin={{
          top: 12,
          right: 8,
          left: 4,
          bottom: isLongRange ? 28 : 4,
        }}
        barCategoryGap={isLongRange ? "14%" : "22%"}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={xTick}
          interval={0}
          height={isLongRange ? 56 : 36}
          angle={isLongRange ? -45 : 0}
          textAnchor={isLongRange ? "end" : "middle"}
          dy={isLongRange ? 4 : 0}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 15, fontWeight: 700, fill: "var(--foreground)" }}
          allowDecimals={false}
          domain={[0, yMax]}
          width={40}
        >
          <Label
            value="Days"
            angle={-90}
            position="insideLeft"
            offset={12}
            style={Y_LABEL_STYLE}
          />
        </YAxis>
        <Tooltip
          cursor={{ fill: "oklch(0.96 0.015 150)", opacity: 0.5 }}
          content={<StackedTooltip />}
        />
        {CHART_DISEASE_CATEGORIES.map((cat, index) => (
          <Bar
            key={cat.key}
            dataKey={cat.key}
            name={cat.label}
            stackId="sickDays"
            fill={cat.color}
            radius={
              index === CHART_DISEASE_CATEGORIES.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]
            }
            maxBarSize={isLongRange ? 28 : 56}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
