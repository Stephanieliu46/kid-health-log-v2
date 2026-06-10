import type { LogEntry } from "./log-store";

export type Drug = "paracetamol" | "ibuprofen";

export const DRUG_LABELS: Record<Drug, string> = {
  paracetamol: "Paracetamol",
  ibuprofen: "Ibuprofen",
};

export const DRUG_SHORT: Record<Drug, string> = {
  paracetamol: "P",
  ibuprofen: "I",
};

export const DOSE_AMOUNTS_ML = [2.5, 5, 7.5, 10] as const;

export const CUSTOM_DRUG_COLOR = "oklch(0.52 0.14 300)";

const PARA_COLOR = "oklch(0.55 0.10 210)";
const IBU_COLOR = "oklch(0.60 0.14 38)";

/** Migrate legacy localStorage value. */
export function normalizeDrug(drug: string | null | undefined): Drug | null {
  if (drug === "nurofen" || drug === "ibuprofen") return "ibuprofen";
  if (drug === "paracetamol") return "paracetamol";
  return null;
}

export function getDrugLabel(drug: Drug | null): string | null {
  return drug ? DRUG_LABELS[drug] : null;
}

export function hasMedication(log: Pick<LogEntry, "drug" | "customDrug">): boolean {
  return log.drug !== null || Boolean(log.customDrug?.trim());
}

export function formatAmountMl(amount: number | null): string | null {
  if (amount === null) return null;
  return `${amount}ml`;
}

export function getLogMedicationDisplay(
  log: Pick<LogEntry, "drug" | "customDrug" | "amount">,
): { label: string; short: string; color: string; amountLabel: string | null } | null {
  if (log.customDrug?.trim()) {
    const name = log.customDrug.trim();
    return {
      label: name,
      short: name.slice(0, 2).toUpperCase(),
      color: CUSTOM_DRUG_COLOR,
      amountLabel: formatAmountMl(log.amount),
    };
  }
  if (log.drug) {
    return {
      label: DRUG_LABELS[log.drug],
      short: DRUG_SHORT[log.drug],
      color: log.drug === "paracetamol" ? PARA_COLOR : IBU_COLOR,
      amountLabel: formatAmountMl(log.amount),
    };
  }
  return null;
}
