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
export const featuredArticle = () => ARTICLES.find((a) => a.featured) ?? null;

export const VIDEOS = _videos;
export const getVideosForFighter = (u: string) => VIDEOS.filter((v) => v.fighters.includes(u));

export const PRODUCTS = _products;

/* ============ Cache helpers ============ */

let _loadPromise: Promise<void> | null = null;
const _lastLoaded: Record<string, number> = {};
const CACHE_TTL = 30_000;

async function _loadTable<T>(
  table: string,
  dest: T[],
  mapFn: (row: any) => T,
  joins:
    | {
        table: string;
        on: (joinData: any[]) => void;
      }
    | undefined,
  cacheKey: string,
) {
  const now = Date.now();
  if (now - (_lastLoaded[cacheKey] || 0) < CACHE_TTL && dest.length > 0) return;
  _lastLoaded[cacheKey] = now;

  const supabase = getSupabase();
  const { data } = await supabase.from(table).select("*");
  dest.length = 0;
  if (data?.length) dest.push(...data.map(mapFn));

  if (joins && data?.length) {
    const { data: joinData } = await supabase.from(joins.table).select("*");
    if (joinData) joins.on(joinData);
  }
}

export async function ensureFightersLoaded() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = _loadTable(
    "fighters",
    _fighters,
    rowToFighter,
    {
      table: "fight_history",
      on(history: any[]) {
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
      },
    },
    "fighters",
  );
  await _loadPromise;
  _loadPromise = null;
}

export async function ensureEventsLoaded() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = _loadTable(
    "events",
    _events,
    rowToEventFromRow,
    {
      table: "event_cards",
      on(cards: any[]) {
        for (let i = 0; i < _events.length; i++) {
          const e = _events[i];
          const ec = cards.filter((c: any) => c.event_slug === e.slug);
          _events[i] = {
            ...e,
            card: ec.map((c: any) => ({ a: c.fighter_a, b: c.fighter_b, weight: c.weight })),
          };
        }
      },
    },
    "events",
  );
  await _loadPromise;
  _loadPromise = null;
}

export async function ensureArticlesLoaded() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = _loadTable(
    "articles",
    _articles,
    rowToArticleFromRow,
    {
      table: "article_fighters",
      on(af: any[]) {
        for (let i = 0; i < _articles.length; i++) {
          const a = _articles[i];
          const fighters = af
            .filter((f: any) => f.article_slug === a.slug)
            .map((f: any) => f.fighter_username);
          _articles[i] = { ...a, fighters };
        }
      },
    },
    "articles",
  );
  await _loadPromise;
  _loadPromise = null;
}

export async function ensureVideosLoaded() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = _loadTable(
    "videos",
    _videos,
    rowToVideoFromRow,
    {
      table: "video_fighters",
      on(vf: any[]) {
        for (let i = 0; i < _videos.length; i++) {
          const v = _videos[i];
          const fighters = vf
            .filter((f: any) => f.video_id === v.id)
            .map((f: any) => f.fighter_username);
          _videos[i] = { ...v, fighters };
        }
      },
    },
    "videos",
  );
  await _loadPromise;
  _loadPromise = null;
}

export async function ensureProductsLoaded() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = _loadTable("products", _products, rowToProductFromRow, undefined, "products");
  await _loadPromise;
  _loadPromise = null;
}

function rowToEventFromRow(row: any): BoxingEvent {
  return {
    slug: row.slug,
    name: row.name,
    date: row.date,
    arena: row.arena,
    mainEvent: { a: row.main_event_a, b: row.main_event_b, title: row.main_event_title },
    card: [],
    status: row.status,
    tagline: row.tagline,
    image: row.image_url ?? undefined,
  };
}

function rowToArticleFromRow(row: any): Article {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    category: row.category,
    author: row.author,
    date: row.date,
    fighters: [],
    featured: row.featured,
    image: row.image_url ?? undefined,
  };
}

function rowToVideoFromRow(row: any): Video {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    duration: row.duration,
    fighters: [],
    views: row.views,
  };
}

function rowToProductFromRow(row: any): Product {
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

/* ============ Supabase data loader (legacy bulk) ============ */

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
    await Promise.all([
      ensureFightersLoaded(),
      ensureEventsLoaded(),
      ensureArticlesLoaded(),
      ensureVideosLoaded(),
      ensureProductsLoaded(),
    ]);
  } catch {
    // Data will be loaded on next navigation if Supabase becomes available
  }
}
