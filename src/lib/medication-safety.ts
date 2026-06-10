import { getLastDrugDoseTimestamp } from "./log-store";
import { DRUG_LABELS, type Drug } from "./medications";

const MIN_INTERVAL_MS: Record<Drug, number> = {
  paracetamol: 4 * 60 * 60 * 1000,
  ibuprofen: 6 * 60 * 60 * 1000,
};

const MIN_INTERVAL_HOURS: Record<Drug, 4 | 6> = {
  paracetamol: 4,
  ibuprofen: 6,
};

export type { Drug };

export type SafetyViolation = {
  child: string;
  drug: Drug;
  minutesSinceLastDose: number;
  minIntervalHours: 4 | 6;
};

export function parseLogTimestamp(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

/** NHS interval check scoped to one child, based on their saved medication logs. */
export function checkMedicationSafety(
  child: string,
  drug: Drug,
  now: number = Date.now(),
): SafetyViolation | null {
  const lastDose = getLastDrugDoseTimestamp(child, drug);
  if (lastDose === null) return null;

  const elapsed = now - lastDose;
  const minInterval = MIN_INTERVAL_MS[drug];
  if (elapsed >= minInterval) return null;

  const minutes = Math.max(1, Math.round(elapsed / 60_000));

  return {
    child,
    drug,
    minutesSinceLastDose: minutes,
    minIntervalHours: MIN_INTERVAL_HOURS[drug],
  };
}

export function formatSafetyMessage(violation: SafetyViolation): string {
  const drugName = DRUG_LABELS[violation.drug];
  return `Safety Warning: ${drugName} was given to ${violation.child} ${violation.minutesSinceLastDose} minutes ago. NHS guidelines recommend a minimum ${violation.minIntervalHours}-hour interval between doses for the same child. Are you sure you want to proceed?`;
}
