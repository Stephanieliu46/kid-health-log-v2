import { useSyncExternalStore } from "react";
import { deleteEpisodesForChild, renameChildInEpisodes } from "./episode-store";
import { deleteLogsForChild, renameChildInLogs } from "./log-store";
import { evaluateAddChild } from "./entitlements";
import { openPaywall } from "./pro-store";

const LAST_CHILD_KEY = "kidhealth.lastChild.v1";

function readLastChild(names: string[]): string {
  if (typeof window === "undefined") return names[0] ?? "";
  try {
    const raw = localStorage.getItem(LAST_CHILD_KEY);
    if (raw && names.includes(raw)) return raw;
  } catch {
    /* ignore */
  }
  return names[0] ?? "";
}

function writeLastChild(child: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_CHILD_KEY, child);
  } catch (e) {
    console.error("[children-store] Failed to persist last child:", e);
  }
}

export type Child = {
  id: string;
  name: string;
};

const KEY = "kidhealth.children.v1";
export const DEFAULT_CHILD_NAME = "My Child";
const listeners = new Set<() => void>();

let cache: Child[] = [];
let initialized = false;

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function read(): Child[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Child[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(next: Child[]) {
  initFromStorage();
  cache = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      console.error("[children-store] Failed to persist:", e);
    }
  }
  listeners.forEach((l) => l());
}

function seedDefaults() {
  const child: Child = { id: createId(), name: DEFAULT_CHILD_NAME };
  cache = [child];
  writeLastChild(DEFAULT_CHILD_NAME);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch (e) {
      console.error("[children-store] Failed to seed defaults:", e);
    }
  }
  listeners.forEach((l) => l());
}

function initFromStorage() {
  if (!initialized) {
    cache = read();
    if (cache.length === 0) seedDefaults();
    initialized = true;
  }
}

export function getChildren(): Child[] {
  initFromStorage();
  return cache;
}

export function getChildNames(): string[] {
  return getChildren().map((c) => c.name);
}

export function addChild(name: string): Child {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name cannot be empty.");

  const gate = evaluateAddChild();
  if (!gate.allowed) {
    if (gate.reason === "paywall") openPaywall("add_child");
    throw new Error(
      gate.reason === "max_reached"
        ? "Maximum of 5 child profiles reached."
        : "Upgrade to Pro to add more children.",
    );
  }

  initFromStorage();
  if (cache.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error("A child with this name already exists.");
  }
  const child: Child = { id: createId(), name: trimmed };
  write([...cache, child]);
  return child;
}

export function updateChild(id: string, name: string): Child {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name cannot be empty.");
  initFromStorage();
  const existing = cache.find((c) => c.id === id);
  if (!existing) throw new Error("Child not found.");
  if (
    cache.some(
      (c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    throw new Error("A child with this name already exists.");
  }

  const oldName = existing.name;
  if (oldName !== trimmed) {
    renameChildInLogs(oldName, trimmed);
    renameChildInEpisodes(oldName, trimmed);
    const names = cache.map((c) => c.name);
    if (readLastChild(names) === oldName) writeLastChild(trimmed);
  }

  const updated = cache.map((c) => (c.id === id ? { ...c, name: trimmed } : c));
  write(updated);
  return { id, name: trimmed };
}

export function deleteChild(id: string) {
  initFromStorage();
  const child = cache.find((c) => c.id === id);
  if (!child) return;

  deleteLogsForChild(child.name);
  deleteEpisodesForChild(child.name);

  const next = cache.filter((c) => c.id !== id);
  write(next);

  const names = next.map((c) => c.name);
  if (!names.includes(readLastChild(names)) && names.length > 0) {
    writeLastChild(names[0]);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Child[] {
  initFromStorage();
  return cache;
}

function getServerSnapshot(): Child[] {
  return [{ id: DEFAULT_CHILD_NAME, name: DEFAULT_CHILD_NAME }];
}

export function useChildren(): Child[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function hydrateChildrenStore() {
  if (typeof window === "undefined") return;
  const stored = read();
  initialized = true;
  if (stored.length === 0 && cache.length === 0) {
    seedDefaults();
  } else if (stored.length !== cache.length || stored.some((c, i) => c.id !== cache[i]?.id)) {
    cache = stored.length > 0 ? stored : cache;
    listeners.forEach((l) => l());
  }
}

export function resetChildrenStore() {
  cache = [];
  initialized = false;
}
