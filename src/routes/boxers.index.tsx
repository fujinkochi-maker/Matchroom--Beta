import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { ChampionCard } from "@/components/ChampionCard";
import { FighterCard } from "@/components/FighterCard";
import { FIGHTERS, getChampions, ensureFightersLoaded } from "@/data/fighters";
import { DIVISIONS, REGIONS, type Division } from "@/data/types";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/boxers/")({
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: BoxersSkeleton,
  loader: async () => {
    await ensureFightersLoaded();
    return { fighters: FIGHTERS, champs: getChampions() };
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
  const router = useRouter();
  const { fighters, champs } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [division, setDivision] = useState<Division | "all">("all");
  const [region, setRegion] = useState<string>("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await router.invalidate();
    setRefreshing(false);
  };

  const results = useMemo(() => {
    const needle = q.toLowerCase();
    const filtered = fighters.filter((f) => {
      if (division !== "all" && f.division !== division) return false;
      if (region !== "all" && f.region !== region) return false;
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
    });
    filtered.sort((a, b) => {
      if (a.rank === 0 && b.rank !== 0) return -1;
      if (b.rank === 0 && a.rank !== 0) return 1;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.displayRank - b.displayRank;
    });
    let dRank = 1;
    return filtered.map((f) => ({
      ...f,
      displayRank: f.rank === 0 ? 0 : dRank++,
    }));
  }, [q, division, region, filter, fighters]);

  return (
    <>
      <section className="bg-foreground text-background">
        <div className="container-x py-14">
          <p className="eyebrow">
            <span className="h-px w-7 bg-background" />
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

      {champs.length > 0 && (
        <section className="container-x py-12">
          <h2 className="mb-6 font-display text-2xl uppercase tracking-wider">
            <span className="red-bar" />
            Champions
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {champs.slice(0, 6).map((c) => (
              <ChampionCard key={c.username} fighter={c} beltsHeld={c.beltsHeld ? c.beltsHeld.split(",") : []} />
            ))}
          </div>
        </section>
      )}

      <section className="container-x pb-16">
        <div className="sticky top-16 z-30 -mx-4 border-y border-border bg-background/95 px-4 py-4 backdrop-blur md:mx-0 md:px-0">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
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
            <button
              onClick={refresh}
              disabled={refreshing}
              className="flex h-11 items-center gap-2 border border-border bg-background px-4 text-sm font-semibold uppercase tracking-wider outline-none transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["all", ...REGIONS].map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  region === r
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary hover:text-primary"
                }`}
              >
                {r === "all" ? "All Regions" : r}
              </button>
            ))}
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
            <FighterCard key={f.username} fighter={f} displayRank={f.displayRank} />
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

function BoxersSkeleton() {
  return (
    <>
      <section className="bg-foreground text-background">
        <div className="container-x py-14">
          <Skeleton className="h-3 w-16 bg-background/20" />
          <Skeleton className="mt-2 h-14 w-40 bg-background/20" />
        </div>
      </section>
      <section className="container-x py-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border border-border bg-card">
              <Skeleton className="aspect-[3/4] w-full rounded-none" />
            </div>
          ))}
        </div>
      </section>
      <section className="container-x pb-16">
        <div className="flex gap-3">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-24" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="border border-border bg-card">
              <Skeleton className="aspect-[3/4] w-full rounded-none" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
