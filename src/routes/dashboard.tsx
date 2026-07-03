import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
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
import { getFeverEpisodesForChild } from "@/lib/fever-trend";
import { getLastChild, setLastChild } from "@/lib/last-child";
import { BottomNav } from "@/components/BottomNav";
import { AppShell, TabPage } from "@/components/AppShell";
import { ChildTabs } from "@/components/ChildTabs";
import { IllnessHistoryChart } from "@/components/IllnessHistoryChart";
import { FeverTrendTracker } from "@/components/FeverTrendTracker";
import { DashboardWelcomeCard } from "@/components/DashboardWelcomeCard";

const SICK_DAYS_CARD_STYLE = {
  borderLeftWidth: 4,
  borderLeftColor: "var(--episode-closed)",
  background: "var(--episode-closed-muted)",
} as const;

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — KidHealth Log" },
      { name: "description", content: "Fever trend and monthly sick-day charts by child." },
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
  const feverEpisodes = useMemo(
    () => getFeverEpisodesForChild(episodes, selectedChild),
    [episodes, selectedChild],
  );

  const sectionTitleClass = "text-sm font-bold text-foreground leading-tight";

  const handleSelectChild = (child: string) => {
    setSelectedChild(child);
    setLastChild(child);
  };

  return (
    <AppShell>
      <TabPage scrollable className="gap-2 pt-3">
        <header className="shrink-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--child-accent-foreground)]"
              style={{ background: "var(--child-accent)" }}
            >
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight leading-tight">Dashboard</h1>
            </div>
          </div>

          <ChildTabs selected={selectedChild} onSelect={handleSelectChild} />
        </header>

        {feverEpisodes.length > 0 && (
          <div className="shrink-0 space-y-1.5">
            <h2 className={sectionTitleClass}>Fever Trend Tracker</h2>
            <FeverTrendTracker child={selectedChild} />
          </div>
        )}

        {isEmptyHistory ? (
          <DashboardWelcomeCard />
        ) : (
          <div className="shrink-0 space-y-1.5">
            <h2 className={sectionTitleClass}>Sick days by month</h2>

            <section className="surface-card rounded-2xl p-4" style={SICK_DAYS_CARD_STYLE}>
              <div className="segment-track">
                {PERIOD_OPTIONS.map(({ label, months }) => (
                  <button
                    key={months}
                    onClick={() => setPeriodMonths(months)}
                    className={`segment-btn ${periodMonths === months ? "segment-btn-active" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {!showChart ? (
                <p className="mt-2 rounded-xl bg-muted/30 px-3 py-5 text-center text-sm text-muted-foreground leading-relaxed">
                  No illnesses recorded for{" "}
                  <span className="font-semibold text-foreground">{selectedChild}</span> in the past{" "}
                  {periodLabel}.
                </p>
              ) : (
                <div className="mt-2 h-[min(280px,36dvh)] min-h-[220px]">
                  <IllnessHistoryChart
                    data={chartData}
                    periodMonths={periodMonths}
                    className="h-full"
                  />
                </div>
              )}
            </section>

            {!showChart ? (
              <Link
                to="/"
                className="inline-flex w-full items-center justify-center rounded-xl btn-navy px-4 py-2 text-sm font-semibold"
              >
                Quick Log
              </Link>
            ) : (
              <>
                {activeCategories.length > 0 && (
                  <div className="shrink-0 rounded-xl bg-muted border border-border px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 text-center">
                      Illness types
                    </p>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                      {activeCategories.map((cat) => (
                        <span
                          key={cat.key}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-sm shrink-0 ring-1 ring-border"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="shrink-0 text-center text-[11px] font-medium text-muted-foreground pb-1">
                  Tap or hover a bar for the monthly breakdown
                </p>
              </>
            )}
          </div>
        )}
      </TabPage>
      <BottomNav />
    </AppShell>
  );
}
