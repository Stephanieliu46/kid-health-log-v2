import { Droplet } from "lucide-react";
import { DoseCountdown } from "@/components/MedicationCountdown";
import { DOSE_AMOUNTS_ML, DRUG_LABELS, type Drug } from "@/lib/medications";

const DRUG_STYLES: Record<
  Drug,
  {
    accent: string;
    tint: string;
    tintActive: string;
    buttonActive: string;
    buttonActiveText: string;
  }
> = {
  paracetamol: {
    accent: "var(--child-accent-foreground)",
    tint: "var(--child-accent)",
    tintActive: "color-mix(in srgb, var(--child-accent) 40%, var(--card))",
    buttonActive: "var(--child-accent)",
    buttonActiveText: "var(--child-accent-foreground)",
  },
  ibuprofen: {
    accent: "var(--peach-deep)",
    tint: "var(--episode-open-muted)",
    tintActive: "color-mix(in srgb, var(--peach) 45%, var(--card))",
    buttonActive: "var(--peach)",
    buttonActiveText: "var(--charcoal)",
  },
};

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
  const styles = DRUG_STYLES[drug];
  const label = DRUG_LABELS[drug];
  const active = selectedAmount !== null;

  return (
    <div
      className={`relative transition active:scale-[0.99] overflow-hidden surface-card rounded-2xl`}
      style={{
        background: active ? styles.tintActive : "var(--surface)",
        borderColor: active ? styles.accent : "var(--border)",
        color: "var(--foreground)",
      }}
    >
      <div className={compact ? "px-2.5 py-2" : "p-4"}>
        <div className="flex items-center gap-1">
          <div
            className={`rounded-full ${compact ? "h-1 w-5" : "h-1.5 w-6"}`}
            style={{ background: styles.accent }}
          />
          <Droplet
            className={compact ? "h-3.5 w-3.5" : "h-5 w-5"}
            style={{ color: styles.accent }}
            fill={styles.accent}
            fillOpacity={0.15}
          />
          <span className={`font-bold ${compact ? "text-sm" : "text-base"}`}>{label}</span>
        </div>
        <div className={`flex gap-1 ${compact ? "mt-1.5" : "mt-2"}`}>
          {DOSE_AMOUNTS_ML.map((a) => {
            const isActive = selectedAmount === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => onSelect(isActive ? null : a)}
                className={`flex-1 rounded-lg font-bold transition border ${
                  compact ? "py-1.5 text-xs" : "py-2 text-sm"
                } ${isActive ? "border-transparent" : "hover:bg-muted"}`}
                style={
                  isActive
                    ? {
                        background: styles.buttonActive,
                        color: styles.buttonActiveText,
                      }
                    : {
                        background: "var(--warm-gray)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }
                }
              >
                {a}
              </button>
            );
          })}
        </div>
        <div
          className={`text-center font-semibold text-muted-foreground ${
            compact ? "mt-0 text-[10px]" : "mt-1 text-xs"
          }`}
        >
          ml
        </div>
        {child && <DoseCountdown child={child} drug={drug} compact={compact} />}
      </div>
    </div>
  );
}
