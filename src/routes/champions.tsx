import { createFileRoute } from "@tanstack/react-router";
import { ChampionCard } from "@/components/ChampionCard";
import { getChampions, ensureFightersLoaded } from "@/data/fighters";
import { getPublicRankings } from "@/lib/admin.server";
import beltImg from "@/assets/belt.jpg";

export const Route = createFileRoute("/champions")({
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
          <p className="eyebrow text-primary">
            <span className="h-px w-7 bg-primary" />
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
          <p className="text-muted-foreground">No champions yet.</p>
        </section>
      )}
    </>
  );
}
