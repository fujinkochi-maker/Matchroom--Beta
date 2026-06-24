import { useState } from "react";
import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import {
  ArrowRight,
  Trophy,
  Calendar,
  Newspaper,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import heroArena from "@/assets/hero-arena.jpg";
import faceoff from "@/assets/faceoff.jpg";
import { ChampionCard } from "@/components/ChampionCard";
import { Countdown } from "@/components/Countdown";
import { FighterAvatar } from "@/components/FighterAvatar";
import {
  getChampions,
  upcomingEvents,
  FIGHTERS,
  EVENTS,
  ARTICLES,
  VIDEOS,
  getByUsername,
  getRanked,
  ensureFightersLoaded,
  ensureEventsLoaded,
  ensureArticlesLoaded,
  ensureVideosLoaded,
} from "@/data/fighters";
import { DIVISIONS, type Division, type Fighter } from "@/data/types";

import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: HomeSkeleton,
  loader: async () => {
    await Promise.all([
      ensureFightersLoaded(),
      ensureEventsLoaded(),
      ensureArticlesLoaded(),
      ensureVideosLoaded(),
    ]);
    const events = upcomingEvents();
    const eventsWithFighters = events
      .map((e) => ({
        event: e,
        a: getByUsername(e.mainEvent.a),
        b: getByUsername(e.mainEvent.b),
      }))
      .filter(
        (
          x,
        ): x is {
          event: (typeof events)[number];
          a: NonNullable<ReturnType<typeof getByUsername>>;
          b: NonNullable<ReturnType<typeof getByUsername>>;
        } => !!x.a && !!x.b,
      );
    const topRanked = DIVISIONS.slice(0, 3).map((div) => ({
      division: div,
      fighters: getRanked(div).slice(0, 5),
    }));
    return {
      fighterCount: FIGHTERS.length,
      eventCount: EVENTS.length,
      champs: getChampions(),
      eventsWithFighters,
      topRanked,
      articles: ARTICLES.slice(0, 3),
      videos: VIDEOS.slice(0, 4),
      _t: Date.now(),
    };
  },
  head: () => ({
    meta: [
      { title: "Matchroom Boxing Beta — Home of Roblox Boxing" },
      {
        name: "description",
        content:
          "Cinematic championship boxing for the Roblox era. Champions, events, rankings, and the biggest fights in Boxing Beta.",
      },
      { property: "og:title", content: "Matchroom Boxing Beta — Home of Roblox Boxing" },
      {
        property: "og:description",
        content: "The Ultimate Roblox Boxing Championship Experience.",
      },
      { property: "og:image", content: heroArena },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { fighterCount, eventCount, champs, eventsWithFighters, topRanked, articles, videos } =
    Route.useLoaderData();
  return (
    <>
      <Hero fighterCount={fighterCount} eventCount={eventCount} />
      <ChampionsStrip champs={champs} />
      {eventsWithFighters.length > 0 && <EventCarousel events={eventsWithFighters} />}
      <RankingsTeaser topRanked={topRanked} />
      <LatestNews articles={articles} />
      <FeaturedVideos videos={videos} />
      <StoreTeaser />
    </>
  );
}

function Hero({ fighterCount, eventCount }: { fighterCount: number; eventCount: number }) {
  return (
    <section className="relative isolate overflow-hidden bg-foreground text-background">
      <img
        src={heroArena}
        alt="Matchroom Boxing Beta arena"
        className="absolute inset-0 h-full w-full object-cover opacity-55"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/70 to-foreground/20" />
      <div className="absolute inset-y-0 left-0 w-1 bg-primary md:w-2" />
      <div className="container-x relative grid min-h-[60vh] items-center gap-10 py-20 md:min-h-[78vh] lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="eyebrow animate-fade-in">
            <span className="h-px w-8 bg-background" /> Matchroom Presents
          </p>
          <h1 className="mt-3 font-display text-[14vw] uppercase leading-[0.85] tracking-tight md:text-[7.5rem] animate-slide-up animate-delay-100">
            Matchroom
            <span
              className="block text-transparent bg-clip-text"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, #fef3c7 0%, #f59e0b 40%, #b45309 70%, #92400e 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
              }}
            >
              EXCLUSIVES
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-background/80 md:text-lg animate-fade-in animate-delay-200">
            The Ultimate Roblox Boxing Championship Experience. Champions, contenders, world-class
            events and the fights that define the era.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-slide-up animate-delay-300">
            <Link
              to="/champions"
              className="group inline-flex items-center gap-2 bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary-dark"
            >
              View Champions{" "}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 border border-background/30 bg-background/5 px-6 py-4 text-sm font-bold uppercase tracking-wider text-background backdrop-blur hover:bg-background/10"
            >
              Upcoming Events <Calendar className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3 border-t border-background/15 pt-6 md:gap-6">
            <Stat n={String(DIVISIONS.length)} l="Divisions" />
            <Stat n={String(fighterCount)} l="Pro Fighters" />
            <Stat n={String(eventCount)} l="Events" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <p className="font-display text-3xl text-background">{n}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-background/70">{l}</p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow">
          <span className="h-px w-7 bg-primary" />
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-4xl uppercase tracking-tight md:text-5xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function ChampionsStrip({ champs }: { champs: ReturnType<typeof getChampions> }) {
  if (champs.length === 0) return null;
  return (
    <section className="container-x py-16 md:py-24">
      <SectionHeader
        eyebrow="Reigning Kings"
        title="Current Champions"
        action={
          <>
            <Link
              to="/champions"
              className="hidden text-sm font-bold uppercase tracking-wider text-primary hover:underline md:inline-flex"
            >
              View All →
            </Link>
            <Link
              to="/champions"
              className="text-xs font-bold uppercase tracking-wider text-primary hover:underline md:hidden"
            >
              View All →
            </Link>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
        {champs.slice(0, 3).map((c) => (
          <ChampionCard key={c.username} fighter={c} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {champs.slice(3).map((c) => (
          <ChampionCard key={c.username} fighter={c} />
        ))}
      </div>
    </section>
  );
}

function EventCarousel({
  events,
}: {
  events: {
    event: NonNullable<ReturnType<typeof upcomingEvents>>[number];
    a: NonNullable<ReturnType<typeof getByUsername>>;
    b: NonNullable<ReturnType<typeof getByUsername>>;
  }[];
}) {
  const [i, setI] = useState(0);
  const current = events[i];
  if (!current) return null;
  const { event, a, b } = current;
  return (
    <section className="bg-foreground text-background relative">
      {events.length > 1 && (
        <>
          <button
            onClick={() => setI((p) => Math.max(0, p - 1))}
            disabled={i === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 grid h-10 w-10 place-items-center rounded-full border border-background/30 bg-background/10 text-background backdrop-blur hover:bg-background/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setI((p) => Math.min(events.length - 1, p + 1))}
            disabled={i === events.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 grid h-10 w-10 place-items-center rounded-full border border-background/30 bg-background/10 text-background backdrop-blur hover:bg-background/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
      <div className="container-x grid gap-10 py-16 md:py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">
            <span className="h-px w-7 bg-background" />
            {events.length > 1 ? `Event ${i + 1} of ${events.length}` : "Next Event"}
          </p>
          <h2 className="mt-2 font-display text-4xl uppercase md:text-6xl">{event.name}</h2>
          <p className="mt-3 max-w-lg text-background/70">{event.tagline}</p>
          <p className="mt-2 text-sm text-background/60">
            {new Date(event.date).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            • {event.arena}
          </p>
          <div className="mt-6 max-w-md">
            <Countdown targetISO={event.date} />
          </div>
          <Link
            to="/events"
            className="mt-8 inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-primary-dark"
          >
            <Play className="h-4 w-4" /> View Fight Card
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[a, b].map((f) => (
            <div
              key={f.username}
              className="border border-background/20 bg-background/5 p-4 backdrop-blur"
            >
              <FighterAvatar name={f.displayName} src={f.image} />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-background/80">
                {f.division}
              </p>
              <p className="font-display text-xl uppercase">{f.displayName}</p>
              <p className="text-xs text-background/70">
                @{f.username} • {f.wins}-{f.losses}-{f.draws}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RankingsTeaser({
  topRanked,
}: {
  topRanked: { division: Division; fighters: Fighter[] }[];
}) {
  return (
    <section className="container-x py-16 md:py-24">
      <SectionHeader
        eyebrow="Pound for Pound"
        title="Top Rankings"
        action={
          <>
            <Link
              to="/rankings"
              className="hidden text-sm font-bold uppercase tracking-wider text-primary hover:underline md:inline-flex"
            >
              All Divisions →
            </Link>
            <Link
              to="/rankings"
              className="text-xs font-bold uppercase tracking-wider text-primary hover:underline md:hidden"
            >
              All Divisions →
            </Link>
          </>
        }
      />
      <div className="grid gap-6 md:grid-cols-3">
        {topRanked.map(({ division, fighters }) => (
          <div key={division} className="border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
              <p className="font-display text-sm uppercase tracking-[0.2em]">{division}</p>
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <ul className="divide-y divide-border">
              {fighters.map((f) => (
                <li key={f.username}>
                  <Link
                    to="/boxers/$username"
                    params={{ username: f.username }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface"
                  >
                    <span
                      className={`w-6 font-mono text-sm font-bold ${f.displayRank === 0 ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {f.displayRank === 0 ? "C" : f.displayRank}
                    </span>
                    <div className="h-9 w-9 shrink-0">
                      <FighterAvatar name={f.displayName} square src={f.image} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{f.displayName}</p>
                      <p className="truncate text-xs text-muted-foreground">@{f.username}</p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {f.wins}-{f.losses}-{f.draws}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function LatestNews({ articles }: { articles: typeof ARTICLES }) {
  if (articles.length === 0) return null;
  return (
    <section className="bg-surface">
      <div className="container-x py-16 md:py-24">
        <SectionHeader
          eyebrow="Newsroom"
          title="Latest News"
          action={
            <Link
              to="/news"
              className="hidden text-sm font-bold uppercase tracking-wider text-primary hover:underline md:inline-flex"
            >
              All News →
            </Link>
          }
        />
        <div className="grid gap-6 md:grid-cols-3">
          {articles.map((a) => (
            <Link
              key={a.slug}
              to="/news/$slug"
              params={{ slug: a.slug }}
              className="group flex flex-col border border-border bg-card transition-shadow hover:shadow-card"
            >
              <div
                className="relative aspect-[16/10] overflow-hidden bg-foreground/10"
                style={
                  a.image
                    ? {
                        backgroundImage: `url(${a.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <Newspaper className="absolute right-3 top-3 h-5 w-5 text-background/40" />
                <p className="absolute bottom-3 left-3 bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  {a.category}
                </p>
              </div>
              <div className="flex-1 p-5">
                <p className="text-xs text-muted-foreground">
                  {new Date(a.date).toLocaleDateString()} • {a.author}
                </p>
                <h3 className="mt-2 font-display text-xl uppercase leading-tight transition-colors group-hover:text-primary">
                  {a.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{a.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedVideos({ videos }: { videos: typeof VIDEOS }) {
  if (videos.length === 0) return null;
  return (
    <section className="container-x py-16 md:py-24">
      <SectionHeader
        eyebrow="Watch"
        title="Featured Videos"
        action={
          <Link
            to="/videos"
            className="hidden text-sm font-bold uppercase tracking-wider text-primary hover:underline md:inline-flex"
          >
            All Videos →
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {videos.map((v) => (
          <Link key={v.id} to="/videos" className="group block">
            <div className="relative aspect-video overflow-hidden border border-border bg-foreground/10">
              {v.thumbnail ? (
                <>
                  <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-110">
                      <Play className="h-6 w-6 fill-current" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-110">
                    <Play className="h-6 w-6 fill-current" />
                  </div>
                </div>
              )}
              <span className="absolute bottom-2 right-2 bg-foreground/80 px-1.5 py-0.5 font-mono text-xs text-background">
                {v.duration}
              </span>
              <span className="absolute left-2 top-2 bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                {v.category}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug group-hover:text-primary">
              {v.title}
            </p>
            <p className="text-xs text-muted-foreground">{v.views} views</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StoreTeaser() {
  return (
    <section className="bg-foreground text-background">
      <div className="container-x grid items-center gap-10 py-16 md:py-20 lg:grid-cols-2">
        <div>
          <p className="eyebrow">
            <span className="h-px w-7 bg-background" />
            Official Merchandise
          </p>
          <h2 className="mt-2 font-display text-4xl uppercase md:text-6xl">Matchroom Store</h2>
          <p className="mt-3 max-w-md text-background/70">
            Hoodies, training gloves, championship collections and limited drops — straight from the
            Boxing Beta locker room.
          </p>
          <Link
            to="/store"
            className="mt-6 inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-primary-dark"
          >
            Shop the Drop <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[10, 0, 164].map((h, i) => (
            <div
              key={i}
              className="aspect-[3/4] border border-background/20"
              style={{
                background: `linear-gradient(135deg, hsl(${h} 70% 40%), hsl(${h} 70% 18%))`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <>
      <section className="bg-foreground text-background">
        <div className="container-x py-20">
          <Skeleton className="h-3 w-48 bg-background/20" />
          <Skeleton className="mt-3 h-24 w-96 bg-background/20" />
          <Skeleton className="mt-3 h-4 w-80 bg-background/20" />
          <div className="mt-8 flex gap-3">
            <Skeleton className="h-12 w-44 bg-background/20" />
            <Skeleton className="h-12 w-44 bg-background/20" />
          </div>
        </div>
      </section>
      <section className="container-x py-16">
        <Skeleton className="h-6 w-48" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border bg-card">
              <Skeleton className="aspect-[3/4] w-full rounded-none" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
