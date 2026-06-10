import { Droplet } from "lucide-react";
import { DoseCountdown } from "@/components/MedicationCountdown";
import { DOSE_AMOUNTS_ML, DRUG_LABELS, type Drug } from "@/lib/medications";

const PARA_BG = "oklch(0.92 0.04 200)";
const PARA_BG_ACTIVE = "linear-gradient(135deg, oklch(0.72 0.07 200), oklch(0.66 0.08 205))";
const PARA_ACCENT = "oklch(0.55 0.10 210)";
const IBU_BG = "oklch(0.92 0.05 45)";
const IBU_BG_ACTIVE = "linear-gradient(135deg, oklch(0.74 0.10 40), oklch(0.66 0.12 35))";
const IBU_ACCENT = "oklch(0.60 0.14 38)";

export function DoseCard({
  drug,
  child,
  selectedAmount,
  onSelect,
  compact = false,
}: {
  drug: Drug;
  child?: string;
  selectedAmount: number | null;
  onSelect: (amount: number | null) => void;
  compact?: boolean;
}) {
  const isPara = drug === "paracetamol";
  const bg = isPara ? PARA_BG : IBU_BG;
  const bgActive = isPara ? PARA_BG_ACTIVE : IBU_BG_ACTIVE;
  const accent = isPara ? PARA_ACCENT : IBU_ACCENT;
  const label = DRUG_LABELS[drug];
  const active = selectedAmount !== null;

  return (
    <div
      className={`relative transition active:scale-[0.97] overflow-hidden ${
        compact ? "rounded-2xl" : "rounded-3xl"
      } ${active ? "text-white shadow-[var(--shadow-soft)]" : "text-foreground"}`}
      style={{ background: active ? bgActive : bg }}
    >
      <div className={compact ? "px-2.5 py-2.5" : "px-3 py-3"}>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-6 rounded-full" style={{ background: accent }} />
          <Droplet
            className={`${compact ? "h-4 w-4" : "h-5 w-5"} ${active ? "opacity-90" : ""}`}
            style={active ? undefined : { color: accent }}
            fill={active ? "currentColor" : accent}
            fillOpacity={active ? 0.25 : 0.2}
          />
          <span className={`font-bold ${compact ? "text-[15px]" : "text-base"}`}>{label}</span>
        </div>
        <div className={`flex gap-1 ${compact ? "mt-2" : "mt-2"}`}>
          {DOSE_AMOUNTS_ML.map((a) => {
            const isActive = selectedAmount === a;
            return (
              <button
                key={a}
                onClick={() => onSelect(isActive ? null : a)}
                className={`flex-1 rounded-lg font-bold transition ${
                  compact ? "py-2 text-sm" : "py-2 text-sm"
                } ${
                  isActive
                    ? "bg-white/25 text-white ring-1 ring-white/50"
                    : active
                      ? "bg-white/10 text-white/80 hover:bg-white/15"
                      : "bg-white/70 text-foreground hover:bg-white"
                }`}
              >
                {a}
              </button>
            );
          })}
        </div>
        <div
          className={`text-center font-semibold ${
            compact ? "mt-0.5 text-[11px]" : "mt-1 text-xs"
          } ${active ? "text-white/70" : "text-foreground/60"}`}
        >
          ml
        </div>
        {child && (
          <DoseCountdown child={child} drug={drug} inverted={active} compact={compact} />
        )}
      </div>
    </div>
  );
}
