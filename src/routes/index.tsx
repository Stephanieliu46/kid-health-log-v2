import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { ChevronDown, Check, Thermometer, Calendar } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { addLog } from "@/lib/log-store";
import {
  getDefaultEpisodeForChild,
  resolveEpisodeForQuickLog,
  formatEpisodeTitle,
  useEpisodes,
  getEpisode,
} from "@/lib/episode-store";
import { inferLogDiseaseTypes } from "@/lib/disease-types";
import {
  checkPaywallOnAppOpen,
  evaluateCreateEpisode,
  guardLogSave,
  recordEmergencyLogIfNeeded,
} from "@/lib/entitlements";
import { openPaywall } from "@/lib/pro-store";
import { useChildren } from "@/lib/children-store";
import { getLastChild, setLastChild } from "@/lib/last-child";
import {
  checkMedicationSafety,
  formatSafetyMessage,
  type SafetyViolation,
} from "@/lib/medication-safety";
import { DRUG_LABELS, type Drug } from "@/lib/medications";
import { BottomNav } from "@/components/BottomNav";
import { AppShell, TabPage } from "@/components/AppShell";
import { DoseCard } from "@/components/DoseCard";
import { TemperatureScale } from "@/components/TemperatureScale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KidHealth Log — Quick Log" },
      { name: "description", content: "Log meds and temperature for your child in seconds." },
    ],
  }),
  component: QuickLog,
});

function formatDateInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimeInput(d: Date) {
  return d.toTimeString().slice(0, 5);
}

type PendingSave = {
  child: string;
  logDiseaseTypes: string[];
  date: string;
  time: string;
  temp: number | null;
  drug: Drug | null;
  amount: number | null;
  notes: string | null;
};

function QuickLog() {
  const navigate = useNavigate();
  const children = useChildren();
  const episodes = useEpisodes();
  const [child, setChild] = useState<string>(() => getLastChild());
  const [dose, setDose] = useState<{ drug: Drug; amount: number } | null>(null);
  const [temp, setTemp] = useState(37.5);
  const [noTemp, setNoTemp] = useState(false);
  const [date, setDate] = useState(() => formatDateInput(new Date()));
  const [time, setTime] = useState(() => formatTimeInput(new Date()));
  const [notes, setNotes] = useState("");
  const [safetyViolation, setSafetyViolation] = useState<SafetyViolation | null>(null);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);

  useEffect(() => {
    const names = children.map((c) => c.name);
    if (names.length === 0) return;
    if (!names.includes(child)) {
      const last = getLastChild();
      setChild(last || names[0]);
    }
  }, [children, child]);

  useEffect(() => {
    checkPaywallOnAppOpen();
  }, []);

  const openEpisode = useMemo(
    () => episodes.find((e) => e.id === getDefaultEpisodeForChild(child)?.id) ?? getDefaultEpisodeForChild(child),
    [episodes, child],
  );

  const selectChild = (name: string) => {
    setChild(name);
    setLastChild(name);
  };

  const buildPendingSave = (): PendingSave => {
    const logDiseaseTypes = inferLogDiseaseTypes([], noTemp ? null : temp, noTemp);
    return {
      child,
      logDiseaseTypes,
      date,
      time,
      temp: noTemp ? null : temp,
      drug: dose?.drug ?? null,
      amount: dose?.amount ?? null,
      notes: notes.trim() || null,
    };
  };

  const commitSave = (data: PendingSave) => {
    const existingOpen = getDefaultEpisodeForChild(data.child);
    if (existingOpen && !guardLogSave(existingOpen)) return;

    let isEmergencyPass = false;
    if (!existingOpen) {
      const gate = evaluateCreateEpisode();
      if (!gate.allowed) {
        openPaywall();
        return;
      }
      isEmergencyPass = gate.isEmergencyPass;
    }

    const episode = resolveEpisodeForQuickLog(data.child, data.logDiseaseTypes, {
      isEmergencyPass,
    });
    const resolved = getEpisode(episode.id) ?? episode;
    if (!guardLogSave(resolved)) return;

    const dateLabel = new Date(data.date + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    const tempLabel = data.temp === null ? "Not Taken" : `${data.temp.toFixed(1)}°C`;
    const drugLabel = data.drug ? `${DRUG_LABELS[data.drug]} ${data.amount}ml` : null;

    try {
      addLog({
        child: data.child,
        episodeId: episode.id,
        date: data.date,
        time: data.time,
        temp: data.temp,
        drug: data.drug,
        customDrug: null,
        amount: data.amount,
        notes: data.notes,
      });

      recordEmergencyLogIfNeeded(episode.id, data.temp, data.drug);

      setLastChild(data.child);

      toast.success("Entry saved", {
        description: [
          data.child,
          formatEpisodeTitle(episode),
          `${dateLabel} ${data.time}`,
          tempLabel,
          drugLabel,
        ]
          .filter(Boolean)
          .join(" · "),
        duration: 4000,
        action: {
          label: "View Episodes",
          onClick: () => navigate({ to: "/timeline" }),
        },
      });
      setDose(null);
      setNotes("");
    } catch {
      toast.error("Save failed", { description: "Please try again." });
    }
  };

  const handleSave = () => {
    const data = buildPendingSave();

    if (data.drug) {
      const violation = checkMedicationSafety(data.child, data.drug);
      if (violation) {
        setPendingSave(data);
        setSafetyViolation(violation);
        return;
      }
    }

    commitSave(data);
  };

  const handleProceedAnyway = () => {
    if (pendingSave) commitSave(pendingSave);
    setSafetyViolation(null);
    setPendingSave(null);
  };

  const handleCancelSafety = () => {
    setSafetyViolation(null);
    setPendingSave(null);
  };

  const tempColor =
    temp >= 39 ? "text-destructive" : temp >= 38 ? "text-primary" : "text-foreground";

  const bannerTitle = openEpisode
    ? formatEpisodeTitle(openEpisode)
    : "New episode on save";

  return (
    <AppShell>
      <TabPage scrollable className="gap-2 pt-2 pb-[4.25rem]">
        <div className="shrink-0 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Quick Log</h1>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-accent">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--gradient-primary)] text-[10px] font-bold text-primary-foreground">
                {child ? child[0] : "?"}
              </span>
              {child || "Select child"}
              <ChevronDown className="h-4 w-4 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-base">
              {children.map(({ name: c }) => (
                <DropdownMenuItem key={c} onClick={() => selectChild(c)} className="text-base py-2.5">
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="shrink-0 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm leading-snug">
          <span className="font-bold text-primary">{bannerTitle}</span>
          <span className="text-muted-foreground font-medium">
            {" "}
            — edit in Episodes
          </span>
        </div>

        <section className="shrink-0 grid grid-cols-2 gap-2">
          <DoseCard
            drug="paracetamol"
            child={child}
            compact
            selectedAmount={dose?.drug === "paracetamol" ? dose.amount : null}
            onSelect={(amount) => setDose(amount ? { drug: "paracetamol", amount } : null)}
          />
          <DoseCard
            drug="ibuprofen"
            child={child}
            compact
            selectedAmount={dose?.drug === "ibuprofen" ? dose.amount : null}
            onSelect={(amount) => setDose(amount ? { drug: "ibuprofen", amount } : null)}
          />
        </section>

        <section className="shrink-0 flex flex-col rounded-xl bg-card px-3 py-2.5 shadow-[var(--shadow-soft)] border border-border/60">
          <div className="shrink-0 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Thermometer className="h-4 w-4" />
              Temp
            </div>
            <div className="flex items-center gap-2 min-w-0">
              {noTemp ? (
                <button
                  type="button"
                  onClick={() => setNoTemp(false)}
                  className="text-base font-bold text-muted-foreground underline-offset-2 hover:underline"
                >
                  Not Taken
                </button>
              ) : (
                <div className={`text-3xl font-bold tabular-nums leading-none ${tempColor}`}>
                  {temp.toFixed(1)}
                  <span className="text-base font-semibold text-muted-foreground ml-0.5">°C</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setNoTemp((v) => !v)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition border ${
                  noTemp
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-muted text-foreground border-border hover:bg-accent"
                }`}
              >
                {noTemp ? "Undo" : "No Temp"}
              </button>
            </div>
          </div>
          <div className={`shrink-0 ${noTemp ? "opacity-40" : ""}`}>
            <Slider
              value={[temp]}
              min={37}
              max={42}
              step={0.1}
              onValueChange={(v) => {
                setNoTemp(false);
                setTemp(v[0]);
              }}
              disabled={noTemp}
              className="mt-2"
            />
            <TemperatureScale compact />
          </div>

          <div className="shrink-0 mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-base font-semibold text-foreground outline-none"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-transparent text-base font-semibold text-foreground outline-none"
            />
          </div>

          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="shrink-0 mt-2 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-base outline-none"
          />

          <button
            onClick={handleSave}
            className="shrink-0 mt-2 w-full rounded-xl py-3 text-base font-bold text-primary-foreground transition active:scale-[0.98]"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Check className="h-5 w-5" />
              Save
            </span>
          </button>
        </section>
      </TabPage>

      <AlertDialog
        open={safetyViolation !== null}
        onOpenChange={(open) => {
          if (!open) handleCancelSafety();
        }}
      >
        <AlertDialogContent className="border-amber-400/60 bg-amber-50 dark:bg-amber-950/40 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-amber-800 dark:text-amber-200">
              NHS Safety Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-amber-900/80 dark:text-amber-100/80">
              {safetyViolation ? formatSafetyMessage(safetyViolation) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogCancel
              onClick={handleCancelSafety}
              className="w-full border-amber-300/60 text-base py-3"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleProceedAnyway}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white text-base py-3"
            >
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </AppShell>
  );
}
