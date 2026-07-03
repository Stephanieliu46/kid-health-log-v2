import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
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
  syncEpisodeOpenedAtFromLogs,
} from "@/lib/episode-store";
import { inferLogDiseaseTypes } from "@/lib/disease-types";
import {
  checkPaywallOnAppOpen,
  evaluateCreateEpisode,
  guardLogSave,
  recordEmergencyLogIfNeeded,
  openEmergencyPaywall,
  getEmergencyLogsRemaining,
  shouldPromptEmergencyLog,
  isEmergencyPassExhausted,
  EMERGENCY_LOG_LIMIT,
} from "@/lib/entitlements";
import { openPaywall } from "@/lib/pro-store";
import { useChildren } from "@/lib/children-store";
import { getLastChild, setLastChild } from "@/lib/last-child";
import {
  checkDailyMaxDose,
  checkMedicationInterval,
  DAILY_MAX_PROCEED_LIABILITY,
  formatDailyMaxMessage,
  formatIntervalSafetyMessage,
  parseLogTimestamp,
  type MedicationSafetyViolation,
} from "@/lib/medication-safety";
import { DRUG_LABELS, type Drug } from "@/lib/medications";
import {
  convertTemp,
  formatLogTemp,
  getSliderConfig,
  getTempColorClass,
  getTempUnitSymbol,
  toCelsius,
} from "@/lib/temperature";
import { getTemperatureUnit, useTemperatureUnit } from "@/lib/temperature-unit-store";
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

type SafetyModalState = {
  violation: MedicationSafetyViolation;
  pendingSave: PendingSave | null;
  pendingDose: { drug: Drug; amount: number } | null;
};

function safetyOverrideKey(child: string, drug: Drug, kind: MedicationSafetyViolation["kind"]) {
  return `${child}:${drug}:${kind}`;
}

function resolveMedicationViolation(
  child: string,
  drug: Drug,
  overrides: Set<string>,
  atTime: number,
): MedicationSafetyViolation | null {
  const daily = checkDailyMaxDose(child, drug, atTime);
  if (daily && !overrides.has(safetyOverrideKey(child, drug, "daily_max"))) {
    return daily;
  }

  const interval = checkMedicationInterval(child, drug, atTime);
  if (interval && !overrides.has(safetyOverrideKey(child, drug, "interval"))) {
    return interval;
  }

  return null;
}

function QuickLog() {
  const navigate = useNavigate();
  const children = useChildren();
  const episodes = useEpisodes();
  const temperatureUnit = useTemperatureUnit();
  const sliderConfig = getSliderConfig(temperatureUnit);
  const prevTempUnit = useRef(temperatureUnit);
  const [child, setChild] = useState<string>(() => getLastChild());
  const [dose, setDose] = useState<{ drug: Drug; amount: number } | null>(null);
  const [temp, setTemp] = useState(() => getSliderConfig(getTemperatureUnit()).default);
  const [noTemp, setNoTemp] = useState(false);
  const [date, setDate] = useState(() => formatDateInput(new Date()));
  const [time, setTime] = useState(() => formatTimeInput(new Date()));
  const [notes, setNotes] = useState("");
  const [safetyModal, setSafetyModal] = useState<SafetyModalState | null>(null);
  const [safetyOverrides, setSafetyOverrides] = useState<Set<string>>(() => new Set());

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

  useEffect(() => {
    if (prevTempUnit.current === temperatureUnit) return;
    setTemp((value) => convertTemp(value, prevTempUnit.current, temperatureUnit));
    prevTempUnit.current = temperatureUnit;
  }, [temperatureUnit]);

  const openEpisode = useMemo(
    () => episodes.find((e) => e.id === getDefaultEpisodeForChild(child)?.id) ?? getDefaultEpisodeForChild(child),
    [episodes, child],
  );

  const selectChild = (name: string) => {
    setChild(name);
    setLastChild(name);
    setSafetyOverrides(new Set());
  };

  const buildPendingSave = (): PendingSave => {
    const logDiseaseTypes = inferLogDiseaseTypes(
      [],
      noTemp ? null : toCelsius(temp, temperatureUnit),
      noTemp,
    );
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

  const commitSave = (data: PendingSave, options?: { forceEmergencyPass?: boolean }) => {
    const existingOpen = getDefaultEpisodeForChild(data.child);

    if (!options?.forceEmergencyPass) {
      if (existingOpen?.isEmergencyPass && isEmergencyPassExhausted(existingOpen)) {
        openEmergencyPaywall(existingOpen);
        return;
      }

      if (
        shouldPromptEmergencyLog(existingOpen, {
          forceConfirmed: options?.forceEmergencyPass,
          startingEmergencyPass: false,
        })
      ) {
        openEmergencyPaywall(existingOpen, {
          onEmergencyLog: () => commitSave(data, { forceEmergencyPass: true }),
        });
        return;
      }
    }

    let isEmergencyPass = false;
    if (!existingOpen) {
      const gate = evaluateCreateEpisode();
      if (!gate.allowed) {
        openPaywall("new_episode");
        return;
      }

      isEmergencyPass = gate.isEmergencyPass;
      if (
        shouldPromptEmergencyLog(null, {
          forceConfirmed: options?.forceEmergencyPass,
          startingEmergencyPass: isEmergencyPass,
        })
      ) {
        openEmergencyPaywall(null, {
          onEmergencyLog: () => commitSave(data, { forceEmergencyPass: true }),
        });
        return;
      }
      if (options?.forceEmergencyPass) {
        isEmergencyPass = true;
      }
    } else if (!existingOpen.isEmergencyPass && !guardLogSave(existingOpen)) {
      return;
    }

    const logTimestamp = parseLogTimestamp(data.date, data.time);

    const episode = resolveEpisodeForQuickLog(data.child, data.logDiseaseTypes, {
      isEmergencyPass,
      logTimestamp,
    });
    const resolved = getEpisode(episode.id) ?? episode;
    if (isEmergencyPassExhausted(resolved)) {
      openEmergencyPaywall(resolved);
      return;
    }

    const dateLabel = new Date(data.date + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    const tempLabel =
      data.temp === null
        ? "Not Taken"
        : formatLogTemp(data.temp, temperatureUnit, temperatureUnit);
    const drugLabel = data.drug ? `${DRUG_LABELS[data.drug]} ${data.amount}ml` : null;

    try {
      addLog({
        child: data.child,
        episodeId: episode.id,
        date: data.date,
        time: data.time,
        temp: data.temp,
        tempUnit: temperatureUnit,
        drug: data.drug,
        customDrug: null,
        amount: data.amount,
        notes: data.notes,
      });

      syncEpisodeOpenedAtFromLogs(episode.id);

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
      setSafetyOverrides(new Set());
    } catch {
      toast.error("Save failed", { description: "Please try again." });
    }
  };

  const handleSave = () => {
    const data = buildPendingSave();
    const logTime = parseLogTimestamp(data.date, data.time);

    if (data.drug) {
      const violation = resolveMedicationViolation(
        data.child,
        data.drug,
        safetyOverrides,
        logTime,
      );
      if (violation) {
        setSafetyModal({
          violation,
          pendingSave: data,
          pendingDose: null,
        });
        return;
      }
    }

    commitSave(data);
  };

  const handleProceedAnyway = () => {
    if (!safetyModal) return;

    setSafetyOverrides((prev) => {
      const next = new Set(prev);
      next.add(
        safetyOverrideKey(
          safetyModal.violation.child,
          safetyModal.violation.drug,
          safetyModal.violation.kind,
        ),
      );
      return next;
    });

    if (safetyModal.pendingSave) {
      commitSave(safetyModal.pendingSave);
    } else if (safetyModal.pendingDose) {
      setDose(safetyModal.pendingDose);
    }
    setSafetyModal(null);
  };

  const handleCancelSafety = () => {
    setSafetyModal(null);
  };

  const handleDoseSelect = (drug: Drug, amount: number | null) => {
    if (!amount) {
      setDose(null);
      return;
    }

    const logTime = parseLogTimestamp(date, time);
    const dailyViolation = checkDailyMaxDose(child, drug, logTime);
    if (
      dailyViolation &&
      !safetyOverrides.has(safetyOverrideKey(child, drug, "daily_max"))
    ) {
      setSafetyModal({
        violation: dailyViolation,
        pendingSave: null,
        pendingDose: { drug, amount },
      });
      return;
    }

    setDose({ drug, amount });
  };

  const tempColor = getTempColorClass(noTemp ? null : temp, temperatureUnit);

  const bannerTitle = openEpisode
    ? formatEpisodeTitle(openEpisode)
    : "New episode on save";
  const emergencyLogsRemaining = openEpisode?.isEmergencyPass
    ? getEmergencyLogsRemaining(openEpisode)
    : null;

  return (
    <AppShell>
      <TabPage scrollable className="gap-2 pt-1">
        <div className="shrink-0 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Quick Log</h1>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition hover:brightness-[0.97]"
              style={{
                background: "var(--child-accent)",
                color: "var(--child-accent-foreground)",
              }}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full btn-navy text-[9px] font-bold">
                {child ? child[0] : "?"}
              </span>
              {child || "Select child"}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
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

        <div
          className="shrink-0 surface-card rounded-xl px-3 py-1.5 text-xs leading-snug"
          style={{
            borderLeftWidth: 3,
            borderLeftColor: "var(--episode-open)",
            background: "var(--episode-open-muted)",
          }}
        >
          <span className="font-bold text-foreground">{bannerTitle}</span>
          {emergencyLogsRemaining !== null ? (
            <span className="font-semibold text-foreground">
              {" "}
              · Emergency · {emergencyLogsRemaining} of {EMERGENCY_LOG_LIMIT} left
            </span>
          ) : null}
          <span className="font-medium text-muted-foreground">
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
            onSelect={(amount) => handleDoseSelect("paracetamol", amount)}
          />
          <DoseCard
            drug="ibuprofen"
            child={child}
            compact
            selectedAmount={dose?.drug === "ibuprofen" ? dose.amount : null}
            onSelect={(amount) => handleDoseSelect("ibuprofen", amount)}
          />
        </section>

        <section className="shrink-0 flex flex-col surface-card rounded-2xl p-3 gap-2">
          <div className="shrink-0 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Thermometer className="h-3.5 w-3.5" />
              Temp
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              {noTemp ? (
                <span className="text-sm font-semibold text-muted-foreground">
                  Not Taken
                </span>
              ) : (
                <div className={`text-2xl font-semibold tabular-nums leading-none ${tempColor}`}>
                  {temp.toFixed(1)}
                  <span className="text-sm font-semibold text-muted-foreground ml-0.5">
                    {getTempUnitSymbol(temperatureUnit)}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setNoTemp((v) => !v)}
                className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold transition border ${
                  noTemp ? "btn-mint" : "btn-mint opacity-80 hover:opacity-100"
                }`}
              >
                No Temp
              </button>
            </div>
          </div>
          <div className="shrink-0">
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
            <TemperatureScale compact unit={temperatureUnit} />
          </div>

          <div className="shrink-0 flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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

          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="shrink-0 w-full rounded-lg border border-border bg-muted px-2.5 py-1.5 text-sm outline-none"
          />

          <button
            onClick={handleSave}
            className="shrink-0 w-full rounded-xl btn-navy py-2.5 text-sm transition active:scale-[0.98] shadow-[var(--shadow-warm)]"
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <Check className="h-4 w-4" />
              Add to Log
            </span>
          </button>
        </section>
      </TabPage>

      <AlertDialog
        open={safetyModal !== null && safetyModal.violation.kind === "interval"}
        onOpenChange={(open) => {
          if (!open) handleCancelSafety();
        }}
      >
        <AlertDialogContent className="border-orange-400 bg-orange-50 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-orange-950">
              NHS Safety Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium text-orange-900 leading-relaxed">
              {safetyModal?.violation.kind === "interval"
                ? formatIntervalSafetyMessage(safetyModal.violation)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogCancel
              onClick={handleCancelSafety}
              className="w-full border-orange-300 bg-white text-orange-950 text-sm py-2.5 font-semibold hover:bg-orange-100"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleProceedAnyway}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm py-2.5 font-semibold"
            >
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={safetyModal !== null && safetyModal.violation.kind === "daily_max"}
        onOpenChange={(open) => {
          if (!open) handleCancelSafety();
        }}
      >
        <AlertDialogContent className="border-destructive/60 bg-destructive/5 max-w-sm max-h-[90dvh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-destructive">
              ⚠️ Maximum Daily Dose Exceeded
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <p className="whitespace-pre-line text-left text-base text-foreground/80">
                {safetyModal?.violation.kind === "daily_max"
                  ? formatDailyMaxMessage(safetyModal.violation)
                  : ""}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogCancel
              onClick={handleCancelSafety}
              className="w-full border-destructive/40 text-base py-3 font-semibold ring-2 ring-destructive/30 bg-background"
            >
              Cancel
            </AlertDialogCancel>
            <p className="text-center text-[11px] leading-snug text-muted-foreground">
              {DAILY_MAX_PROCEED_LIABILITY}
            </p>
            <AlertDialogAction
              onClick={handleProceedAnyway}
              className="w-full bg-destructive/90 hover:bg-destructive text-destructive-foreground text-base py-3"
            >
              Proceed Anyway (Risk Assumed)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </AppShell>
  );
}
