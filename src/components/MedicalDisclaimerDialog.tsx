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
  MEDICAL_DISCLAIMER_INTRO,
  MEDICAL_DISCLAIMER_SECTIONS,
  MEDICAL_DISCLAIMER_TITLE,
  PRIVACY_POLICY_SECTIONS,
  SAFETY_PROCEED_LIABILITY,
} from "@/lib/medical-disclaimer";

export function MedicalDisclaimerBody({
  compact = false,
  showPrivacy = false,
}: {
  compact?: boolean;
  showPrivacy?: boolean;
}) {
  return (
    <div className={`space-y-3 ${compact ? "text-xs" : "text-sm"} leading-relaxed`}>
      {MEDICAL_DISCLAIMER_SECTIONS.map((section) => (
        <div key={section.heading}>
          <p className="font-semibold text-foreground">{section.heading}</p>
          <p className="text-muted-foreground">{section.body}</p>
        </div>
      ))}
      {showPrivacy &&
        PRIVACY_POLICY_SECTIONS.map((section) => (
          <div key={section.heading}>
            <p className="font-semibold text-foreground">{section.heading}</p>
            <p className="text-muted-foreground">{section.body}</p>
          </div>
        ))}
    </div>
  );
}

export function MedicalDisclaimerAcceptDialog({
  open,
  onAccept,
}: {
  open: boolean;
  onAccept: () => void;
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="max-w-md max-h-[90dvh] overflow-y-auto border-primary/20"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">{MEDICAL_DISCLAIMER_TITLE}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p className="text-sm font-medium text-foreground">{MEDICAL_DISCLAIMER_INTRO}</p>
              <MedicalDisclaimerBody />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onAccept}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            I Understand / Agree
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MedicalDisclaimerViewDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">
            Medical Disclaimer &amp; Privacy Policy
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <div>
                <p className="text-sm font-bold text-foreground mb-2">{MEDICAL_DISCLAIMER_TITLE}</p>
                <MedicalDisclaimerBody showPrivacy />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="w-full">Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SafetyWarningDisclaimerNote({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-primary/30 bg-secondary/50 p-3 ${
        compact ? "text-[11px] leading-snug" : "text-xs leading-relaxed"
      }`}
    >
      <p className="font-bold text-foreground">{MEDICAL_DISCLAIMER_TITLE}</p>
      <MedicalDisclaimerBody compact />
    </div>
  );
}

export function SafetyProceedLiabilityNote() {
  return (
    <p className="text-center text-[11px] leading-snug text-muted-foreground">
      {SAFETY_PROCEED_LIABILITY}
    </p>
  );
}
