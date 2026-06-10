import { Checkbox } from "@/components/ui/checkbox";
import {
  DISEASE_TYPES,
  OTHER_DISEASE_PLACEHOLDER,
  type DiseaseType,
} from "@/lib/disease-types";

type Props = {
  selected: DiseaseType[];
  onChange: (next: DiseaseType[]) => void;
  otherDetail: string;
  onOtherDetailChange: (value: string) => void;
  variant?: "checkbox" | "chip";
  compact?: boolean;
};

export function DiseaseTypeMultiSelect({
  selected,
  onChange,
  otherDetail,
  onOtherDetailChange,
  variant = "checkbox",
  compact = false,
}: Props) {
  const toggle = (type: DiseaseType) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  if (variant === "chip") {
    return (
      <div>
        <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
          {DISEASE_TYPES.map((type) => {
            const active = selected.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggle(type)}
                className={`rounded-full font-medium transition ${
                  compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
                } ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-accent"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
        {selected.includes("Other") && (
          <input
            value={otherDetail}
            onChange={(e) => onOtherDetailChange(e.target.value)}
            placeholder={OTHER_DISEASE_PLACEHOLDER}
            className={`mt-1.5 w-full rounded-lg border border-border bg-muted/50 outline-none ${
              compact ? "px-2 py-1 text-[10px]" : "px-3 py-2 text-sm"
            }`}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {DISEASE_TYPES.map((type) => {
        const checked = selected.includes(type);
        return (
          <label
            key={type}
            className="flex items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2 cursor-pointer hover:bg-accent/40"
          >
            <Checkbox checked={checked} onCheckedChange={() => toggle(type)} />
            <span className="text-sm">{type}</span>
          </label>
        );
      })}
      {selected.includes("Other") && (
        <input
          value={otherDetail}
          onChange={(e) => onOtherDetailChange(e.target.value)}
          placeholder={OTHER_DISEASE_PLACEHOLDER}
          className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none"
        />
      )}
    </div>
  );
}
