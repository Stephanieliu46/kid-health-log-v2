import { Link, useRouterState } from "@tanstack/react-router";
import { Layers, Plus, LayoutDashboard, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = { to: string; label: string; icon: LucideIcon; center?: boolean };

const ITEMS: Item[] = [
  { to: "/timeline", label: "Episodes", icon: Layers },
  { to: "/", label: "Quick Log", icon: Plus, center: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-[390px] px-2 pb-2 pt-1">
        <div className="flex items-stretch justify-around rounded-2xl border border-border/60 bg-card/95 backdrop-blur shadow-[var(--shadow-soft)] px-1 py-2">
          {ITEMS.map(({ to, label, icon: Icon, center }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-0.5 rounded-xl transition min-w-0 ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`flex items-center justify-center rounded-full transition ${
                    center
                      ? "h-10 w-10 text-primary-foreground shadow-[var(--shadow-soft)]"
                      : "h-6 w-6"
                  }`}
                  style={center ? { background: "var(--gradient-primary)" } : undefined}
                >
                  <Icon className={center ? "h-5 w-5" : "h-5 w-5"} />
                </span>
                <span className="text-xs font-semibold truncate max-w-full px-0.5">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
