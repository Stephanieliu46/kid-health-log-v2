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
import { getTemperatureUnit } from "@/lib/temperature-unit-store";
import { DOSE_AMOUNTS_ML, DRUG_LABELS, type Drug } from "@/lib/medications";
import {
  guardLogSave,
  openEmergencyPaywall,
  recordEmergencyLogIfNeeded,
  shouldPromptEmergencyLog,
  isEmergencyPassExhausted,
} from "@/lib/entitlements";
import { getEpisode, type Episode } from "@/lib/episode-store";
import { getLastCustomDrugName, setLastCustomDrugName } from "@/lib/last-custom-drug";
import {
  dialogFooterClass,
  dialogPrimaryButtonClass,
  dialogSecondaryButtonClass,
} from "@/lib/dialog-ui";
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
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [name, setName] = useState("");
  const [presetMl, setPresetMl] = useState<number | null>(null);
  const [customMl, setCustomMl] = useState("");
  const [date, setDate] = useState(() => formatDateInput(new Date()));
  const [time, setTime] = useState(() => formatTimeInput(new Date()));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !episode) return;
    const now = new Date();
    setSelectedDrug(null);
    setName(getLastCustomDrugName(episode.child));
    setPresetMl(null);
    setCustomMl("");
    setDate(formatDateInput(now));
    setTime(formatTimeInput(now));
    setNotes("");
  }, [open, episode]);

  const resolvedMl = customMl.trim()
    ? Number.parseFloat(customMl)
    : presetMl;

  const medicineLabel = selectedDrug ? DRUG_LABELS[selectedDrug] : name.trim();

  const canSave =
    (selectedDrug !== null || name.trim().length > 0) &&
    resolvedMl !== null &&
    !Number.isNaN(resolvedMl) &&
    resolvedMl > 0;

  const handleSave = (options?: { forceEmergencyPass?: boolean }) => {
    if (!episode || !canSave) return;

    const current = getEpisode(episode.id) ?? episode;

    if (!options?.forceEmergencyPass) {
      if (current.isEmergencyPass && isEmergencyPassExhausted(current)) {
        openEmergencyPaywall(current);
        return;
      }
      if (shouldPromptEmergencyLog(current)) {
        openEmergencyPaywall(current, {
          onEmergencyLog: () => handleSave({ forceEmergencyPass: true }),
        });
        return;
      }
    }

    if (!guardLogSave(current)) return;

    if (!selectedDrug) {
      setLastCustomDrugName(episode.child, name.trim());
    }

    addLog({
      child: episode.child,
      episodeId: episode.id,
      date,
      time,
      temp: null,
      tempUnit: getTemperatureUnit(),
      drug: selectedDrug,
      customDrug: selectedDrug ? null : name.trim(),
      amount: resolvedMl,
      notes: notes.trim() || null,
    });

    recordEmergencyLogIfNeeded(episode.id, null, selectedDrug, selectedDrug ? null : name.trim());

    toast.success("Medicine logged", {
      description: `${medicineLabel} · ${resolvedMl}ml`,
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
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["paracetamol", "ibuprofen"] as const).map((drug) => {
                const active = selectedDrug === drug;
                const isPara = drug === "paracetamol";
                return (
                  <button
                    key={drug}
                    type="button"
                    onClick={() => {
                      setSelectedDrug(active ? null : drug);
                      if (!active) setName("");
                    }}
                    className={`rounded-xl py-2.5 text-sm font-bold transition border ${
                      active
                        ? "border-transparent shadow-sm"
                        : "bg-card text-foreground border-border hover:bg-muted"
                    }`}
                    style={
                      active
                        ? isPara
                          ? {
                              background: "var(--child-accent)",
                              color: "var(--child-accent-foreground)",
                            }
                          : {
                              background: "var(--peach)",
                              color: "var(--charcoal)",
                            }
                        : undefined
                    }
                  >
                    {DRUG_LABELS[drug]}
                  </button>
                );
              })}
            </div>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) setSelectedDrug(null);
              }}
              placeholder="e.g. Amoxicillin, Antibiotic syrup"
              className="mt-2 rounded-xl text-base"
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
                      ? "border-transparent text-[var(--segment-active-fg)]"
                      : "bg-[var(--warm-gray)] text-foreground border-border hover:bg-accent"
                  }`}
                  style={
                    presetMl === ml && !customMl.trim()
                      ? { background: "var(--segment-active)" }
                      : undefined
                  }
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

        <DialogFooter className={dialogFooterClass}>
          <button
            onClick={() => handleSave()}
            disabled={!canSave}
            className={`${dialogPrimaryButtonClass} btn-navy`}
          >
            Save
          </button>
          <button
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
