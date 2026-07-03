import { isFeverType } from "./disease-types";
import type { Episode } from "./episode-store";
import type { TemperatureUnit } from "./temperature-unit-store";
import { normalizeTempUnit } from "./temperature";
import type { LogEntry } from "./log-store";
import { parseLogTimestamp } from "./medication-safety";

export const FEVER_CHART_Y_MIN = 35;
export const FEVER_CHART_Y_MAX = 41.5;

export type FeverTrendPoint = {
  id: string;
  timestamp: number;
  dateLabel: string;
  timeLabel: string;
  fullLabel: string;
  temp: number;
  tempUnit: TemperatureUnit;
};

export function episodeHasFever(episode: Pick<Episode, "diseaseTypes">): boolean {
  return episode.diseaseTypes.some(isFeverType);
}

export function getFeverEpisodesForChild(episodes: Episode[], child: string): Episode[] {
  return episodes
    .filter((e) => e.child === child && episodeHasFever(e))
    .sort((a, b) => {
      if (a.status === "open" && b.status !== "open") return -1;
      if (b.status === "open" && a.status !== "open") return 1;
      const aTime = a.status === "open" ? a.openedAt : (a.closedAt ?? a.openedAt);
      const bTime = b.status === "open" ? b.openedAt : (b.closedAt ?? b.openedAt);
      return bTime - aTime;
    });
}

export function resolveDefaultFeverEpisodeId(episodes: Episode[]): string | null {
  const openFever = episodes.find((e) => e.status === "open");
  if (openFever) return openFever.id;

  const latestClosed = episodes
    .filter((e) => e.status === "closed")
    .sort((a, b) => (b.closedAt ?? b.openedAt) - (a.closedAt ?? a.openedAt))[0];

  return latestClosed?.id ?? null;
}

function formatDateLabel(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatTimeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatFullLabel(ts: number): string {
  return new Date(ts).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getFeverTrendPoints(logs: LogEntry[], episodeId: string): FeverTrendPoint[] {
  return logs
    .filter((log) => log.episodeId === episodeId && log.temp !== null)
    .map((log) => {
      const timestamp = parseLogTimestamp(log.date, log.time);
      return {
        id: log.id,
        timestamp,
        dateLabel: formatDateLabel(timestamp),
        timeLabel: formatTimeLabel(timestamp),
        fullLabel: formatFullLabel(timestamp),
        temp: log.temp as number,
        tempUnit: normalizeTempUnit(log.tempUnit),
      };
    })
    .filter((point) => !Number.isNaN(point.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function formatClosedFeverEpisodeLabel(episode: Episode, title: string): string {
  const end = episode.closedAt ?? episode.openedAt;
  const endLabel = new Date(end).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${title} · ${endLabel}`;
}
