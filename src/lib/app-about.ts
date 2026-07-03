import { APP_VERSION } from "./feedback";

/** Set via VITE_APP_STORE_APP_ID when the iOS app is live on the App Store. */
export const APP_STORE_APP_ID =
  (import.meta.env.VITE_APP_STORE_APP_ID as string | undefined)?.trim() ?? "";

/** Optional JSON manifest: { "version": "1.0.1", "storeUrl": "https://..." } */
export const VERSION_CHECK_URL =
  (import.meta.env.VITE_VERSION_CHECK_URL as string | undefined)?.trim() ?? "";

export type AppUpdateCheckResult =
  | { status: "current"; latestVersion: string }
  | { status: "update_available"; latestVersion: string; storeUrl: string }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

type VersionManifest = {
  version?: string;
  storeUrl?: string;
};

type ITunesLookupResponse = {
  results?: Array<{
    version?: string;
    trackViewUrl?: string;
  }>;
};

const CHECK_CACHE_KEY = "kidhealth.update-check.v1";
const CHECK_CACHE_MS = 6 * 60 * 60 * 1000;

function parseVersionParts(version: string): number[] {
  return version
    .split(".")
    .map((part) => Number.parseInt(part.replace(/[^0-9].*$/, ""), 10))
    .map((n) => (Number.isNaN(n) ? 0 : n));
}

export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersionParts(latest);
  const b = parseVersionParts(current);
  const len = Math.max(a.length, b.length);

  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff > 0) return true;
    if (diff < 0) return false;
  }
  return false;
}

export function getAppStoreReviewUrl(): string | null {
  if (!APP_STORE_APP_ID) return null;
  return `https://apps.apple.com/app/id${APP_STORE_APP_ID}?action=write-review`;
}

export function getAppStorePageUrl(): string | null {
  if (!APP_STORE_APP_ID) return null;
  return `https://apps.apple.com/app/id${APP_STORE_APP_ID}`;
}

export function openExternalUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function readCachedCheck(): AppUpdateCheckResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECK_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; result: AppUpdateCheckResult };
    if (Date.now() - parsed.at > CHECK_CACHE_MS) return null;
    return parsed.result;
  } catch {
    return null;
  }
}

function writeCachedCheck(result: AppUpdateCheckResult) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      CHECK_CACHE_KEY,
      JSON.stringify({ at: Date.now(), result }),
    );
  } catch {
    // ignore quota errors
  }
}

async function fetchVersionManifest(): Promise<VersionManifest | null> {
  if (!VERSION_CHECK_URL) return null;

  const response = await fetch(VERSION_CHECK_URL, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("Could not reach version manifest.");
  }
  return (await response.json()) as VersionManifest;
}

async function fetchAppStoreVersion(): Promise<{ version: string; storeUrl: string } | null> {
  if (!APP_STORE_APP_ID) return null;

  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(APP_STORE_APP_ID)}&country=gb`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error("Could not reach the App Store.");
  }

  const data = (await response.json()) as ITunesLookupResponse;
  const entry = data.results?.[0];
  if (!entry?.version) return null;

  return {
    version: entry.version,
    storeUrl: entry.trackViewUrl ?? getAppStorePageUrl() ?? "",
  };
}

export async function checkAppUpdate(options?: {
  force?: boolean;
}): Promise<AppUpdateCheckResult> {
  if (!options?.force) {
    const cached = readCachedCheck();
    if (cached) return cached;
  }

  if (!APP_STORE_APP_ID && !VERSION_CHECK_URL) {
    return { status: "unconfigured" };
  }

  try {
    const manifest = await fetchVersionManifest();
    const appStore = await fetchAppStoreVersion();

    const latestVersion = appStore?.version ?? manifest?.version;
    if (!latestVersion) {
      const result: AppUpdateCheckResult = { status: "current", latestVersion: APP_VERSION };
      writeCachedCheck(result);
      return result;
    }

    const storeUrl =
      appStore?.storeUrl ??
      manifest?.storeUrl ??
      getAppStorePageUrl() ??
      "";

    if (isNewerVersion(latestVersion, APP_VERSION)) {
      const result: AppUpdateCheckResult = {
        status: "update_available",
        latestVersion,
        storeUrl,
      };
      writeCachedCheck(result);
      return result;
    }

    const result: AppUpdateCheckResult = { status: "current", latestVersion };
    writeCachedCheck(result);
    return result;
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Update check failed.",
    };
  }
}
