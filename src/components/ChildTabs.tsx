import { useChildren } from "@/lib/children-store";

export function ChildTabs({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (child: string) => void;
}) {
  const children = useChildren();
  if (children.length === 0) return null;

  return (
    <div className="segment-track">
      {children.map(({ name }) => {
        const active = selected === name;
        return (
          <button
            key={name}
            onClick={() => onSelect(name)}
            className={`segment-btn truncate ${active ? "segment-btn-active" : ""}`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
