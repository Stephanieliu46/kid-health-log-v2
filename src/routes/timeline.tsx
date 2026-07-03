import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { useLogs, getLogsForEpisode, sortLogsDesc, type LogEntry } from "@/lib/log-store";
import { useEpisodes, getSickDays, formatEpisodeTitle, type Episode } from "@/lib/episode-store";
import { BottomNav } from "@/components/BottomNav";
import { AppShell, TabPage } from "@/components/AppShell";
import { LogEditDialog } from "@/components/LogEditDialog";
import { LogCard } from "@/components/LogCard";
import { NewEpisodeDialog } from "@/components/NewEpisodeDialog";
import { getLastChild, setLastChild } from "@/lib/last-child";
import { ChildTabs } from "@/components/ChildTabs";
import { ChildNameBadge } from "@/components/ChildNameBadge";

const PREVIEW_LOG_LIMIT = 3;

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Episodes — KidHealth Log" },
      { name: "description", content: "Open and closed illness episodes." },
    ],
  }),
  component: EpisodesPage,
});

function EpisodeBlock({
  episode,
  variant,
  onEditLog,
}: {
  episode: Episode;
  variant: "open" | "closed";
  onEditLog: (log: LogEntry) => void;
}) {
  const episodeLogs = sortLogsDesc(getLogsForEpisode(episode.id));
  const previewLogs = episodeLogs.slice(0, PREVIEW_LOG_LIMIT);
  const moreCount = episodeLogs.length - previewLogs.length;
  const sickDays = getSickDays(episode.openedAt, episode.closedAt);
  const startedLabel = new Date(episode.openedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const isOpen = variant === "open";

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden shrink-0 shadow-[var(--shadow-warm)]"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: isOpen ? "var(--episode-open)" : "var(--episode-closed)",
        background: isOpen ? "var(--episode-open-muted)" : "var(--episode-closed-muted)",
      }}
    >
      <Link
        to="/episode/$episodeId"
        params={{ episodeId: episode.id }}
        className="flex items-center justify-between px-2.5 py-2 transition hover:bg-muted/60"
      >
        <div className="min-w-0 text-foreground">
          <div className="flex items-center gap-1 min-w-0">
            <div className="text-sm font-bold truncate leading-tight">{formatEpisodeTitle(episode)}</div>
            {episode.isEmergencyPass && isOpen && (
              <span className="shrink-0 rounded-full bg-card border border-border px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                Emergency
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs font-medium text-muted-foreground truncate leading-tight">
            <ChildNameBadge name={episode.child} compact />
            <span>
              · {episodeLogs.length} {episodeLogs.length === 1 ? "log" : "logs"} · {sickDays}d ·{" "}
              {startedLabel}
              {moreCount > 0 && isOpen ? ` · +${moreCount} more` : ""}
            </span>
          </div>
        </div>
        <ChevronRight className="h-3 w-3 shrink-0 ml-0.5 text-muted-foreground" />
      </Link>

      {isOpen && previewLogs.length > 0 && (
        <div className="px-1.5 pb-1.5 space-y-0.5 border-t border-border bg-card/80">
          {previewLogs.map((log) => (
            <LogCard key={log.id} log={log} onEdit={() => onEditLog(log)} mini />
          ))}
        </div>
      )}
    </div>
  );
}

function EpisodesPage() {
  const logs = useLogs();
  const episodes = useEpisodes();
  const [selectedChild, setSelectedChild] = useState(getLastChild);

  const handleSelectChild = (child: string) => {
    setSelectedChild(child);
    setLastChild(child);
  };

  const childEpisodes = episodes.filter((e) => e.child === selectedChild);
  const childLogs = logs.filter((l) => l.child === selectedChild);
  const openEpisodes = childEpisodes.filter((e) => e.status === "open");
  const closedEpisodes = childEpisodes
    .filter((e) => e.status === "closed")
    .sort((a, b) => (b.closedAt ?? b.openedAt) - (a.closedAt ?? a.openedAt));

  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [newEpisodeOpen, setNewEpisodeOpen] = useState(false);

  const hasContent = logs.length > 0 || episodes.length > 0;

  return (
    <AppShell>
      <TabPage>
        <header className="shrink-0">
          <h1 className="text-xl font-bold tracking-tight">Episodes</h1>
          <p className="text-sm text-muted-foreground font-medium">
            {childLogs.length === 0
              ? `No entries for ${selectedChild}.`
              : `${childLogs.length} ${childLogs.length === 1 ? "entry" : "entries"} for ${selectedChild}`}
          </p>
          <div className="mt-1.5">
            <ChildTabs selected={selectedChild} onSelect={handleSelectChild} />
          </div>
        </header>

        {!hasContent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm text-muted-foreground">
              Save a Quick Log or create an episode.
            </p>
            <Link
              to="/"
              className="mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold btn-navy"
            >
              Go to Quick Log
            </Link>
          </div>
        ) : childEpisodes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 mt-2">
            <p className="text-sm text-muted-foreground">
              No episodes for {selectedChild} yet.
            </p>
            <button
              onClick={() => setNewEpisodeOpen(true)}
              className="mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold btn-navy"
            >
              New Episode
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] mt-1.5 pb-2">
            <section className="flex flex-col gap-1">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                Open Episodes
              </div>
              <div className="flex flex-col gap-1">
                {openEpisodes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open episodes.</p>
                ) : (
                  openEpisodes.map((episode) => (
                    <EpisodeBlock
                      key={episode.id}
                      episode={episode}
                      variant="open"
                      onEditLog={setEditingLog}
                    />
                  ))
                )}
                <button
                  onClick={() => setNewEpisodeOpen(true)}
                  className="shrink-0 w-full rounded-lg border border-dashed border-border py-1.5 text-xs font-semibold text-foreground bg-card transition hover:bg-muted inline-flex items-center justify-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  New Episode
                </button>
              </div>
            </section>

            {closedEpisodes.length > 0 && (
              <section className="flex flex-col gap-1 mt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Closed Episodes
                </div>
                {closedEpisodes.map((episode) => (
                  <EpisodeBlock
                    key={episode.id}
                    episode={episode}
                    variant="closed"
                    onEditLog={setEditingLog}
                  />
                ))}
              </section>
            )}
          </div>
        )}
      </TabPage>

      <LogEditDialog
        log={editingLog}
        open={editingLog !== null}
        onOpenChange={(open) => {
          if (!open) setEditingLog(null);
        }}
      />

      <NewEpisodeDialog
        open={newEpisodeOpen}
        onOpenChange={setNewEpisodeOpen}
        defaultChild={selectedChild}
      />

      <BottomNav />
    </AppShell>
  );
}
