import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  purchasePro,
  usePaywallOpen,
  setPaywallOpen,
  useIsPro,
  usePurchasing,
  usePaywallReason,
  usePaywallEmergencyLogsRemaining,
  consumeEmergencyLogAction,
  type PaywallReason,
} from "@/lib/pro-store";
import { EMERGENCY_LOG_LIMIT } from "@/lib/entitlements";
import { toast } from "sonner";

const PAYWALL_COPY: Record<PaywallReason, string> = {
  add_child:
    "The free version includes 1 child profile. Upgrade to KidHealth Pro for £2.99 once to add up to 5 children and switch between them in Quick Log and Dashboard.",
  new_episode:
    "The free version covers 1 full illness episode. Upgrade to Pro for £2.99 once to unlock unlimited episodes and keep permanent illness history.",
  emergency_pass:
    "Your free plan includes one full illness history. Upgrade to Pro for £2.99 once to permanently save every episode, or use Emergency Log entries for a new illness.",
  generic:
    "Upgrade to KidHealth Pro for £2.99 once to unlock unlimited episodes, up to 5 child profiles, and multi-child quick switch.",
};

export function PaywallModal() {
  const open = usePaywallOpen();
  const reason = usePaywallReason();
  const emergencyLogsRemaining = usePaywallEmergencyLogsRemaining();
  const isPro = useIsPro();
  const purchasing = usePurchasing();
  const [success, setSuccess] = useState(false);

  if (isPro) return null;

  const showEmergencyAction =
    reason === "emergency_pass" &&
    emergencyLogsRemaining !== null &&
    emergencyLogsRemaining > 0;

  const isEmergencyExhausted =
    reason === "emergency_pass" &&
    emergencyLogsRemaining !== null &&
    emergencyLogsRemaining === 0;

  const emergencyDescription = showEmergencyAction
    ? emergencyLogsRemaining === EMERGENCY_LOG_LIMIT
      ? "Your first illness episode is closed. You can log this new illness up to 5 times with Emergency Pass while data stays in temporary storage."
      : `Emergency Pass active. You have ${emergencyLogsRemaining} of ${EMERGENCY_LOG_LIMIT} emergency logs remaining.`
    : isEmergencyExhausted
      ? "You've used all 5 Emergency Pass logs. Upgrade to Pro to keep logging this illness permanently."
      : PAYWALL_COPY[reason];

  const handlePurchase = async () => {
    try {
      await purchasePro();
      setSuccess(true);
      toast.success("Purchase Successful!", {
        description: "KidHealth Pro unlocked permanently.",
      });
      setTimeout(() => {
        setSuccess(false);
        setPaywallOpen(false);
      }, 1500);
    } catch {
      /* purchasePro always resolves in mock flow */
    }
  };

  const handleEmergencyLog = () => {
    const action = consumeEmergencyLogAction();
    action?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!purchasing) setPaywallOpen(next);
      }}
    >
      <DialogContent className="max-w-sm border-primary/30">
        <DialogHeader>
          <div
            className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground"
            style={{ background: "var(--gradient-pro)" }}
          >
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">
            {success ? "Purchase Successful!" : "Upgrade to KidHealth Pro"}
          </DialogTitle>
          {!success && (
            <DialogDescription className="text-center text-sm leading-relaxed">
              {emergencyDescription}
            </DialogDescription>
          )}
        </DialogHeader>

        {!success && (
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70 inline-flex items-center justify-center gap-2"
              style={{ background: "var(--gradient-pro)" }}
            >
              {purchasing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing App Store purchase…
                </>
              ) : (
                <>💳 Upgrade for £2.99</>
              )}
            </button>
            {showEmergencyAction ? (
              <button
                type="button"
                onClick={handleEmergencyLog}
                disabled={purchasing}
                className="w-full rounded-xl border border-[color-mix(in_srgb,var(--episode-open)_55%,var(--border))] bg-[color-mix(in_srgb,var(--episode-open-muted)_70%,var(--surface))] py-2.5 text-sm font-semibold text-foreground hover:brightness-[0.98] disabled:opacity-50"
              >
                Emergency Log · {emergencyLogsRemaining} of {EMERGENCY_LOG_LIMIT} left
              </button>
            ) : reason !== "emergency_pass" ? (
              <button
                onClick={() => setPaywallOpen(false)}
                disabled={purchasing}
                className="w-full rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
              >
                Not now
              </button>
            ) : null}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
