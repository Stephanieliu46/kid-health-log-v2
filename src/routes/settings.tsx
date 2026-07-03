import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Users,
  Pencil,
  Trash2,
  Plus,
  Crown,
  Shield,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  Thermometer,
  Moon,
  Sun,
  Monitor,
  Info,
  Star,
  FileText,
  Download,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { AppShell, TabPage } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
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
  useIsPro,
  purchasePro,
  openPaywall,
  usePurchasing,
} from "@/lib/pro-store";
import { evaluateAddChild } from "@/lib/entitlements";
import {
  useChildren,
  addChild,
  updateChild,
  deleteChild,
  type Child,
} from "@/lib/children-store";
import { toast } from "sonner";
import { APP_VERSION, submitFeedback } from "@/lib/feedback";
import {
  APP_STORE_APP_ID,
  checkAppUpdate,
  getAppStoreReviewUrl,
  openExternalUrl,
  type AppUpdateCheckResult,
} from "@/lib/app-about";
import { MedicalDisclaimerViewDialog } from "@/components/MedicalDisclaimerDialog";
import {
  setTemperatureUnit,
  useTemperatureUnit,
  type TemperatureUnit,
} from "@/lib/temperature-unit-store";
import { setTheme, useTheme, type Theme } from "@/lib/theme-store";

const SETTINGS_SECTION_STYLES = {
  children: {
    borderLeftWidth: 3,
    borderLeftColor: "var(--episode-closed)",
    background: "var(--episode-closed-muted)",
  },
  preferences: {
    borderLeftWidth: 3,
    borderLeftColor: "var(--episode-open)",
    background: "var(--episode-open-muted)",
  },
  account: {
    borderLeftWidth: 3,
    borderLeftColor: "var(--episode-closed)",
    background: "var(--episode-closed-muted)",
  },
  about: {
    borderLeftWidth: 3,
    borderLeftColor: "var(--episode-open)",
    background: "var(--episode-open-muted)",
  },
} as const;

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — KidHealth Log" },
      { name: "description", content: "Manage profile, children, and Pro membership." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const isPro = useIsPro();
  const purchasing = usePurchasing();
  const children = useChildren();
  const temperatureUnit = useTemperatureUnit();
  const theme = useTheme();

  const [proExpanded, setProExpanded] = useState(false);

  const [childDialogOpen, setChildDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [childNameInput, setChildNameInput] = useState("");
  const [deleteChildTarget, setDeleteChildTarget] = useState<Child | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [updateCheck, setUpdateCheck] = useState<AppUpdateCheckResult | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const runCheck = async () => {
      setUpdateChecking(true);
      const result = await checkAppUpdate();
      if (!cancelled) {
        setUpdateCheck(result);
        setUpdateChecking(false);
        if (result.status === "update_available") {
          toast.info("Update available", {
            description: `Version ${result.latestVersion} is on the App Store.`,
            action: result.storeUrl
              ? {
                  label: "Update",
                  onClick: () => openExternalUrl(result.storeUrl),
                }
              : undefined,
          });
        }
      }
    };

    void runCheck();
    return () => {
      cancelled = true;
    };
  }, []);

  const addChildGate = evaluateAddChild();
  const atChildLimit =
    !addChildGate.allowed && addChildGate.reason === "max_reached";

  const openAddChild = () => {
    const gate = evaluateAddChild();
    if (!gate.allowed) {
      if (gate.reason === "paywall") openPaywall("add_child");
      return;
    }
    setEditingChild(null);
    setChildNameInput("");
    setChildDialogOpen(true);
  };

  const openEditChild = (child: Child) => {
    setEditingChild(child);
    setChildNameInput(child.name);
    setChildDialogOpen(true);
  };

  const saveChild = () => {
    try {
      if (editingChild) {
        updateChild(editingChild.id, childNameInput);
        toast.success("Child updated");
      } else {
        addChild(childNameInput);
        toast.success("Child added");
      }
      setChildDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save child");
    }
  };

  const handleDeleteChild = () => {
    if (!deleteChildTarget) return;
    deleteChild(deleteChildTarget.id);
    setDeleteChildTarget(null);
    toast.success("Child removed", {
      description: `${deleteChildTarget.name} and their episodes/logs were deleted.`,
    });
  };

  const handleSubmitFeedback = async () => {
    if (feedbackSending) return;
    setFeedbackSending(true);
    try {
      await submitFeedback({
        message: feedbackMessage,
        isPro,
      });
      setFeedbackMessage("");
      toast.success("Feedback has received, thank you！");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send feedback");
    } finally {
      setFeedbackSending(false);
    }
  };

  const handlePurchase = async () => {
    await purchasePro();
    toast.success("Purchase Successful!", {
      description: "KidHealth Pro unlocked permanently.",
    });
    setProExpanded(false);
  };

  const handleCheckForUpdates = async () => {
    setUpdateChecking(true);
    const result = await checkAppUpdate({ force: true });
    setUpdateCheck(result);
    setUpdateChecking(false);

    if (result.status === "current") {
      toast.success("You're up to date", {
        description: `Version ${APP_VERSION} is the latest release.`,
      });
    } else if (result.status === "update_available") {
      toast.info("Update available", {
        description: `Version ${result.latestVersion} is on the App Store.`,
      });
    } else if (result.status === "error") {
      toast.error("Update check failed", { description: result.message });
    }
  };

  const handleOpenAppStoreUpdate = () => {
    if (updateCheck?.status !== "update_available" || !updateCheck.storeUrl) return;
    openExternalUrl(updateCheck.storeUrl);
  };

  const handleRateOnAppStore = () => {
    const url = getAppStoreReviewUrl();
    if (!url) {
      toast.message("App Store rating is not configured yet.");
      return;
    }
    openExternalUrl(url);
  };

  const aboutActionClass =
    "w-full rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted inline-flex items-center gap-1.5";

  const sectionCardClass = "surface-card rounded-xl p-2.5";
  const sectionTitleClass = "text-sm font-bold";
  const sectionHeaderClass = "flex items-center gap-1.5 mb-1.5";

  return (
    <AppShell>
      <TabPage scrollable className="gap-0">
        <header className="shrink-0">
          <h1 className="text-xl font-bold tracking-tight leading-tight">Settings</h1>
          <p className="text-xs text-muted-foreground font-medium">Children, preferences & membership.</p>
        </header>

        <div className="flex-1 min-h-0 mt-1.5 space-y-1.5 pb-1">
          {/* Pro membership card */}
          {isPro ? (
            <section
              className={sectionCardClass}
              style={{ background: "var(--gradient-pro-active)" }}
            >
              <div className="flex items-start gap-2">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--child-accent-foreground)]"
                  style={{ background: "var(--child-accent)" }}
                >
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className={sectionTitleClass}>Permanent Pro activated</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                    Unlimited episodes · Up to 5 child profiles · Multi-child quick switch
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <section
              className={sectionCardClass}
              style={{ background: "var(--gradient-pro-card)" }}
            >
              <button
                type="button"
                onClick={() => setProExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-2 text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
                  >
                    <Crown className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className={sectionTitleClass}>Upgrade to KidHealth Pro</h2>
                    <p className="text-xs text-muted-foreground">Unlock full care features</p>
                  </div>
                </div>
                {proExpanded ? (
                  <ChevronUp className="h-4 w-4 text-foreground/70 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-foreground/70 shrink-0" />
                )}
              </button>

              {proExpanded && (
                <div className="mt-2 space-y-1.5 border-t border-primary/20 pt-2">
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="rounded-lg bg-card/60 p-2 border border-border/60">
                      <div className="font-semibold text-foreground mb-1">Free</div>
                      <ul className="space-y-0.5 text-muted-foreground leading-snug">
                        <li>· 1 illness episode</li>
                        <li>· 1 child profile</li>
                        <li>· 5 emergency pass logs</li>
                        <li>· Dashboard trend charts</li>
                      </ul>
                    </div>
                    <div className="rounded-lg bg-primary/5 p-2 border border-primary/30">
                      <div className="font-semibold text-foreground mb-1">Pro · £2.99 once</div>
                      <ul className="space-y-0.5 text-muted-foreground leading-snug">
                        <li>· Unlimited episode entries</li>
                        <li>· Up to 5 child profiles</li>
                        <li>· Multi-child quick switch</li>
                        <li>· Permanent illness history</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="w-full rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-70 inline-flex items-center justify-center gap-1.5"
                  >
                    {purchasing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>💳 Upgrade for £2.99</>
                    )}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Children */}
          <section className={sectionCardClass} style={SETTINGS_SECTION_STYLES.children}>
            <div className="flex items-center justify-between mb-1.5">
              <div className={sectionHeaderClass}>
                <Users className="h-3.5 w-3.5 text-primary" />
                <h2 className={sectionTitleClass}>Children</h2>
              </div>
              <button
                onClick={openAddChild}
                disabled={atChildLimit}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${
                  atChildLimit
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>

            {atChildLimit && (
              <p className="text-xs text-muted-foreground mb-1.5">
                Maximum of 5 child profiles reached.
              </p>
            )}

            {children.length === 0 ? (
              <p className="text-xs text-muted-foreground">No children added yet.</p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
                {children.map((child) => (
                  <li
                    key={child.id}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-muted/35"
                  >
                    <span className="text-sm font-semibold">{child.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditChild(child)}
                        className="rounded-lg p-1 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        aria-label={`Edit ${child.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteChildTarget(child)}
                        className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Delete ${child.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Preferences */}
          <section className={sectionCardClass} style={SETTINGS_SECTION_STYLES.preferences}>
            <div className={sectionHeaderClass}>
              <Thermometer className="h-3.5 w-3.5 text-foreground" />
              <h2 className={sectionTitleClass}>Preferences</h2>
            </div>

            <label className="text-xs font-semibold text-muted-foreground">Appearance</label>
            <div className="mt-1 segment-track">
              {(
                [
                  { id: "light" as Theme, label: "Light", icon: Sun },
                  { id: "dark" as Theme, label: "Dark", icon: Moon },
                  { id: "system" as Theme, label: "System", icon: Monitor },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  className={`segment-btn inline-flex items-center justify-center gap-1 ${
                    theme === id ? "segment-btn-active" : ""
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <label className="mt-2 block text-xs font-semibold text-muted-foreground">
              Temperature unit
            </label>
            <div className="mt-1 segment-track">
              {(["celsius", "fahrenheit"] as const).map((unit: TemperatureUnit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setTemperatureUnit(unit)}
                  className={`segment-btn ${temperatureUnit === unit ? "segment-btn-active" : ""}`}
                >
                  {unit === "celsius" ? "Celsius (°C)" : "Fahrenheit (°F)"}
                </button>
              ))}
            </div>
          </section>

          {/* Feedback */}
          <section className={sectionCardClass} style={SETTINGS_SECTION_STYLES.account}>
            <div className={sectionHeaderClass}>
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              <h2 className={sectionTitleClass}>Feedback</h2>
            </div>
            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              rows={2}
              placeholder="Bug reports, ideas, or questions…"
              disabled={feedbackSending}
              className="w-full resize-none rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleSubmitFeedback}
              disabled={!feedbackMessage.trim() || feedbackSending}
              className="mt-1.5 w-full rounded-lg bg-primary py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              {feedbackSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send"
              )}
            </button>
          </section>

          <section className={sectionCardClass} style={SETTINGS_SECTION_STYLES.about}>
            <div className={sectionHeaderClass}>
              <Info className="h-3.5 w-3.5 text-foreground" />
              <h2 className={sectionTitleClass}>About</h2>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Version</span>
              <span className="text-xs font-bold tabular-nums text-foreground">{APP_VERSION}</span>
            </div>

            {updateChecking && !updateCheck ? (
              <p className="mt-1.5 text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking for updates…
              </p>
            ) : updateCheck?.status === "update_available" ? (
              <div className="mt-1.5 rounded-lg border border-[color-mix(in_srgb,var(--peach-deep)_35%,var(--border))] bg-[color-mix(in_srgb,var(--peach)_18%,var(--surface))] px-2.5 py-1.5">
                <p className="text-xs font-semibold text-foreground">
                  Update available: v{updateCheck.latestVersion}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  A newer version is on the App Store.
                </p>
                {updateCheck.storeUrl ? (
                  <button
                    type="button"
                    onClick={handleOpenAppStoreUpdate}
                    className="mt-1.5 w-full rounded-lg btn-navy py-1.5 text-[11px] font-semibold inline-flex items-center justify-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Update on App Store
                  </button>
                ) : null}
              </div>
            ) : updateCheck?.status === "current" ? (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                You&apos;re on the latest version
                {updateCheck.latestVersion !== APP_VERSION
                  ? ` (App Store: v${updateCheck.latestVersion})`
                  : ""}
                .
              </p>
            ) : updateCheck?.status === "error" ? (
              <p className="mt-1.5 text-[11px] text-destructive leading-snug">{updateCheck.message}</p>
            ) : null}

            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={updateChecking}
              className={`mt-1.5 ${aboutActionClass} disabled:opacity-60`}
            >
              {updateChecking ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Check for updates
                </>
              )}
            </button>

            <div className="mt-1.5 space-y-1">
              <button
                type="button"
                onClick={() => setDisclaimerOpen(true)}
                className={aboutActionClass}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                Medical Disclaimer &amp; Privacy Policy
              </button>

              <button
                type="button"
                onClick={handleRateOnAppStore}
                className={aboutActionClass}
                disabled={!APP_STORE_APP_ID}
              >
                <Star className="h-3.5 w-3.5 shrink-0" />
                Rate on the App Store
              </button>
            </div>

            <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
              All health data is stored 100% locally on this device.
            </p>
          </section>
        </div>
      </TabPage>

      <MedicalDisclaimerViewDialog open={disclaimerOpen} onOpenChange={setDisclaimerOpen} />

      <Dialog open={childDialogOpen} onOpenChange={setChildDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingChild ? "Edit Child" : "Add Child"}</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input
              value={childNameInput}
              onChange={(e) => setChildNameInput(e.target.value)}
              placeholder="Child's name"
              className="mt-1 rounded-xl"
              autoFocus
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setChildDialogOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={saveChild}
              disabled={!childNameInput.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteChildTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteChildTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteChildTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting this child will also permanently remove all their illness episodes and log
              entries. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChild}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </AppShell>
  );
}
