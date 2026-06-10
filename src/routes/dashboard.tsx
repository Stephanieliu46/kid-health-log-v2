import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useEpisodes } from "@/lib/episode-store";
import { useChildren } from "@/lib/children-store";
import {
  PERIOD_OPTIONS,
  getMonthlyStackedChartData,
  hasChartData,
  getActiveChartCategories,
  type PeriodMonths,
} from "@/lib/dashboard-stats";
import { getLastChild, setLastChild } from "@/lib/last-child";
import { BottomNav } from "@/components/BottomNav";
import { AppShell, TabPage } from "@/components/AppShell";
import { ChildTabs } from "@/components/ChildTabs";
import { IllnessHistoryChart } from "@/components/IllnessHistoryChart";
import { DashboardWelcomeCard } from "@/components/DashboardWelcomeCard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — KidHealth Log" },
      { name: "description", content: "Monthly stacked illness history by child." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const episodes = useEpisodes();
  const children = useChildren();
  const [selectedChild, setSelectedChild] = useState(getLastChild);
  const [periodMonths, setPeriodMonths] = useState<PeriodMonths>(6);

  useEffect(() => {
    const names = children.map((c) => c.name);
    if (names.length === 0) return;
    if (!names.includes(selectedChild)) {
      setSelectedChild(getLastChild() || names[0]);
    }
  }, [children, selectedChild]);

  const childEpisodes = episodes.filter((e) => e.child === selectedChild);
  const isEmptyHistory = childEpisodes.length === 0;
  const chartData = getMonthlyStackedChartData(episodes, selectedChild, periodMonths);
  const periodLabel = PERIOD_OPTIONS.find((p) => p.months === periodMonths)?.label ?? "";
  const showChart = hasChartData(chartData);
  const activeCategories = getActiveChartCategories(chartData);

  const handleSelectChild = (child: string) => {
    setSelectedChild(child);
    setLastChild(child);
  };

  return (
    <AppShell>
      <TabPage scrollable className="gap-2 pt-3">
        <header className="shrink-0 space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight leading-tight">Dashboard</h1>
              <p className="text-base font-medium text-muted-foreground leading-snug">
                Stacked sick days
              </p>
            </div>
          </div>

          <ChildTabs selected={selectedChild} onSelect={handleSelectChild} size="large" />
        </header>

        {!isEmptyHistory && (
          <div className="shrink-0">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Time range
            </p>
            <div className="flex gap-1.5">
              {PERIOD_OPTIONS.map(({ label, months }) => (
                <button
                  key={months}
                  onClick={() => setPeriodMonths(months)}
                  className={`flex-1 rounded-xl py-3.5 text-base font-bold transition border ${
                    periodMonths === months
                      ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                      : "bg-muted/60 text-foreground border-border hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="shrink-0 flex flex-col gap-2">
          {isEmptyHistory ? (
            <DashboardWelcomeCard />
          ) : !showChart ? (
            <div className="flex flex-col items-center justify-center text-center px-4 py-8">
              <p className="text-base font-medium text-muted-foreground leading-relaxed">
                No illnesses recorded for <span className="font-bold text-foreground">{selectedChild}</span> in
                the past {periodLabel}.
              </p>
              <Link
                to="/"
                className="mt-4 rounded-xl px-5 py-3 text-base font-bold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                Quick Log
              </Link>
            </div>
          ) : (
            <>
              <p className="shrink-0 text-base font-bold text-foreground">Sick days by month</p>

              <div className="h-[min(300px,38dvh)] min-h-[240px] shrink-0 rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-soft)]">
                <IllnessHistoryChart
                  data={chartData}
                  periodMonths={periodMonths}
                  className="h-full"
                />
              </div>

              {activeCategories.length > 0 && (
                <div className="shrink-0 rounded-2xl bg-muted/40 border border-border/50 px-3 py-2.5">
                  <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 text-center">
                    Illness types
                  </p>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                    {activeCategories.map((cat) => (
                      <span
                        key={cat.key}
                        className="inline-flex items-center gap-2 text-base font-semibold text-foreground"
                      >
                        <span
                          className="h-4 w-4 rounded-sm shrink-0 ring-1 ring-black/10"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="shrink-0 text-center text-sm font-medium text-muted-foreground pb-0.5">
                Tap or hover a bar for the monthly breakdown
              </p>
            </>
          )}
        </div>
      </TabPage>
      <BottomNav />
    </AppShell>
  );
}
