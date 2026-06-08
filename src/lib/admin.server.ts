import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getAdminSupabase } from "./supabase-admin";
import { exchangeDiscordCode, validateFighterToken } from "./discord-oauth.server";

const DISCORD_API = "https://discord.com/api/v10";

function discordHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN ?? ""}`,
    "Content-Type": "application/json",
  };
}

async function updateDiscordNickname(guildId: string, discordId: string, nickname: string) {
  if (!guildId) {
    console.warn("[Discord] Skipping nickname update — no guildId");
    return;
  }
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.warn("[Discord] Skipping nickname update — DISCORD_BOT_TOKEN not set");
    return;
  }
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordId}`, {
      method: "PATCH",
      headers: discordHeaders(),
      body: JSON.stringify({ nick: nickname }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[Discord] Nickname update failed (${res.status}): ${text}`);
    }
  } catch (err) {
    console.warn("[Discord] Nickname update error:", err);
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
const WORLD_CHAMPION_ROLE = "1511957885892956160";
const UNIFIED_CHAMPION_ROLE = "1511959744955285596";
const UNDISPUTED_ROLE = "1511959750865059870";
const FORMER_WORLD_CHAMPION_ROLE = "1511961430985932818";
const BELT_ROLES: Record<string, string> = {
  WBC: "1511958029954846810",
  WBA: "1511958114986098748",
  IBF: "1511958120014942300",
  WBO: "1511958030353305600",
};

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

/* ── Fighter Discord OAuth Login ── */

export const discordLogin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), redirectUri: z.string() }))
  .handler(async ({ data }) => {
    return exchangeDiscordCode(data.code, data.redirectUri);
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

function invertResult(r: string): string {
  if (r === "W") return "L";
  if (r === "L") return "W";
  return "D";
}

async function syncOpponentRecords(
  supabase: any,
  username: string,
  history: { opponent: string; result: string; method: string; date: string; event: string }[],
) {
  const opponentUsernames = [...new Set(history.map((h) => h.opponent).filter(Boolean))];
  for (const opp of opponentUsernames) {
    const { data: oppFighter } = await supabase
      .from("fighters")
      .select("username, division")
      .eq("username", opp)
      .single();
    if (!oppFighter) continue;

    await supabase
      .from("fight_history")
      .delete()
      .eq("fighter_username", opp)
      .eq("opponent", username);

    const mirrored = history
      .filter((h) => h.opponent === opp)
      .map((h) => ({
        fighter_username: opp,
        opponent: username,
        result: invertResult(h.result),
        method: h.method,
        date: h.date,
        event: h.event,
      }));
    if (mirrored.length > 0) {
      const { error } = await supabase.from("fight_history").insert(mirrored);
      if (error) console.error(`Failed to mirror fights for ${opp}:`, error);
    }

    const { data: oppHistory } = await supabase
      .from("fight_history")
      .select("result, method")
      .eq("fighter_username", opp);
    const auto = autoCalcStats(oppHistory || []);
    if (auto) {
      await supabase
        .from("fighters")
        .update({
          wins: auto.wins,
          losses: auto.losses,
          draws: auto.draws,
          kos: auto.kos,
          streak: auto.streak,
        })
        .eq("username", opp);
    }

    if (oppFighter.division) {
      const { recalculateDivision } = await import("@/data/rankings");
      recalculateDivision(oppFighter.division).catch((err: any) =>
        console.error(`Ranking recalculation failed for ${opp}:`, err),
      );
    }
  }
}

function autoCalcStats(history?: { result: string; method: string }[]) {
  if (!history?.length) return null;
  let wins = 0,
    losses = 0,
    draws = 0,
    kos = 0;
  for (const h of history) {
    if (h.result === "W") wins++;
    else if (h.result === "L") losses++;
    else draws++;
    if (h.result === "W" && ["KO", "TKO"].includes(h.method)) kos++;
  }
  let streak = "";
  const sorted = [...history];
  if (sorted.length) {
    const r = sorted[sorted.length - 1].result;
    let c = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      if (sorted[i].result === r) c++;
      else break;
    }
    streak = `${c}${r}`;
  }
  return { wins, losses, draws, kos, streak };
}

const historyEntrySchema = z.object({
  opponent: z.string(),
  result: z.enum(["W", "L", "D"]),
  method: z.string(),
  date: z.string(),
  event: z.string(),
});

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
  region: z.string().default(""),
  imageUrl: z.string().optional(),
  history: z.array(historyEntrySchema).optional(),
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
      region: data.region,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateFighter = createServerFn({ method: "POST" })
  .inputValidator(fighterSchema.extend({ originalUsername: z.string() }))
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();

    // Auto-calc stats from fight history if provided
    const auto = autoCalcStats(data.history);
    const wins = auto ? auto.wins : data.wins;
    const losses = auto ? auto.losses : data.losses;
    const draws = auto ? auto.draws : data.draws;
    const kos = auto ? auto.kos : data.kos;
    const streak = auto ? auto.streak : data.streak;

    // Check if fighter previously had belts (for Former World Champion logic)
    const { data: oldFighter } = await supabase
      .from("fighters")
      .select("belts_held")
      .eq("username", data.originalUsername)
      .single();
    const hadBelts = !!(oldFighter?.belts_held ?? "");

    const { error } = await supabase.from("fighters").upsert({
      username: data.username,
      display_name: data.displayName,
      nickname: data.nickname,
      division: data.division,
      rank: data.rank,
      wins,
      losses,
      draws,
      kos,
      stance: data.stance,
      belts: data.belts,
      debut: data.debut,
      streak,
      bio: data.bio,
      image_url: data.imageUrl ?? null,
      belts_held: data.beltsHeld,
      region: data.region,
    });
    if (error) throw new Error(error.message);

    if (data.originalUsername !== data.username) {
      await supabase.from("fighters").delete().eq("username", data.originalUsername);
    }

    // Save fight history if provided
    if (data.history?.length) {
      await supabase.from("fight_history").delete().eq("fighter_username", data.username);
      const { error: hErr } = await supabase.from("fight_history").insert(
        data.history.map((h) => ({
          fighter_username: data.username,
          opponent: h.opponent,
          result: h.result,
          method: h.method,
          date: h.date,
          event: h.event,
        })),
      );
      if (hErr) console.error("Failed to save fight history:", hErr);
    }

    // Sync opponent records if history provided
    if (data.history?.length) {
      syncOpponentRecords(supabase, data.username, data.history).catch((err: any) =>
        console.error("Opponent sync failed:", err),
      );
    }

    // Recalculate division ranks for fighters table
    const { data: divFighters } = await supabase
      .from("fighters")
      .select("username, rank, wins, losses")
      .eq("division", data.division);
    if (divFighters) {
      divFighters.sort((a, b) => {
        if (a.rank === 0) return -1;
        if (b.rank === 0) return 1;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return a.rank - b.rank;
      });
      let nextRank = 1;
      for (const f of divFighters) {
        if (f.rank === 0) continue;
        await supabase.from("fighters").update({ rank: nextRank++ }).eq("username", f.username);
      }
    }

    // Recalculate rankings for this division (global + all regions)
    const { recalculateDivision } = await import("@/data/rankings");
    await recalculateDivision(data.division);

    // Update Discord nickname with new record
    const { data: updated } = await supabase
      .from("fighters")
      .select("discord_id, display_name, wins, losses, draws, kos, guild_id, belts_held")
      .eq("username", data.username)
      .single();
    if (updated?.discord_id) {
      await updateDiscordNickname(updated.guild_id, updated.discord_id, formatNickname(updated));
      if (updated.guild_id && updated.wins >= 3) {
        await discordAddRole(updated.guild_id, updated.discord_id, PRO_BOXER_ROLE);
        await discordRemoveRole(updated.guild_id, updated.discord_id, AMATEUR_ROLE);
      }

      // Update Discord champion roles based on belts_held
      if (updated.guild_id) {
        for (const roleId of [
          WORLD_CHAMPION_ROLE,
          UNIFIED_CHAMPION_ROLE,
          UNDISPUTED_ROLE,
          FORMER_WORLD_CHAMPION_ROLE,
        ]) {
          await discordRemoveRole(updated.guild_id, updated.discord_id, roleId);
        }
        for (const roleId of Object.values(BELT_ROLES)) {
          await discordRemoveRole(updated.guild_id, updated.discord_id, roleId);
        }
        const belts = (data.beltsHeld || "").split(",").filter(Boolean);
        if (belts.length > 0) {
          for (const belt of belts) {
            const roleId = BELT_ROLES[belt];
            if (roleId) {
              await discordAddRole(updated.guild_id, updated.discord_id, roleId);
            }
          }
          if (belts.length === 4) {
            await discordAddRole(updated.guild_id, updated.discord_id, UNDISPUTED_ROLE);
          } else if (belts.length >= 2) {
            await discordAddRole(updated.guild_id, updated.discord_id, UNIFIED_CHAMPION_ROLE);
          } else {
            await discordAddRole(updated.guild_id, updated.discord_id, WORLD_CHAMPION_ROLE);
          }
        } else if (hadBelts) {
          await discordAddRole(updated.guild_id, updated.discord_id, FORMER_WORLD_CHAMPION_ROLE);
        }
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

export const recalculateAllRankings = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const { recalculateAll } = await import("@/data/rankings");
    await recalculateAll();
    return { ok: true };
  });

export const getRankingsForAdmin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { data: rankings } = await supabase
      .from("rankings")
      .select("*, fighters:fighter_username(display_name)")
      .order("division", { ascending: true })
      .order("body", { ascending: true })
      .order("rank", { ascending: true });
    return { rankings: rankings ?? [] };
  });

export const getPublicRankings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = getAdminSupabase();
    const { data } = await supabase
      .from("rankings")
      .select("*, fighters:fighter_username(display_name, image_url)")
      .order("division", { ascending: true })
      .order("body", { ascending: true })
      .order("rank", { ascending: true });
    return { rankings: data ?? [] };
  } catch {
    return { rankings: [] };
  }
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

    // Sync opponent records
    if (data.history.length > 0) {
      syncOpponentRecords(supabase, data.fighterUsername, data.history).catch((err: any) =>
        console.error("Opponent sync failed:", err),
      );
    }

    // Auto-calc stats from history and update fighter
    const auto = autoCalcStats(data.history);
    if (auto) {
      await supabase
        .from("fighters")
        .update({
          wins: auto.wins,
          losses: auto.losses,
          draws: auto.draws,
          kos: auto.kos,
          streak: auto.streak,
        })
        .eq("username", data.fighterUsername);
    }

    // Recalculate rankings
    const { data: fighter } = await supabase
      .from("fighters")
      .select("division")
      .eq("username", data.fighterUsername)
      .single();
    if (fighter?.division) {
      const { recalculateDivision } = await import("@/data/rankings");
      recalculateDivision(fighter.division).catch((err: any) =>
        console.error("Ranking recalculation failed:", err),
      );
    }

    return { ok: true };
  });

/* ============ Events ============ */

const cardSchema = z.object({
  fighterA: z.string(),
  fighterB: z.string(),
  weight: z.enum(DIVISIONS),
  slot: z.enum(["prelim", "maincard", "comain", "main"]).default("maincard"),
  title: z.string().optional(),
});

function findMainFromCard(card: z.infer<typeof cardSchema>[]) {
  const main = card.find((c) => c.slot === "main");
  return {
    mainEventA: main?.fighterA ?? "",
    mainEventB: main?.fighterB ?? "",
    mainEventTitle: main?.title ?? "",
  };
}

const eventSchema = z.object({
  token: z.string(),
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  date: z.string().min(1),
  arena: z.string().min(1).max(200),
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
    const { mainEventA, mainEventB, mainEventTitle } = findMainFromCard(data.card);
    if (!mainEventA || !mainEventB || !mainEventTitle)
      throw new Error(
        "Card must have a row with slot 'Main Event' including both fighters and a title.",
      );

    const { error: evErr } = await supabase.from("events").insert({
      slug: data.slug,
      name: data.name,
      date: data.date,
      arena: data.arena,
      main_event_a: mainEventA,
      main_event_b: mainEventB,
      main_event_title: mainEventTitle,
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
          slot: c.slot,
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
    const { mainEventA, mainEventB, mainEventTitle } = findMainFromCard(data.card);
    if (!mainEventA || !mainEventB || !mainEventTitle)
      throw new Error(
        "Card must have a row with slot 'Main Event' including both fighters and a title.",
      );

    const { error: evErr } = await supabase.from("events").upsert({
      slug: data.slug,
      name: data.name,
      date: data.date,
      arena: data.arena,
      main_event_a: mainEventA,
      main_event_b: mainEventB,
      main_event_title: mainEventTitle,
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
          slot: c.slot,
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

/* ============ Event Signups ============ */

export const signupForEvent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      eventSlug: z.string(),
      fighterUsername: z.string(),
      adminWebhookUrl: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from("event_signups")
      .insert({ event_slug: data.eventSlug, fighter_username: data.fighterUsername });
    if (error) throw new Error(error.message);

    const { data: fighter } = await supabase
      .from("fighters")
      .select("display_name, wins, losses, draws, kos, division")
      .eq("username", data.fighterUsername)
      .single();

    const webhookUrl = data.adminWebhookUrl || process.env.ADMIN_WEBHOOK_URL;
    if (webhookUrl) {
      const record = fighter
        ? `${fighter.display_name} (${fighter.division}) — ${fighter.wins}-${fighter.losses}-${fighter.draws} (${fighter.kos} KOs)`
        : data.fighterUsername;
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `🥊 **New Signup**\nFighter: ${record}` }),
      }).catch(() => {});
    }

    const { clearSignupsCache } = await import("@/data/fighters");
    clearSignupsCache();
    return { ok: true };
  });

export const adminAddSignup = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      eventSlug: z.string(),
      fighterUsername: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from("event_signups")
      .insert({ event_slug: data.eventSlug, fighter_username: data.fighterUsername });
    if (error) throw new Error(error.message);

    const { clearSignupsCache } = await import("@/data/fighters");
    clearSignupsCache();

    // Fetch event + fighter info for webhook + DM
    const [evRes, fRes] = await Promise.all([
      supabase.from("events").select("name, arena, date").eq("slug", data.eventSlug).single(),
      supabase
        .from("fighters")
        .select("display_name, division, discord_id")
        .eq("username", data.fighterUsername)
        .single(),
    ]);
    const ev = evRes.data;
    const fighter = fRes.data;
    const fighterLabel = fighter
      ? `${fighter.display_name} (${fighter.division})`
      : data.fighterUsername;
    const dateStr = ev?.date
      ? new Date(ev.date).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "TBD";

    // Admin webhook — same format as Discord signup webhook
    const webhookUrl = process.env.ADMIN_WEBHOOK_URL;
    if (webhookUrl && ev) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🔔 ${fighterLabel} signed up for ${ev.name} (${dateStr})`,
        }),
      }).catch(() => {});
    }

    // DM to fighter
    const token = process.env.DISCORD_BOT_TOKEN;
    const discordId = fighter?.discord_id;
    if (token && discordId && ev) {
      try {
        const chRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
          method: "POST",
          headers: discordHeaders(),
          body: JSON.stringify({ recipient_id: discordId }),
        });
        if (chRes.ok) {
          const { id: channelId } = await chRes.json();
          await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
            method: "POST",
            headers: discordHeaders(),
            body: JSON.stringify({
              content: `✅ **You've been signed up!**\n\n**${ev.name}**\n📍 ${ev.arena}\n📅 ${dateStr}\n\nCheck the event page for fight card updates.`,
            }),
          });
        }
      } catch (dmErr) {
        console.error("[adminAddSignup] DM failed:", dmErr);
      }
    }

    return { ok: true };
  });

export const removeSignup = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.number() }))
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    await supabase.from("event_signups").delete().eq("id", data.id);
    const { clearSignupsCache } = await import("@/data/fighters");
    clearSignupsCache();
    return { ok: true };
  });

export const getEventSignups = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), eventSlug: z.string() }))
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { data: signups } = await supabase
      .from("event_signups")
      .select(
        "*, fighters:fighter_username(display_name, wins, losses, draws, kos, division, region)",
      )
      .eq("event_slug", data.eventSlug);
    return { signups: signups ?? [] };
  });

/* ============ Fighter Follows ============ */

export const followFighter = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), fighterUsername: z.string() }))
  .handler(async ({ data }) => {
    const discordId = validateFighterToken(data.token);
    if (!discordId) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from("fighter_follows")
      .insert({ fighter_username: data.fighterUsername, user_discord_id: discordId });
    if (error && !error.message?.includes("duplicate key")) throw new Error(error.message);
    const { clearFighterFollowsCache } = await import("@/data/fighters");
    clearFighterFollowsCache();
    return { ok: true };
  });

export const unfollowFighter = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), fighterUsername: z.string() }))
  .handler(async ({ data }) => {
    const discordId = validateFighterToken(data.token);
    if (!discordId) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    await supabase
      .from("fighter_follows")
      .delete()
      .eq("fighter_username", data.fighterUsername)
      .eq("user_discord_id", discordId);
    const { clearFighterFollowsCache } = await import("@/data/fighters");
    clearFighterFollowsCache();
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

/* ============ Posts / Feed ============ */

const postSchema = z.object({
  token: z.string(),
  content: z.string().min(1).max(2000),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const createPost = createServerFn({ method: "POST" })
  .inputValidator(postSchema)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    let authorType: string;
    let authorUsername: string | null;

    // Try fighter token first, then admin token
    const discordId = validateFighterToken(data.token);
    if (discordId) {
      authorType = "fighter";
      const { data: fighter } = await supabase
        .from("fighters")
        .select("username")
        .eq("discord_id", discordId)
        .single();
      if (!fighter) throw new Error("Fighter not found");
      authorUsername = fighter.username;
    } else if (validateToken(data.token)) {
      authorType = "admin";
      authorUsername = "admin";
    } else {
      throw new Error("Unauthorized");
    }

    const { data: inserted, error: pErr } = await supabase
      .from("posts")
      .insert({
        content: data.content,
        image_url: data.imageUrl ?? null,
        video_url: data.videoUrl ?? null,
        author_type: authorType,
        author_username: authorUsername,
      })
      .select("id")
      .single();

    if (pErr) throw new Error(pErr.message);

    const postId = inserted.id;

    if (data.tags.length > 0) {
      const { error: tErr } = await supabase
        .from("post_tags")
        .insert(data.tags.map((u) => ({ post_id: postId, fighter_username: u })));
      if (tErr) throw new Error(tErr.message);

      // Create notifications for tagged fighters
      const { data: taggedFighters } = await supabase
        .from("fighters")
        .select("username, discord_id, guild_id")
        .in("username", data.tags);

      if (taggedFighters) {
        const notifs = taggedFighters.map((f) => ({
          fighter_username: f.username,
          type: "tag" as const,
          post_id: postId,
          actor_discord_id: discordId ?? "admin",
        }));
        await supabase.from("notifications").insert(notifs);

        // Send Discord DM to each tagged fighter
        for (const f of taggedFighters) {
          if (f.discord_id && process.env.DISCORD_BOT_TOKEN) {
            try {
              const dmRes = await fetch(`${DISCORD_API}/users/${f.discord_id}/channels`, {
                method: "POST",
                headers: discordHeaders(),
                body: JSON.stringify({ recipient_id: f.discord_id }),
              });
              if (dmRes.ok) {
                const dm = (await dmRes.json()) as { id: string };
                const preview =
                  data.content.length > 100 ? data.content.slice(0, 100) + "..." : data.content;
                await fetch(`${DISCORD_API}/channels/${dm.id}/messages`, {
                  method: "POST",
                  headers: discordHeaders(),
                  body: JSON.stringify({
                    content: `🔔 You were tagged in a post: "${preview}"\nCheck it out: ${    process.env.VITE_SITE_URL ?? "https://matchroom-beta.vercel.app"}/feed`,
                  }),
                });
              }
            } catch {
              // DM is best-effort
            }
          }
        }
      }
    }

    // Send Discord embed to feed webhook
    const feedWebhookUrl = process.env.FEED_WEBHOOK_URL;
    if (feedWebhookUrl) {
      const siteUrl = process.env.VITE_SITE_URL ?? "https://matchroom-beta.vercel.app";
      let tagNames: string[] = [];
      if (data.tags.length > 0) {
        const { data: tagFighters } = await supabase
          .from("fighters")
          .select("username, display_name")
          .in("username", data.tags);
        if (tagFighters) {
          tagNames = data.tags.map((u) => {
            const f = tagFighters.find((tf) => tf.username === u);
            return f ? f.display_name : u;
          });
        }
      }
      const embed: any = {
        title: "New Update",
        url: `${siteUrl}/feed`,
        color: 0xcc0000,
        description:
          data.content.length > 4096 ? data.content.slice(0, 4093) + "..." : data.content,
        timestamp: new Date().toISOString(),
        footer: {
          text: tagNames.length > 0 ? `Tagged: ${tagNames.join(", ")}` : "Feed",
        },
        author: { name: "Matchroom Boxing" },
      };
      if (data.imageUrl) embed.image = { url: data.imageUrl };
      fetch(feedWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      }).catch(() => {});
    }

    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), postId: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const discordId = validateFighterToken(data.token);
    const isAdmin = validateToken(data.token);

    if (!discordId && !isAdmin) throw new Error("Unauthorized");

    if (discordId) {
      // Fighter can only delete their own posts
      const { data: post } = await supabase
        .from("posts")
        .select("author_type, author_username")
        .eq("id", data.postId)
        .single();
      if (!post || post.author_type !== "fighter") throw new Error("Unauthorized");
      const { data: fighter } = await supabase
        .from("fighters")
        .select("username")
        .eq("discord_id", discordId)
        .single();
      if (!fighter || fighter.username !== post.author_username) throw new Error("Unauthorized");
    }

    const { error } = await supabase.from("posts").delete().eq("id", data.postId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const updatePostSchema = z.object({
  token: z.string(),
  postId: z.string(),
  content: z.string().min(1).max(2000),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const updatePost = createServerFn({ method: "POST" })
  .inputValidator(updatePostSchema)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    if (!validateToken(data.token)) throw new Error("Unauthorized");

    const { error: uErr } = await supabase
      .from("posts")
      .update({
        content: data.content,
        image_url: data.imageUrl ?? null,
        video_url: data.videoUrl ?? null,
      })
      .eq("id", data.postId);

    if (uErr) throw new Error(uErr.message);

    // Replace tags
    await supabase.from("post_tags").delete().eq("post_id", data.postId);
    if (data.tags.length > 0) {
      const { error: tErr } = await supabase
        .from("post_tags")
        .insert(data.tags.map((u) => ({ post_id: data.postId, fighter_username: u })));
      if (tErr) throw new Error(tErr.message);
    }

    return { ok: true };
  });

export const likePost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), postId: z.string() }))
  .handler(async ({ data }) => {
    const discordId = validateFighterToken(data.token);
    if (!discordId && !validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id: data.postId, user_discord_id: discordId ?? "admin" });
    if (error && !error.message.includes("violates unique constraint")) {
      throw new Error(error.message);
    }

    // Notify post author
    const { data: post } = await supabase
      .from("posts")
      .select("author_type, author_username")
      .eq("id", data.postId)
      .single();
    if (post?.author_type === "fighter" && post.author_username) {
      const { data: author } = await supabase
        .from("fighters")
        .select("username")
        .eq("username", post.author_username)
        .single();
      if (author) {
        await supabase.from("notifications").insert({
          fighter_username: author.username,
          type: "like",
          post_id: data.postId,
          actor_discord_id: discordId ?? "admin",
        });
      }
    }

    return { ok: true };
  });

export const unlikePost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), postId: z.string() }))
  .handler(async ({ data }) => {
    const discordId = validateFighterToken(data.token);
    if (!discordId && !validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", data.postId)
      .eq("user_discord_id", discordId ?? "admin");
    return { ok: true };
  });

export const getNotifications = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const discordId = validateFighterToken(data.token);
    if (!discordId) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { data: notifs } = await supabase
      .from("notifications")
      .select("*, fighters!inner(discord_id)")
      .eq("fighters.discord_id", discordId)
      .order("created_at", { ascending: false })
      .limit(50);
    return { notifications: notifs ?? [] };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const discordId = validateFighterToken(data.token);
    if (!discordId) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq(
        "fighter_username",
        (await supabase.from("fighters").select("username").eq("discord_id", discordId).single())
          .data?.username ?? "",
      );
    return { ok: true };
  });
