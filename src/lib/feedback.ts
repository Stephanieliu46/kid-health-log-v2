const FORMSPREE_ENDPOINT = "https://formspree.io/f/xeewzdvn";

export const APP_VERSION = "1.0.4";

export type FeedbackPayload = {
  message: string;
  isPro: boolean;
};

export async function submitFeedback({
  message,
  isPro,
}: FeedbackPayload): Promise<void> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error("Please enter your feedback before submitting.");
  }

  const response = await fetch(FORMSPREE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      message: trimmed,
      appVersion: APP_VERSION,
      isPro,
    }),
  });

  if (!response.ok) {
    let detail = "Could not send feedback. Please try again.";
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) detail = data.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }
}
