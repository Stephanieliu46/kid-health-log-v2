import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createEpisode,
  setDefaultEpisodeForChild,
  updateEpisode,
  formatEpisodeTitle,
} from "@/lib/episode-store";
import {
  buildDiseaseTypesFromSelection,
  DEFAULT_DISEASE_TYPE,
  type DiseaseType,
} from "@/lib/disease-types";
import { evaluateCreateEpisode } from "@/lib/entitlements";
import { openPaywall } from "@/lib/pro-store";
import { useChildren } from "@/lib/children-store";
import { DiseaseTypeMultiSelect } from "@/components/DiseaseTypeMultiSelect";
import {
  dialogDateFieldClass,
  dialogDateWrapClass,
  dialogFooterClass,
  dialogPrimaryButtonClass,
  dialogSecondaryButtonClass,
} from "@/lib/dialog-ui";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultChild?: string;
};

function formatDateInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function NewEpisodeDialog({ open, onOpenChange, defaultChild }: Props) {
  const children = useChildren();
  const [child, setChild] = useState(defaultChild ?? children[0]?.name ?? "");
  const [selectedTypes, setSelectedTypes] = useState<DiseaseType[]>([DEFAULT_DISEASE_TYPE]);
  const [otherDetail, setOtherDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState(() => formatDateInput(new Date()));

  useEffect(() => {
    if (open && defaultChild) setChild(defaultChild);
  }, [open, defaultChild]);

  const handleCreate = () => {
    if (!child.trim()) {
      toast.error("Add a child in Settings first");
      return;
    }

    const gate = evaluateCreateEpisode();
    if (!gate.allowed) {
      openPaywall("new_episode");
      return;
    }

    const diseaseTypes = buildDiseaseTypesFromSelection(selectedTypes, otherDetail);
    const types = diseaseTypes.length > 0 ? diseaseTypes : [DEFAULT_DISEASE_TYPE];

    const [y, m, d] = startDate.split("-").map(Number);
    const openedAt = new Date(y, m - 1, d).getTime();

    const episode = createEpisode(child, types, openedAt, {
      isEmergencyPass: gate.isEmergencyPass,
    });
    if (notes.trim()) {
      updateEpisode(episode.id, { notes: notes.trim() });
    }
    setDefaultEpisodeForChild(child, episode.id);
    toast.success("Episode created", {
      description: gate.isEmergencyPass
        ? `Emergency Pass active — ${formatEpisodeTitle(episode)} for ${child}`
        : `${formatEpisodeTitle(episode)} for ${child}`,
    });
    onOpenChange(false);
    setOtherDetail("");
    setNotes("");
    setSelectedTypes([DEFAULT_DISEASE_TYPE]);
    setStartDate(formatDateInput(new Date()));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-center">New Episode</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Child</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {children.map(({ name: c }) => (
                <button
                  key={c}
                  onClick={() => setChild(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    child === c ? "shadow-sm" : "bg-muted hover:bg-accent"
                  }`}
                  style={
                    child === c
                      ? {
                          background: "var(--child-accent)",
                          color: "var(--child-accent-foreground)",
                        }
                      : undefined
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Start Date</label>
            <div className={dialogDateWrapClass}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dialogDateFieldClass}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Illness Types</label>
            <div className="mt-1.5">
              <DiseaseTypeMultiSelect
                selected={selectedTypes}
                onChange={setSelectedTypes}
                otherDetail={otherDetail}
                onOtherDetailChange={setOtherDetail}
                variant="chip"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-none rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <DialogFooter className={dialogFooterClass}>
          <button
            onClick={handleCreate}
            className={dialogPrimaryButtonClass}
            style={{ background: "var(--primary)" }}
          >
            Create Episode
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
