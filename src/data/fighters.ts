/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  Fighter,
  Division,
  BoxingEvent,
  Article,
  Video,
  Product,
  Post,
  Notification,
  EventSignup,
  CardSlot,
} from "./types";
import { DIVISIONS } from "./types";
import { getSupabase } from "@/lib/supabase";

/* ============ Module-level caches ============ */

const _fighters: Fighter[] = [];
const _events: BoxingEvent[] = [];
const _articles: Article[] = [];
const _videos: Video[] = [];
const _products: Product[] = [];
const _posts: Post[] = [];
const _notifications: Notification[] = [];
const _eventSignups: EventSignup[] = [];

/* ============ Public exports ============ */

export const FIGHTERS = _fighters;
export const getChampion = (division: Division) =>
  FIGHTERS.find((f) => f.division === division && f.rank === 0);
export const getChampions = () => DIVISIONS.map((d) => getChampion(d)).filter(Boolean) as Fighter[];
export const getChampionTitle = (beltsHeld: string): string => {
  const count = beltsHeld ? beltsHeld.split(",").filter(Boolean).length : 0;
  if (count === 0) return "Champion";
  if (count === 4) return "Undisputed";
  if (count >= 2) return "Unified Champion";
  return "World Champion";
};

export const getByUsername = (u: string) =>
  FIGHTERS.find((f) => f.username.toLowerCase() === u.toLowerCase());
export const getRanked = (division: Division, source?: Fighter[], region?: string) => {
  const pool = source ?? FIGHTERS;
  const fighters = pool
    .filter((f) => f.division === division && (!region || region === "all" || f.region === region))
    .sort((a, b) => {
      if (a.rank === 0) return -1;
      if (b.rank === 0) return 1;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.rank - b.rank;
    });
  let displayRank = 1;
  return fighters.map((f) => ({
    ...f,
    displayRank: f.rank === 0 ? 0 : displayRank++,
  }));
};

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
export const EVENT_SIGNUPS: ReadonlyArray<EventSignup> = _eventSignups;
export const upcomingEvents = () => EVENTS.filter((e) => e.status === "upcoming");
export const nextEvent = () => upcomingEvents()[0];
export const getSignupsForEvent = (slug: string) =>
  _eventSignups.filter((s) => s.eventSlug === slug);
export const getSignedUpFighters = (slug: string) => {
  const usernames = new Set(getSignupsForEvent(slug).map((s) => s.fighterUsername));
  return _fighters.filter((f) => usernames.has(f.username));
};

export const ARTICLES = _articles;
export const getArticleBySlug = (s: string) => ARTICLES.find((a) => a.slug === s);
export const getNewsForFighter = (u: string) => ARTICLES.filter((a) => a.fighters.includes(u));
export const featuredArticle = () => ARTICLES.find((a) => a.featured) ?? null;

export const VIDEOS = _videos;
export const getVideosForFighter = (u: string) => VIDEOS.filter((v) => v.fighters.includes(u));
export const getPostsForFighter = (u: string) =>
  POSTS.filter((p) => p.tags.includes(u) || p.authorUsername === u);

export const PRODUCTS = _products;
export const POSTS = _posts;
export const NOTIFICATIONS = _notifications;

/* ============ Cache helpers ============ */

const _loadPromises: Record<string, Promise<void> | null> = {};
const _lastLoaded: Record<string, number> = {};
const CACHE_TTL = 5_000;

const PAGE_SIZE = 20;
let _postsHasMore = true;
let _postsLoadingMore = false;

export function clearPostCache() {
  delete _lastLoaded["posts"];
  _postsHasMore = true;
  _postsLoadingMore = false;
}

export function hasMorePosts() {
  return _postsHasMore;
}

export function isLoadingMorePosts() {
  return _postsLoadingMore;
}

async function _loadPostsPage(page: number, replace: boolean) {
  const supabase = getSupabase();
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const mapped = (data || []).map(rowToPostFromRow);

  if (replace) {
    _posts.length = 0;
    _posts.push(...mapped);
  } else {
    _posts.push(...mapped);
  }

  _postsHasMore = mapped.length === PAGE_SIZE;

  const { data: tags } = await supabase.from("post_tags").select("*");
  if (tags) {
    for (let i = 0; i < _posts.length; i++) {
      const p = _posts[i];
      const ft = tags.filter((t: any) => t.post_id === p.id).map((t: any) => t.fighter_username);
      _posts[i] = { ...p, tags: ft };
    }
  }

  _lastLoaded["posts"] = Date.now();
}

export async function loadMorePosts() {
  if (!_postsHasMore || _postsLoadingMore) return;
  _postsLoadingMore = true;
  const page = Math.floor(_posts.length / PAGE_SIZE);
  try {
    await _loadPostsPage(page, false);
  } finally {
    _postsLoadingMore = false;
  }
}

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

export function clearSignupsCache() {
  delete _lastLoaded["_eventSignups"];
  _eventSignups.length = 0;
}

export async function ensureSignupsLoaded() {
  const k = "_eventSignups";
  if (_loadPromises[k]) return _loadPromises[k];
  _loadPromises[k] = _loadTable(
    "event_signups",
    _eventSignups,
    rowToSignupFromRow,
    undefined,
    "event_signups",
  );
  await _loadPromises[k];
  _loadPromises[k] = null;
}

function rowToSignupFromRow(row: any): EventSignup {
  return {
    id: row.id,
    eventSlug: row.event_slug,
    fighterUsername: row.fighter_username,
    signedUpAt: row.signed_up_at,
  };
}

export function clearFightersCache() {
  delete _lastLoaded["_fighters"];
}

export async function refreshFighter(username: string): Promise<Fighter | undefined> {
  const supabase = getSupabase();

  const { data: row } = await supabase
    .from("fighters")
    .select("*")
    .eq("username", username)
    .single();

  if (!row) return undefined;

  const { data: history } = await supabase
    .from("fight_history")
    .select("*")
    .eq("fighter_username", username);

  const fighter = rowToFighter(row);
  fighter.history = (history || []).map((h: any) => ({
    opponent: h.opponent,
    result: h.result as "W" | "L" | "D",
    method: h.method,
    date: h.date,
    event: h.event,
  }));

  const idx = _fighters.findIndex((f) => f.username === username);
  if (idx !== -1) {
    _fighters[idx] = fighter;
  } else {
    _fighters.push(fighter);
  }

  return fighter;
}

export async function ensureFightersLoaded() {
  const k = "_fighters";
  if (_loadPromises[k]) return _loadPromises[k];
  _loadPromises[k] = _loadTable(
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
  await _loadPromises[k];
  _loadPromises[k] = null;
}

export async function ensureEventsLoaded() {
  const k = "_events";
  if (_loadPromises[k]) return _loadPromises[k];
  _loadPromises[k] = _loadTable(
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
            card: ec.map((c: any) => ({
              a: c.fighter_a,
              b: c.fighter_b,
              weight: c.weight,
              slot: c.slot ?? "maincard",
            })),
          };
        }
      },
    },
    "events",
  );
  await _loadPromises[k];
  _loadPromises[k] = null;
}

export async function ensureArticlesLoaded() {
  const k = "_articles";
  if (_loadPromises[k]) return _loadPromises[k];
  _loadPromises[k] = _loadTable(
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
  await _loadPromises[k];
  _loadPromises[k] = null;
}

export async function ensureVideosLoaded() {
  const k = "_videos";
  if (_loadPromises[k]) return _loadPromises[k];
  _loadPromises[k] = _loadTable(
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
  await _loadPromises[k];
  _loadPromises[k] = null;
}

export async function ensureProductsLoaded() {
  const k = "_products";
  if (_loadPromises[k]) return _loadPromises[k];
  _loadPromises[k] = _loadTable("products", _products, rowToProductFromRow, undefined, "products");
  await _loadPromises[k];
  _loadPromises[k] = null;
}

export async function ensurePostsLoaded() {
  const k = "_posts";
  const now = Date.now();
  if (now - (_lastLoaded["posts"] || 0) < CACHE_TTL && _posts.length > 0) return;
  if (_loadPromises[k]) return _loadPromises[k];
  _loadPromises[k] = _loadPostsPage(0, true);
  await _loadPromises[k];
  _loadPromises[k] = null;
}

export async function ensureNotificationsLoaded() {
  const k = "_notifications";
  if (_loadPromises[k]) return _loadPromises[k];
  _loadPromises[k] = _loadTable(
    "notifications",
    _notifications,
    rowToNotificationFromRow,
    undefined,
    "notifications",
  );
  await _loadPromises[k];
  _loadPromises[k] = null;
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

function rowToPostFromRow(row: any): Post {
  const fighter = FIGHTERS.find((f) => f.username === row.author_username);
  return {
    id: row.id,
    content: row.content,
    imageUrl: row.image_url ?? undefined,
    videoUrl: row.video_url ?? undefined,
    authorType: row.author_type,
    authorUsername: row.author_username ?? undefined,
    authorDisplayName:
      row.author_type === "fighter" && fighter
        ? fighter.displayName
        : (row.author_username ?? "Admin"),
    authorImage: fighter?.image,
    tags: [],
    likes: 0,
    likedByCurrentUser: false,
    createdAt: row.created_at,
  };
}

function rowToNotificationFromRow(row: any): Notification {
  const actor = FIGHTERS.find((f) => f.discordId === row.actor_discord_id);
  return {
    id: row.id,
    fighterUsername: row.fighter_username,
    type: row.type,
    postId: row.post_id,
    actorDiscordId: row.actor_discord_id,
    actorDisplayName: actor?.displayName ?? "Someone",
    read: row.read,
    createdAt: row.created_at,
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
    region: row.region ?? "",
    image: row.image_url ?? undefined,
    discordId: row.discord_id ?? undefined,
    guildId: row.guild_id ?? undefined,
  };
}

function rowToEvent(row: any, cards: any[]): BoxingEvent {
  return {
    slug: row.slug,
    name: row.name,
    date: row.date,
    arena: row.arena,
    mainEvent: { a: row.main_event_a, b: row.main_event_b, title: row.main_event_title },
    card: cards.map((c: any) => ({
      a: c.fighter_a,
      b: c.fighter_b,
      weight: c.weight,
      slot: c.slot ?? "maincard",
    })),
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
    for (const key of Object.keys(_lastLoaded)) delete _lastLoaded[key];

    await Promise.all([
      _loadTable(
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
      ),
      _loadTable(
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
                card: ec.map((c: any) => ({
                  a: c.fighter_a,
                  b: c.fighter_b,
                  weight: c.weight,
                  slot: c.slot ?? "maincard",
                })),
              };
            }
          },
        },
        "events",
      ),
      _loadTable(
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
      ),
      _loadTable(
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
      ),
      _loadTable("products", _products, rowToProductFromRow, undefined, "products"),
      _loadTable(
        "posts",
        _posts,
        rowToPostFromRow,
        {
          table: "post_tags",
          on(tags: any[]) {
            for (let i = 0; i < _posts.length; i++) {
              const p = _posts[i];
              const ft = tags
                .filter((t: any) => t.post_id === p.id)
                .map((t: any) => t.fighter_username);
              _posts[i] = { ...p, tags: ft };
            }
          },
        },
        "posts",
      ),
      _loadTable(
        "notifications",
        _notifications,
        rowToNotificationFromRow,
        undefined,
        "notifications",
      ),
      _loadTable("event_signups", _eventSignups, rowToSignupFromRow, undefined, "event_signups"),
    ]);
  } catch {
    // Data will load on next access if Supabase is unavailable
  }
}
