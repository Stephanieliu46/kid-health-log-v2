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
} from "@/lib/pro-store";
import { toast } from "sonner";

export function PaywallModal() {
  const open = usePaywallOpen();
  const isPro = useIsPro();
  const purchasing = usePurchasing();
  const [success, setSuccess] = useState(false);

  if (isPro) return null;

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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!purchasing) setPaywallOpen(next);
      }}
    >
      <DialogContent className="max-w-sm border-amber-200/60">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">
            {success ? "Purchase Successful!" : "Upgrade to KidHealth Pro"}
          </DialogTitle>
          {!success && (
            <DialogDescription className="text-center text-sm leading-relaxed">
              Thank you for utilizing the Emergency Pass! 🔒 Your last 5 logs are securely saved
              in temporary storage. As the free version covers 1 full illness history, upgrade to
              Pro for £2.99 once to unlock unlimited episodes, permanently save this current
              illness, and manage up to 5 child profiles.
            </DialogDescription>
          )}
        </DialogHeader>

        {!success && (
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70 inline-flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)" }}
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
            <button
              onClick={() => setPaywallOpen(false)}
              disabled={purchasing}
              className="w-full rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              Not now
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
