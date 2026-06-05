import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useState } from "react";

import { FighterAvatar } from "@/components/FighterAvatar";
import { DIVISIONS, REGIONS, type Division } from "@/data/types";
import { getRanked, ensureFightersLoaded, FIGHTERS } from "@/data/fighters";
import { Skeleton } from "@/components/ui/skeleton";

const BODIES = ["OVERALL", "WBC", "WBA", "IBF", "WBO"] as const;
type Body = (typeof BODIES)[number];

export const Route = createFileRoute("/rankings")({
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: RankingsSkeleton,
  loader: async () => {
    await ensureFightersLoaded();
    return { fighters: FIGHTERS };
  },
  head: () => ({
    meta: [
      { title: "Rankings — Matchroom Boxing Beta" },
      {
        name: "description",
        content:
          "Official Matchroom Boxing Beta rankings across all nine weight divisions and sanctioning bodies.",
      },
      { property: "og:title", content: "Rankings — Matchroom Boxing Beta" },
      {
        property: "og:description",
        content: "Top contenders and champions, ranked across all nine divisions.",
      },
    ],
  }),
  component: RankingsPage,
});

function RankingsPage() {
  const { fighters } = Route.useLoaderData();
  const [division, setDivision] = useState<Division>("Heavyweight");
  const [body, setBody] = useState<Body>("OVERALL");
  const [region, setRegion] = useState("all");

  const bodyLabel = (b: Body) => (b === "OVERALL" ? "Overall" : b);

  return (
    <>
      <section className="bg-foreground text-background">
        <div className="container-x py-14">
          <p className="eyebrow text-primary">
            <span className="h-px w-7 bg-primary" />
            Pound for Pound
          </p>
          <h1 className="mt-2 font-display text-6xl uppercase md:text-7xl">Rankings</h1>
          <p className="mt-3 max-w-xl text-background/70">
            Official rankings across all sanctioning bodies.
          </p>
        </div>
      </section>

      <section className="container-x py-12">
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {DIVISIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDivision(d)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                division === d
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2">
          {BODIES.map((b) => (
            <button
              key={b}
              onClick={() => setBody(b)}
              className={`shrink-0 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                body === b
                  ? "bg-card text-foreground border border-primary"
                  : "border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {bodyLabel(b)}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2">
          {["all", ...REGIONS].map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`shrink-0 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                region === r
                  ? "bg-card text-foreground border border-primary"
                  : "border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {r === "all" ? "All Regions" : r}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <RankingTable division={division} body={body} region={region} fighters={fighters} />
        </div>
      </section>
    </>
  );
}

function RankingTable({
  division,
  body,
  region,
  fighters,
}: {
  division: Division;
  body: Body;
  region: string;
  fighters: typeof FIGHTERS;
}) {
  if (body === "OVERALL") {
    return <OverallTable division={division} region={region} fighters={fighters} />;
  }

  // For regional + body-specific, compute on-the-fly from fighters
  const pool = fighters.filter((f) => {
    if (f.division !== division) return false;
    if (region && region !== "all" && f.region !== region) return false;
    return true;
  });

  if (pool.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No {body} rankings for {division} yet.
      </p>
    );
  }

  const FORMULAS: Record<string, (f: (typeof fighters)[number]) => number> = {
    OVERALL: (f) => f.wins * 10 + f.kos * 5 - f.losses * 8,
    WBC: (f) => f.wins * 10 + f.kos * 8 - f.losses * 6,
    WBA: (f) => f.wins * 12 - f.losses * 10,
    IBF: (f) => f.wins * 8 + f.kos * 3 - f.losses * 10,
    WBO: (f) =>
      f.wins * 10 + (parseInt(f.streak, 10) || 0) * (f.streak.endsWith("W") ? 3 : 0) - f.losses * 7,
  };

  const calcPoints = FORMULAS[body];
  const champions = pool.filter((f) => (f.beltsHeld ?? "").includes(body));
  const contenders = pool
    .filter((f) => !(f.beltsHeld ?? "").includes(body))
    .map((f) => ({ fighter: f, points: calcPoints(f) }))
    .sort((a, b) => b.points - a.points);

  const bodyRankings: { fighter: (typeof fighters)[number]; rank: number; points: number }[] = [];
  for (const c of champions) {
    bodyRankings.push({ fighter: c, rank: 0, points: 9999 });
  }
  contenders.forEach((c, i) => {
    bodyRankings.push({ fighter: c.fighter, rank: i + 1, points: c.points });
  });

  return (
    <div className="overflow-hidden border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="w-16 px-4 py-3 text-left">{body} Rank</th>
            <th className="px-4 py-3 text-left">Fighter</th>
            <th className="px-4 py-3 text-left">Record</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bodyRankings.map((r) => {
            const isChamp = r.rank === 0;
            return (
              <tr
                key={`${r.fighter.username}-${body}`}
                className={isChamp ? "bg-primary/5" : "bg-card"}
              >
                <td className="px-4 py-3">
                  {isChamp ? (
                    <span className="inline-flex items-center gap-1 bg-primary px-2 py-0.5 text-xs font-bold uppercase text-primary-foreground">
                      <Trophy className="h-3 w-3" /> C
                    </span>
                  ) : (
                    <span className="font-mono text-base font-bold">#{r.rank}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to="/boxers/$username"
                    params={{ username: r.fighter.username }}
                    className="group flex items-center gap-3"
                  >
                    <div className="h-10 w-10 shrink-0">
                      <FighterAvatar name={r.fighter.displayName} square src={r.fighter.image} />
                    </div>
                    <div>
                      <p className="font-semibold group-hover:text-primary">
                        {r.fighter.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">@{r.fighter.username}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono">
                  {r.fighter.wins}-{r.fighter.losses}-{r.fighter.draws}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OverallTable({
  division,
  region,
  fighters,
}: {
  division: Division;
  region: string;
  fighters: typeof FIGHTERS;
}) {
  const ranked = getRanked(division, fighters, region === "all" ? undefined : region);
  if (ranked.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No fighters in {division} division yet.
      </p>
    );
  }
  return (
    <div className="overflow-hidden border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="w-16 px-4 py-3 text-left">Rank</th>
            <th className="px-4 py-3 text-left">Fighter</th>
            <th className="px-4 py-3 text-left">Record</th>
            <th className="px-4 py-3 text-left">Streak</th>
            <th className="px-4 py-3 text-left">KO %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ranked.map((f) => {
            const isChamp = f.displayRank === 0;
            const kos = Math.round((f.kos / Math.max(f.wins, 1)) * 100);
            return (
              <tr key={f.username} className={isChamp ? "bg-primary/5" : "bg-card"}>
                <td className="px-4 py-3">
                  {isChamp ? (
                    <span className="inline-flex items-center gap-1 bg-primary px-2 py-0.5 text-xs font-bold uppercase text-primary-foreground">
                      <Trophy className="h-3 w-3" /> C
                    </span>
                  ) : (
                    <span className="font-mono text-base font-bold">{f.displayRank}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to="/boxers/$username"
                    params={{ username: f.username }}
                    className="group flex items-center gap-3"
                  >
                    <div className="h-10 w-10 shrink-0">
                      <FighterAvatar name={f.displayName} square src={f.image} />
                    </div>
                    <div>
                      <p className="font-semibold group-hover:text-primary">{f.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        @{f.username} • "{f.nickname}"
                      </p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono">
                  {f.wins}-{f.losses}-{f.draws}
                </td>
                <td className="px-4 py-3">
                  <span className="bg-foreground px-2 py-0.5 text-xs font-bold text-background">
                    {f.streak}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-primary">{kos}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankingsSkeleton() {
  return (
    <>
      <section className="bg-foreground text-background">
        <div className="container-x py-14">
          <Skeleton className="h-3 w-32 bg-background/20" />
          <Skeleton className="mt-3 h-14 w-56 bg-background/20" />
        </div>
      </section>
      <section className="container-x py-12">
        <div className="flex gap-1.5">
          {[1, 2, 3].map((d) => (
            <Skeleton key={d} className="h-8 w-28 rounded-full" />
          ))}
        </div>
        <div className="mt-4 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((b) => (
            <Skeleton key={b} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <div className="mt-6 border border-border">
          {[1, 2, 3, 4, 5].map((r) => (
            <div key={r} className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
