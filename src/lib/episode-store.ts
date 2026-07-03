import { useSyncExternalStore } from "react";
import {
  DEFAULT_DISEASE_TYPE,
  episodeIncludesStandardType,
  formatDiseaseTypes,
  mergeDiseaseTypes,
  normalizeDiseaseTypes,
} from "./disease-types";
import { getEarliestLogTimestampForEpisode } from "./log-store";

export type EpisodeStatus = "open" | "closed";

export type Episode = {
  id: string;
  child: string;
  diseaseTypes: string[];
  notes: string | null;
  status: EpisodeStatus;
  openedAt: number;
  /** When this episode record was created in the app (for backfill vs ongoing detection). */
  createdAt?: number;
  closedAt?: number;
  /** How many idle reminders have been shown (0, 1, or 2). */
  reminderCount?: number;
  /** Timestamp when user last chose "Keep Open". */
  reminderSnoozedAt?: number;
  /** After 2nd "Keep Open", never show idle reminders again. */
  reminder_exhausted?: boolean;
  /** Night-time emergency pass episode (free tier 2nd illness). */
  isEmergencyPass?: boolean;
  /** Temp/med logs recorded under emergency pass (max 5 free). */
  emergency_log_count?: number;
};

const KEY = "kidhealth.episodes.v1";
const DEFAULT_KEY = "kidhealth.defaultEpisode.v1";
const listeners = new Set<() => void>();

type DefaultEpisodeStore = Record<string, string>;

function readDefaults(): DefaultEpisodeStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DEFAULT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DefaultEpisodeStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDefaults(store: DefaultEpisodeStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEFAULT_KEY, JSON.stringify(store));
  } catch (e) {
    console.error("[episode-store] Failed to persist default episode:", e);
  }
}

type LegacyEpisode = Partial<Episode> & { diseaseType?: string };

function normalizeEpisode(raw: LegacyEpisode): Episode {
  return {
    id: raw.id!,
    child: raw.child!,
    diseaseTypes: normalizeDiseaseTypes(raw.diseaseTypes, raw.diseaseType),
    notes: raw.notes ?? null,
    status: raw.status ?? "open",
    openedAt: raw.openedAt ?? Date.now(),
    createdAt: raw.createdAt ?? raw.openedAt ?? Date.now(),
    closedAt: raw.closedAt,
    reminderCount: raw.reminderCount ?? 0,
    reminderSnoozedAt: raw.reminderSnoozedAt,
    reminder_exhausted: raw.reminder_exhausted ?? false,
    isEmergencyPass: raw.isEmergencyPass ?? false,
    emergency_log_count: raw.emergency_log_count ?? 0,
  };
}

function read(): Episode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyEpisode[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEpisode);
  } catch {
    return [];
  }
}

let cache: Episode[] = [];
let initialized = false;

function initFromStorage() {
  if (typeof window === "undefined") return;
  if (!initialized) {
    cache = read();
    initialized = true;
  }
}

function write(next: Episode[]) {
  initFromStorage();
  cache = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      console.error("[episode-store] Failed to persist episodes:", e);
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

export function formatEpisodeTitle(episode: Episode): string {
  return formatDiseaseTypes(episode.diseaseTypes);
}

export function getOpenEpisodesForChild(child: string): Episode[] {
  initFromStorage();
  return cache.filter((e) => e.child === child && e.status === "open");
}

export function getDefaultEpisodeForChild(child: string): Episode | null {
  initFromStorage();
  const open = getOpenEpisodesForChild(child);
  if (open.length === 0) return null;

  const preferredId = readDefaults()[child];
  if (preferredId) {
    const preferred = open.find((e) => e.id === preferredId);
    if (preferred) return preferred;
  }

  const coldFeverEpisode = open.find((e) =>
    episodeIncludesStandardType(e.diseaseTypes, DEFAULT_DISEASE_TYPE),
  );
  if (coldFeverEpisode) return coldFeverEpisode;

  return open[0];
}

/**
 * Resolve target episode for Quick Log: append to open episode or create new.
 * Merges log illness tags into the episode's diseaseTypes list.
 */
export function resolveEpisodeForQuickLog(
  child: string,
  logDiseaseTypes: string[],
  options?: { isEmergencyPass?: boolean; logTimestamp?: number },
): Episode {
  initFromStorage();
  const open = getDefaultEpisodeForChild(child);

  if (open) {
    appendDiseaseTypesToEpisode(open.id, logDiseaseTypes);
    return getEpisode(open.id)!;
  }

  const types =
    logDiseaseTypes.length > 0 ? logDiseaseTypes : [DEFAULT_DISEASE_TYPE];
  const episode = createEpisode(child, types, options?.logTimestamp ?? Date.now(), {
    isEmergencyPass: options?.isEmergencyPass,
  });
  setDefaultEpisodeForChild(child, episode.id);
  return episode;
}

export function appendDiseaseTypesToEpisode(id: string, incoming: string[]) {
  if (incoming.length === 0) return;
  initFromStorage();
  write(
    cache.map((e) =>
      e.id === id
        ? { ...e, diseaseTypes: mergeDiseaseTypes(e.diseaseTypes, incoming) }
        : e,
    ),
  );
}

export function setDefaultEpisodeForChild(child: string, episodeId: string) {
  const store = readDefaults();
  store[child] = episodeId;
  writeDefaults(store);
}

/** @deprecated Use getDefaultEpisodeForChild */
export function getOpenEpisodeForChild(child: string): Episode | null {
  return getDefaultEpisodeForChild(child);
}

/** @deprecated Use resolveEpisodeForQuickLog */
export function getOrCreateQuickLogEpisode(child: string): Episode {
  return resolveEpisodeForQuickLog(child, [DEFAULT_DISEASE_TYPE]);
}

export function createEpisode(
  child: string,
  diseaseTypes: string[],
  openedAt: number = Date.now(),
  options?: { isEmergencyPass?: boolean },
): Episode {
  initFromStorage();
  const episode: Episode = {
    id: createId(),
    child,
    diseaseTypes: mergeDiseaseTypes([], diseaseTypes),
    notes: null,
    status: "open",
    openedAt,
    createdAt: Date.now(),
    reminderCount: 0,
    reminder_exhausted: false,
    isEmergencyPass: options?.isEmergencyPass ?? false,
    emergency_log_count: 0,
  };
  write([episode, ...cache]);
  return episode;
}

export function closeEpisode(id: string, closedAt: number = Date.now()) {
  initFromStorage();
  write(
    cache.map((e) =>
      e.id === id ? { ...e, status: "closed" as const, closedAt } : e,
    ),
  );
}

export function reopenEpisode(id: string) {
  initFromStorage();
  const episode = cache.find((e) => e.id === id);
  if (!episode) throw new Error("Episode not found.");
  if (episode.status !== "closed") throw new Error("Episode is already open.");

  write(
    cache.map((e) => {
      if (e.id !== id) return e;
      const { closedAt: _closedAt, ...rest } = e;
      return {
        ...rest,
        status: "open" as const,
        reminderCount: 0,
        reminderSnoozedAt: undefined,
        reminder_exhausted: false,
      };
    }),
  );
  setDefaultEpisodeForChild(episode.child, id);
}

export function snoozeEpisodeReminder(id: string) {
  initFromStorage();
  write(
    cache.map((e) => {
      if (e.id !== id) return e;
      const nextCount = (e.reminderCount ?? 0) + 1;
      if (nextCount >= 2) {
        return {
          ...e,
          reminderCount: 2,
          reminderSnoozedAt: Date.now(),
          reminder_exhausted: true,
        };
      }
      return {
        ...e,
        reminderCount: nextCount,
        reminderSnoozedAt: Date.now(),
      };
    }),
  );
}

export function incrementEmergencyLogCount(id: string) {
  initFromStorage();
  write(
    cache.map((e) =>
      e.id === id
        ? { ...e, emergency_log_count: (e.emergency_log_count ?? 0) + 1 }
        : e,
    ),
  );
}

export function getAllEpisodes(): Episode[] {
  initFromStorage();
  return cache;
}

export function getEpisode(id: string): Episode | null {
  initFromStorage();
  return cache.find((e) => e.id === id) ?? null;
}

export function updateEpisode(
  id: string,
  patch: Partial<Pick<Episode, "child" | "diseaseTypes" | "notes" | "openedAt">>,
) {
  initFromStorage();
  write(
    cache.map((e) => {
      if (e.id !== id) return e;
      const next = { ...e, ...patch };
      if (patch.diseaseTypes) {
        next.diseaseTypes = mergeDiseaseTypes([], patch.diseaseTypes);
      }
      return next;
    }),
  );
}

/** Align open episode start with the earliest logged entry in that episode. */
export function syncEpisodeOpenedAtFromLogs(episodeId: string) {
  const episode = getEpisode(episodeId);
  if (!episode || episode.status !== "open") return;

  const earliest = getEarliestLogTimestampForEpisode(episodeId);
  if (earliest === null || earliest >= episode.openedAt) return;

  updateEpisode(episodeId, { openedAt: earliest });
}

export function deleteEpisode(id: string) {
  initFromStorage();
  const episode = cache.find((e) => e.id === id);
  if (!episode) return;

  const defaults = readDefaults();
  if (defaults[episode.child] === id) {
    delete defaults[episode.child];
    writeDefaults(defaults);
  }

  write(cache.filter((e) => e.id !== id));
}

export function deleteEpisodesForChild(child: string) {
  initFromStorage();
  const defaults = readDefaults();
  if (defaults[child]) {
    delete defaults[child];
    writeDefaults(defaults);
  }
  write(cache.filter((e) => e.child !== child));
}

export function renameChildInEpisodes(oldName: string, newName: string) {
  initFromStorage();
  const defaults = readDefaults();
  if (defaults[oldName]) {
    defaults[newName] = defaults[oldName];
    delete defaults[oldName];
    writeDefaults(defaults);
  }
  write(cache.map((e) => (e.child === oldName ? { ...e, child: newName } : e)));
}

export function getSickDays(openedAt: number, closedAt?: number): number {
  const end = closedAt ?? Date.now();
  const ms = Math.max(0, end - openedAt);
  return Math.round((ms / 86_400_000) * 10) / 10;
}

export function getEpisodeDurationLabel(openedAt: number, closedAt?: number): string {
  const days = getSickDays(openedAt, closedAt);
  if (days < 1) {
    const hours = Math.round((Math.max(0, (closedAt ?? Date.now()) - openedAt) / 3_600_000) * 10) / 10;
    return hours <= 1 ? `${hours}h` : `${hours} hours`;
  }
  return days === 1 ? "1 day" : `${days} days`;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Episode[] {
  initFromStorage();
  return cache;
}

function getServerSnapshot(): Episode[] {
  return [];
}

export function useEpisodes(): Episode[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function hydrateEpisodeStore() {
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

export function resetEpisodeStore() {
  cache = [];
  initialized = false;
  listeners.forEach((l) => l());
}
