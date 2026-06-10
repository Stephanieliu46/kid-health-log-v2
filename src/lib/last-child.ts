import { getChildNames } from "./children-store";

const KEY = "kidhealth.lastChild.v1";

function fallbackChild(): string {
  const names = getChildNames();
  return names[0] ?? "";
}

export function getLastChild(): string {
  if (typeof window === "undefined") return fallbackChild();
  try {
    const raw = localStorage.getItem(KEY);
    const names = getChildNames();
    if (raw && names.includes(raw)) return raw;
  } catch {
    /* ignore */
  }
  return fallbackChild();
}

export function setLastChild(child: string) {
  if (typeof window === "undefined") return;
  const names = getChildNames();
  if (!names.includes(child)) return;
  try {
    localStorage.setItem(KEY, child);
  } catch (e) {
    console.error("[last-child] Failed to persist:", e);
  }
}
