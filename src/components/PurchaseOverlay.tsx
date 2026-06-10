import { Loader2 } from "lucide-react";
import { usePurchasing } from "@/lib/pro-store";

export function PurchaseOverlay() {
  const purchasing = usePurchasing();
  if (!purchasing) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm"
      aria-hidden
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-5 shadow-lg border border-border/60">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">Processing purchase…</p>
      </div>
    </div>
  );
}
