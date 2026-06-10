import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CloseEpisodeDialog } from "@/components/CloseEpisodeDialog";
import {
  findPendingIdleReminder,
  getIdleReminderCopy,
  type PendingIdleReminder,
} from "@/lib/episode-reminders";
import { snoozeEpisodeReminder, useEpisodes } from "@/lib/episode-store";

export function EpisodeIdleReminder() {
  const episodes = useEpisodes();
  const [pending, setPending] = useState<PendingIdleReminder | null>(null);
  const [closeTarget, setCloseTarget] = useState<PendingIdleReminder | null>(null);

  useEffect(() => {
    const reminder = findPendingIdleReminder(episodes);
    setPending(reminder);
  }, [episodes]);

  const handleKeepOpen = () => {
    if (!pending) return;
    snoozeEpisodeReminder(pending.episode.id);
    setPending(null);
  };

  const handleCloseRequest = () => {
    if (!pending) return;
    setCloseTarget(pending);
    setPending(null);
  };

  const copy = pending ? getIdleReminderCopy(pending.stage) : null;

  return (
    <>
      <AlertDialog open={pending !== null} onOpenChange={() => {}}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={handleCloseRequest}
              className="w-full"
            >
              Close Episode
            </AlertDialogAction>
            <AlertDialogCancel onClick={handleKeepOpen} className="w-full">
              Keep Open
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CloseEpisodeDialog
        episode={closeTarget?.episode ?? null}
        open={closeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCloseTarget(null);
        }}
      />
    </>
  );
}
