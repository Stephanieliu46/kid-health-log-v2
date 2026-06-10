import { getChildren } from "./children-store";
import {
  getAllEpisodes,
  type Episode,
  incrementEmergencyLogCount,
} from "./episode-store";
import { getIsPro, openPaywall } from "./pro-store";

export const FREE_EPISODE_LIMIT = 1;
export const FREE_CHILD_LIMIT = 1;
export const PRO_CHILD_LIMIT = 5;
export const EMERGENCY_LOG_LIMIT = 5;
export const EMERGENCY_HOURS = 12;
export const IDLE_REMINDER_MS = 5 * 24 * 60 * 60 * 1000; // 120 hours

export type CreateEpisodeResult =
  | { allowed: true; isEmergencyPass: boolean }
  | { allowed: false; reason: "paywall" | "episode_limit" };

export function evaluateCreateEpisode(): CreateEpisodeResult {
  if (getIsPro()) return { allowed: true, isEmergencyPass: false };

  const episodes = getAllEpisodes();
  if (episodes.length < FREE_EPISODE_LIMIT) {
    return { allowed: true, isEmergencyPass: false };
  }

  const closed = episodes.filter((e) => e.status === "closed");
  const hasOpen = episodes.some((e) => e.status === "open");

  if (
    episodes.length === FREE_EPISODE_LIMIT &&
    closed.length === FREE_EPISODE_LIMIT &&
    !hasOpen
  ) {
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
export function isCountableEmergencyLog(temp: number | null, drug: string | null): boolean {
  return temp !== null || drug !== null;
}

export function recordEmergencyLogIfNeeded(episodeId: string, temp: number | null, drug: string | null) {
  const episode = getAllEpisodes().find((e) => e.id === episodeId);
  if (!episode?.isEmergencyPass || getIsPro()) return;
  if (!isCountableEmergencyLog(temp, drug)) return;
  incrementEmergencyLogCount(episodeId);
}

export function checkPaywallOnAppOpen(): boolean {
  if (getIsPro()) return false;
  const blocked = getAllEpisodes().some(
    (e) => e.status === "open" && shouldBlockEmergencyEpisode(e),
  );
  if (blocked) {
    openPaywall();
    return true;
  }
  return false;
}

export function guardLogSave(episode: Episode | null): boolean {
  if (!episode) return true;
  if (shouldBlockEmergencyEpisode(episode)) {
    openPaywall();
    return false;
  }
  return true;
}
