export const DISEASE_TYPES = [
  "Fever (Vaccine)",
  "Cold & Fever",
  "Cough",
  "Allergy",
  "Stomach Bug / Diarrhea",
  "Other",
] as const;

export type DiseaseType = (typeof DISEASE_TYPES)[number];

export const DEFAULT_DISEASE_TYPE: DiseaseType = "Cold & Fever";

export const OTHER_DISEASE_PLACEHOLDER =
  "e.g. bruises, toothache, ear infection…";

const OTHER_PREFIX = "Other — ";

export function isFeverType(label: string): boolean {
  return label.toLowerCase().includes("fever");
}

export function formatDiseaseTypes(types: string[]): string {
  if (types.length === 0) return "Unspecified";
  return types.join(", ");
}

export function mergeDiseaseTypes(existing: string[], incoming: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const t of [...existing, ...incoming]) {
    const trimmed = t.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    merged.push(trimmed);
  }
  return merged;
}

export function episodeHasType(types: string[], type: string): boolean {
  return types.some((t) => t === type || t.startsWith(OTHER_PREFIX));
}

export function episodeIncludesStandardType(types: string[], type: DiseaseType): boolean {
  if (type === "Other") return types.some((t) => t === "Other" || t.startsWith(OTHER_PREFIX));
  return types.includes(type);
}

/** Build stored labels from multi-select UI state. */
export function buildDiseaseTypesFromSelection(
  selected: DiseaseType[],
  otherDetail: string,
): string[] {
  const result: string[] = [];
  for (const type of selected) {
    if (type === "Other") {
      const detail = otherDetail.trim();
      result.push(detail ? `${OTHER_PREFIX}${detail}` : "Other");
    } else {
      result.push(type);
    }
  }
  return result;
}

/** Parse episode diseaseTypes into checkbox state for edit UI. */
export function parseDiseaseTypesForEdit(types: string[]): {
  selected: DiseaseType[];
  otherDetail: string;
} {
  const selected = new Set<DiseaseType>();
  let otherDetail = "";

  for (const label of types) {
    if (label.startsWith(OTHER_PREFIX)) {
      selected.add("Other");
      otherDetail = label.slice(OTHER_PREFIX.length);
    } else if ((DISEASE_TYPES as readonly string[]).includes(label)) {
      selected.add(label as DiseaseType);
    } else if (label === "Other") {
      selected.add("Other");
    }
  }

  return { selected: [...selected], otherDetail };
}

function migrateLegacyLabel(label: string): string {
  if (label === "Stomach Bug") return "Stomach Bug / Diarrhea";
  if (label === "Chickenpox") return "Other";
  return label;
}

export function normalizeDiseaseTypes(
  diseaseTypes?: string[] | null,
  legacyDiseaseType?: string | null,
): string[] {
  if (Array.isArray(diseaseTypes) && diseaseTypes.length > 0) {
    return mergeDiseaseTypes([], diseaseTypes.map(migrateLegacyLabel));
  }
  if (legacyDiseaseType?.trim()) {
    return [migrateLegacyLabel(legacyDiseaseType.trim())];
  }
  return [DEFAULT_DISEASE_TYPE];
}

/** Infer illness tags from vitals when parent didn't pick any chips. */
export function inferLogDiseaseTypes(
  selected: string[],
  temp: number | null,
  noTemp: boolean,
): string[] {
  const inferred = [...selected];
  if (!noTemp && temp !== null && temp >= 38 && !inferred.includes("Cold & Fever")) {
    inferred.push("Cold & Fever");
  }
  if (inferred.length === 0) {
    inferred.push(DEFAULT_DISEASE_TYPE);
  }
  return mergeDiseaseTypes([], inferred);
}
