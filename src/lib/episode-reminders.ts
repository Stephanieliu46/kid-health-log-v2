import { IDLE_REMINDER_MS } from "./entitlements";
import type { Episode } from "./episode-store";
import { getLastActivityForEpisode } from "./log-store";

export type IdleReminderStage = 1 | 2;

export type PendingIdleReminder = {
  episode: Episode;
  stage: IdleReminderStage;
};

function hoursSinceLastActivity(episode: Episode): number {
  const lastActivity = getLastActivityForEpisode(episode.id) ?? episode.openedAt;
  return (Date.now() - lastActivity) / 3_600_000;
}

/**
 * Returns the highest-priority open episode needing an idle reminder, if any.
 * Checked on app startup / dashboard mount.
 */
export function findPendingIdleReminder(episodes: Episode[]): PendingIdleReminder | null {
  const openEpisodes = episodes.filter((e) => e.status === "open");

  for (const episode of openEpisodes) {
    if (episode.reminder_exhausted) continue;

    const idleMs = hoursSinceLastActivity(episode) * 3_600_000;
    if (idleMs < IDLE_REMINDER_MS) continue;

    const count = episode.reminderCount ?? 0;

    if (count === 0) {
      return { episode, stage: 1 };
    }

    if (count === 1 && episode.reminderSnoozedAt) {
      const sinceSnooze = Date.now() - episode.reminderSnoozedAt;
      if (sinceSnooze >= IDLE_REMINDER_MS) {
        return { episode, stage: 2 };
      }
    }
  }

  return null;
}

export function getIdleReminderCopy(stage: IdleReminderStage): {
  title: string;
  description: string;
} {
  if (stage === 1) {
    return {
      title: "Is your child fully recovered? 🌟",
      description:
        "No records for 5 days. We recommend closing this episode to keep data organized.",
    };
  }
  return {
    title: "Please verify this episode",
    description:
      "To ensure the absolute accuracy of your child's future health trend charts, please verify if this week-old episode has ended.",
  };
}
