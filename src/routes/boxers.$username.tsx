import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Trophy, ArrowLeft, Play, RefreshCw, Heart } from "lucide-react";
import { FighterAvatar } from "@/components/FighterAvatar";
import {
  getByUsername,
  getNewsForFighter,
  getVideosForFighter,
  getPostsForFighter,
  FIGHTERS,
  POSTS,
  ensureFightersLoaded,
  ensureArticlesLoaded,
  ensureVideosLoaded,
  ensurePostsLoaded,
} from "@/data/fighters";
import { hashHue } from "@/lib/utils";
import { getFighterSession } from "@/lib/discord-auth";
import { getPublicRankings, likePost, unlikePost, deletePost } from "@/lib/admin.server";
import { toast } from "sonner";
import type { Post } from "@/data/types";

export const Route = createFileRoute("/boxers/$username")({
  loader: async ({ params }) => {
    await Promise.all([
      ensureFightersLoaded(),
      ensureArticlesLoaded(),
      ensureVideosLoaded(),
      ensurePostsLoaded(),
    ]);
    const fighter = getByUsername(params.username);
    if (!fighter) throw notFound();
    const { rankings } = await getPublicRankings();
    const fighterRanks = rankings.filter((r: any) => r.fighter_username === params.username);
    return { fighter, fighterRanks };
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
  const router = useRouter();
  const { fighter: f, fighterRanks } = Route.useLoaderData();
  const news = getNewsForFighter(f.username);
  const videos = getVideosForFighter(f.username);
  const kos = Math.round((f.kos / Math.max(f.wins, 1)) * 100);
  const opponents = FIGHTERS.filter(
    (x) => x.division === f.division && x.username !== f.username,
  ).slice(0, 4);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await router.invalidate();
    setRefreshing(false);
  };

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
            <div className="flex items-center justify-between">
              <Link
                to="/boxers"
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-background/60 hover:text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Boxers
              </Link>
              <button
                onClick={refresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-background/60 hover:text-primary disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
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

      {/* Road to Belt */}
      <section className="container-x py-8">
        <h2 className="font-display text-3xl uppercase">
          <span className="red-bar" />
          Road to Belt
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Current ranking per sanctioning body.
          {fighterRanks.some((r: any) => r.rank === 0) && (
            <span className="ml-2 inline-flex items-center gap-1 bg-primary px-2 py-0.5 text-xs font-bold uppercase text-primary-foreground">
              <Trophy className="h-3 w-3" /> Unified Champion
            </span>
          )}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {fighterRanks.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">Not yet ranked.</p>
          )}
          {fighterRanks.map((r: any) => {
            const isChamp = r.rank === 0;
            const isMandatory = r.rank === 1;
            return (
              <div
                key={r.body}
                className={`border p-4 ${isChamp ? "border-primary bg-primary/10" : "border-border bg-card"}`}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {r.body}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p className={`font-display text-2xl ${isChamp ? "text-primary" : ""}`}>
                    {isChamp ? "CHAMP" : `#${r.rank}`}
                  </p>
                  <span className="font-mono text-xs text-muted-foreground">{r.points} pts</span>
                </div>
                {isMandatory && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    Mandatory Challenger
                  </p>
                )}
              </div>
            );
          })}
        </div>
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

            {/* Feed Section */}
            <h3 className="mt-10 font-display text-2xl uppercase">
              <span className="red-bar" />
              Recent Activity
            </h3>
            <div className="mt-4 space-y-3">
              <FighterFeed username={f.username} />
            </div>

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

function FighterFeed({ username }: { username: string }) {
  const session = getFighterSession();
  const posts = getPostsForFighter(username);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const router = useRouter();

  const handleLike = async (postId: string) => {
    if (!session?.token) return;
    try {
      if (likedPosts.has(postId)) {
        await unlikePost({ data: { token: session.token, postId } });
        setLikedPosts((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await likePost({ data: { token: session.token, postId } });
        setLikedPosts((prev) => {
          const next = new Set(prev);
          next.add(postId);
          return next;
        });
      }
    } catch {
      /* best-effort */
    }
  };

  const handleDelete = async (postId: string) => {
    if (!session?.token) return;
    try {
      await deletePost({ data: { token: session.token, postId } });
      await router.invalidate();
      toast.success("Post deleted");
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete");
    }
  };

  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <>
      {[...posts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((p) => (
          <div key={p.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm">{p.content}</p>
                {p.imageUrl && (
                  <div className="mt-2 overflow-hidden rounded-lg border border-border">
                    <img src={p.imageUrl} alt="" className="w-full object-cover" loading="lazy" />
                  </div>
                )}
                {p.videoUrl && (
                  <div className="mt-2 overflow-hidden rounded-lg border border-border">
                    <iframe
                      src={p.videoUrl.replace("watch?v=", "embed/").split("&")[0]}
                      className="aspect-video w-full"
                      allowFullScreen
                      title="Video"
                    />
                  </div>
                )}
                {p.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.tags.map((t) => {
                      const fighter = FIGHTERS.find((f) => f.username === t);
                      return (
                        <Link
                          key={t}
                          to="/boxers/$username"
                          params={{ username: t }}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-primary"
                        >
                          @{fighter?.displayName ?? t}
                        </Link>
                      );
                    })}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <button
                    onClick={() => handleLike(p.id)}
                    disabled={!session?.token}
                    className={`inline-flex items-center gap-1 ${likedPosts.has(p.id) ? "text-primary" : ""} hover:text-primary disabled:opacity-50`}
                  >
                    <Heart className={`h-3 w-3 ${likedPosts.has(p.id) ? "fill-current" : ""}`} />
                  </button>
                  <span>{formatTime(p.createdAt)}</span>
                  {session?.username === p.authorUsername && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="ml-auto text-muted-foreground hover:text-destructive"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
    </>
  );
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function Meta({ l, v }: { l: string; v: string | number }) {
  return (
    <div className="border-l-2 border-primary pl-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{l}</p>
      <p className="mt-0.5 font-display text-lg">{v}</p>
    </div>
  );
}
