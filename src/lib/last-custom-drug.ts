const KEY = "kidhealth.lastCustomDrug.v1";

function read(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function write(next: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

export function getLastCustomDrugName(child: string): string {
  return read()[child]?.trim() ?? "";
}

export function setLastCustomDrugName(child: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const store = read();
  store[child] = trimmed;
  write(store);
}
