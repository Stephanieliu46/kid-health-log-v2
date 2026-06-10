import { useEffect, useState } from "react";
import { Calendar, Droplet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addLog } from "@/lib/log-store";
import { DOSE_AMOUNTS_ML } from "@/lib/medications";
import { guardLogSave } from "@/lib/entitlements";
import type { Episode } from "@/lib/episode-store";
import { toast } from "sonner";

type Props = {
  episode: Episode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
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

export function LogMedicineDialog({ episode, open, onOpenChange, onSaved }: Props) {
  const [name, setName] = useState("");
  const [presetMl, setPresetMl] = useState<number | null>(null);
  const [customMl, setCustomMl] = useState("");
  const [date, setDate] = useState(() => formatDateInput(new Date()));
  const [time, setTime] = useState(() => formatTimeInput(new Date()));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setName("");
    setPresetMl(null);
    setCustomMl("");
    setDate(formatDateInput(now));
    setTime(formatTimeInput(now));
    setNotes("");
  }, [open]);

  const resolvedMl = customMl.trim()
    ? Number.parseFloat(customMl)
    : presetMl;

  const canSave =
    name.trim().length > 0 &&
    resolvedMl !== null &&
    !Number.isNaN(resolvedMl) &&
    resolvedMl > 0;

  const handleSave = () => {
    if (!episode || !canSave) return;
    if (!guardLogSave(episode)) return;

    addLog({
      child: episode.child,
      episodeId: episode.id,
      date,
      time,
      temp: null,
      drug: null,
      customDrug: name.trim(),
      amount: resolvedMl,
      notes: notes.trim() || null,
    });

    toast.success("Medicine logged", {
      description: `${name.trim()} · ${resolvedMl}ml`,
    });
    onOpenChange(false);
    onSaved?.();
  };

  if (!episode) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Log Medicine</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-muted-foreground">Medicine name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amoxicillin, Antibiotic syrup"
              className="mt-1.5 rounded-xl text-base"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <Droplet className="h-4 w-4" />
              Amount (ml)
            </label>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {DOSE_AMOUNTS_ML.map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => {
                    setPresetMl(ml);
                    setCustomMl("");
                  }}
                  className={`rounded-xl py-2.5 text-sm font-bold transition border ${
                    presetMl === ml && !customMl.trim()
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "bg-muted text-foreground border-border hover:bg-accent"
                  }`}
                >
                  {ml}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground shrink-0">Custom</span>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={customMl}
                onChange={(e) => {
                  setCustomMl(e.target.value);
                  setPresetMl(null);
                }}
                placeholder="e.g. 3.5"
                className="rounded-xl text-base flex-1"
              />
              <span className="text-sm font-semibold text-muted-foreground">ml</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
            <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-base font-bold text-foreground outline-none"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-transparent text-base font-bold text-foreground outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Prescription details, frequency…"
              className="mt-1.5 w-full resize-none rounded-xl border border-border bg-muted/50 px-3 py-2 text-base outline-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border px-4 py-2.5 text-base font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl px-4 py-2.5 text-base font-bold text-primary-foreground disabled:opacity-50"
            style={{ background: "var(--gradient-primary)" }}
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
