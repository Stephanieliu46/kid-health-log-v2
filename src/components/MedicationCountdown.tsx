import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { getLastDrugDoseTimestamp, useLogs } from "@/lib/log-store";
import {
  checkDailyMaxDose,
  countDrugDosesInRollingWindow,
  MAX_DOSES_IN_24H,
} from "@/lib/medication-safety";
import { type Drug } from "@/lib/medications";

const INTERVAL_MS: Record<Drug, number> = {
  paracetamol: 4 * 60 * 60 * 1000,
  ibuprofen: 6 * 60 * 60 * 1000,
};

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** e.g. "Yesterday 11:30 PM" or "Today 3:45 PM" */
export function formatLastDoseLabel(timestamp: number, now: number = Date.now()): string {
  const doseDate = new Date(timestamp);
  const nowDate = new Date(now);
  const timeLabel = doseDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isSameCalendarDay(doseDate, nowDate)) {
    return `Today ${timeLabel}`;
  }

  const yesterday = new Date(nowDate);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(doseDate, yesterday)) {
    return `Yesterday ${timeLabel}`;
  }

  const dateLabel = doseDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${dateLabel} ${timeLabel}`;
}

/** e.g. "8h 45m ago" or "5h 0m ago" */
export function formatElapsedAgo(elapsedMs: number): string {
  const totalMinutes = Math.floor(Math.max(0, elapsedMs) / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m ago`;
}

/** Inline countdown shown below dose buttons on each drug card. */
export function DoseCountdown({
  child,
  drug,
  compact = false,
}: {
  child: string;
  drug: Drug;
  compact?: boolean;
}) {
  useLogs();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const lastDose = getLastDrugDoseTimestamp(child, drug);
  const dailyMax = checkDailyMaxDose(child, drug, now);
  const doseCount24h = countDrugDosesInRollingWindow(child, drug, now);
  const maxDoses24h = MAX_DOSES_IN_24H[drug];

  if (dailyMax) {
    return (
      <div
        className={`rounded-md text-center leading-snug font-semibold border ${
          compact ? "mt-1 px-1.5 py-1 text-[10px]" : "mt-2 px-2 py-1.5 text-xs"
        } bg-[var(--muted)] text-destructive border-[var(--border)]`}
      >
        <div>
          {doseCount24h}/{maxDoses24h} doses in 24h — limit reached
        </div>
        {lastDose !== null && (
          <div className="mt-0.5 tabular-nums font-medium text-muted-foreground">
            Last Dose: {formatLastDoseLabel(lastDose, now)} ({formatElapsedAgo(now - lastDose)})
          </div>
        )}
      </div>
    );
  }

  if (lastDose === null) return null;

  const elapsed = now - lastDose;
  const remaining = INTERVAL_MS[drug] - elapsed;

  if (remaining > 0) {
    return (
      <div
        className={`flex items-center justify-center gap-1 rounded-md font-semibold tabular-nums border ${
          compact ? "mt-1 px-1.5 py-0.5 text-[10px]" : "mt-2 gap-1.5 rounded-lg px-2 py-1.5 text-xs"
        } bg-[var(--muted)] text-muted-foreground border-[var(--border)]`}
      >
        <Clock className={`shrink-0 ${compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"}`} />
        <span>{formatCountdown(remaining)}</span>
      </div>
    );
  }

  const lastDoseLabel = formatLastDoseLabel(lastDose, now);
  const elapsedAgo = formatElapsedAgo(elapsed);

  return (
    <div
      className={`rounded-md text-center leading-snug badge-success ${
        compact ? "mt-1 px-1.5 py-1 text-[10px]" : "mt-2 px-2 py-1.5 text-xs"
      }`}
    >
      <div className="font-semibold">Ready for Next Dose</div>
      <div className="mt-0.5 tabular-nums opacity-80">
        Last Dose: {lastDoseLabel} ({elapsedAgo})
      </div>
    </div>
  );
}
