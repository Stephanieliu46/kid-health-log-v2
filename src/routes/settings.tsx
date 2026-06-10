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
import { useProfile, updateParentName } from "@/lib/profile-store";
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
  const profile = useProfile();
  const isPro = useIsPro();
  const purchasing = usePurchasing();
  const children = useChildren();

  const [parentName, setParentName] = useState(profile.parentName);
  const [proExpanded, setProExpanded] = useState(false);

  const [childDialogOpen, setChildDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [childNameInput, setChildNameInput] = useState("");
  const [deleteChildTarget, setDeleteChildTarget] = useState<Child | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);

  useEffect(() => {
    setParentName(profile.parentName);
  }, [profile.parentName]);

  const addChildGate = evaluateAddChild();
  const atChildLimit =
    !addChildGate.allowed && addChildGate.reason === "max_reached";

  const openAddChild = () => {
    const gate = evaluateAddChild();
    if (!gate.allowed) {
      if (gate.reason === "paywall") openPaywall();
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

  const handleSaveProfile = () => {
    try {
      updateParentName(parentName);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update profile");
    }
  };

  const handleSubmitFeedback = async () => {
    if (feedbackSending) return;
    setFeedbackSending(true);
    try {
      await submitFeedback({
        message: feedbackMessage,
        isPro,
        parentName: parentName.trim() || profile.parentName,
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

  return (
    <AppShell>
      <TabPage className="gap-0 overflow-y-auto">
        <header className="shrink-0">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-base text-muted-foreground font-medium">Profile, children & membership.</p>
        </header>

        <div className="flex-1 min-h-0 mt-3 space-y-4 pb-2">
          {/* Pro membership card */}
          {isPro ? (
            <section
              className="rounded-2xl border border-emerald-300/60 p-4 shadow-[var(--shadow-soft)]"
              style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" }}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-emerald-900">
                    Permanent Pro activated
                  </h2>
                  <p className="mt-1 text-sm text-emerald-800/80">
                    Unlimited episodes · Up to 5 child profiles · Illness trend charts
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <section
              className="rounded-2xl border border-amber-300/50 p-4 shadow-[var(--shadow-soft)]"
              style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)" }}
            >
              <button
                type="button"
                onClick={() => setProExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-2 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)" }}
                  >
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-amber-950">
                      Upgrade to KidHealth Pro
                    </h2>
                    <p className="text-sm text-amber-900/70">Unlock full care features</p>
                  </div>
                </div>
                {proExpanded ? (
                  <ChevronUp className="h-4 w-4 text-amber-800 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-amber-800 shrink-0" />
                )}
              </button>

              {proExpanded && (
                <div className="mt-4 space-y-3 border-t border-amber-300/40 pt-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-white/60 p-2.5 border border-amber-200/50">
                      <div className="font-semibold text-amber-950 mb-1.5">Free</div>
                      <ul className="space-y-1 text-amber-900/80">
                        <li>· 1 illness episode</li>
                        <li>· 1 child profile</li>
                        <li>· 5 emergency pass logs</li>
                      </ul>
                    </div>
                    <div className="rounded-xl bg-amber-950/5 p-2.5 border border-amber-400/40">
                      <div className="font-semibold text-amber-950 mb-1.5">Pro · £2.99 once</div>
                      <ul className="space-y-1 text-amber-900/80">
                        <li>· Unlimited episode entries</li>
                        <li>· Up to 5 child profiles</li>
                        <li>· Multi-child quick switch</li>
                        <li>· Monthly illness trend chart</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-70 inline-flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)" }}
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
          <section className="rounded-2xl bg-card border border-border/60 shadow-[var(--shadow-soft)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold">Children</h2>
              </div>
              <button
                onClick={openAddChild}
                disabled={atChildLimit}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold ${
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
              <p className="text-sm text-muted-foreground mb-2">
                Maximum of 5 child profiles reached.
              </p>
            )}

            {children.length === 0 ? (
              <p className="text-xs text-muted-foreground">No children added yet.</p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                {children.map((child) => (
                  <li
                    key={child.id}
                    className="flex items-center justify-between px-3 py-2.5 bg-muted/20"
                  >
                    <span className="text-base font-semibold">{child.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditChild(child)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        aria-label={`Edit ${child.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteChildTarget(child)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

          {/* Account */}
          <section className="rounded-2xl bg-card border border-border/60 shadow-[var(--shadow-soft)] p-4">
            <h2 className="text-base font-bold mb-3">Account</h2>
            <label className="text-sm font-semibold text-muted-foreground">Parent nickname</label>
            <div className="mt-1 flex gap-2">
              <Input
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="rounded-xl flex-1"
                placeholder="Your name"
              />
              <button
                onClick={handleSaveProfile}
                className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                Save
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-border/60">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Feedback</h3>
              </div>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                rows={4}
                placeholder="Bug reports, ideas, or questions…"
                disabled={feedbackSending}
                className="w-full resize-none rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleSubmitFeedback}
                disabled={!feedbackMessage.trim() || feedbackSending}
                className="mt-2 w-full rounded-xl py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2"
                style={{ background: "var(--gradient-primary)" }}
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
            </div>
          </section>

          <p className="text-center text-sm text-muted-foreground pb-1 leading-relaxed">
            Version {APP_VERSION}. All data is stored 100% locally on this device.
          </p>
        </div>
      </TabPage>

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
              className="rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              style={{ background: "var(--gradient-primary)" }}
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
