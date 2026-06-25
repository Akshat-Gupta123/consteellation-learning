import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { LogOut, Rocket, Telescope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ICBadge } from "@/components/ICBadge";
import { getProfile } from "@/lib/profile.functions";
import { migrateLocalGalaxies } from "@/lib/galaxy.functions";
import {
  clearLocalConstellationData,
  loadLocalGalaxies,
  loadLocalProgress,
} from "@/lib/storage";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated")({
  // Client-side gate: server-side redirects can't see browser-stored sessions
  // without an extra round-trip, so we render a small "checking auth" state
  // while the client confirms, and bounce to /auth if unauthenticated.
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const migrate = useServerFn(migrateLocalGalaxies);

  useEffect(() => {
    if (status === "signedOut") {
      navigate({ to: "/auth", replace: true });
    }
  }, [status, navigate]);

  // One-time migration of legacy localStorage galaxies into the cloud profile.
  useEffect(() => {
    if (status !== "signedIn") return;
    const galaxies = loadLocalGalaxies();
    if (galaxies.length === 0) return;
    const progressMap = loadLocalProgress();
    const progress: Record<string, { completed: string[] }> = {};
    for (const [k, v] of Object.entries(progressMap)) {
      progress[k] = { completed: v.completed ?? [] };
    }
    migrate({ data: { galaxies: galaxies as never, progress } })
      .then(() => {
        clearLocalConstellationData();
        qc.invalidateQueries({ queryKey: ["galaxies"] });
      })
      .catch(() => {
        // Migration is best-effort. Leave local data in place to retry next time.
      });
  }, [status, migrate, qc]);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
    enabled: status === "signedIn",
    staleTime: 5_000,
  });

  if (status === "loading" || (status === "signedIn" && !profileQuery.data)) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Aligning your constellation…
      </div>
    );
  }
  if (status === "signedOut" || !user) {
    return null;
  }

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
          <Link to="/" className="font-display text-sm font-bold tracking-tight text-foreground sm:text-base">
            Constellation
          </Link>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            <NavLink to="/" icon={<Rocket className="h-3.5 w-3.5" />} label="Galaxies" />
            <NavLink to="/garage" icon={<Telescope className="h-3.5 w-3.5" />} label="Garage" />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ICBadge ic={profileQuery.data?.ic ?? 0} />
            <button
              onClick={async () => {
                await signOut();
                await supabase.auth.signOut();
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>

        <nav className="flex items-center gap-1 border-t border-border/40 px-5 py-2 sm:hidden">
          <NavLink to="/" icon={<Rocket className="h-3.5 w-3.5" />} label="Galaxies" />
          <NavLink to="/garage" icon={<Telescope className="h-3.5 w-3.5" />} label="Garage" />
        </nav>
      </header>

      <Outlet />
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      activeProps={{ className: "border-primary/60 bg-primary/10 text-foreground" }}
      className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {icon}
      {label}
    </Link>
  );
}
