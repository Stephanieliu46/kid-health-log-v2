import { useSyncExternalStore } from "react";
import { normalizeDrug, type Drug } from "./medications";
import { convertTemp, normalizeTempUnit } from "./temperature";
import type { TemperatureUnit } from "./temperature-unit-store";

export type LogEntry = {
  id: string;
  child: string;
  episodeId: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  temp: number | null; // null = Not Taken; value is in tempUnit
  tempUnit: TemperatureUnit;
  drug: Drug | null;
  /** Other medicines (e.g. antibiotics) logged from Episode detail. */
  customDrug: string | null;
  amount: number | null; // ml
  notes: string | null;
  createdAt: number;
};

const KEY = "kidhealth.logs.v1";
const listeners = new Set<() => void>();

function read(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<LogEntry>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => ({
      ...entry,
      episodeId: entry.episodeId ?? null,
      notes: entry.notes ?? null,
      drug: normalizeDrug(entry.drug as string | null | undefined),
      customDrug: entry.customDrug?.trim() || null,
      tempUnit: normalizeTempUnit(entry.tempUnit as TemperatureUnit | undefined),
    })) as LogEntry[];
  } catch {
    return [];
  }
}

let cache: LogEntry[] = [];
let initialized = false;

function initFromStorage() {
  if (typeof window === "undefined") return;
  if (!initialized) {
    cache = read();
    initialized = true;
  }
}

function write(next: LogEntry[]) {
  initFromStorage();
  cache = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      console.error("[log-store] Failed to persist logs:", e);
    }
  }
  listeners.forEach((l) => l());
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function addLog(entry: Omit<LogEntry, "id" | "createdAt">) {
  initFromStorage();
  const full: LogEntry = {
    ...entry,
    id: createId(),
    createdAt: Date.now(),
  };
  write([full, ...cache]);
  return full;
}

export function deleteLog(id: string) {
  initFromStorage();
  write(cache.filter((l) => l.id !== id));
}

export function updateLog(
  id: string,
  patch: Partial<
    Pick<
      LogEntry,
      "date" | "time" | "temp" | "tempUnit" | "drug" | "customDrug" | "amount" | "notes" | "episodeId"
    >
  >,
) {
  initFromStorage();
  write(cache.map((l) => (l.id === id ? { ...l, ...patch } : l)));
}

/** Attach orphan logs (no episode) to the given episode for the same child. */
export function attachOrphanLogsToEpisode(child: string, episodeId: string) {
  initFromStorage();
  write(
    cache.map((l) =>
      l.child === child && l.episodeId === null ? { ...l, episodeId } : l,
    ),
  );
}

export function getLogsForEpisode(episodeId: string): LogEntry[] {
  initFromStorage();
  return cache.filter((l) => l.episodeId === episodeId);
}

export function compareLogsDesc(a: LogEntry, b: LogEntry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.time < b.time ? 1 : -1;
}

export function compareLogsAsc(a: LogEntry, b: LogEntry): number {
  return -compareLogsDesc(a, b);
}

export function sortLogsDesc(logs: LogEntry[]): LogEntry[] {
  return [...logs].sort(compareLogsDesc);
}

export function sortLogsAsc(logs: LogEntry[]): LogEntry[] {
  return [...logs].sort(compareLogsAsc);
}

/** Latest log timestamp (date+time) for idle reminder checks. */
export function getLastActivityForEpisode(episodeId: string): number | null {
  const logs = getLogsForEpisode(episodeId);
  if (logs.length === 0) return null;

  let latest: number | null = null;
  for (const log of logs) {
    const ts = new Date(`${log.date}T${log.time}`).getTime();
    if (Number.isNaN(ts)) continue;
    if (latest === null || ts > latest) latest = ts;
  }
  return latest;
}

export function getEarliestLogTimestampForEpisode(episodeId: string): number | null {
  const logs = getLogsForEpisode(episodeId);
  if (logs.length === 0) return null;

  let earliest: number | null = null;
  for (const log of logs) {
    const ts = new Date(`${log.date}T${log.time}`).getTime();
    if (Number.isNaN(ts)) continue;
    if (earliest === null || ts < earliest) earliest = ts;
  }
  return earliest;
}

export function deleteLogsForEpisode(episodeId: string) {
  initFromStorage();
  write(cache.filter((l) => l.episodeId !== episodeId));
}

export function deleteLogsForChild(child: string) {
  initFromStorage();
  write(cache.filter((l) => l.child !== child));
}

export function renameChildInLogs(oldName: string, newName: string) {
  initFromStorage();
  write(cache.map((l) => (l.child === oldName ? { ...l, child: newName } : l)));
}

/** Most recent log date+time for a child's medication (used for NHS interval checks). */
export function getLastDrugDoseTimestamp(child: string, drug: Drug): number | null {
  initFromStorage();
  let latest: number | null = null;
  for (const log of cache) {
    if (log.child !== child || log.drug !== drug) continue;
    const ts = new Date(`${log.date}T${log.time}`).getTime();
    if (Number.isNaN(ts)) continue;
    if (latest === null || ts > latest) latest = ts;
  }
  return latest;
}

export function updateLogsChildForEpisode(episodeId: string, child: string) {
  initFromStorage();
  write(cache.map((l) => (l.episodeId === episodeId ? { ...l, child } : l)));
}

export function countOrphanLogs(child: string): number {
  initFromStorage();
  return cache.filter((l) => l.child === child && l.episodeId === null).length;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): LogEntry[] {
  initFromStorage();
  return cache;
}

/** Sync read of all logs (for medication safety checks outside React). */
export function getLogsSnapshot(): LogEntry[] {
  return getSnapshot();
}

/** Convert every stored temperature to the new unit when the user changes preference. */
export function migrateLogsToTempUnit(newUnit: TemperatureUnit) {
  initFromStorage();
  let changed = false;

  const next = cache.map((log) => {
    if (log.tempUnit === newUnit) {
      return log;
    }

    changed = true;
    if (log.temp === null) {
      return { ...log, tempUnit: newUnit };
    }

    const converted = convertTemp(log.temp, log.tempUnit, newUnit);
    return {
      ...log,
      temp: Math.round(converted * 10) / 10,
      tempUnit: newUnit,
    };
  });

  if (changed) {
    write(next);
  }
}

function getServerSnapshot(): LogEntry[] {
  return [];
}

export function useLogs(): LogEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Sync in-memory cache from localStorage after client hydration (SSR-safe). */
export function hydrateLogStore() {
  if (typeof window === "undefined") return;
  const stored = read();
  initialized = true;
  const changed =
    stored.length !== cache.length ||
    stored.some((entry, i) => entry.id !== cache[i]?.id);
  if (changed) {
    cache = stored;
    listeners.forEach((l) => l());
  }
}

export function resetLogStore() {
  cache = [];
  initialized = false;
  listeners.forEach((l) => l());
}

