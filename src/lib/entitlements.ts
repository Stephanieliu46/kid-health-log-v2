import { getChildren } from "./children-store";
import {
  getAllEpisodes,
  type Episode,
  incrementEmergencyLogCount,
} from "./episode-store";
import { getIsPro, openPaywall, type OpenPaywallOptions } from "./pro-store";

export const FREE_EPISODE_LIMIT = 1;
export const FREE_CHILD_LIMIT = 1;
export const PRO_CHILD_LIMIT = 5;
export const EMERGENCY_LOG_LIMIT = 5;
export const EMERGENCY_HOURS = 12;
export const IDLE_REMINDER_MS = 5 * 24 * 60 * 60 * 1000; // 120 hours

export type CreateEpisodeResult =
  | { allowed: true; isEmergencyPass: boolean }
  | { allowed: false; reason: "paywall" | "episode_limit" };

export function getEmergencyLogsRemaining(episode: Episode | null | undefined): number {
  if (!episode?.isEmergencyPass || getIsPro()) return 0;
  const used = episode.emergency_log_count ?? 0;
  return Math.max(0, EMERGENCY_LOG_LIMIT - used);
}

/** Show upgrade + emergency-log confirm before each save on an active emergency pass. */
export function shouldPromptEmergencyLog(
  episode: Episode | null | undefined,
  options?: { forceConfirmed?: boolean; startingEmergencyPass?: boolean },
): boolean {
  if (getIsPro() || options?.forceConfirmed) return false;
  if (options?.startingEmergencyPass) return true;
  if (!episode?.isEmergencyPass) return false;
  if (shouldBlockEmergencyEpisode(episode)) return false;
  return getEmergencyLogsRemaining(episode) > 0;
}

export function isEmergencyPassExhausted(episode: Episode | null | undefined): boolean {
  if (!episode?.isEmergencyPass || getIsPro()) return false;
  return shouldBlockEmergencyEpisode(episode);
}

/** Free user may start one emergency-pass episode after their full illness episode is closed. */
export function canStartEmergencyPass(): boolean {
  if (getIsPro()) return false;

  const episodes = getAllEpisodes();
  if (episodes.some((e) => e.status === "open")) return false;

  const fullEpisodes = episodes.filter((e) => !e.isEmergencyPass);
  const closedFullCount = fullEpisodes.filter((e) => e.status === "closed").length;
  if (closedFullCount < FREE_EPISODE_LIMIT) return false;

  return !episodes.some((e) => e.isEmergencyPass);
}

export function evaluateCreateEpisode(): CreateEpisodeResult {
  if (getIsPro()) return { allowed: true, isEmergencyPass: false };

  const episodes = getAllEpisodes();
  const openEpisodes = episodes.filter((e) => e.status === "open");
  if (openEpisodes.length > 0) {
    return { allowed: false, reason: "episode_limit" };
  }

  const fullEpisodes = episodes.filter((e) => !e.isEmergencyPass);
  if (fullEpisodes.length < FREE_EPISODE_LIMIT) {
    return { allowed: true, isEmergencyPass: false };
  }

  if (canStartEmergencyPass()) {
    return { allowed: true, isEmergencyPass: true };
  }

  return { allowed: false, reason: "paywall" };
}

export type AddChildResult =
  | { allowed: true }
  | { allowed: false; reason: "paywall" | "max_reached" };

export function evaluateAddChild(): AddChildResult {
  const count = getChildren().length;

  if (getIsPro()) {
    if (count >= PRO_CHILD_LIMIT) {
      return { allowed: false, reason: "max_reached" };
    }
    return { allowed: true };
  }

  if (count >= FREE_CHILD_LIMIT) {
    return { allowed: false, reason: "paywall" };
  }

  return { allowed: true };
}

export function canAddChild(): boolean {
  return evaluateAddChild().allowed;
}

export function getChildLimit(): number {
  return getIsPro() ? PRO_CHILD_LIMIT : FREE_CHILD_LIMIT;
}

export function isEmergencyEpisode(episode: Episode): boolean {
  return episode.isEmergencyPass === true;
}

export function shouldBlockEmergencyEpisode(episode: Episode): boolean {
  if (getIsPro()) return false;
  if (!episode.isEmergencyPass) return false;

  const hoursSinceOpen = (Date.now() - episode.openedAt) / 3_600_000;
  if (hoursSinceOpen >= EMERGENCY_HOURS) return true;

  return (episode.emergency_log_count ?? 0) >= EMERGENCY_LOG_LIMIT;
}

/** Count temp or medication logs toward emergency quota. */
export function isCountableEmergencyLog(
  temp: number | null,
  drug: string | null,
  customDrug?: string | null,
): boolean {
  return temp !== null || drug !== null || Boolean(customDrug?.trim());
}

export function recordEmergencyLogIfNeeded(
  episodeId: string,
  temp: number | null,
  drug: string | null,
  customDrug?: string | null,
) {
  const episode = getAllEpisodes().find((e) => e.id === episodeId);
  if (!episode?.isEmergencyPass || getIsPro()) return;
  if (!isCountableEmergencyLog(temp, drug, customDrug)) return;
  incrementEmergencyLogCount(episodeId);
}

export function openEmergencyPaywall(
  episode: Episode | null | undefined,
  options?: Pick<OpenPaywallOptions, "onEmergencyLog">,
) {
  const remaining = episode
    ? getEmergencyLogsRemaining(episode)
    : EMERGENCY_LOG_LIMIT;

  openPaywall("emergency_pass", {
    emergencyLogsRemaining: remaining,
    onEmergencyLog: options?.onEmergencyLog,
  });
}

export function checkPaywallOnAppOpen(): boolean {
  if (getIsPro()) return false;
  const blocked = getAllEpisodes().some(
    (e) => e.status === "open" && shouldBlockEmergencyEpisode(e),
  );
  if (blocked) {
    const episode = getAllEpisodes().find(
      (e) => e.status === "open" && shouldBlockEmergencyEpisode(e),
    );
    openEmergencyPaywall(episode);
    return true;
  }
  return false;
}

export function guardLogSave(episode: Episode | null): boolean {
  if (!episode) return true;
  if (shouldBlockEmergencyEpisode(episode)) {
    openEmergencyPaywall(episode);
    return false;
  }
  return true;
}
