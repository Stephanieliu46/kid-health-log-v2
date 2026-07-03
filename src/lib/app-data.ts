/** All KidHealth Log localStorage keys — used for account wipe. */
export const APP_STORAGE_KEYS = [
  "kidhealth.auth.v1",
  "kidhealth.pendingCode.v1",
  "kidhealth.children.v1",
  "kidhealth.logs.v1",
  "kidhealth.episodes.v1",
  "kidhealth.defaultEpisode.v1",
  "kidhealth.lastChild.v1",
  "kidhealth.lastDose.v1",
  "kidhealth.rememberMe.v1",
  "kidhealth.pro.v1",
  "kidhealth.profile.v1",
  "kidhealth.disclaimer.v1",
  "kidhealth.lastCustomDrug.v1",
  "kidhealth.temperatureUnit.v1",
  "kidhealth.theme.v1",
] as const;

export function clearAllAppData() {
  if (typeof window === "undefined") return;
  for (const key of APP_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`[app-data] Failed to remove ${key}:`, e);
    }
  }
}
