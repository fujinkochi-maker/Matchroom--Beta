import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import { ChampionCard } from "@/components/ChampionCard";
import { FighterCard } from "@/components/FighterCard";
import { FIGHTERS, getChampions, loadDataFromSupabase } from "@/data/fighters";
import { DIVISIONS, type Division } from "@/data/types";

export const Route = createFileRoute("/boxers/")({
  loader: async () => {
    await loadDataFromSupabase();
  },
  head: () => ({
    meta: [
      { title: "Boxers — Matchroom Boxing Beta" },
      {
        name: "description",
        content:
          "Browse every active Boxing Beta fighter. Search by name, filter by division, and find your favorite contenders.",
      },
      { property: "og:title", content: "Boxers — Matchroom Boxing Beta" },
      {
        property: "og:description",
        content: "Every active Boxing Beta fighter, with search and filters.",
      },
    ],
  }),
  component: BoxersPage,
});

type Filter = "all" | "champion" | "top" | "undefeated" | "ko";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All Fighters" },
  { id: "champion", label: "Champions" },
  { id: "top", label: "Top 3 Ranked" },
  { id: "undefeated", label: "Undefeated" },
  { id: "ko", label: "KO Specialists" },
];

function BoxersPage() {
  const champs = getChampions();
  const [q, setQ] = useState("");
  const [division, setDivision] = useState<Division | "all">("all");
  const [filter, setFilter] = useState<Filter>("all");

  const results = useMemo(() => {
    const needle = q.toLowerCase();
    return FIGHTERS.filter((f) => {
      if (division !== "all" && f.division !== division) return false;
      if (filter === "champion" && f.rank !== 0) return false;
      if (filter === "top" && f.rank > 3) return false;
      if (filter === "undefeated" && f.losses > 0) return false;
      if (filter === "ko" && f.kos / Math.max(f.wins, 1) < 0.6) return false;
      if (!needle) return true;
      return (
        f.username.toLowerCase().includes(needle) ||
        f.displayName.toLowerCase().includes(needle) ||
        f.nickname.toLowerCase().includes(needle) ||
        f.division.toLowerCase().includes(needle) ||
        `${f.wins}-${f.losses}-${f.draws}`.includes(needle)
      );
    }).sort((a, b) => a.rank - b.rank);
  }, [q, division, filter]);

  return (
    <>
      <section className="bg-foreground text-background">
        <div className="container-x py-14">
          <p className="eyebrow text-primary">
            <span className="h-px w-7 bg-primary" />
            Roster
          </p>
          <h1 className="mt-2 font-display text-6xl uppercase tracking-tight md:text-7xl">
            Boxers
          </h1>
          <p className="mt-3 max-w-xl text-background/70">
            Every active Boxing Beta fighter — champions, contenders, and the next generation of
            stars.
          </p>
        </div>
      </section>

      <section className="container-x py-12">
        <h2 className="mb-6 font-display text-2xl uppercase tracking-wider">
          <span className="red-bar" />
          Champions
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {champs.slice(0, 6).map((c) => (
            <ChampionCard key={c.username} fighter={c} />
          ))}
        </div>
      </section>

      <section className="container-x pb-16">
        <div className="sticky top-16 z-30 -mx-4 border-y border-border bg-background/95 px-4 py-4 backdrop-blur md:mx-0 md:px-0">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search fighter, username, division, or record..."
                className="h-11 w-full border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value as Division | "all")}
              className="h-11 border border-border bg-background px-3 text-sm font-semibold uppercase tracking-wider outline-none focus:border-primary"
            >
              <option value="all">All Divisions</option>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  filter === f.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary hover:text-primary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">{results.length} fighters</p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {results.map((f) => (
            <FighterCard key={f.username} fighter={f} />
          ))}
        </div>
        {results.length === 0 && (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            No fighters match those filters.
          </p>
        )}
      </section>
    </>
  );
}
