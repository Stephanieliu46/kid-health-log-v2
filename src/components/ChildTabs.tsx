import { useChildren } from "@/lib/children-store";

export function ChildTabs({
  selected,
  onSelect,
  size = "default",
}: {
  selected: string;
  onSelect: (child: string) => void;
  size?: "default" | "large";
}) {
  const children = useChildren();
  if (children.length === 0) return null;

  const isLarge = size === "large";

  return (
    <div
      className={`flex rounded-2xl bg-muted/70 p-1 ${isLarge ? "shadow-[var(--shadow-soft)]" : ""}`}
    >
      {children.map(({ name }) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className={`flex-1 rounded-xl font-bold transition truncate ${
            isLarge ? "py-3.5 text-base" : "py-2.5 text-sm"
          } ${
            selected === name
              ? "bg-card text-primary shadow-sm ring-1 ring-primary/20"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
