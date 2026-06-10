const TICKS = [37, 38, 39, 40, 41, 42];

export function TemperatureScale({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative ${compact ? "mt-1 h-3.5" : "mt-2 h-5"}`}>
      {TICKS.map((t) => {
        const left = ((t - 37) / 5) * 100;
        return (
          <div
            key={t}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${left}%`, transform: "translateX(-50%)" }}
          >
            <div className={`w-px bg-border ${compact ? "h-1" : "h-2"}`} />
            <span
              className={`tabular-nums font-semibold text-muted-foreground ${
                compact ? "mt-0 text-[11px]" : "mt-0.5 text-xs"
              }`}
            >
              {t}
            </span>
          </div>
        );
      })}
    </div>
  );
}
