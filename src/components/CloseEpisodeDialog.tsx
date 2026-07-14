import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  closeEpisode,
  formatEpisodeTitle,
  getSickDays,
  type Episode,
} from "@/lib/episode-store";
import { getLogsForEpisode, sortLogsDesc } from "@/lib/log-store";
import {
  formatCloseDateInput,
  formatCloseTimeInput,
  parseCloseTimestamp,
} from "@/lib/episode-close";
import {
  dialogDateFieldClass,
  dialogDateWrapClass,
  dialogFooterClass,
  dialogPrimaryButtonClass,
  dialogSecondaryButtonClass,
} from "@/lib/dialog-ui";
import { ChildNameBadge } from "@/components/ChildNameBadge";
import { toast } from "sonner";

type Props = {
  episode: Episode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: () => void;
};

export function CloseEpisodeDialog({ episode, open, onOpenChange, onClosed }: Props) {
  const [endDate, setEndDate] = useState(() => formatCloseDateInput());
  const [endTime, setEndTime] = useState(() => formatCloseTimeInput());

  useEffect(() => {
    if (!open || !episode) return;
    // Default to the most recent log (medicine/temperature) time; fall back to now.
    const lastLog = sortLogsDesc(getLogsForEpisode(episode.id))[0];
    const lastTs = lastLog
      ? new Date(`${lastLog.date}T${lastLog.time}`).getTime()
      : NaN;
    if (lastLog && !Number.isNaN(lastTs) && lastTs >= episode.openedAt) {
      setEndDate(lastLog.date);
      setEndTime(lastLog.time);
    } else {
      const now = new Date();
      setEndDate(formatCloseDateInput(now));
      setEndTime(formatCloseTimeInput(now));
    }
  }, [open, episode?.id]);

  const previewCloseAt = useMemo(
    () => parseCloseTimestamp(endDate, endTime),
    [endDate, endTime],
  );

  const handleConfirm = () => {
    if (!episode) return;

    if (Number.isNaN(previewCloseAt)) {
      toast.error("Invalid date or time");
      return;
    }
    if (previewCloseAt < episode.openedAt) {
      toast.error("Close time cannot be before episode start");
      return;
    }

    closeEpisode(episode.id, previewCloseAt);
    toast.success("Episode closed", {
      description: `${formatEpisodeTitle(episode)} for ${episode.child} is now closed.`,
    });
    onOpenChange(false);
    onClosed?.();
  };

  if (!episode) return null;

  const title = formatEpisodeTitle(episode);
  const logCount = getLogsForEpisode(episode.id).length;
  const startedLabel = new Date(episode.openedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const sickDays = getSickDays(episode.openedAt, previewCloseAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm overflow-x-hidden"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Close Episode</DialogTitle>
        </DialogHeader>

        <div
          className="rounded-xl border border-border/60 px-3 py-2.5"
          style={{
            borderLeftWidth: 3,
            borderLeftColor: "var(--episode-open)",
            background: "var(--episode-open-muted)",
          }}
        >
          <p className="text-sm font-bold text-foreground leading-tight">{title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <ChildNameBadge name={episode.child} compact />
            <span>· Started {startedLabel}</span>
            <span>
              · {logCount} {logCount === 1 ? "log" : "logs"}
            </span>
            <span>
              · {sickDays} {sickDays === 1 ? "day" : "days"}
            </span>
          </div>
          {episode.notes ? (
            <p className="mt-2 text-xs text-muted-foreground leading-snug border-t border-border/50 pt-2">
              {episode.notes}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              End date
            </label>
            <div className={dialogDateWrapClass}>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={dialogDateFieldClass}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              End time
            </label>
            <div className={dialogDateWrapClass}>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={dialogDateFieldClass}
              />
            </div>
          </div>
        </div>

        <DialogFooter className={dialogFooterClass}>
          <button
            type="button"
            onClick={handleConfirm}
            className={dialogPrimaryButtonClass}
            style={{ background: "var(--primary)" }}
          >
            Close Episode
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={dialogSecondaryButtonClass}
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
