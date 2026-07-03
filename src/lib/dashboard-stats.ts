import type { Episode } from "./episode-store";

export const PERIOD_OPTIONS = [
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "12 months", months: 12 },
] as const;

export type PeriodMonths = (typeof PERIOD_OPTIONS)[number]["months"];

/** Stacked-bar disease categories — Morandi accent palette. */
export const CHART_DISEASE_CATEGORIES = [
  { key: "feverVaccine", label: "Fever (Vaccine)", color: "#8FADA5" },
  { key: "coldFever", label: "Cold & Fever", color: "#D9B8AB" },
  { key: "cough", label: "Cough", color: "#8A9FAA" },
  { key: "allergy", label: "Allergy", color: "#B8CCC6" },
  { key: "stomachBug", label: "Stomach Bug / Diarrhea", color: "#C4A090" },
  { key: "other", label: "Other", color: "#9B9A97" },
] as const;

export type ChartCategoryKey = (typeof CHART_DISEASE_CATEGORIES)[number]["key"];

export type MonthlyStackedRow = {
  monthKey: string;
  /** Short label for the X-axis. */
  label: string;
  /** Full month name for tooltips (e.g. "July 2025"). */
  fullLabel: string;
  totalDays: number;
} & Record<ChartCategoryKey, number>;

const OTHER_PREFIX = "Other — ";

function startOfDay(ts: number): Date {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Map stored episode disease label → chart stack category. */
export function mapDiseaseLabelToChartKey(label: string): ChartCategoryKey {
  const trimmed = label.trim();
  if (trimmed === "Fever (Vaccine)") return "feverVaccine";
  if (trimmed === "Cold & Fever") return "coldFever";
  if (trimmed === "Cough") return "cough";
  if (trimmed === "Allergy") return "allergy";
  if (trimmed === "Stomach Bug / Diarrhea" || trimmed === "Stomach Bug") return "stomachBug";
  if (trimmed === "Chickenpox") return "other";
  if (trimmed === "Other" || trimmed.startsWith(OTHER_PREFIX)) return "other";
  return "other";
}

function emptyCategoryCounts(): Record<ChartCategoryKey, number> {
  return {
    feverVaccine: 0,
    coldFever: 0,
    cough: 0,
    allergy: 0,
    stomachBug: 0,
    other: 0,
  };
}

function createEmptyRow(monthKey: string, label: string, fullLabel: string): MonthlyStackedRow {
  return {
    monthKey,
    label,
    fullLabel,
    totalDays: 0,
    ...emptyCategoryCounts(),
  };
}

function formatMonthLabels(d: Date, months: PeriodMonths): { label: string; fullLabel: string } {
  const fullLabel = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  if (months === 12) {
    return {
      label: d.toLocaleDateString("en-US", { month: "short" }),
      fullLabel,
    };
  }
  if (months === 6) {
    return {
      label: d.toLocaleDateString("en-US", { month: "short" }),
      fullLabel,
    };
  }
  return {
    label: d.toLocaleDateString("en-US", { month: "short" }),
    fullLabel,
  };
}

/** Build ordered month buckets for the chart X-axis. */
export function getMonthBuckets(months: PeriodMonths, now = new Date()) {
  const buckets: { monthKey: string; label: string; fullLabel: string }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = monthKeyFromDate(d);
    const { label, fullLabel } = formatMonthLabels(d, months);
    buckets.push({ monthKey, label, fullLabel });
  }
  return buckets;
}

function enumerateDaysInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function roundDays(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Aggregate episode sick days into monthly stacks by disease category.
 * Multi-type episodes split each calendar day evenly across their types
 * so the stacked bar height matches unique sick days.
 */
export function getMonthlyStackedChartData(
  episodes: Episode[],
  child: string,
  months: PeriodMonths,
  now = new Date(),
): MonthlyStackedRow[] {
  const buckets = getMonthBuckets(months, now);
  const monthKeys = new Set(buckets.map((b) => b.monthKey));
  const rows = new Map<string, MonthlyStackedRow>(
    buckets.map((b) => [b.monthKey, createEmptyRow(b.monthKey, b.label, b.fullLabel)]),
  );

  const childEpisodes = episodes.filter((e) => e.child === child);

  for (const episode of childEpisodes) {
    const episodeStart = startOfDay(episode.openedAt);
    const rawEnd = episode.closedAt ?? now.getTime();
    const episodeEnd = startOfDay(rawEnd);

    const categoryKeys = [
      ...new Set(
        (episode.diseaseTypes.length > 0 ? episode.diseaseTypes : ["Other"]).map(
          mapDiseaseLabelToChartKey,
        ),
      ),
    ];
    const weight = 1 / categoryKeys.length;

    for (const day of enumerateDaysInclusive(episodeStart, episodeEnd)) {
      const key = monthKeyFromDate(day);
      if (!monthKeys.has(key)) continue;

      const row = rows.get(key)!;
      for (const cat of categoryKeys) {
        row[cat] = roundDays(row[cat] + weight);
      }
      row.totalDays = roundDays(row.totalDays + 1);
    }
  }

  return buckets.map((b) => rows.get(b.monthKey)!);
}

export function getDashboardTotals(
  episodes: Episode[],
  child: string,
  months: PeriodMonths,
): { episodeCount: number; totalDays: number } {
  const chartData = getMonthlyStackedChartData(episodes, child, months);
  const totalDays = roundDays(chartData.reduce((sum, row) => sum + row.totalDays, 0));

  const now = Date.now();
  const periodStart = new Date();
  periodStart.setMonth(periodStart.getMonth() - months);
  periodStart.setHours(0, 0, 0, 0);

  const episodeCount = episodes.filter((e) => {
    if (e.child !== child) return false;
    const end = e.closedAt ?? now;
    return e.openedAt <= now && end >= periodStart.getTime();
  }).length;

  return { episodeCount, totalDays };
}

export function hasChartData(rows: MonthlyStackedRow[]): boolean {
  return rows.some((row) => row.totalDays > 0);
}

/** Legend entries that appear in the selected child's chart data. */
export function getActiveChartCategories(rows: MonthlyStackedRow[]) {
  return CHART_DISEASE_CATEGORIES.filter((cat) =>
    rows.some((row) => (row[cat.key] ?? 0) > 0),
  );
}

/** Recharts chart config keyed by category. */
export const STACKED_CHART_CONFIG = Object.fromEntries(
  CHART_DISEASE_CATEGORIES.map((c) => [c.key, { label: c.label, color: c.color }]),
);
