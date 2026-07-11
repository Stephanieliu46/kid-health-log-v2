import { getLogsSnapshot } from "./log-store";
import { DRUG_LABELS, type Drug } from "./medications";

export type { Drug };

const MIN_INTERVAL_MS: Record<Drug, number> = {
  paracetamol: 4 * 60 * 60 * 1000,
  ibuprofen: 6 * 60 * 60 * 1000,
};

const MIN_INTERVAL_HOURS: Record<Drug, 4 | 6> = {
  paracetamol: 4,
  ibuprofen: 6,
};

export const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;

export const MAX_DOSES_IN_24H: Record<Drug, number> = {
  paracetamol: 4,
  ibuprofen: 3,
};

export type IntervalViolation = {
  kind: "interval";
  child: string;
  drug: Drug;
  minutesSinceLastDose: number;
  minIntervalHours: 4 | 6;
};

export type DailyMaxViolation = {
  kind: "daily_max";
  child: string;
  drug: Drug;
  doseCount: number;
  maxDoses: number;
};

export type MedicationSafetyViolation = IntervalViolation | DailyMaxViolation;

/** @deprecated Use IntervalViolation */
export type SafetyViolation = Omit<IntervalViolation, "kind">;

export function parseLogTimestamp(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

export function countDrugDosesInRollingWindow(
  child: string,
  drug: Drug,
  atTime: number = Date.now(),
): number {
  const windowStart = atTime - ROLLING_WINDOW_MS;
  let count = 0;
  for (const log of getLogsSnapshot()) {
    if (log.child !== child || log.drug !== drug) continue;
    const ts = parseLogTimestamp(log.date, log.time);
    if (Number.isNaN(ts)) continue;
    if (ts >= windowStart && ts <= atTime) count++;
  }
  return count;
}

/**
 * When the rolling 24h dose count is at/over the max, returns the timestamp at
 * which enough old doses age out of the window for another dose to be allowed.
 * Returns null when the limit is not currently reached.
 */
export function getDailyMaxResetTime(
  child: string,
  drug: Drug,
  atTime: number = Date.now(),
): number | null {
  const windowStart = atTime - ROLLING_WINDOW_MS;
  const times: number[] = [];
  for (const log of getLogsSnapshot()) {
    if (log.child !== child || log.drug !== drug) continue;
    const ts = parseLogTimestamp(log.date, log.time);
    if (Number.isNaN(ts)) continue;
    if (ts >= windowStart && ts <= atTime) times.push(ts);
  }

  const maxDoses = MAX_DOSES_IN_24H[drug];
  if (times.length < maxDoses) return null;

  // The count drops below the max once all but (maxDoses - 1) of the current
  // window's doses have aged out — i.e. 24h after the (count - maxDoses + 1)th
  // oldest dose.
  times.sort((a, b) => a - b);
  return times[times.length - maxDoses] + ROLLING_WINDOW_MS;
}

/** Rolling 24h daily max — blocks when limit already reached (next dose would exceed NHS max). */
export function checkDailyMaxDose(
  child: string,
  drug: Drug,
  atTime: number = Date.now(),
): DailyMaxViolation | null {
  // Backdated logs ≥24h in the past are historical — skip the rolling daily-max check.
  if (Date.now() - atTime >= ROLLING_WINDOW_MS) return null;

  const maxDoses = MAX_DOSES_IN_24H[drug];
  const doseCount = countDrugDosesInRollingWindow(child, drug, atTime);
  if (doseCount < maxDoses) return null;

  return {
    kind: "daily_max",
    child,
    drug,
    doseCount,
    maxDoses,
  };
}

/** NHS interval check scoped to one child, relative to the proposed log time. */
export function checkMedicationInterval(
  child: string,
  drug: Drug,
  atTime: number = Date.now(),
): IntervalViolation | null {
  const logs = getLogsSnapshot();
  let lastDose: number | null = null;
  for (const log of logs) {
    if (log.child !== child || log.drug !== drug) continue;
    const ts = parseLogTimestamp(log.date, log.time);
    if (Number.isNaN(ts) || ts >= atTime) continue;
    if (lastDose === null || ts > lastDose) lastDose = ts;
  }
  if (lastDose === null) return null;

  const elapsed = atTime - lastDose;
  const minInterval = MIN_INTERVAL_MS[drug];
  if (elapsed >= minInterval) return null;

  const minutes = Math.max(1, Math.round(elapsed / 60_000));

  return {
    kind: "interval",
    child,
    drug,
    minutesSinceLastDose: minutes,
    minIntervalHours: MIN_INTERVAL_HOURS[drug],
  };
}

/** @deprecated Use atTime */
export function checkMedicationSafety(
  child: string,
  drug: Drug,
  atTime: number = Date.now(),
): MedicationSafetyViolation | null {
  return checkDailyMaxDose(child, drug, atTime) ?? checkMedicationInterval(child, drug, atTime);
}

export function formatIntervalSafetyMessage(violation: IntervalViolation): string {
  const drugName = DRUG_LABELS[violation.drug];
  return `Safety Warning: ${drugName} was given to ${violation.child} ${violation.minutesSinceLastDose} minutes ago. NHS guidelines recommend a minimum ${violation.minIntervalHours}-hour interval between doses for the same child. Are you sure you want to proceed?`;
}

/** @deprecated Use formatIntervalSafetyMessage */
export function formatSafetyMessage(violation: SafetyViolation): string {
  return formatIntervalSafetyMessage({ kind: "interval", ...violation });
}

export function formatDailyMaxMessage(violation: DailyMaxViolation): string {
  if (violation.drug === "paracetamol") {
    return `Paracetamol (Calpol) has already been recorded ${violation.doseCount} times within the last 24 hours. Giving another dose may lead to a dangerous overdose.\n\nNHS guidelines state children should not have more than ${violation.maxDoses} doses of paracetamol in any 24-hour period.`;
  }

  return `Ibuprofen has already been recorded ${violation.doseCount} times within the last 24 hours. Giving another dose may lead to a dangerous overdose.\n\nNHS guidelines state children should not have more than ${violation.maxDoses} doses of ibuprofen in any 24-hour period.`;
}

export const DAILY_MAX_PROCEED_LIABILITY =
  "Proceeding implies you assume full responsibility for exceeding the recommended daily dose.";
