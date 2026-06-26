import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { CosmicBackdrop } from "@/components/CosmicBackdrop";

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
      { title: "Constellation — Explore Knowledge, One Star at a Time" },
      {
        name: "description",
        content:
          "Constellation turns any topic into a visual star-map learning journey, powered by the Nova AI tutor.",
      },
      { name: "author", content: "Constellation" },
      { property: "og:title", content: "Constellation — AI Star-Map Learning" },
      {
        property: "og:description",
        content:
          "Transform any topic into a structured universe of knowledge. Learn by exploring stars.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
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
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const showCornerLogo = pathname !== "/";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="cosmic-bg" aria-hidden="true" />
      <div className="starfield" aria-hidden="true" />
      <CosmicBackdrop />
      {showCornerLogo && (
        <Link
          to="/"
          aria-label="Constellation home"
          className="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 py-1.5 backdrop-blur transition-colors hover:border-primary/60 hover:text-primary sm:left-6 sm:top-6"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-cyan" fill="currentColor" aria-hidden="true">
            <circle cx="6" cy="8" r="1.4" />
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="18" cy="9" r="1.4" />
            <circle cx="15" cy="16" r="1.8" />
            <circle cx="8" cy="17" r="1.4" />
            <path d="M6 8 L12 5 L18 9 L15 16 L8 17 Z" stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.5" />
          </svg>
          <span className="font-display text-xs font-bold tracking-wide sm:text-sm">Constellation</span>
        </Link>
      )}
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
