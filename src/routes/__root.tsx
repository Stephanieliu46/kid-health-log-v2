import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { hydrateLogStore, attachOrphanLogsToEpisode } from "../lib/log-store";
import {
  hydrateEpisodeStore,
  getOpenEpisodesForChild,
} from "../lib/episode-store";
import {
  DEFAULT_DISEASE_TYPE,
  episodeIncludesStandardType,
} from "../lib/disease-types";
import { hydrateAuthStore, isAuthenticated } from "../lib/auth-store";
import { hydrateProStore } from "../lib/pro-store";
import { checkPaywallOnAppOpen } from "../lib/entitlements";
import { hydrateChildrenStore, getChildNames } from "../lib/children-store";
import { AppToaster } from "@/components/ui/sonner";
import { PaywallModal } from "@/components/PaywallModal";
import { EpisodeIdleReminder } from "@/components/EpisodeIdleReminder";
import { PurchaseOverlay } from "@/components/PurchaseOverlay";
import {
  acceptDisclaimer,
  hasAcceptedDisclaimer,
  hydrateDisclaimerStore,
} from "@/lib/medical-disclaimer";
import { hydrateTemperatureUnitStore } from "@/lib/temperature-unit-store";
import { hydrateThemeStore } from "@/lib/theme-store";
import { MedicalDisclaimerAcceptDialog } from "@/components/MedicalDisclaimerDialog";

const THEME_BOOTSTRAP = `(function(){try{var t=JSON.parse(localStorage.getItem("kidhealth.theme.v1")||'"system"');var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})();`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KidHealth Log" },
      { name: "description", content: "KidHealth Log: A minimalist app for parents to quickly log children's illness details." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "KidHealth Log" },
      { property: "og:description", content: "KidHealth Log: A minimalist app for parents to quickly log children's illness details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "KidHealth Log" },
      { name: "twitter:description", content: "KidHealth Log: A minimalist app for parents to quickly log children's illness details." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7d662bbf-1fc1-4fdc-b326-2234649246aa/id-preview-d7518ac9--ad7209a5-90e2-401f-b7f5-e27e4ef84f86.lovable.app-1781006463878.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7d662bbf-1fc1-4fdc-b326-2234649246aa/id-preview-d7518ac9--ad7209a5-90e2-401f-b7f5-e27e4ef84f86.lovable.app-1781006463878.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [ready, setReady] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(true);

  useEffect(() => {
    hydrateAuthStore();
    hydrateProStore();
    hydrateChildrenStore();
    hydrateLogStore();
    hydrateEpisodeStore();
    hydrateDisclaimerStore();
    hydrateTemperatureUnitStore();
    hydrateThemeStore();

    for (const child of getChildNames()) {
      const coldFever = getOpenEpisodesForChild(child).find((e) =>
        episodeIncludesStandardType(e.diseaseTypes, DEFAULT_DISEASE_TYPE),
      );
      if (coldFever) attachOrphanLogsToEpisode(child, coldFever.id);
    }

    checkPaywallOnAppOpen();
    setDisclaimerAccepted(hasAcceptedDisclaimer());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Legacy auth routes remain available but app no longer requires login.
    const authed = isAuthenticated();
    if (authed && (pathname === "/login" || pathname === "/register")) {
      navigate({ to: "/", replace: true });
    }
  }, [ready, pathname, navigate]);

  if (!ready) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <EpisodeIdleReminder />
      <PaywallModal />
      <PurchaseOverlay />
      <MedicalDisclaimerAcceptDialog
        open={!disclaimerAccepted}
        onAccept={() => {
          acceptDisclaimer();
          setDisclaimerAccepted(true);
        }}
      />
      <AppToaster position="bottom-center" closeButton offset={{ bottom: 88 }} />
    </QueryClientProvider>
  );
}
