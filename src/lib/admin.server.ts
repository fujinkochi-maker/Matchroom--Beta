import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getAdminSupabase } from "./supabase-admin";

const DISCORD_API = "https://discord.com/api/v10";

function discordHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN ?? ""}`,
    "Content-Type": "application/json",
  };
}

async function updateDiscordNickname(discordId: string, nickname: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId || !process.env.DISCORD_BOT_TOKEN) return;
  try {
    await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordId}`, {
      method: "PATCH",
      headers: discordHeaders(),
      body: JSON.stringify({ nick: nickname }),
    });
  } catch {
    // nickname update is best-effort
  }
}

function formatNickname(f: {
  display_name: string;
  wins: number;
  losses: number;
  draws: number;
  kos: number;
}): string {
  return `${f.display_name} | ${f.wins}-${f.losses}-${f.draws} | ${f.kos}KO${f.kos !== 1 ? "s" : ""}`;
}

/* ── Discord role helpers ── */
const AMATEUR_ROLE = "1510667124006457496";
const PRO_BOXER_ROLE = "1510665774052806780";

async function discordAddRole(guildId: string, userId: string, roleId: string) {
  try {
    await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: "PUT",
      headers: discordHeaders(),
    });
  } catch {
    // best-effort
  }
}

async function discordRemoveRole(guildId: string, userId: string, roleId: string) {
  try {
    await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: "DELETE",
      headers: discordHeaders(),
    });
  } catch {
    // best-effort
  }
}

const SESSION_SECRET =
  process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "matchroom-admin-secret";

function signToken(): string {
  const exp = Date.now() + 86_400_000;
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(String(exp)).digest("base64url");
  return `${exp}.${hmac}`;
}

function validateToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, hmac] = parts;
  const exp = Number(expStr);
  if (Date.now() > exp) return false;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(expStr).digest("base64url");
  return hmac === expected;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ password: z.string().min(1) }))
  .handler(async ({ data }) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) throw new Error("ADMIN_PASSWORD is not configured on the server");
    if (data.password !== adminPassword) {
      throw new Error("Invalid password");
    }
    return { token: signToken() };
  });

const DIVISIONS = [
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
  "Light Heavyweight",
  "Cruiserweight",
  "Heavyweight",
] as const;

/* ============ Fighters ============ */

const fighterSchema = z.object({
  token: z.string(),
  username: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  nickname: z.string().max(100).default(""),
  division: z.enum(DIVISIONS),
  rank: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  draws: z.number().int().min(0),
  kos: z.number().int().min(0),
  stance: z.enum(["Orthodox", "Southpaw", "Switch"]),
  belts: z.number().int().min(0),
  beltsHeld: z.string().default(""),
  debut: z.string().min(1),
  streak: z.string().default(""),
  bio: z.string().default(""),
  imageUrl: z.string().optional(),
});

export const createFighter = createServerFn({ method: "POST" })
  .inputValidator(fighterSchema)
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("fighters").insert({
      username: data.username,
      display_name: data.displayName,
      nickname: data.nickname,
      division: data.division,
      rank: data.rank,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      kos: data.kos,
      stance: data.stance,
      belts: data.belts,
      debut: data.debut,
      streak: data.streak,
      bio: data.bio,
      image_url: data.imageUrl ?? null,
      belts_held: data.beltsHeld,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateFighter = createServerFn({ method: "POST" })
  .inputValidator(fighterSchema.extend({ originalUsername: z.string() }))
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("fighters").upsert({
      username: data.username,
      display_name: data.displayName,
      nickname: data.nickname,
      division: data.division,
      rank: data.rank,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      kos: data.kos,
      stance: data.stance,
      belts: data.belts,
      debut: data.debut,
      streak: data.streak,
      bio: data.bio,
      image_url: data.imageUrl ?? null,
      belts_held: data.beltsHeld,
    });
    if (error) throw new Error(error.message);

    if (data.originalUsername !== data.username) {
      await supabase.from("fighters").delete().eq("username", data.originalUsername);
    }

    // Update Discord nickname with new record
    const { data: updated } = await supabase
      .from("fighters")
      .select("discord_id, display_name, wins, losses, draws, kos, guild_id")
      .eq("username", data.username)
      .single();
    if (updated?.discord_id) {
      updateDiscordNickname(updated.discord_id, formatNickname(updated));
      // Check promotion (fire-and-forget)
      if (updated.guild_id && updated.wins >= 3) {
        discordAddRole(updated.guild_id, updated.discord_id, PRO_BOXER_ROLE);
        discordRemoveRole(updated.guild_id, updated.discord_id, AMATEUR_ROLE);
      }
    }

    return { ok: true };
  });

export const deleteFighter = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), username: z.string() }))
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("fighters").delete().eq("username", data.username);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertFightHistory = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      fighterUsername: z.string(),
      history: z.array(
        z.object({
          opponent: z.string(),
          result: z.enum(["W", "L", "D"]),
          method: z.string(),
          date: z.string(),
          event: z.string(),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    await supabase.from("fight_history").delete().eq("fighter_username", data.fighterUsername);
    if (data.history.length > 0) {
      const { error } = await supabase.from("fight_history").insert(
        data.history.map((h) => ({
          fighter_username: data.fighterUsername,
          opponent: h.opponent,
          result: h.result,
          method: h.method,
          date: h.date,
          event: h.event,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/* ============ Events ============ */

const cardSchema = z.object({
  fighterA: z.string(),
  fighterB: z.string(),
  weight: z.enum(DIVISIONS),
});

const eventSchema = z.object({
  token: z.string(),
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  date: z.string().min(1),
  arena: z.string().min(1).max(200),
  mainEventA: z.string().min(1),
  mainEventB: z.string().min(1),
  mainEventTitle: z.string().min(1).max(200),
  status: z.enum(["upcoming", "past"]),
  tagline: z.string().max(300).default(""),
  card: z.array(cardSchema).default([]),
  imageUrl: z.string().optional(),
});

export const createEvent = createServerFn({ method: "POST" })
  .inputValidator(eventSchema)
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error: evErr } = await supabase.from("events").insert({
      slug: data.slug,
      name: data.name,
      date: data.date,
      arena: data.arena,
      main_event_a: data.mainEventA,
      main_event_b: data.mainEventB,
      main_event_title: data.mainEventTitle,
      status: data.status,
      tagline: data.tagline,
      image_url: data.imageUrl ?? null,
    });
    if (evErr) throw new Error(evErr.message);

    if (data.card.length > 0) {
      const { error: cardErr } = await supabase.from("event_cards").insert(
        data.card.map((c) => ({
          event_slug: data.slug,
          fighter_a: c.fighterA,
          fighter_b: c.fighterB,
          weight: c.weight,
        })),
      );
      if (cardErr) throw new Error(cardErr.message);
    }
    return { ok: true };
  });

export const updateEvent = createServerFn({ method: "POST" })
  .inputValidator(eventSchema)
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error: evErr } = await supabase.from("events").upsert({
      slug: data.slug,
      name: data.name,
      date: data.date,
      arena: data.arena,
      main_event_a: data.mainEventA,
      main_event_b: data.mainEventB,
      main_event_title: data.mainEventTitle,
      status: data.status,
      tagline: data.tagline,
      image_url: data.imageUrl ?? null,
    });
    if (evErr) throw new Error(evErr.message);

    await supabase.from("event_cards").delete().eq("event_slug", data.slug);
    if (data.card.length > 0) {
      const { error: cardErr } = await supabase.from("event_cards").insert(
        data.card.map((c) => ({
          event_slug: data.slug,
          fighter_a: c.fighterA,
          fighter_b: c.fighterB,
          weight: c.weight,
        })),
      );
      if (cardErr) throw new Error(cardErr.message);
    }
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), slug: z.string() }))
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("events").delete().eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ Articles ============ */

const articleSchema = z.object({
  token: z.string(),
  slug: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  excerpt: z.string().max(500).default(""),
  body: z.string().default(""),
  category: z.enum([
    "Breaking News",
    "Fight Results",
    "Rankings",
    "Event Announcements",
    "Interviews",
  ]),
  author: z.string().min(1).max(100),
  date: z.string().min(1),
  featured: z.boolean().default(false),
  imageUrl: z.string().optional(),
  fighters: z.array(z.string()).default([]),
});

export const createArticle = createServerFn({ method: "POST" })
  .inputValidator(articleSchema)
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error: aErr } = await supabase.from("articles").insert({
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt,
      body: data.body,
      category: data.category,
      author: data.author,
      date: data.date,
      featured: data.featured,
      image_url: data.imageUrl ?? null,
    });
    if (aErr) throw new Error(aErr.message);

    if (data.fighters.length > 0) {
      const { error: afErr } = await supabase
        .from("article_fighters")
        .insert(data.fighters.map((u) => ({ article_slug: data.slug, fighter_username: u })));
      if (afErr) throw new Error(afErr.message);
    }
    return { ok: true };
  });

export const updateArticle = createServerFn({ method: "POST" })
  .inputValidator(articleSchema)
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error: aErr } = await supabase.from("articles").upsert({
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt,
      body: data.body,
      category: data.category,
      author: data.author,
      date: data.date,
      featured: data.featured,
      image_url: data.imageUrl ?? null,
    });
    if (aErr) throw new Error(aErr.message);

    await supabase.from("article_fighters").delete().eq("article_slug", data.slug);
    if (data.fighters.length > 0) {
      const { error: afErr } = await supabase
        .from("article_fighters")
        .insert(data.fighters.map((u) => ({ article_slug: data.slug, fighter_username: u })));
      if (afErr) throw new Error(afErr.message);
    }
    return { ok: true };
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), slug: z.string() }))
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("articles").delete().eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ Videos ============ */

const videoSchema = z.object({
  token: z.string(),
  id: z.string().min(1).max(50),
  title: z.string().min(1).max(300),
  category: z.enum([
    "Highlights",
    "Full Fights",
    "Knockouts",
    "Training",
    "Faceoffs",
    "Press Conferences",
  ]),
  duration: z.string().min(1).max(20),
  views: z.string().min(1).max(20),
  fighters: z.array(z.string()).default([]),
});

export const createVideo = createServerFn({ method: "POST" })
  .inputValidator(videoSchema)
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error: vErr } = await supabase.from("videos").insert({
      id: data.id,
      title: data.title,
      category: data.category,
      duration: data.duration,
      views: data.views,
    });
    if (vErr) throw new Error(vErr.message);

    if (data.fighters.length > 0) {
      const { error: vfErr } = await supabase
        .from("video_fighters")
        .insert(data.fighters.map((u) => ({ video_id: data.id, fighter_username: u })));
      if (vfErr) throw new Error(vfErr.message);
    }
    return { ok: true };
  });

export const updateVideo = createServerFn({ method: "POST" })
  .inputValidator(videoSchema)
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error: vErr } = await supabase.from("videos").upsert({
      id: data.id,
      title: data.title,
      category: data.category,
      duration: data.duration,
      views: data.views,
    });
    if (vErr) throw new Error(vErr.message);

    await supabase.from("video_fighters").delete().eq("video_id", data.id);
    if (data.fighters.length > 0) {
      const { error: vfErr } = await supabase
        .from("video_fighters")
        .insert(data.fighters.map((u) => ({ video_id: data.id, fighter_username: u })));
      if (vfErr) throw new Error(vfErr.message);
    }
    return { ok: true };
  });

export const deleteVideo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string() }))
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ Products ============ */

const productSchema = z.object({
  token: z.string(),
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  category: z.enum(["Hoodies", "Shirts", "Gloves", "Caps", "Champion Collection", "Limited Drop"]),
  price: z.number().int().min(0),
  limited: z.boolean().default(false),
  stock: z.number().int().min(0).default(50),
  imageUrl: z.string().optional(),
});

export const createProduct = createServerFn({ method: "POST" })
  .inputValidator(productSchema)
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("products").insert({
      id: data.id,
      name: data.name,
      category: data.category,
      price: data.price,
      limited: data.limited,
      stock: data.stock,
      image_url: data.imageUrl ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator(productSchema)
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("products").upsert({
      id: data.id,
      name: data.name,
      category: data.category,
      price: data.price,
      limited: data.limited,
      stock: data.stock,
      image_url: data.imageUrl ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string() }))
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
