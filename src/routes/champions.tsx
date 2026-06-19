import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { ChampionCard } from "@/components/ChampionCard";
import { getChampions, ensureFightersLoaded } from "@/data/fighters";
import { getPublicRankings } from "@/lib/admin.server";
import { Skeleton } from "@/components/ui/skeleton";
import beltImg from "@/assets/belt.jpg";

export const Route = createFileRoute("/champions")({
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: ChampionsSkeleton,
  loader: async () => {
    await ensureFightersLoaded();
    const { rankings } = await getPublicRankings();
    const champs = getChampions();
    const beltMap: Record<string, string[]> = {};
    for (const r of rankings) {
      if (r.rank === 0) {
        if (!beltMap[r.fighter_username]) beltMap[r.fighter_username] = [];
        beltMap[r.fighter_username].push(r.body);
      }
    }
    return { champions: champs, beltMap };
  },
  head: () => ({
    meta: [
      { title: "Champions — Matchroom Boxing Beta" },
      {
        name: "description",
        content:
          "Every reigning Boxing Beta champion across all nine divisions, from flyweight to heavyweight.",
      },
      { property: "og:title", content: "Champions — Matchroom Boxing Beta" },
      {
        property: "og:description",
        content: "Meet the reigning Boxing Beta champions across all nine divisions.",
      },
      { property: "og:image", content: beltImg },
    ],
  }),
  component: ChampionsPage,
});

function ChampionsPage() {
  const { champions, beltMap } = Route.useLoaderData();
  return (
    <>
      <section className="relative isolate overflow-hidden bg-foreground text-background">
        <img
          src={beltImg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40" />
        <div className="container-x relative py-20">
          <p className="eyebrow">
            <span className="h-px w-7 bg-background" />
            The Crown Jewels
          </p>
          <h1 className="mt-2 font-display text-6xl uppercase tracking-tight md:text-7xl">
            Champions
          </h1>
          <p className="mt-3 max-w-2xl text-background/70">
            Nine divisions. Nine kings. Every reigning champion in Boxing Beta, ranked, profiled,
            and ready to defend.
          </p>
        </div>
      </section>
      {champions.length > 0 ? (
        <section className="container-x py-12 md:py-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {champions.map((c: any) => (
              <ChampionCard key={c.username} fighter={c} beltsHeld={beltMap[c.username] ?? []} />
            ))}
          </div>
        </section>
      ) : (
        <section className="container-x py-16 text-center">
          <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-semibold">No champions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The first champion will be crowned soon.
          </p>
        </section>
      )}
    </>
  );
}

function ChampionsSkeleton() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-foreground text-background">
        <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40" />
        <div className="container-x relative py-20">
          <Skeleton className="h-3 w-32 bg-background/20" />
          <Skeleton className="mt-4 h-16 w-96 bg-background/20" />
          <Skeleton className="mt-3 h-4 w-80 bg-background/20" />
        </div>
      </section>
      <section className="container-x py-12 md:py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border border-border bg-card">
              <Skeleton className="aspect-[3/4] w-full rounded-none" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
