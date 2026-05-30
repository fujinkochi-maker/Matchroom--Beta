import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useState } from "react";

import { FighterAvatar } from "@/components/FighterAvatar";
import { DIVISIONS, type Division } from "@/data/types";
import { getRanked, loadDataFromSupabase } from "@/data/fighters";

export const Route = createFileRoute("/rankings")({
  loader: async () => {
    await loadDataFromSupabase();
  },
  head: () => ({
    meta: [
      { title: "Rankings — Matchroom Boxing Beta" },
      {
        name: "description",
        content: "Official Matchroom Boxing Beta rankings across all nine weight divisions.",
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
  const [division, setDivision] = useState<Division>("Heavyweight");
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
            Updated monthly by the Matchroom rankings panel.
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
        <div className="mt-6">
          <RankingTable division={division} />
        </div>
      </section>
    </>
  );
}

function RankingTable({ division }: { division: Division }) {
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
            const isChamp = f.rank === 0;
            const kos = Math.round((f.kos / Math.max(f.wins, 1)) * 100);
            return (
              <tr key={f.username} className={isChamp ? "bg-primary/5" : "bg-card"}>
                <td className="px-4 py-3">
                  {isChamp ? (
                    <span className="inline-flex items-center gap-1 bg-primary px-2 py-0.5 text-xs font-bold uppercase text-primary-foreground">
                      <Trophy className="h-3 w-3" /> C
                    </span>
                  ) : (
                    <span className="font-mono text-base font-bold">{f.rank}</span>
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
