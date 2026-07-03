import { useSyncExternalStore } from "react";
import { migrateLogsToTempUnit } from "./log-store";

export type TemperatureUnit = "celsius" | "fahrenheit";

const KEY = "kidhealth.temperatureUnit.v1";
const DEFAULT_UNIT: TemperatureUnit = "celsius";
const listeners = new Set<() => void>();

let cache: TemperatureUnit = DEFAULT_UNIT;
let initialized = false;

function isValidUnit(value: unknown): value is TemperatureUnit {
  return value === "celsius" || value === "fahrenheit";
}

function read(): TemperatureUnit {
  if (typeof window === "undefined") return DEFAULT_UNIT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_UNIT;
    const parsed = JSON.parse(raw) as unknown;
    return isValidUnit(parsed) ? parsed : DEFAULT_UNIT;
  } catch {
    return DEFAULT_UNIT;
  }
}

function write(next: TemperatureUnit) {
  initFromStorage();
  cache = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      console.error("[temperature-unit-store] Failed to persist:", e);
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

export function getTemperatureUnit(): TemperatureUnit {
  initFromStorage();
  return cache;
}

export function setTemperatureUnit(unit: TemperatureUnit) {
  initFromStorage();
  if (cache === unit) return;
  migrateLogsToTempUnit(unit);
  write(unit);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): TemperatureUnit {
  initFromStorage();
  return cache;
}

function getServerSnapshot(): TemperatureUnit {
  return DEFAULT_UNIT;
}

export function useTemperatureUnit(): TemperatureUnit {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function hydrateTemperatureUnitStore() {
  if (typeof window === "undefined") return;
  const stored = read();
  initialized = true;
  if (stored !== cache) {
    cache = stored;
    listeners.forEach((l) => l());
  }
}

export function resetTemperatureUnitStore() {
  cache = DEFAULT_UNIT;
  initialized = false;
}
