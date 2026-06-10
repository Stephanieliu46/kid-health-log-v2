import { useEffect, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { closeEpisode, formatEpisodeTitle, type Episode } from "@/lib/episode-store";
import { getLastActivityForEpisode } from "@/lib/log-store";
import { toast } from "sonner";

type Props = {
  episode: Episode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: () => void;
};

function formatDateInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimeInput(d: Date) {
  return d.toTimeString().slice(0, 5);
}

function parseCloseTimestamp(date: string, time: string): number {
  return new Date(`${date}T${time}`).getTime();
}

export function CloseEpisodeDialog({ episode, open, onOpenChange, onClosed }: Props) {
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));
  const [endTime, setEndTime] = useState(() => formatTimeInput(new Date()));

  useEffect(() => {
    if (!open || !episode) return;
    const lastActivity = getLastActivityForEpisode(episode.id);
    const defaultTs = lastActivity ?? Date.now();
    const d = new Date(defaultTs);
    setEndDate(formatDateInput(d));
    setEndTime(formatTimeInput(d));
  }, [open, episode]);

  const handleConfirm = () => {
    if (!episode) return;
    const closedAt = parseCloseTimestamp(endDate, endTime);
    if (Number.isNaN(closedAt)) {
      toast.error("Invalid date or time");
      return;
    }
    if (closedAt < episode.openedAt) {
      toast.error("Close time cannot be before episode start");
      return;
    }

    closeEpisode(episode.id, closedAt);
    toast.success("Episode closed", {
      description: `${formatEpisodeTitle(episode)} for ${episode.child} is now closed.`,
    });
    onOpenChange(false);
    onClosed?.();
  };

  if (!episode) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Close Episode</DialogTitle>
          <DialogDescription>
            Confirm when this illness ended. Duration is calculated from start to your chosen
            close time.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm">
          <span className="font-semibold">{formatEpisodeTitle(episode)}</span>
          <span className="text-muted-foreground"> · {episode.child}</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            Close Episode
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
