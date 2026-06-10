import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { useLogs, getLogsForEpisode, type LogEntry } from "@/lib/log-store";
import { useEpisodes, getSickDays, formatEpisodeTitle, type Episode } from "@/lib/episode-store";
import { BottomNav } from "@/components/BottomNav";
import { AppShell, TabPage } from "@/components/AppShell";
import { LogEditDialog } from "@/components/LogEditDialog";
import { LogCard } from "@/components/LogCard";
import { NewEpisodeDialog } from "@/components/NewEpisodeDialog";
import { getLastChild, setLastChild } from "@/lib/last-child";
import { ChildTabs } from "@/components/ChildTabs";

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

function sortLogsDesc(logs: LogEntry[]) {
  return [...logs].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.time < b.time ? 1 : -1;
  });
}

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
      className={`rounded-xl border overflow-hidden shrink-0 ${
        isOpen ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card"
      }`}
    >
      <Link
        to="/episode/$episodeId"
        params={{ episodeId: episode.id }}
        className="flex items-center justify-between px-3 py-2 transition hover:bg-primary/5"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`text-base font-bold truncate ${isOpen ? "text-primary" : "text-foreground"}`}
            >
              {formatEpisodeTitle(episode)}
            </div>
            {episode.isEmergencyPass && isOpen && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                Emergency
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-muted-foreground truncate">
            {episode.child} · {episodeLogs.length} {episodeLogs.length === 1 ? "log" : "logs"} ·{" "}
            {sickDays}d · {startedLabel}
            {moreCount > 0 && isOpen ? ` · +${moreCount} more inside` : ""}
          </div>
        </div>
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 ml-1 ${isOpen ? "text-primary" : "text-muted-foreground"}`}
        />
      </Link>

      {isOpen && previewLogs.length > 0 && (
        <div className="px-2 pb-2 space-y-1 border-t border-primary/10">
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
          <h1 className="text-2xl font-bold tracking-tight">Episodes</h1>
          <p className="text-base text-muted-foreground font-medium">
            {childLogs.length === 0
              ? `No entries for ${selectedChild}.`
              : `${childLogs.length} ${childLogs.length === 1 ? "entry" : "entries"} for ${selectedChild}`}
          </p>
          <div className="mt-2">
            <ChildTabs selected={selectedChild} onSelect={handleSelectChild} size="large" />
          </div>
        </header>

        {!hasContent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm text-muted-foreground">
              Save a Quick Log or create an episode.
            </p>
            <Link
              to="/"
              className="mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
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
              className="mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              New Episode
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 gap-3 mt-2 overflow-hidden">
            <section className="flex flex-col min-h-0 gap-1.5 overflow-hidden">
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                Open Episodes
              </div>
              <div className="flex flex-col gap-1.5 min-h-0 overflow-hidden">
                {openEpisodes.length === 0 ? (
                  <p className="text-base text-muted-foreground">No open episodes.</p>
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
                  className="shrink-0 w-full rounded-xl border border-dashed border-primary/40 py-3 text-base font-bold text-primary transition hover:bg-primary/5 inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Episode
                </button>
              </div>
            </section>

            {closedEpisodes.length > 0 && (
              <section className="flex flex-col gap-1.5 shrink-0">
                <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
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
