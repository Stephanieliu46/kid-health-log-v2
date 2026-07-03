/** Light mint pill for child name labels. */
export function ChildNameBadge({
  name,
  className = "",
  compact = false,
}: {
  name: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${
        compact ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-xs"
      } ${className}`}
      style={{
        background: "var(--child-accent)",
        color: "var(--child-accent-foreground)",
      }}
    >
      {name}
    </span>
  );
}
