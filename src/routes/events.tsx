import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Play } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { FighterAvatar } from "@/components/FighterAvatar";
import { EVENTS, FIGHTERS, ensureEventsLoaded, ensureFightersLoaded } from "@/data/fighters";
import type { Fighter } from "@/data/types";
import { hashHue } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/events")({
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: EventsSkeleton,
  loader: async () => {
    await Promise.all([ensureEventsLoaded(), ensureFightersLoaded()]);
    return { events: EVENTS, fighters: FIGHTERS };
  },
  head: () => ({
    meta: [
      { title: "Events — Matchroom Boxing Beta" },
      {
        name: "description",
        content:
          "Upcoming and past Matchroom Boxing Beta events. Fight cards, main events, countdowns, and arenas.",
      },
      { property: "og:title", content: "Events — Matchroom Boxing Beta" },
      {
        property: "og:description",
        content: "Every Matchroom Boxing Beta event, main event, and full card.",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { events, fighters } = Route.useLoaderData();
  const upcoming = events.filter((e) => e.status === "upcoming");
  const past = events.filter((e) => e.status === "past");
  return (
    <>
      <section className="bg-foreground text-background">
        <div className="container-x py-14">
          <p className="eyebrow text-primary">
            <span className="h-px w-7 bg-primary" />
            Fight Nights
          </p>
          <h1 className="mt-2 font-display text-6xl uppercase md:text-7xl">Events</h1>
          <p className="mt-3 max-w-xl text-background/70">
            The biggest nights in Roblox boxing — main events, fight cards, and championship
            moments.
          </p>
        </div>
      </section>

      <section className="container-x py-12">
        <h2 className="mb-6 font-display text-3xl uppercase">
          <span className="red-bar" />
          Upcoming
        </h2>
        {upcoming.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {upcoming.map((e) => (
              <EventCard key={e.slug} event={e} fighters={fighters} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No upcoming events.</p>
        )}
      </section>

      <section className="container-x pb-16">
        <h2 className="mb-6 font-display text-3xl uppercase">
          <span className="red-bar" />
          Past Events
        </h2>
        {past.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {past.map((e) => (
              <div key={e.slug} className="border border-border bg-card p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {new Date(e.date).toLocaleDateString()}
                </p>
                <h3 className="mt-1 font-display text-xl uppercase">{e.name}</h3>
                <p className="text-sm text-muted-foreground">{e.tagline}</p>
                <p className="mt-2 text-xs">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  {e.arena}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No past events.</p>
        )}
      </section>
    </>
  );
}

function EventCard({
  event,
  fighters,
}: {
  event: (typeof EVENTS)[number];
  fighters: typeof FIGHTERS;
}) {
  const a = fighters.find((f) => f.username === event.mainEvent.a);
  const b = fighters.find((f) => f.username === event.mainEvent.b);
  if (!a || !b) return null;
  return (
    <article className="overflow-hidden border border-border bg-card shadow-card">
      <div className="relative bg-foreground p-6 text-background">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: `linear-gradient(120deg, hsl(${hashHue(a.displayName)} 70% 30%), hsl(${hashHue(b.displayName)} 70% 30%))`,
          }}
        />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            {event.mainEvent.title}
          </p>
          <h3 className="mt-1 font-display text-3xl uppercase leading-none">{event.name}</h3>
          <p className="mt-1 text-xs text-background/70">
            {new Date(event.date).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            • {event.arena}
          </p>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <FighterMini f={a} side="left" />
            <span className="font-display text-3xl text-primary">VS</span>
            <FighterMini f={b} side="right" />
          </div>

          <div className="mt-5">
            <Countdown targetISO={event.date} compact />
          </div>
        </div>
      </div>
      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Full Card
        </p>
        <ul className="mt-2 divide-y divide-border">
          {event.card.map((b, i) => {
            const aName = fighters.find((f) => f.username === b.a)?.displayName;
            const bName = fighters.find((f) => f.username === b.b)?.displayName;
            return (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="font-semibold">
                  {aName} <span className="text-muted-foreground">vs</span> {bName}
                </span>
                <span className="text-xs uppercase tracking-wider text-primary">{b.weight}</span>
              </li>
            );
          })}
        </ul>
        <button className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark">
          <Play className="h-4 w-4" /> Watch Now
        </button>
      </div>
    </article>
  );
}

function FighterMini({ f, side }: { f: Fighter | undefined; side: "left" | "right" }) {
  if (!f) return null;
  return (
    <div className={side === "right" ? "text-right" : ""}>
      <div className={`inline-block w-20 ${side === "right" ? "ml-auto" : ""}`}>
        <FighterAvatar name={f.displayName} square src={f.image} />
      </div>
      <p className="mt-2 font-display text-sm uppercase leading-tight">{f.displayName}</p>
      <p className="font-mono text-[10px] text-background/60">
        {f.wins}-{f.losses}-{f.draws}
      </p>
    </div>
  );
}

function EventsSkeleton() {
  return (
    <>
      <section className="bg-foreground text-background">
        <div className="container-x py-14">
          <Skeleton className="h-3 w-24 bg-background/20" />
          <Skeleton className="mt-3 h-14 w-48 bg-background/20" />
        </div>
      </section>
      <section className="container-x py-12">
        <Skeleton className="h-8 w-36" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="border border-border bg-card">
              <div className="bg-foreground p-6">
                <Skeleton className="h-3 w-32 bg-background/20" />
                <Skeleton className="mt-1 h-8 w-64 bg-background/20" />
                <Skeleton className="mt-1 h-3 w-48 bg-background/20" />
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <Skeleton className="h-20 w-20 rounded-full bg-background/20" />
                  <Skeleton className="h-8 w-12 bg-background/20" />
                  <Skeleton className="h-20 w-20 rounded-full bg-background/20" />
                </div>
              </div>
              <div className="p-5">
                <Skeleton className="h-3 w-20" />
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="mt-2 h-5 w-full" />
                ))}
                <Skeleton className="mt-4 h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
