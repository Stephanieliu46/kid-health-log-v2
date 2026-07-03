export const DISCLAIMER_STORAGE_KEY = "kidhealth.disclaimer.v1";

export type DisclaimerAcceptance = {
  accepted: true;
  acceptedAt: number;
};

export const MEDICAL_DISCLAIMER_INTRO =
  "By using this app, you agree to our Medical Disclaimer.";

export const MEDICAL_DISCLAIMER_TITLE = "⚖️ Medical Disclaimer";

export const MEDICAL_DISCLAIMER_SECTIONS = [
  {
    heading: "Not Medical Advice",
    body: "KidHealth Log is a personal tracking tool and does not provide professional medical advice, diagnosis, or treatment.",
  },
  {
    heading: "Consult a Professional",
    body: "Always seek the advice of your doctor, NHS 111, or other qualified healthcare providers with any questions you may have regarding a medical condition.",
  },
  {
    heading: "No Guarantee on Timers",
    body: "The medication safety timers and countdowns provided in this app are for informational reference only. While we strive for accuracy, software glitches or data delays may occur. Parents must independently verify medication dosages and timings as prescribed by healthcare professionals or product packaging.",
  },
  {
    heading: "Limitation of Liability",
    body: "By using this app, you agree that the developer shall not be held liable for any decisions made or actions taken in reliance upon the information provided by the application.",
  },
] as const;

export const PRIVACY_POLICY_SECTIONS = [
  {
    heading: "Local Storage Only",
    body: "KidHealth Log stores all child profiles, illness episodes, and log entries locally on your device. We do not upload your health data to our servers.",
  },
  {
    heading: "Your Control",
    body: "You can delete individual logs, children, or all app data at any time from within the app. Uninstalling the app removes locally stored data from your device.",
  },
] as const;

export const SAFETY_PROCEED_LIABILITY =
  "Proceeding implies you assume full responsibility for this dosage timing.";

export function hasAcceptedDisclaimer(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(DISCLAIMER_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<DisclaimerAcceptance>;
    return parsed.accepted === true;
  } catch {
    return false;
  }
}

export function acceptDisclaimer(): void {
  if (typeof window === "undefined") return;
  const payload: DisclaimerAcceptance = {
    accepted: true,
    acceptedAt: Date.now(),
  };
  localStorage.setItem(DISCLAIMER_STORAGE_KEY, JSON.stringify(payload));
}

export function hydrateDisclaimerStore(): void {
  hasAcceptedDisclaimer();
}
