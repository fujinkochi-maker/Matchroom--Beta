import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useState } from "react";

import { FighterAvatar } from "@/components/FighterAvatar";
import { DIVISIONS, type Division } from "@/data/types";
import { getRanked, ensureFightersLoaded, FIGHTERS } from "@/data/fighters";
import { getPublicRankings } from "@/lib/admin.server";

const BODIES = ["OVERALL", "WBC", "WBA", "IBF", "WBO"] as const;
type Body = (typeof BODIES)[number];

export const Route = createFileRoute("/rankings")({
  loader: async () => {
    await ensureFightersLoaded();
    const { rankings } = await getPublicRankings();
    return { rankings };
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
  const { rankings } = Route.useLoaderData();
  const [division, setDivision] = useState<Division>("Heavyweight");
  const [body, setBody] = useState<Body>("OVERALL");

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

        <div className="mt-6">
          <RankingTable division={division} body={body} rankings={rankings} />
        </div>
      </section>
    </>
  );
}

function RankingTable({
  division,
  body,
  rankings,
}: {
  division: Division;
  body: Body;
  rankings: any[];
}) {
  if (body === "OVERALL") {
    return <OverallTable division={division} />;
  }

  const bodyRankings = rankings
    .filter((r: any) => r.division === division && r.body === body)
    .sort((a: any, b: any) => a.rank - b.rank);

  if (bodyRankings.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No {body} rankings for {division} yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="w-16 px-4 py-3 text-left">{body} Rank</th>
            <th className="px-4 py-3 text-left">Fighter</th>
            <th className="px-4 py-3 text-left">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bodyRankings.map((r: any) => {
            const isChamp = r.rank === 0;
            const fighter = FIGHTERS.find((f) => f.username === r.fighter_username);
            return (
              <tr
                key={`${r.fighter_username}-${r.body}`}
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
                    params={{ username: r.fighter_username }}
                    className="group flex items-center gap-3"
                  >
                    <div className="h-10 w-10 shrink-0">
                      <FighterAvatar name={fighter?.displayName ?? r.fighter_username} square src={fighter?.image} />
                    </div>
                    <div>
                      <p className="font-semibold group-hover:text-primary">
                        {fighter?.displayName ?? r.fighter_username}
                      </p>
                      <p className="text-xs text-muted-foreground">@{r.fighter_username}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OverallTable({ division }: { division: Division }) {
  const ranked = getRanked(division);
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
