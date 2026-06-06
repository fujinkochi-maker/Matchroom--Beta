import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MapPin, Calendar, Trophy, Users } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { FighterAvatar } from "@/components/FighterAvatar";
import {
  EVENTS,
  FIGHTERS,
  ensureEventsLoaded,
  ensureFightersLoaded,
  ensureSignupsLoaded,
  EVENT_SIGNUPS,
} from "@/data/fighters";
import { CARD_SLOT_LABELS, type CardSlot } from "@/data/types";
import type { Division } from "@/data/types";
import { cn, lastName } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/events/$slug")({
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: EventDetailSkeleton,
  loader: async ({ params }) => {
    await Promise.all([ensureEventsLoaded(), ensureFightersLoaded(), ensureSignupsLoaded()]);
    const event = EVENTS.find((e) => e.slug === params.slug);
    if (!event) throw notFound();
    return { event, fighters: FIGHTERS, signups: EVENT_SIGNUPS };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData.event.name} — Matchroom Boxing Beta` },
      {
        name: "description",
        content: `${loaderData.event.name} at ${loaderData.event.arena}. ${loaderData.event.mainEvent.title}: ${loaderData.event.mainEvent.a} vs ${loaderData.event.mainEvent.b}.`,
      },
    ],
  }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { event, fighters } = Route.useLoaderData();
  const a = fighters.find((f) => f.username === event.mainEvent.a);
  const b = fighters.find((f) => f.username === event.mainEvent.b);

  const signups = Route.useLoaderData().signups.filter((s) => s.eventSlug === event.slug);
  const signedUpFighters = signups
    .map((s) => fighters.find((f) => f.username === s.fighterUsername))
    .filter(Boolean);

  const groupedBySlot = {} as Record<CardSlot, typeof event.card>;
  for (const entry of event.card) {
    const slot = entry.slot;
    if (!groupedBySlot[slot]) groupedBySlot[slot] = [];
    groupedBySlot[slot].push(entry);
  }

  const mainCard = event.card.find((c) => c.slot === "main");
  const mainTitle = mainCard?.title || event.mainEvent.title;

  return (
    <>
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="absolute inset-0 bg-neutral-600/30" />
        <div className="container-x relative py-14">
          {event.status === "upcoming" ? (
            <span className="inline-block rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              Upcoming
            </span>
          ) : (
            <span className="inline-block rounded-full bg-background/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background">
              Past Event
            </span>
          )}
          <h1 className="mt-3 font-display text-5xl uppercase leading-none md:text-7xl">
            {event.name}
          </h1>
          <p className="mt-2 max-w-2xl text-base text-background/70">{event.tagline}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-background/60">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(event.date).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {event.arena}
            </span>
          </div>
          {event.status === "upcoming" && (
            <div className="mt-6">
              <Countdown targetISO={event.date} />
            </div>
          )}
        </div>
      </section>

      <section className="container-x -mt-10">
        <div className="relative overflow-hidden border border-border bg-card shadow-card">
          <div className="p-6 md:p-10">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {mainTitle}
            </p>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-8">
              <div className="text-center">
                <div className="mx-auto w-24 md:w-32">
                  <FighterAvatar name={lastName(a?.displayName ?? event.mainEvent.a)} square src={a?.image} />
                </div>
                <p className="mt-2 font-display text-lg uppercase leading-tight md:text-2xl">
                  {lastName(a?.displayName ?? event.mainEvent.a)}
                </p>
                {a && (
                  <p className="font-mono text-xs text-muted-foreground">
                    {a.wins}-{a.losses}-{a.draws} ({a.kos} KOs)
                  </p>
                )}
                {a?.rank === 0 && (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary">
                    <Trophy className="h-3 w-3" /> Champion
                  </span>
                )}
              </div>
              <div className="text-center">
                <span className="font-display text-4xl text-primary md:text-6xl">VS</span>
              </div>
              <div className="text-center">
                <div className="mx-auto w-24 md:w-32">
                  <FighterAvatar name={lastName(b?.displayName ?? event.mainEvent.b)} square src={b?.image} />
                </div>
                <p className="mt-2 font-display text-lg uppercase leading-tight md:text-2xl">
                  {lastName(b?.displayName ?? event.mainEvent.b)}
                </p>
                {b && (
                  <p className="font-mono text-xs text-muted-foreground">
                    {b.wins}-{b.losses}-{b.draws} ({b.kos} KOs)
                  </p>
                )}
                {b?.rank === 0 && (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary">
                    <Trophy className="h-3 w-3" /> Champion
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {event.card.length > 0 && (
        <section className="container-x py-12">
          <h2 className="mb-6 font-display text-3xl uppercase">
            <span className="red-bar" />
            Fight Card
          </h2>
          <div className="space-y-6">
            {(["main", "comain", "maincard", "prelim"] as CardSlot[]).map((slot) => {
              const entries = groupedBySlot[slot];
              if (!entries?.length) return null;
              return (
                <div key={slot}>
                  <h3 className="mb-3 border-b border-border pb-1 font-display text-lg uppercase tracking-wider text-primary">
                    {CARD_SLOT_LABELS[slot]}
                  </h3>
                  <div className="divide-y divide-border">
                    {entries.map((entry, i) => {
                      const fa = fighters.find((f) => f.username === entry.a);
                      const fb = fighters.find((f) => f.username === entry.b);
                      return (
                        <div key={i} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <Link
                              to="/boxers/$username"
                              params={{ username: entry.a }}
                              className="group flex items-center gap-2"
                            >
                              <FighterAvatar
                                name={lastName(fa?.displayName ?? entry.a)}
                                square
                                className="h-8 w-8"
                              />
                              <span className="font-semibold group-hover:text-primary">
                                {lastName(fa?.displayName ?? entry.a)}
                              </span>
                            </Link>
                            <span className="font-display text-sm text-muted-foreground">VS</span>
                            <Link
                              to="/boxers/$username"
                              params={{ username: entry.b }}
                              className="group flex items-center gap-2"
                            >
                              <span className="font-semibold group-hover:text-primary">
                                {lastName(fb?.displayName ?? entry.b)}
                              </span>
                              <FighterAvatar
                                name={lastName(fb?.displayName ?? entry.b)}
                                square
                                className="h-8 w-8"
                              />
                            </Link>
                          </div>
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">
                            {entry.weight}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {event.status === "upcoming" && (
        <section className="container-x pb-12">
          <h2 className="mb-6 font-display text-3xl uppercase">
            <span className="red-bar" />
            Signups
          </h2>
          {signedUpFighters.length > 0 ? (
            <div className="border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">
                  {signedUpFighters.length} fighter{signedUpFighters.length !== 1 ? "s" : ""} signed
                  up
                </span>
              </div>
              <div className="divide-y divide-border">
                {signedUpFighters.map((f: any) => (
                  <Link
                    key={f.username}
                    to="/boxers/$username"
                    params={{ username: f.username }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface"
                  >
                    <FighterAvatar name={lastName(f.displayName)} square className="h-9 w-9" />
                    <div>
                      <p className="text-sm font-semibold">{lastName(f.displayName)}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.division} • {f.wins}-{f.losses}-{f.draws}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No signups yet. Join via Discord with `/signup`.
            </p>
          )}
        </section>
      )}
    </>
  );
}

function EventDetailSkeleton() {
  return (
    <>
      <section className="bg-foreground text-background">
        <div className="container-x py-14">
          <Skeleton className="h-5 w-20 bg-background/20" />
          <Skeleton className="mt-3 h-16 w-96 bg-background/20" />
          <Skeleton className="mt-2 h-4 w-64 bg-background/20" />
          <Skeleton className="mt-4 h-4 w-48 bg-background/20" />
        </div>
      </section>
      <section className="container-x -mt-10">
        <div className="border border-border bg-card p-10">
          <Skeleton className="mx-auto h-4 w-32" />
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-8">
            <Skeleton className="mx-auto h-32 w-32 rounded-full" />
            <Skeleton className="h-12 w-16" />
            <Skeleton className="mx-auto h-32 w-32 rounded-full" />
          </div>
        </div>
      </section>
    </>
  );
}
