import { Link } from "@tanstack/react-router";
import { Sparkles, Settings } from "lucide-react";

export function DashboardWelcomeCard() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-2">
      <div className="w-full rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-[var(--shadow-soft)] text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground shadow-[var(--shadow-soft)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Welcome to KidHealth Log
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Customize your child&apos;s name in Settings, then log an illness to see the stacked
          monthly chart here.
        </p>
        <Link
          to="/settings"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-bold text-primary-foreground transition active:scale-[0.98]"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <Settings className="h-5 w-5" />
          Go to Settings
        </Link>
      </div>
    </div>
  );
}
