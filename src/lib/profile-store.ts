import { useSyncExternalStore } from "react";

export type Profile = {
  parentName: string;
};

const KEY = "kidhealth.profile.v1";
const DEFAULT_PROFILE: Profile = { parentName: "Parent" };
const listeners = new Set<() => void>();

let cache: Profile = DEFAULT_PROFILE;
let initialized = false;

function read(): Profile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Profile;
    if (!parsed?.parentName?.trim()) return DEFAULT_PROFILE;
    return { parentName: parsed.parentName.trim() };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function write(next: Profile) {
  initFromStorage();
  cache = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      console.error("[profile-store] Failed to persist:", e);
    }
  }
  listeners.forEach((l) => l());
}

function initFromStorage() {
  if (!initialized) {
    cache = read();
    initialized = true;
  }
}

export function getProfile(): Profile {
  initFromStorage();
  return cache;
}

export function updateParentName(parentName: string) {
  const trimmed = parentName.trim();
  if (!trimmed) throw new Error("Name cannot be empty.");
  write({ parentName: trimmed });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Profile {
  initFromStorage();
  return cache;
}

function getServerSnapshot(): Profile {
  return DEFAULT_PROFILE;
}

export function useProfile(): Profile {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function hydrateProfileStore() {
  if (typeof window === "undefined") return;
  const stored = read();
  initialized = true;
  if (stored.parentName !== cache.parentName) {
    cache = stored;
    listeners.forEach((l) => l());
  }
}

export function resetProfileStore() {
  cache = DEFAULT_PROFILE;
  initialized = false;
}
