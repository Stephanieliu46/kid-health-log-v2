import { useState, useEffect } from "react";
import { Thermometer, Calendar } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateLog, type LogEntry } from "@/lib/log-store";
import { useEpisodes, formatEpisodeTitle } from "@/lib/episode-store";
import { DoseCard } from "@/components/DoseCard";
import { DOSE_AMOUNTS_ML, type Drug } from "@/lib/medications";
import { Input } from "@/components/ui/input";
import {
  dialogFooterClass,
  dialogPrimaryButtonClass,
  dialogSecondaryButtonClass,
} from "@/lib/dialog-ui";
import { TemperatureScale } from "@/components/TemperatureScale";
import {
  convertTemp,
  getSliderConfig,
  getTempColorClass,
  getTempUnitSymbol,
} from "@/lib/temperature";
import { useTemperatureUnit } from "@/lib/temperature-unit-store";

type Props = {
  log: LogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function LogEditDialog({ log, open, onOpenChange, onSaved }: Props) {
  const episodes = useEpisodes();
  const temperatureUnit = useTemperatureUnit();
  const sliderConfig = getSliderConfig(temperatureUnit);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [temp, setTemp] = useState(37.5);
  const [noTemp, setNoTemp] = useState(false);
  const [dose, setDose] = useState<{ drug: Drug; amount: number } | null>(null);
  const [customDrug, setCustomDrug] = useState("");
  const [customMl, setCustomMl] = useState<number | null>(null);
  const [customMlInput, setCustomMlInput] = useState("");
  const [notes, setNotes] = useState("");
  const [episodeId, setEpisodeId] = useState<string | null>(null);

  const isCustomMed = Boolean(log?.customDrug?.trim());

  useEffect(() => {
    if (!log) return;
    setDate(log.date);
    setTime(log.time);
    setTemp(
      log.temp === null
        ? sliderConfig.default
        : convertTemp(log.temp, log.tempUnit, temperatureUnit),
    );
    setNoTemp(log.temp === null);
    setDose(
      log.drug && log.amount
        ? { drug: log.drug, amount: log.amount }
        : null,
    );
    setCustomDrug(log.customDrug ?? "");
    setCustomMl(log.customDrug ? log.amount : null);
    setCustomMlInput(
      log.customDrug && log.amount !== null && !DOSE_AMOUNTS_ML.includes(log.amount as (typeof DOSE_AMOUNTS_ML)[number])
        ? String(log.amount)
        : "",
    );
    setNotes(log.notes ?? "");
    setEpisodeId(log.episodeId);
  }, [log, temperatureUnit, sliderConfig.default]);

  const childEpisodes = log
    ? episodes.filter((e) => e.child === log.child)
    : [];

  const handleSave = () => {
    if (!log) return;
    const customAmount = customMlInput.trim()
      ? Number.parseFloat(customMlInput)
      : customMl;

    updateLog(log.id, {
      date,
      time,
      temp: noTemp ? null : temp,
      tempUnit: temperatureUnit,
      drug: isCustomMed ? null : dose?.drug ?? null,
      customDrug: isCustomMed ? customDrug.trim() || null : null,
      amount: isCustomMed
        ? customAmount !== null && !Number.isNaN(customAmount)
          ? customAmount
          : null
        : dose?.amount ?? null,
      notes: notes.trim() || null,
      episodeId,
    });
    onOpenChange(false);
    onSaved?.();
  };

  const tempColor = getTempColorClass(noTemp ? null : temp, temperatureUnit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[92vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle>Edit Log</DialogTitle>
        </DialogHeader>

        {childEpisodes.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Episode</label>
            <select
              value={episodeId ?? ""}
              onChange={(e) => setEpisodeId(e.target.value || null)}
              className="mt-1 w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none"
            >
              <option value="">No episode</option>
              {childEpisodes.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {formatEpisodeTitle(ep)} ({ep.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {isCustomMed ? (
          <div className="space-y-3 surface-card rounded-2xl p-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Medicine name</label>
              <Input
                value={customDrug}
                onChange={(e) => setCustomDrug(e.target.value)}
                className="mt-1 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount (ml)</label>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {DOSE_AMOUNTS_ML.map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => {
                      setCustomMl(ml);
                      setCustomMlInput("");
                    }}
                    className={`rounded-xl py-2 text-xs font-bold transition border ${
                      customMl === ml && !customMlInput.trim()
                        ? "border-transparent text-[var(--segment-active-fg)]"
                        : "bg-[var(--warm-gray)] text-foreground border-border hover:bg-accent"
                    }`}
                    style={
                      customMl === ml && !customMlInput.trim()
                        ? { background: "var(--segment-active)" }
                        : undefined
                    }
                  >
                    {ml}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0">Custom</span>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={customMlInput}
                  onChange={(e) => {
                    setCustomMlInput(e.target.value);
                    setCustomMl(null);
                  }}
                  className="rounded-xl text-sm flex-1"
                />
                <span className="text-xs font-semibold text-muted-foreground">ml</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <DoseCard
              drug="paracetamol"
              child={log?.child}
              selectedAmount={dose?.drug === "paracetamol" ? dose.amount : null}
              onSelect={(amount) => setDose(amount ? { drug: "paracetamol", amount } : null)}
            />
            <DoseCard
              drug="ibuprofen"
              child={log?.child}
              selectedAmount={dose?.drug === "ibuprofen" ? dose.amount : null}
              onSelect={(amount) => setDose(amount ? { drug: "ibuprofen", amount } : null)}
            />
          </div>
        )}

        <div className="surface-card-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Thermometer className="h-3.5 w-3.5" />
              Temperature
            </div>
            {noTemp ? (
              <span className="text-lg font-semibold text-muted-foreground">
                Not Taken
              </span>
            ) : (
              <div className={`text-2xl font-semibold tabular-nums leading-none ${tempColor}`}>
                {temp.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground ml-0.5">
                  {getTempUnitSymbol(temperatureUnit)}
                </span>
              </div>
            )}
          </div>
          <div>
            <Slider
              variant="temperature"
              value={[temp]}
              min={sliderConfig.min}
              max={sliderConfig.max}
              step={sliderConfig.step}
              onValueChange={(v) => {
                setNoTemp(false);
                setTemp(v[0]);
              }}
            />
            <TemperatureScale unit={temperatureUnit} />
          </div>
          <button
            type="button"
            onClick={() => setNoTemp((v) => !v)}
            className={`w-full rounded-xl py-2 text-xs font-semibold transition border ${
              noTemp ? "btn-mint" : "btn-mint opacity-80 hover:opacity-100"
            }`}
          >
            No Temp
          </button>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Symptoms, sleep, appetite…"
              className="mt-1.5 w-full resize-none rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2.5">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-foreground outline-none"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-transparent text-sm font-semibold text-foreground outline-none"
            />
          </div>
        </div>

        <DialogFooter className={dialogFooterClass}>
          <button
            onClick={handleSave}
            className={`${dialogPrimaryButtonClass} btn-navy`}
          >
            Save Changes
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
