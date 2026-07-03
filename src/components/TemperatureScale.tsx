import type { TemperatureUnit } from "@/lib/temperature-unit-store";
import { getTemperatureScaleTicks } from "@/lib/temperature";

export function TemperatureScale({
  compact = false,
  unit = "celsius",
}: {
  compact?: boolean;
  unit?: TemperatureUnit;
}) {
  const ticks = getTemperatureScaleTicks(unit);

  return (
    <div className={`relative ${compact ? "mt-0.5 h-3" : "mt-2 h-5"}`}>
      {ticks.map((tick) => (
        <div
          key={tick.value}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: `${tick.position}%`, transform: "translateX(-50%)" }}
        >
          <div className={`w-px bg-border ${compact ? "h-1" : "h-2"}`} />
          <span
            className={`tabular-nums font-semibold text-muted-foreground ${
              compact ? "mt-0 text-[10px]" : "mt-0.5 text-xs"
            }`}
          >
            {unit === "fahrenheit" ? tick.value.toFixed(1) : String(Math.round(tick.value))}
          </span>
        </div>
      ))}
    </div>
  );
}
