/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Fighter, Division, BoxingEvent, Article, Video, Product } from "./types";
import { DIVISIONS } from "./types";
import { getSupabase } from "@/lib/supabase";

/* ============ Module-level caches ============ */

const _fighters: Fighter[] = [];
const _events: BoxingEvent[] = [];
const _articles: Article[] = [];
const _videos: Video[] = [];
const _products: Product[] = [];

/* ============ Public exports ============ */

export const FIGHTERS = _fighters;
export const getChampion = (division: Division) =>
  FIGHTERS.find((f) => f.division === division && f.rank === 0);
export const getChampions = () => DIVISIONS.map((d) => getChampion(d)).filter(Boolean) as Fighter[];
export const getByUsername = (u: string) =>
  FIGHTERS.find((f) => f.username.toLowerCase() === u.toLowerCase());
export const getRanked = (division: Division) =>
  FIGHTERS.filter((f) => f.division === division).sort((a, b) => a.rank - b.rank);

export const CATEGORIES = [
  "All",
  "Event Announcements",
  "Fight Results",
  "Rankings",
  "Interviews",
  "Breaking News",
] as const;

export const VIDEO_CATS = [
  "Highlights",
  "Full Fights",
  "Knockouts",
  "Training",
  "Faceoffs",
  "Press Conferences",
] as const;

export const CATS = [
  "All",
  "Hoodies",
  "Shirts",
  "Caps",
  "Gloves",
  "Champion Collection",
  "Limited Drop",
] as const;

export const EVENTS = _events;
export const upcomingEvents = () => EVENTS.filter((e) => e.status === "upcoming");
export const nextEvent = () => upcomingEvents()[0];

export const ARTICLES = _articles;
export const getArticleBySlug = (s: string) => ARTICLES.find((a) => a.slug === s);
export const getNewsForFighter = (u: string) => ARTICLES.filter((a) => a.fighters.includes(u));
export const featuredArticle = () => ARTICLES.find((a) => a.featured) ?? ARTICLES[0];

export const VIDEOS = _videos;
export const getVideosForFighter = (u: string) => VIDEOS.filter((v) => v.fighters.includes(u));

export const PRODUCTS = _products;

/* ============ Supabase data loader ============ */

function rowToFighter(row: any): Fighter {
  return {
    username: row.username,
    displayName: row.display_name,
    nickname: row.nickname,
    division: row.division,
    rank: row.rank,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    kos: row.kos,
    stance: row.stance,
    belts: row.belts,
    beltsHeld: row.belts_held ?? "",
    debut: row.debut,
    streak: row.streak ?? "",
    bio: row.bio ?? "",
    history: [],
    image: row.image_url ?? undefined,
    discordId: row.discord_id ?? undefined,
  };
}

function rowToEvent(row: any, cards: any[]): BoxingEvent {
  return {
    slug: row.slug,
    name: row.name,
    date: row.date,
    arena: row.arena,
    mainEvent: { a: row.main_event_a, b: row.main_event_b, title: row.main_event_title },
    card: cards.map((c: any) => ({ a: c.fighter_a, b: c.fighter_b, weight: c.weight })),
    status: row.status,
    tagline: row.tagline,
    image: row.image_url ?? undefined,
  };
}

function rowToArticle(row: any, fighterUsernames: string[]): Article {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    category: row.category,
    author: row.author,
    date: row.date,
    fighters: fighterUsernames,
    featured: row.featured,
    image: row.image_url ?? undefined,
  };
}

function rowToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    limited: row.limited ?? false,
    stock: row.stock ?? 50,
    image: row.image_url ?? undefined,
  };
}

export async function loadDataFromSupabase() {
  try {
    const supabase = getSupabase();

    const [fr, ev, ar, vi, pr] = await Promise.all([
      supabase.from("fighters").select("*"),
      supabase.from("events").select("*"),
      supabase.from("articles").select("*"),
      supabase.from("videos").select("*"),
      supabase.from("products").select("*"),
    ]);

    if (fr.data?.length) {
      _fighters.length = 0;
      _fighters.push(...fr.data.map(rowToFighter));

      // Load fight history
      const { data: history } = await supabase.from("fight_history").select("*");
      if (history) {
        for (const f of _fighters) {
          f.history = history
            .filter((h: any) => h.fighter_username === f.username)
            .map((h: any) => ({
              opponent: h.opponent,
              result: h.result as "W" | "L" | "D",
              method: h.method,
              date: h.date,
              event: h.event,
            }));
        }
      }
    }

    if (ev.data?.length) {
      const { data: cards } = await supabase.from("event_cards").select("*");
      _events.length = 0;
      _events.push(
        ...ev.data.map((e: any) =>
          rowToEvent(e, cards?.filter((c: any) => c.event_slug === e.slug) ?? []),
        ),
      );
    }

    if (ar.data?.length) {
      const { data: articleFighters } = await supabase.from("article_fighters").select("*");
      _articles.length = 0;
      _articles.push(
        ...ar.data.map((a: any) =>
          rowToArticle(
            a,
            articleFighters
              ?.filter((af: any) => af.article_slug === a.slug)
              .map((af: any) => af.fighter_username) ?? [],
          ),
        ),
      );
    }

    if (vi.data?.length) {
      const { data: videoFighters } = await supabase.from("video_fighters").select("*");
      _videos.length = 0;
      _videos.push(
        ...vi.data.map((v: any) => ({
          id: v.id,
          title: v.title,
          category: v.category,
          duration: v.duration,
          fighters:
            videoFighters
              ?.filter((vf: any) => vf.video_id === v.id)
              .map((vf: any) => vf.fighter_username) ?? [],
          views: v.views,
        })),
      );
    }

    if (pr.data?.length) {
      _products.length = 0;
      _products.push(...pr.data.map(rowToProduct));
    }
  } catch {
    // Data will be loaded on next navigation if Supabase becomes available
  }
}
