import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

const KEY = "kidhealth.theme.v1";
const DEFAULT_THEME: Theme = "system";
const listeners = new Set<() => void>();

let cache: Theme = DEFAULT_THEME;
let initialized = false;
let systemListenerAttached = false;

function isValidTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function read(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw) as unknown;
    return isValidTheme(parsed) ? parsed : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: Theme): "light" | "dark" {
  return preference === "system" ? getSystemTheme() : preference;
}

function applyThemeClass(preference: Theme) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(preference);
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

function syncSystemListener() {
  if (typeof window === "undefined") return;

  const mq = window.matchMedia("(prefers-color-scheme: dark)");

  if (cache !== "system") {
    if (systemListenerAttached) {
      mq.removeEventListener("change", onSystemThemeChange);
      systemListenerAttached = false;
    }
    return;
  }

  if (systemListenerAttached) return;

  mq.addEventListener("change", onSystemThemeChange);
  systemListenerAttached = true;
}

function onSystemThemeChange() {
  if (cache !== "system") return;
  applyThemeClass("system");
  listeners.forEach((l) => l());
}

function write(next: Theme) {
  initFromStorage();
  cache = next;
  applyThemeClass(next);
  syncSystemListener();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      console.error("[theme-store] Failed to persist theme:", e);
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

export function getTheme(): Theme {
  initFromStorage();
  return cache;
}

export function getResolvedTheme(): "light" | "dark" {
  return resolveTheme(getTheme());
}

export function setTheme(theme: Theme) {
  write(theme);
}

export function toggleTheme() {
  const resolved = resolveTheme(getTheme());
  write(resolved === "dark" ? "light" : "dark");
}

export function hydrateThemeStore() {
  initFromStorage();
  applyThemeClass(cache);
  syncSystemListener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Theme {
  initFromStorage();
  return cache;
}

function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
