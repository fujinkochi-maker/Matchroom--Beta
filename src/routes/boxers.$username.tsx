import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Trophy, ArrowLeft, Play } from "lucide-react";
import { FighterAvatar } from "@/components/FighterAvatar";
import {
  getByUsername,
  getNewsForFighter,
  getVideosForFighter,
  FIGHTERS,
  ensureFightersLoaded,
  ensureArticlesLoaded,
  ensureVideosLoaded,
} from "@/data/fighters";
import { hashHue } from "@/lib/utils";

export const Route = createFileRoute("/boxers/$username")({
  loader: async ({ params }) => {
    await Promise.all([ensureFightersLoaded(), ensureArticlesLoaded(), ensureVideosLoaded()]);
    const fighter = getByUsername(params.username);
    if (!fighter) throw notFound();
    return { fighter };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          {
            title: `${loaderData.fighter.displayName} (@${loaderData.fighter.username}) — Matchroom Boxing Beta`,
          },
          {
            name: "description",
            content: `${loaderData.fighter.displayName} — ${loaderData.fighter.division}, ranked ${loaderData.fighter.rank === 0 ? "Champion" : `#${loaderData.fighter.rank}`}. Record ${loaderData.fighter.wins}-${loaderData.fighter.losses}-${loaderData.fighter.draws}.`,
          },
          {
            property: "og:title",
            content: `${loaderData.fighter.displayName} — Matchroom Boxing Beta`,
          },
          {
            property: "og:description",
            content: `Profile, stats, fight history and highlights for ${loaderData.fighter.displayName}.`,
          },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="container-x py-24 text-center">
      <h1 className="font-display text-4xl uppercase">Fighter not found</h1>
      <Link to="/boxers" className="mt-4 inline-block text-primary">
        ← Back to Boxers
      </Link>
    </div>
  ),
  component: FighterProfilePage,
});

function FighterProfilePage() {
  const { fighter: f } = Route.useLoaderData();
  const news = getNewsForFighter(f.username);
  const videos = getVideosForFighter(f.username);
  const kos = Math.round((f.kos / Math.max(f.wins, 1)) * 100);
  const opponents = FIGHTERS.filter(
    (x) => x.division === f.division && x.username !== f.username,
  ).slice(0, 4);

  return (
    <>
      {/* Hero banner */}
      <section className="relative bg-foreground text-background">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(60% 80% at 70% 30%, hsl(${hashHue(f.displayName)} 70% 45%), transparent 60%)`,
          }}
        />
        <div className="container-x relative grid gap-8 py-12 md:grid-cols-[280px_1fr] md:items-end">
          <div className="w-full max-w-[280px]">
            <FighterAvatar name={f.displayName} src={f.image} />
          </div>
          <div>
            <Link
              to="/boxers"
              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-background/60 hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Boxers
            </Link>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {f.division}
            </p>
            <h1 className="mt-1 font-display text-6xl uppercase leading-none md:text-7xl">
              {f.displayName}
            </h1>
            <p className="mt-2 text-lg italic text-background/70">
              "{f.nickname}" • @{f.username}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                {f.rank === 0 ? "Champion" : `Ranked #${f.rank}`}
              </span>
              {f.beltsHeld
                ? f.beltsHeld.split(",").map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 border border-background/30 px-2 py-1 text-xs font-bold uppercase tracking-wider"
                    >
                      <Trophy className="h-3 w-3 text-primary" /> {name}
                    </span>
                  ))
                : Array.from({ length: f.belts }).map((_, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 border border-background/30 px-2 py-1 text-xs font-bold uppercase tracking-wider"
                    >
                      <Trophy className="h-3 w-3 text-primary" /> Belt
                    </span>
                  ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="container-x mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Wins", f.wins],
          ["Losses", f.losses],
          ["Draws", f.draws],
          ["KO %", `${kos}%`],
        ].map(([l, v]) => (
          <div key={String(l)} className="border border-border bg-card p-4 shadow-card">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {l}
            </p>
            <p className="mt-1 font-display text-2xl">{v}</p>
          </div>
        ))}
      </section>

      {/* Career */}
      <section className="container-x py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="font-display text-3xl uppercase">
              <span className="red-bar" />
              Career Overview
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">{f.bio}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Meta l="Debut" v={f.debut} />
              <Meta l="Stance" v={f.stance} />
              <Meta l="Streak" v={f.streak} />
              <Meta l="Titles" v={`${f.belts}`} />
            </dl>

            <h3 className="mt-10 font-display text-2xl uppercase">
              <span className="red-bar" />
              Fight History
            </h3>
            <div className="mt-4 overflow-x-auto border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Opponent</th>
                    <th className="px-4 py-3 text-left">Result</th>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {f.history.map((h: (typeof f.history)[number], i: number) => (
                    <tr key={i} className="bg-card">
                      <td className="px-4 py-3 font-semibold">{h.opponent}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-bold ${
                            h.result === "W"
                              ? "bg-primary text-primary-foreground"
                              : h.result === "L"
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {h.result}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{h.method}</td>
                      <td className="px-4 py-3 text-muted-foreground">{h.date}</td>
                      <td className="px-4 py-3 text-muted-foreground">{h.event}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-8">
            <div>
              <h3 className="font-display text-xl uppercase">
                <span className="red-bar" />
                Related News
              </h3>
              <ul className="mt-3 space-y-3">
                {(news.length ? news : []).map((a) => (
                  <li key={a.slug}>
                    <Link
                      to="/news/$slug"
                      params={{ slug: a.slug }}
                      className="group block border border-border bg-card p-3 hover:border-primary"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {a.category}
                      </p>
                      <p className="mt-1 text-sm font-semibold group-hover:text-primary">
                        {a.title}
                      </p>
                    </Link>
                  </li>
                ))}
                {news.length === 0 && (
                  <p className="text-sm text-muted-foreground">No articles yet.</p>
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-xl uppercase">
                <span className="red-bar" />
                Related Videos
              </h3>
              <ul className="mt-3 space-y-3">
                {(videos.length ? videos : []).map((v) => (
                  <li key={v.id} className="flex gap-3 border border-border bg-card p-3">
                    <div className="relative aspect-video w-28 shrink-0 bg-foreground/10">
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary">
                          <Play className="h-3.5 w-3.5 fill-current text-primary-foreground" />
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {v.category}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold">{v.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.duration} • {v.views}
                      </p>
                    </div>
                  </li>
                ))}
                {videos.length === 0 && (
                  <p className="text-sm text-muted-foreground">No videos yet.</p>
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-xl uppercase">
                <span className="red-bar" />
                Rivals
              </h3>
              {opponents.length > 0 ? (
                <ul className="mt-3 grid grid-cols-2 gap-2">
                  {opponents.map((o) => (
                    <li key={o.username}>
                      <Link
                        to="/boxers/$username"
                        params={{ username: o.username }}
                        className="group block border border-border bg-card p-2 hover:border-primary"
                      >
                        <div className="aspect-square">
                          <FighterAvatar name={o.displayName} square src={o.image} />
                        </div>
                        <p className="mt-2 truncate text-xs font-semibold group-hover:text-primary">
                          {o.displayName}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {o.wins}-{o.losses}-{o.draws}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No rivals in this division.</p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function Meta({ l, v }: { l: string; v: string | number }) {
  return (
    <div className="border-l-2 border-primary pl-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{l}</p>
      <p className="mt-0.5 font-display text-lg">{v}</p>
    </div>
  );
}
