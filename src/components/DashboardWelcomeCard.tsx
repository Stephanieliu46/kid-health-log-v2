import { Link } from "@tanstack/react-router";
import { Sparkles, Settings, LineChart, BarChart3, Plus } from "lucide-react";

const CHART_PREVIEWS = [
  {
    icon: LineChart,
    title: "Fever Trend Tracker",
    description: "Temperature readings across each fever episode",
    style: {
      borderLeftWidth: 3,
      borderLeftColor: "var(--episode-open)",
      background: "var(--episode-open-muted)",
    },
  },
  {
    icon: BarChart3,
    title: "Sick days by month",
    description: "Monthly illness breakdown by type",
    style: {
      borderLeftWidth: 3,
      borderLeftColor: "var(--episode-closed)",
      background: "var(--episode-closed-muted)",
    },
  },
] as const;

export function DashboardWelcomeCard() {
  return (
    <div className="shrink-0">
      <section
        className="surface-card rounded-2xl p-4 text-center"
        style={{ background: "var(--episode-open-muted)" }}
      >
        <div
          className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-[var(--child-accent-foreground)]"
          style={{ background: "var(--child-accent)" }}
        >
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-base font-bold tracking-tight text-foreground">
          Your trend charts live here
        </h2>
        <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
          Log illnesses and temperatures to unlock dashboard charts for each child.
        </p>

        <div className="mt-3 space-y-1.5 text-left">
          {CHART_PREVIEWS.map(({ icon: Icon, title, description, style }) => (
            <div
              key={title}
              className="rounded-xl border border-border/60 px-2.5 py-2"
              style={style}
            >
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/80" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground leading-tight">{title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                    {description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <Link
            to="/"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl btn-navy px-4 py-2 text-sm font-semibold transition active:scale-[0.98] shadow-[var(--shadow-warm)]"
          >
            <Plus className="h-4 w-4" />
            Quick Log
          </Link>
          <Link
            to="/settings"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted active:scale-[0.98]"
          >
            <Settings className="h-3.5 w-3.5" />
            Set up child in Settings
          </Link>
        </div>
      </section>
    </div>
  );
}
