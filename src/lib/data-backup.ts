import { APP_VERSION } from "./feedback";

/**
 * Keys included in a backup file. Deliberately excludes credentials
 * (kidhealth.auth.v1, kidhealth.rememberMe.v1, kidhealth.pendingCode.v1)
 * so a backup file never contains a password — on a new device the user
 * registers first, then imports.
 */
export const BACKUP_KEYS = [
  "kidhealth.children.v1",
  "kidhealth.logs.v1",
  "kidhealth.episodes.v1",
  "kidhealth.defaultEpisode.v1",
  "kidhealth.lastChild.v1",
  "kidhealth.lastDose.v1",
  "kidhealth.lastCustomDrug.v1",
  "kidhealth.pro.v1",
  "kidhealth.disclaimer.v1",
  "kidhealth.temperatureUnit.v1",
  "kidhealth.theme.v1",
] as const;

const BACKUP_MARKER = "kidhealth-log-backup";

type BackupFile = {
  app: typeof BACKUP_MARKER;
  appVersion: string;
  exportedAt: string;
  data: Record<string, string>;
};

function buildBackup(): BackupFile {
  const data: Record<string, string> = {};
  for (const key of BACKUP_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return {
    app: BACKUP_MARKER,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/**
 * Fixed filename so saving to the same iCloud folder replaces the previous
 * backup instead of piling up dated copies. The export time is visible in the
 * Files app (modified date), inside the file (exportedAt), and in Settings.
 */
const BACKUP_FILENAME = "kidhealth-backup.json";

const LAST_EXPORT_KEY = "kidhealth.lastBackupAt.v1";

/** ISO timestamp of the last successful export on this device, or null. */
export function getLastBackupAt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_EXPORT_KEY);
}

function recordBackupExported(exportedAt: string) {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, exportedAt);
  } catch {
    // Non-critical — ignore quota errors.
  }
}

/**
 * Export all app data as a JSON file. Uses the share sheet on iOS
 * (so the user can save to Files/iCloud) and a plain download elsewhere.
 * Returns the number of storage keys included.
 */
export async function exportBackup(): Promise<number> {
  const backup = buildBackup();
  const count = Object.keys(backup.data).length;
  if (count === 0) throw new Error("Nothing to export yet.");

  const json = JSON.stringify(backup, null, 2);
  const file = new File([json], BACKUP_FILENAME, { type: "application/json" });

  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "KidHealth Log backup" });
      recordBackupExported(backup.exportedAt);
      return count;
    } catch (e) {
      // User cancelled the share sheet — not an error, but nothing was saved.
      if (e instanceof DOMException && e.name === "AbortError") {
        throw new Error("Export cancelled.");
      }
      // Share failed for another reason — fall through to download.
    }
  }

  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = BACKUP_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  recordBackupExported(backup.exportedAt);
  return count;
}

/**
 * Restore app data from a backup file. Only known kidhealth.* keys are
 * accepted; everything else in the file is ignored. Overwrites current
 * data for the keys present in the backup. Returns the number of keys
 * restored — caller should reload the page afterwards so all stores
 * rehydrate from localStorage.
 */
export async function importBackup(file: File): Promise<number> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("Not a valid backup file (could not read JSON).");
  }

  const backup = parsed as Partial<BackupFile>;
  if (backup?.app !== BACKUP_MARKER || typeof backup.data !== "object" || backup.data === null) {
    throw new Error("Not a KidHealth Log backup file.");
  }

  const allowed = new Set<string>(BACKUP_KEYS);
  let restored = 0;
  for (const [key, value] of Object.entries(backup.data)) {
    if (!allowed.has(key) || typeof value !== "string") continue;
    localStorage.setItem(key, value);
    restored++;
  }
  if (restored === 0) throw new Error("Backup file contains no restorable data.");
  return restored;
}
