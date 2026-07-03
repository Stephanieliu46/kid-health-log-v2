import { Thermometer, Droplet, Trash2, Pencil } from "lucide-react";
import { deleteLog, type LogEntry } from "@/lib/log-store";
import { getLogMedicationDisplay } from "@/lib/medications";
import { formatLogTemp, getTempColorClass, toCelsius } from "@/lib/temperature";
import { useTemperatureUnit } from "@/lib/temperature-unit-store";

export function LogCard({
  log,
  onEdit,
  compact = false,
  mini = false,
}: {
  log: LogEntry;
  onEdit: () => void;
  compact?: boolean;
  mini?: boolean;
}) {
  const med = getLogMedicationDisplay(log);
  const temperatureUnit = useTemperatureUnit();
  const tempHigh =
    log.temp !== null && toCelsius(log.temp, log.tempUnit) >= 39;
  const tempMid =
    log.temp !== null &&
    toCelsius(log.temp, log.tempUnit) >= 38 &&
    toCelsius(log.temp, log.tempUnit) < 39;

  if (mini) {
    return (
      <div className="ml-2 flex items-center gap-1 rounded-lg bg-card/90 border border-border/50 px-1.5 py-0.5 shadow-sm">
        <span className="text-xs font-bold tabular-nums text-foreground w-[2.5rem] shrink-0">
          {log.time}
        </span>
        <div className="flex-1 flex items-center gap-0.5 min-w-0 overflow-hidden">
          {med?.amountLabel && (
            <span
              className="shrink-0 rounded px-1.5 py-px text-[10px] font-bold"
              style={{ background: med.color, color: med.textColor }}
            >
              {med.short} {med.amountLabel}
            </span>
          )}
          <span
            className={`shrink-0 rounded px-1.5 py-px text-[10px] font-semibold ${
              log.temp === null
                ? "bg-muted text-muted-foreground"
                : tempHigh
                  ? "bg-[color-mix(in_srgb,var(--fever-high)_16%,var(--card))] text-fever-high"
                  : tempMid
                    ? "bg-[color-mix(in_srgb,var(--fever-mid)_12%,var(--card))] text-fever-mid"
                    : "bg-muted text-foreground"
            }`}
          >
            {log.temp === null ? "—" : formatLogTemp(log.temp, log.tempUnit, temperatureUnit)}
          </span>
        </div>
        <button
          onClick={onEdit}
          className="text-muted-foreground hover:text-primary p-0.5 shrink-0"
          aria-label="Edit entry"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`surface-card rounded-2xl ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={`font-semibold tabular-nums ${compact ? "text-sm" : "text-base"}`}>
            {log.time}
          </div>
          {!compact && <div className="text-xs text-muted-foreground">{log.child}</div>}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onEdit}
            className="text-muted-foreground hover:text-primary transition p-1"
            aria-label="Edit entry"
          >
            <Pencil className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </button>
          <button
            onClick={() => deleteLog(log.id)}
            className="text-muted-foreground hover:text-destructive transition p-1"
            aria-label="Delete entry"
          >
            <Trash2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </button>
        </div>
      </div>
      <div className={`flex flex-wrap gap-1.5 ${compact ? "mt-2" : "mt-3"}`}>
        {med && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: med.color, color: med.textColor }}
          >
            <Droplet className="h-2.5 w-2.5" fill="currentColor" fillOpacity={0.3} />
            {med.label}
            {med.amountLabel ? ` ${med.amountLabel}` : ""}
          </span>
        )}
        {log.temp !== null && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              tempHigh
                ? "bg-[color-mix(in_srgb,var(--fever-high)_16%,var(--card))] text-fever-high"
                : tempMid
                  ? "bg-[color-mix(in_srgb,var(--fever-mid)_12%,var(--card))] text-fever-mid"
                  : "bg-muted text-foreground"
            }`}
          >
            <Thermometer className="h-2.5 w-2.5" />
            {formatLogTemp(log.temp, log.tempUnit, temperatureUnit)}
          </span>
        )}
      </div>
      {log.notes && !compact && (
        <p className="mt-2 text-xs text-muted-foreground">{log.notes}</p>
      )}
    </div>
  );
}
