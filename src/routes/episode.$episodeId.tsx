import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Thermometer,
  Droplet,
  Lock,
  Trash2,
  ArrowLeft,
  Pencil,
  ChevronDown,
  Pill,
  RotateCcw,
} from "lucide-react";
import {
  useEpisodes,
  deleteEpisode,
  getEpisode,
  updateEpisode,
  getSickDays,
  formatEpisodeTitle,
  reopenEpisode,
} from "@/lib/episode-store";
import {
  useLogs,
  deleteLog,
  deleteLogsForEpisode,
  updateLogsChildForEpisode,
  sortLogsDesc,
  type LogEntry,
} from "@/lib/log-store";
import { useChildren } from "@/lib/children-store";
import { BottomNav } from "@/components/BottomNav";
import { ChildNameBadge } from "@/components/ChildNameBadge";
import { LogEditDialog } from "@/components/LogEditDialog";
import { LogMedicineDialog } from "@/components/LogMedicineDialog";
import { CloseEpisodeDialog } from "@/components/CloseEpisodeDialog";
import { DiseaseTypeMultiSelect } from "@/components/DiseaseTypeMultiSelect";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  buildDiseaseTypesFromSelection,
  formatDiseaseTypes,
  parseDiseaseTypesForEdit,
  DEFAULT_DISEASE_TYPE,
  type DiseaseType,
} from "@/lib/disease-types";
import { getLogMedicationDisplay } from "@/lib/medications";
import { formatLogTemp, toCelsius } from "@/lib/temperature";
import {
  dialogDateFieldClass,
  dialogDateWrapClass,
  dialogFooterClass,
  dialogPrimaryButtonClass,
  dialogSecondaryButtonClass,
} from "@/lib/dialog-ui";
import { useTemperatureUnit } from "@/lib/temperature-unit-store";
import { formatCloseTimeInput, parseCloseTimestamp } from "@/lib/episode-close";

export const Route = createFileRoute("/episode/$episodeId")({
  head: () => ({
    meta: [{ title: "Episode — KidHealth Log" }],
  }),
  component: EpisodePage,
});

function formatDateInput(ts: number) {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function EpisodePage() {
  const { episodeId } = Route.useParams();
  const navigate = useNavigate();
  const children = useChildren();
  const episodes = useEpisodes();
  const logs = useLogs();
  const temperatureUnit = useTemperatureUnit();
  const episode = episodes.find((e) => e.id === episodeId) ?? getEpisode(episodeId);
  const episodeLogs = sortLogsDesc(logs.filter((l) => l.episodeId === episodeId));

  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [editEpisodeOpen, setEditEpisodeOpen] = useState(false);
  const [editSelectedTypes, setEditSelectedTypes] = useState<DiseaseType[]>([DEFAULT_DISEASE_TYPE]);
  const [editOtherDetail, setEditOtherDetail] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editChild, setEditChild] = useState<string>("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLogTarget, setDeleteLogTarget] = useState<LogEntry | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [logMedicineOpen, setLogMedicineOpen] = useState(false);
  const [editTypesExpanded, setEditTypesExpanded] = useState(false);

  if (!episode) {
    return (
      <div className="h-[100dvh] w-full flex justify-center bg-background overflow-hidden">
        <main className="w-full max-w-md px-5 pt-6 text-center">
          <p className="text-muted-foreground">Episode not found.</p>
          <Link to="/timeline" className="mt-4 inline-block text-sm font-medium text-primary">
            Back to Episodes
          </Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  const episodeTitle = formatEpisodeTitle(episode);
  const sickDays = getSickDays(episode.openedAt, episode.closedAt);
  const startedLabel = new Date(episode.openedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const closedLabel =
    episode.status === "closed" && episode.closedAt
      ? `${new Date(episode.closedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}, ${new Date(episode.closedAt).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : null;

  const openEditEpisode = () => {
    const parsed = parseDiseaseTypesForEdit(episode.diseaseTypes);
    setEditSelectedTypes(
      parsed.selected.length > 0 ? parsed.selected : [DEFAULT_DISEASE_TYPE],
    );
    setEditOtherDetail(parsed.otherDetail);
    setEditNotes(episode.notes ?? "");
    setEditStartDate(formatDateInput(episode.openedAt));
    setEditStartTime(formatCloseTimeInput(new Date(episode.openedAt)));
    if (episode.status === "closed" && episode.closedAt) {
      setEditEndDate(formatDateInput(episode.closedAt));
      setEditEndTime(formatCloseTimeInput(new Date(episode.closedAt)));
    } else {
      setEditEndDate("");
      setEditEndTime("");
    }
    setEditChild(episode.child);
    setEditTypesExpanded(false);
    setEditEpisodeOpen(true);
  };

  const editTypesPreview = formatDiseaseTypes(
    buildDiseaseTypesFromSelection(editSelectedTypes, editOtherDetail),
  );

  const saveEpisodeEdits = () => {
    const diseaseTypes = buildDiseaseTypesFromSelection(editSelectedTypes, editOtherDetail);
    const types = diseaseTypes.length > 0 ? diseaseTypes : [DEFAULT_DISEASE_TYPE];

    const openedAt = parseCloseTimestamp(editStartDate, editStartTime || "00:00");
    if (Number.isNaN(openedAt)) {
      toast.error("Invalid start date or time");
      return;
    }

    let closedAt: number | undefined;
    if (episode.status === "closed") {
      closedAt = parseCloseTimestamp(editEndDate, editEndTime || "00:00");
      if (Number.isNaN(closedAt)) {
        toast.error("Invalid end date or time");
        return;
      }
      if (closedAt < openedAt) {
        toast.error("End time cannot be before episode start");
        return;
      }
    }

    if (editChild !== episode.child) {
      updateLogsChildForEpisode(episode.id, editChild);
    }

    updateEpisode(episode.id, {
      child: editChild,
      diseaseTypes: types,
      notes: editNotes.trim() || null,
      openedAt,
      ...(closedAt !== undefined ? { closedAt } : {}),
    });
    setEditEpisodeOpen(false);
    toast.success("Episode updated");
  };

  const handleDeleteEpisode = () => {
    const logCount = episodeLogs.length;
    deleteLogsForEpisode(episode.id);
    deleteEpisode(episode.id);
    setDeleteConfirmOpen(false);
    toast.success("Episode deleted", {
      description:
        logCount > 0
          ? `${episodeTitle} and ${logCount} ${logCount === 1 ? "log" : "logs"} removed.`
          : `${episodeTitle} removed.`,
    });
    navigate({ to: "/timeline" });
  };

  const handleClose = () => {
    setCloseDialogOpen(true);
  };

  const handleReopen = () => {
    try {
      reopenEpisode(episode.id);
      toast.success("Episode re-opened", {
        description: `${episodeTitle} for ${episode.child} is open again.`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not re-open episode");
    }
  };

  const handleDeleteLog = () => {
    if (!deleteLogTarget) return;
    deleteLog(deleteLogTarget.id);
    setDeleteLogTarget(null);
    toast.success("Log deleted");
  };

  return (
    <div className="h-[100dvh] w-full flex justify-center bg-background overflow-hidden">
      <main className="w-full max-w-md h-full flex flex-col min-h-0 overflow-hidden pb-28">
        <div className="shrink-0 px-5 pt-6">
          <Link
            to="/timeline"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Episodes
          </Link>

          <header className="mt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight">{episodeTitle}</h1>
                  <button
                    onClick={openEditEpisode}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                    aria-label="Edit episode"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <ChildNameBadge name={episode.child} compact />
                  <span>
                    · {sickDays} {sickDays === 1 ? "day" : "days"} · Started {startedLabel}
                    {closedLabel ? ` · Closed ${closedLabel}` : ""}
                  </span>
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={
                  episode.status === "open"
                    ? {
                        background: "var(--episode-open-muted)",
                        color: "var(--episode-open-foreground)",
                        border: "1px solid var(--episode-open)",
                      }
                    : {
                        background: "var(--episode-closed-muted)",
                        color: "var(--episode-closed)",
                        border: "1px solid var(--episode-closed)",
                      }
                }
              >
                {episode.status === "open" ? "Open" : "Closed"}
              </span>
            </div>

            {episode.notes && (
              <p className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {episode.notes}
              </p>
            )}
          </header>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] px-5 pb-8">
          <div className="mt-4 space-y-2">
            {episode.status === "open" && (
              <button
                onClick={() => setLogMedicineOpen(true)}
                className="w-full rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground transition hover:bg-muted active:scale-[0.98] inline-flex items-center justify-center gap-1.5"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: "var(--episode-open)",
                }}
              >
                <Pill className="h-3.5 w-3.5" />
                Log Medicine
              </button>
            )}
            {episode.status === "open" && (
              <button
                onClick={handleClose}
                className="w-full rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground transition hover:bg-accent active:scale-[0.98] inline-flex items-center justify-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5" />
                Close Episode
              </button>
            )}
            {episode.status === "closed" && (
              <button
                onClick={handleReopen}
                className="w-full rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground transition hover:bg-muted active:scale-[0.98] inline-flex items-center justify-center gap-1.5"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: "var(--episode-open)",
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Re-open Episode
              </button>
            )}
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="w-full rounded-xl border border-destructive/40 bg-card py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 active:scale-[0.98] inline-flex items-center justify-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Episode
            </button>
          </div>

          <div className="mt-4 space-y-1.5">
          {episodeLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs in this episode yet.</p>
          ) : (
            episodeLogs.map((log) => {
              const med = getLogMedicationDisplay(log);
              const tempHigh =
                log.temp !== null && toCelsius(log.temp, log.tempUnit) >= 39;
              const tempMid =
                log.temp !== null &&
                toCelsius(log.temp, log.tempUnit) >= 38 &&
                toCelsius(log.temp, log.tempUnit) < 39;

              return (
                <div
                  key={log.id}
                  className="surface-card rounded-xl p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.date + "T00:00:00").toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · {log.time}
                    </div>
                    <div className="flex items-center gap-0.5 -m-1">
                      <button
                        onClick={() => setEditingLog(log)}
                        className="text-muted-foreground hover:text-primary transition p-1"
                        aria-label="Edit log"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteLogTarget(log)}
                        className="text-muted-foreground hover:text-destructive transition p-1"
                        aria-label="Delete log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {med && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ background: med.color, color: med.textColor }}
                      >
                        <Droplet className="h-3 w-3" fill="currentColor" fillOpacity={0.3} />
                        {med.label}
                        {med.amountLabel ? ` ${med.amountLabel}` : ""}
                      </span>
                    )}
                    {log.temp !== null && (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          tempHigh
                            ? "bg-[color-mix(in_srgb,var(--fever-high)_16%,var(--card))] text-fever-high"
                            : tempMid
                              ? "bg-[color-mix(in_srgb,var(--fever-mid)_12%,var(--card))] text-fever-mid"
                              : "bg-muted text-foreground"
                        }`}
                      >
                        <Thermometer className="h-3 w-3" />
                        {formatLogTemp(log.temp, log.tempUnit, temperatureUnit)}
                      </span>
                    )}
                  </div>
                  {log.notes && (
                    <p className="mt-1.5 text-xs text-muted-foreground leading-snug">{log.notes}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        </div>
      </main>

      <LogEditDialog
        log={editingLog}
        open={editingLog !== null}
        onOpenChange={(open) => {
          if (!open) setEditingLog(null);
        }}
      />

      <LogMedicineDialog
        episode={episode}
        open={logMedicineOpen}
        onOpenChange={setLogMedicineOpen}
      />

      <CloseEpisodeDialog
        episode={episode.status === "open" ? episode : null}
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        onClosed={() => navigate({ to: "/timeline" })}
      />

      <Dialog open={editEpisodeOpen} onOpenChange={setEditEpisodeOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Episode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Child</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {children.map(({ name }) => (
                  <button
                    key={name}
                    onClick={() => setEditChild(name)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      editChild === name
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-accent"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Illness Types</label>
              {editTypesExpanded ? (
                <div className="mt-1.5 space-y-1.5">
                  <DiseaseTypeMultiSelect
                    selected={editSelectedTypes}
                    onChange={setEditSelectedTypes}
                    otherDetail={editOtherDetail}
                    onOtherDetailChange={setEditOtherDetail}
                    variant="chip"
                    compact
                  />
                  <button
                    type="button"
                    onClick={() => setEditTypesExpanded(false)}
                    className="text-[10px] font-medium text-primary"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditTypesExpanded(true)}
                  className="mt-1.5 w-full flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-left transition hover:bg-accent/40"
                >
                  <span className="text-sm font-medium truncate">{editTypesPreview}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Start date</label>
                <div className={dialogDateWrapClass}>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className={dialogDateFieldClass}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Start time</label>
                <div className={dialogDateWrapClass}>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className={dialogDateFieldClass}
                  />
                </div>
              </div>
            </div>
            {episode.status === "closed" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">End date</label>
                  <div className={dialogDateWrapClass}>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className={dialogDateFieldClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">End time</label>
                  <div className={dialogDateWrapClass}>
                    <input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className={dialogDateFieldClass}
                    />
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="General notes about this illness…"
                className="mt-1 w-full resize-none rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>
          <DialogFooter className={dialogFooterClass}>
            <button
              onClick={saveEpisodeEdits}
              className={dialogPrimaryButtonClass}
              style={{ background: "var(--gradient-primary)" }}
            >
              Save
            </button>
            <button
              onClick={() => setEditEpisodeOpen(false)}
              className={dialogSecondaryButtonClass}
            >
              Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <AlertDialog
        open={deleteLogTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteLogTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this log entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the log from local storage. Medication safety timers will
              recalculate based on your remaining records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLog}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete episode and all logs?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This will permanently delete <strong>{episodeTitle}</strong> for{" "}
                  <strong>{episode.child}</strong>.
                </p>
                <p>
                  {episodeLogs.length > 0 ? (
                    <>
                      <strong>All {episodeLogs.length}{" "}
                      {episodeLogs.length === 1 ? "log entry" : "log entries"}</strong> in this
                      episode will also be deleted, including any medication records used for
                      safety checks.
                    </>
                  ) : (
                    <>
                      Any log entries in this episode will also be deleted. Medication safety
                      timers for {episode.child} only apply to their remaining logs.
                    </>
                  )}
                </p>
                <p>This cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEpisode}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
