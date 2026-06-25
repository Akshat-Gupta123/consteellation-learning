import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Compass, Telescope } from "lucide-react";
import { getGalaxyById } from "@/lib/galaxy.functions";
import { StarNode, type StarStatus } from "@/components/StarNode";

export const Route = createFileRoute("/_authenticated/galaxy/$galaxyId")({
  component: GalaxyScreen,
});

function GalaxyScreen() {
  const { galaxyId } = useParams({ from: "/_authenticated/galaxy/$galaxyId" });
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["galaxy", galaxyId],
    queryFn: () => getGalaxyById({ data: { id: galaxyId } }),
  });

  if (query.isLoading) {
    return <CenteredMessage>Charting the stars…</CenteredMessage>;
  }

  if (query.isError || !query.data) {
    return (
      <CenteredMessage>
        <p className="mb-4">This galaxy could not be found.</p>
        <Link to="/" className="text-primary underline-offset-4 hover:underline">
          Return home
        </Link>
      </CenteredMessage>
    );
  }

  const { galaxy, progress } = query.data;
  const completed = progress.completed;
  const total = galaxy.stars.length;
  const done = galaxy.stars.filter((s) => completed.includes(s.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  function statusFor(index: number): StarStatus {
    const star = galaxy.stars[index];
    if (completed.includes(star.id)) return "completed";
    if (index === 0) return "available";
    const prev = galaxy.stars[index - 1];
    return completed.includes(prev.id) ? "available" : "locked";
  }

  return (
    <div className="relative">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 pt-4 text-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Galaxies
        </Link>
        <h1 className="truncate text-center font-display text-base font-bold text-cosmic sm:text-lg">
          {galaxy.name}
        </h1>
        <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
          {done} / {total} stars
        </span>
      </div>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1fr_300px]">
        <section className="order-2 lg:order-1">
          <div className="relative">
            <div
              className="pointer-events-none absolute bottom-8 left-1/2 top-8 w-px -translate-x-1/2 bg-gradient-to-b from-primary/10 via-primary/40 to-gold/40"
              aria-hidden="true"
            />
            <ol className="relative space-y-6">
              {galaxy.stars.map((star, i) => (
                <li
                  key={star.id}
                  className="animate-float-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <StarNode
                    index={i}
                    title={star.title}
                    difficulty={star.difficulty}
                    status={statusFor(i)}
                    isBoss={star.isBoss}
                    align={i % 2 === 0 ? "left" : "right"}
                    onClick={() =>
                      navigate({
                        to: "/lesson/$galaxyId/$starId",
                        params: { galaxyId: galaxy.id, starId: star.id },
                      })
                    }
                  />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <aside className="order-1 lg:order-2">
          <div className="glass sticky top-24 space-y-5 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-primary">
              <Telescope className="h-5 w-5" />
              <span className="font-display text-sm font-bold">Galaxy Briefing</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{galaxy.description}</p>

            <div className="space-y-3 border-t border-border/50 pt-4 text-sm">
              <Stat label="Difficulty" value={galaxy.difficulty} />
              <Stat label="Stars" value={`${total} lessons`} />
              <Stat label="Topic" value={galaxy.topic} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5" /> Progress
                </span>
                <span className="font-semibold text-foreground">{pct}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-purple transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium capitalize text-foreground">{value}</span>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-5 text-center text-muted-foreground">
      <div>{children}</div>
    </div>
  );
}
