import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useLogs } from "@/lib/log-store";
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

function getDrugCountdownRemaining(
  logs: ReturnType<typeof useLogs>,
  child: string,
  drug: Drug,
  now: number,
): number | null {
  let latest: number | null = null;
  for (const log of logs) {
    if (log.child !== child || log.drug !== drug) continue;
    const ts = new Date(`${log.date}T${log.time}`).getTime();
    if (Number.isNaN(ts)) continue;
    if (latest === null || ts > latest) latest = ts;
  }
  if (latest === null) return null;
  const remaining = INTERVAL_MS[drug] - (now - latest);
  return remaining > 0 ? remaining : null;
}

/** Inline countdown shown below dose buttons on each drug card. */
export function DoseCountdown({
  child,
  drug,
  inverted = false,
  compact = false,
}: {
  child: string;
  drug: Drug;
  /** White text when dose card is selected. */
  inverted?: boolean;
  compact?: boolean;
}) {
  const logs = useLogs();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = getDrugCountdownRemaining(logs, child, drug, now);
  if (remaining === null) return null;

  return (
    <div
      className={`flex items-center justify-center gap-1 rounded-md font-semibold tabular-nums ${
        compact ? "mt-1.5 px-2 py-1 text-xs" : "mt-2 gap-1.5 rounded-lg px-2 py-1.5 text-xs"
      } ${inverted ? "bg-white/15 text-white/90" : "bg-primary/10 text-primary"}`}
    >
      <Clock className={`shrink-0 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
      <span>{formatCountdown(remaining)}</span>
    </div>
  );
}
