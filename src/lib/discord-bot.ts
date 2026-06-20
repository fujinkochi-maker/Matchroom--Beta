import { verifyKey } from "discord-interactions";
import { InteractionType, InteractionResponseType } from "discord-api-types/v10";
import { createClient } from "@supabase/supabase-js";
import { setSupabaseEnv } from "@/lib/supabase";
import {
  FIGHTERS,
  EVENTS,
  ARTICLES,
  VIDEOS,
  PREDICTIONS,
  getRanked,
  getChampions,
  getByUsername,
  getArticleBySlug,
  getVideoById,
  loadDataFromSupabase,
  ensureSignupsLoaded,
  ensureArticlesLoaded,
  ensureEventsLoaded,
  ensureVideosLoaded,
  upcomingEvents,
  nextEvent,
  getSignupsForEvent,
  getPredictionsForEvent,
  getPredictionByUser,
  ensurePredictionsLoaded,
  clearSignupsCache,
  clearPredictionsCache,
} from "@/data/fighters";
import { CARD_SLOT_LABELS } from "@/data/types";

const DISCORD_API = "https://discord.com/api/v10";

const DIVISIONS = [
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
  "Cruiserweight",
  "Heavyweight",
] as const;

export function createHandler(
  env: Record<string, string>,
  waitUntil?: (promise: Promise<unknown>) => void,
  workerOrigin?: string,
) {
  // Ensure Supabase env is set for cache loading (Workers don't have process.env)
  setSupabaseEnv(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const BOT_TOKEN = env.DISCORD_BOT_TOKEN;

  function discordHeaders() {
    return {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    };
  }

  function getSupabaseAdmin() {
    const url = env.VITE_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error("Supabase env vars not set");
    return createClient(url, key);
  }

  function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  function ephemeral(content: string) {
    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content, flags: 64 },
    });
  }

  function getOptionValue(
    options: { name: string; value: string }[] | undefined,
    name: string,
  ): string | undefined {
    return options?.find((o) => o.name === name)?.value;
  }

  function formatRecord(f: { wins: number; losses: number; draws: number; kos: number }): string {
    return `${f.wins}-${f.losses}-${f.draws} (${Math.round((f.kos / Math.max(f.wins, 1)) * 100)}% KO)`;
  }

  const BELT_EMOJIS: Record<string, string> = {
    WBC: "<:wbc:1516824072510636193>",
    WBA: "<:wba:1516824069876482120>",
    IBF: "<:ibf:1516824066856587454>",
    WBO: "<:wbo:1516824074502930653>",
  };

  function formatBelts(beltsHeld: string): string | null {
    if (!beltsHeld) return null;
    const belts = beltsHeld.split(",").filter(Boolean);
    if (belts.length === 0) return null;
    return belts.map((b) => `${BELT_EMOJIS[b] ?? "🏆"} ${b}`).join("  ");
  }

  function formatNickname(f: {
    displayName: string;
    wins: number;
    losses: number;
    draws: number;
    kos: number;
  }): string {
    return `${f.displayName} | ${f.wins}-${f.losses}-${f.draws} | ${f.kos}KO${f.kos !== 1 ? "s" : ""}`;
  }

  const PROMOTER_NAME_LINES: Record<string, (name: string) => string> = {
    champion: (n) =>
      `"The king of the division, **${n}** — when you're at the top, there's nowhere to go but down... and I'll make sure they're coming for you."`,
    contender: (n) =>
      `"**${n}** is hungry. Ranked high, climbing fast — one more win and they're knocking on the champion's door."`,
    undefeated: (n) =>
      `"**${n}** — still perfect. That zero in the loss column? It's not just a number, it's a statement."`,
    newcomer: (n) =>
      `"New blood in the division. **${n}** steps into the ring with everything to prove — and I like what I see."`,
    veteran: (n) =>
      `"**${n}** has been through wars. The record speaks for itself — experience beats youth, nine times out of ten."`,
    brawler: (n) =>
      `"**${n}** doesn't go to decisions. If you're buying a ticket, better not blink — this one ends early."`,
  };

  function promoterLine(fighter: {
    displayName: string;
    wins: number;
    losses: number;
    kos: number;
    rank: number;
  }): string {
    const name = fighter.displayName;
    if (fighter.rank === 0) return PROMOTER_NAME_LINES.champion(name);
    if (fighter.losses === 0 && fighter.wins > 0) return PROMOTER_NAME_LINES.undefeated(name);
    if (fighter.wins >= 15) return PROMOTER_NAME_LINES.veteran(name);
    if (fighter.kos / Math.max(fighter.wins, 1) > 0.6 && fighter.wins > 0)
      return PROMOTER_NAME_LINES.brawler(name);
    if (fighter.wins <= 3) return PROMOTER_NAME_LINES.newcomer(name);
    return PROMOTER_NAME_LINES.contender(name);
  }

  const BRAND_COLOR = 0xd71920;
  const SIGNUP_CATEGORY_ID = "1516703976509411348";
  const STAFF_ROLE_ID = "1511841252633743460";
  const _ticketChannels: Record<string, string> = {};

  function sanitizeChannelName(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100);
  }

  function baseFighterEmbed(fighter: {
    image_url?: string;
    displayName: string;
    division: string;
    username: string;
  }) {
    const embed: any = {
      color: BRAND_COLOR,
      author: {
        name: "Matchroom Boxing",
        icon_url:
          "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
      },
      footer: {
        text: "Matchroom Boxing Beta",
        icon_url:
          "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
      },
      timestamp: new Date().toISOString(),
    };
    if (fighter.image_url) {
      embed.thumbnail = { url: fighter.image_url };
    }
    return embed;
  }

  async function retryFetch(
    url: string,
    options: { method: string; headers?: Record<string, string>; body?: string },
    maxRetries = 3,
  ): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fetch(url, {
          method: options.method,
          headers: options.headers,
          body: options.body,
        });
      } catch (err) {
        const isLast = attempt === maxRetries;
        console.log(
          `[Retry] fetch attempt ${attempt}/${maxRetries} failed: ${err instanceof Error ? err.message : err}${isLast ? "" : ", retrying in " + 1000 * 2 ** (attempt - 1) + "ms"}`,
        );
        if (isLast) throw err;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      }
    }
    throw new Error("unreachable");
  }

  function discordFetch(
    url: string,
    options: { method: string; headers?: Record<string, string>; body?: string },
  ): Promise<Response> {
    return retryFetch(url, options);
  }

  async function editDeferredResponse(
    applicationId: string,
    token: string,
    content: string,
    components?: any[],
  ) {
    try {
      const body: any = { content };
      if (components) body.components = components;
      await discordFetch(`${DISCORD_API}/webhooks/${applicationId}/${token}/messages/@original`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error("[Deferred] Failed to edit:", err);
    }
  }

  async function createDM(userId: string): Promise<string> {
    const res = await discordFetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: discordHeaders(),
      body: JSON.stringify({ recipient_id: userId }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ message: res.statusText }))) as {
        message: string;
      };
      throw new Error(`Discord createDM: ${res.status} ${err.message}`);
    }
    const { id } = (await res.json()) as { id: string };
    return id;
  }

  async function sendMessage(channelId: string, content: string, components?: any[]) {
    const body: any = { content };
    if (components) body.components = components;
    await discordFetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: discordHeaders(),
      body: JSON.stringify(body),
    });
  }

  async function setNickname(guildId: string, userId: string, nick: string) {
    try {
      console.log(`[Nick] Setting ${userId} in ${guildId} to "${nick}"`);
      const res = await discordFetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
        method: "PATCH",
        headers: discordHeaders(),
        body: JSON.stringify({ nick }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        console.error(`[Nick] Failed (${res.status}):`, err);
        return false;
      }
      console.log(`[Nick] Success`);
      return true;
    } catch (err) {
      console.error("[Nick] Error:", err);
      return false;
    }
  }

  const DIVISION_BUTTONS = [
    ["Flyweight", "Bantamweight", "Featherweight"].map((d) => ({
      type: 2,
      style: 2,
      label: d,
      custom_id: `div_${d.toLowerCase().replace(/\s+/g, "_")}`,
    })),
    ["Lightweight", "Welterweight", "Middleweight"].map((d) => ({
      type: 2,
      style: 2,
      label: d,
      custom_id: `div_${d.toLowerCase().replace(/\s+/g, "_")}`,
    })),
    ["Cruiserweight", "Heavyweight"].map((d) => ({
      type: 2,
      style: 2,
      label: d,
      custom_id: `div_${d.toLowerCase().replace(/\s+/g, "_")}`,
    })),
  ].map((row) => ({ type: 1, components: row }));

  const REGION_BUTTONS = [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: "🌏 ASIA", custom_id: "reg_asia" },
        { type: 2, style: 3, label: "🌍 EUROPE", custom_id: "reg_europe" },
        { type: 2, style: 3, label: "🌎 NORTH AMERICA", custom_id: "reg_north_america" },
      ],
    },
  ];

  const REGION_ROLES: Record<string, string> = {
    ASIA: "1512287388498657360",
    EUROPE: "1512287401534427289",
    "NORTH AMERICA": "1512287406609535146",
  };

  const DIVISION_ROLES: Record<string, string> = {
    Flyweight: "1510667123549147136",
    Bantamweight: "1510667122932449552",
    Featherweight: "1510667122219421716",
    Lightweight: "1510667121649123418",
    Welterweight: "1510667120562929854",
    Middleweight: "1510667119560364196",
    Cruiserweight: "1510665779912114428",
    Heavyweight: "1510665777106387025",
  };
  const AMATEUR_ROLE = "1510667124006457496";
  const PRO_BOXER_ROLE = "1510665774052806780";

  async function addRole(guildId: string, userId: string, roleId: string) {
    try {
      console.log(`[Role] Adding ${roleId} to ${userId} in ${guildId}`);
      const res = await discordFetch(
        `${DISCORD_API}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
        {
          method: "PUT",
          headers: discordHeaders(),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        console.error(`[Role] Failed to add (${res.status}):`, err);
        return false;
      }
      console.log(`[Role] Added successfully`);
      return true;
    } catch (err) {
      console.error(`[Role] Error adding ${roleId}:`, err);
      return false;
    }
  }

  async function removeRole(guildId: string, userId: string, roleId: string) {
    try {
      console.log(`[Role] Removing ${roleId} from ${userId} in ${guildId}`);
      const res = await discordFetch(
        `${DISCORD_API}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
        {
          method: "DELETE",
          headers: discordHeaders(),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        console.error(`[Role] Failed to remove (${res.status}):`, err);
        return false;
      }
      console.log(`[Role] Removed successfully`);
      return true;
    } catch (err) {
      console.error(`[Role] Error removing ${roleId}:`, err);
      return false;
    }
  }

  async function checkPromotion(
    guildId: string | undefined | null,
    discordId: string,
    wins: number,
  ) {
    if (!guildId) return;
    if (wins >= 3) {
      await addRole(guildId, discordId, PRO_BOXER_ROLE);
      await removeRole(guildId, discordId, AMATEUR_ROLE);
    }
  }

  async function refreshDOContext() {
    try {
      const ns = (env as any).DISCORD_GATEWAY;
      if (!ns) return;
      const doId = ns.idFromName("discord-gateway");
      const stub = ns.get(doId);
      await stub.fetch("https://do/refresh");
      console.log("[DO] Context refreshed from command");
    } catch (err) {
      console.error("[DO] Context refresh failed:", err);
    }
  }

  async function recalculateDivisionRanks(division: string) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: fighters } = await supabase
        .from("fighters")
        .select("username, rank, wins, losses")
        .eq("division", division);

      if (!fighters) return;

      fighters.sort((a, b) => {
        if (a.rank === 0) return -1;
        if (b.rank === 0) return 1;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return a.rank - b.rank;
      });

      let nextRank = 1;
      for (const f of fighters) {
        if (f.rank === 0) continue;
        await supabase.from("fighters").update({ rank: nextRank++ }).eq("username", f.username);
      }
    } catch (err) {
      console.error("[Ranks] Recalculation failed:", err);
    }
  }

  /* ── Command handlers ── */

  async function handleStatsCommand(interaction: any): Promise<Response> {
    const discordId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!discordId) return ephemeral("Could not identify you.");

    if (FIGHTERS.length === 0) {
      await loadDataFromSupabase().catch(() => {});
    }

    let fighter = FIGHTERS.find((f: any) => f.discordId === discordId);

    if (!fighter) {
      try {
        const supabase = getSupabaseAdmin();
        const { data } = await supabase
          .from("fighters")
          .select("*")
          .eq("discord_id", discordId)
          .single();
        if (data) {
          await loadDataFromSupabase();
          fighter = FIGHTERS.find((f: any) => f.discordId === discordId);
        }
      } catch {
        // DB fallback failed, continue to show error
      }
    }
    if (!fighter)
      return ephemeral("You're not registered yet! Use `/register` to create your fighter.");

    if (fighter.wins >= 3) {
      const promoGuildId = fighter.guildId || interaction.guild_id;
      if (promoGuildId) {
        addRole(promoGuildId, discordId, PRO_BOXER_ROLE);
        removeRole(promoGuildId, discordId, AMATEUR_ROLE);
      }
    }

    const cacheBuster = `${fighter.wins}-${fighter.losses}-${fighter.draws}-${fighter.kos}-${Date.now()}`;
    const imageUrl = workerOrigin
      ? `${workerOrigin}/stat-card/${fighter.username}.png?r=${cacheBuster}`
      : null;

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds: [
          {
            ...(imageUrl ? { image: { url: imageUrl } } : {}),
            ...baseFighterEmbed(fighter),
            fields: [
              { name: "Division", value: fighter.division || "TBD", inline: true },
              {
                name: "Rank",
                value: fighter.rank === 0 ? "Champion" : `#${fighter.rank}`,
                inline: true,
              },
              { name: "Record", value: formatRecord(fighter), inline: true },
              { name: "Stance", value: fighter.stance, inline: true },
              { name: "Streak", value: fighter.streak || "N/A", inline: true },
              ...(formatBelts(fighter.beltsHeld)
                ? [{ name: "Belts Held", value: formatBelts(fighter.beltsHeld)!, inline: false }]
                : []),
              ...(imageUrl
                ? [
                    {
                      name: "Card",
                      value: `[View Full Stat Card](${imageUrl.replace(/\.png$/, "")})`,
                      inline: false,
                    },
                  ]
                : []),
            ],
          },
        ],
      },
    });
  }

  function computeAchievements(fighter: any) {
    const achievements: { emoji: string; name: string; unlocked: boolean }[] = [];
    const total = fighter.wins + fighter.losses + fighter.draws;
    const koPct = fighter.wins > 0 ? Math.round((fighter.kos / fighter.wins) * 100) : 0;

    achievements.push({
      emoji: "<:crown:1516827211427090544>",
      name: "Champion",
      unlocked: fighter.rank === 0,
    });
    achievements.push({ emoji: "🌍", name: "World Champion", unlocked: fighter.belts >= 1 });
    achievements.push({
      emoji: "<:undisputed:1516823917585498192>",
      name: "Undisputed",
      unlocked: fighter.belts === 4,
    });

    achievements.push({
      emoji: "<:fire:1516827203818488048>",
      name: "On Fire",
      unlocked: fighter.streak?.endsWith("W") && parseInt(fighter.streak, 10) >= 5,
    });
    achievements.push({
      emoji: "<:skull:1516827205580095688>",
      name: "Knockout Artist",
      unlocked: koPct >= 70 && fighter.wins >= 5,
    });
    achievements.push({
      emoji: "<:shield:1516827207480115312>",
      name: "Iron Chin",
      unlocked: fighter.losses === 0 && fighter.wins >= 5,
    });
    achievements.push({
      emoji: "<:target:1516827209610952754>",
      name: "Perfect Record",
      unlocked: fighter.losses === 0 && fighter.draws === 0 && total > 0,
    });
    achievements.push({ emoji: "🥇", name: "Double Digit Wins", unlocked: fighter.wins >= 10 });
    achievements.push({
      emoji: "<:chart:1516827201226539038>",
      name: "Rising Star",
      unlocked: fighter.wins >= 3 && fighter.rank > 0 && fighter.rank < 10,
    });
    achievements.push({ emoji: "💪", name: "Veteran", unlocked: total >= 20 });

    return achievements;
  }

  function resolveFighterId(
    interaction: any,
  ): { discordId?: string; displayName?: string } | undefined {
    const userMention = getOptionValue(interaction.data.options, "user");
    const textName = getOptionValue(interaction.data.options, "username");

    if (userMention) return { discordId: userMention };
    if (textName) {
      const mentionMatch = textName.match(/^<@!?(\d+)>$/);
      if (mentionMatch) return { discordId: mentionMatch[1] };
      return { displayName: textName };
    }
    const callerId = interaction.member?.user?.id ?? interaction.user?.id;
    if (callerId) return { discordId: callerId };
    return undefined;
  }

  function lookupFighter(opts: { discordId?: string; displayName?: string }): any | undefined {
    if (opts.discordId) return FIGHTERS.find((f: any) => f.discordId === opts.discordId);
    if (opts.displayName)
      return FIGHTERS.find(
        (f: any) => f.displayName?.toLowerCase() === opts.displayName!.toLowerCase(),
      );
    return undefined;
  }

  async function ensureFightersLoaded(): Promise<void> {
    if (FIGHTERS.length === 0) {
      await loadDataFromSupabase().catch(() => {});
    }
  }

  async function handleAchievementCommand(interaction: any): Promise<Response> {
    await ensureFightersLoaded();
    const opts = resolveFighterId(interaction);
    if (!opts) return ephemeral("Could not identify you.");
    const fighter = lookupFighter(opts);
    if (!fighter)
      return ephemeral("That user hasn't registered as a fighter yet. Use /register first.");

    const achievements = computeAchievements(fighter);
    const unlocked = achievements.filter((a) => a.unlocked);

    const totalFights = fighter.wins + fighter.losses + fighter.draws;

    const desc = unlocked.length
      ? `${fighter.displayName} has fought ${totalFights} time${totalFights !== 1 ? "s" : ""} across their career.`
      : `${fighter.displayName} hasn't earned any achievements yet. Fight more to unlock them!`;

    const fields = unlocked.length
      ? unlocked.map((a) => ({
          name: `${a.emoji} ${a.name}`,
          value: "✅",
          inline: true,
        }))
      : [
          {
            name: "No Achievements",
            value: "Fight to earn achievements like Champion, On Fire, Iron Chin, and more!",
            inline: false,
          },
        ];

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds: [
          {
            color: BRAND_COLOR,
            title: `${fighter.displayName} — Achievements`,
            description: desc,
            fields,
            footer: { text: "Matchroom Boxing Beta" },
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
  }

  async function handlePredictCommand(interaction: any): Promise<Response> {
    const discordId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!discordId) return ephemeral("Could not identify you.");

    const eventSlug = getOptionValue(interaction.data.options, "slug");
    const predictedWinner = getOptionValue(interaction.data.options, "fighter");
    if (!eventSlug || !predictedWinner)
      return ephemeral("Please provide both event slug and fighter username.");

    const fighter = FIGHTERS.find((f: any) => f.username === predictedWinner);
    if (!fighter) return ephemeral(`Fighter **${predictedWinner}** not found.`);

    await ensureEventsLoaded();
    await ensurePredictionsLoaded();

    const event = EVENTS.find((e: any) => e.slug === eventSlug);
    if (!event) return ephemeral(`Event **${eventSlug}** not found.`);

    const existing = getPredictionByUser(eventSlug, discordId);
    if (existing)
      return ephemeral(
        `You already predicted **${existing.predictedWinner}** would win. Use \`/predictions\` to see all predictions.`,
      );

    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("predictions").insert({
        event_slug: eventSlug,
        fighter_username: predictedWinner,
        predicted_winner: predictedWinner,
        user_discord_id: discordId,
      });

      if (error) {
        if (error.message?.includes("unique constraint")) {
          return ephemeral("You've already predicted for this event!");
        }
        console.error("[Predict] Insert error:", error);
        return ephemeral("Failed to save prediction. Try again.");
      }

      clearPredictionsCache();
      await ensurePredictionsLoaded();
    } catch (err) {
      console.error("[Predict] Error:", err);
      return ephemeral("Failed to save prediction. Try again.");
    }

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds: [
          {
            color: BRAND_COLOR,
            title: "✅ Prediction Recorded",
            description: `You predicted **${fighter.displayName}** will win at **${event.name}**!`,
            footer: { text: "Matchroom Boxing Beta" },
            timestamp: new Date().toISOString(),
          },
        ],
        flags: 64,
      },
    });
  }

  async function handlePredictionsCommand(interaction: any): Promise<Response> {
    const eventSlug = getOptionValue(interaction.data.options, "slug");
    if (!eventSlug) return ephemeral("Please provide an event slug.");

    await ensureEventsLoaded();
    await ensurePredictionsLoaded();

    const event = EVENTS.find((e: any) => e.slug === eventSlug);
    if (!event) return ephemeral(`Event **${eventSlug}** not found.`);

    const predictions = getPredictionsForEvent(eventSlug);
    if (!predictions.length) return ephemeral(`No predictions yet for **${event.name}**.`);

    const counts: Record<string, { count: number; fighter: any }> = {};
    for (const p of predictions) {
      if (!counts[p.predictedWinner]) {
        const f = FIGHTERS.find((x: any) => x.username === p.predictedWinner);
        counts[p.predictedWinner] = { count: 0, fighter: f };
      }
      counts[p.predictedWinner].count++;
    }

    const sorted = Object.entries(counts).sort(([, a], [, b]) => b.count - a.count);
    const total = predictions.length;

    const fieldLines = sorted.map(([username, data], i) => {
      const pct = Math.round((data.count / total) * 100);
      const name = data.fighter?.displayName || username;
      const bar =
        "█".repeat(Math.round(pct / 10)) + "░".repeat(Math.max(10 - Math.round(pct / 10), 0));
      return `**${i + 1}.** ${name} — ${data.count}/${total} (${pct}%)\n\`${bar}\``;
    });

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds: [
          {
            color: BRAND_COLOR,
            title: `📊 Predictions — ${event.name}`,
            description: `**${total}** total prediction${total !== 1 ? "s" : ""}`,
            fields: [{ name: "Breakdown", value: fieldLines.join("\n\n"), inline: false }],
            footer: { text: "Matchroom Boxing Beta" },
            timestamp: new Date().toISOString(),
          },
        ],
        flags: 64,
      },
    });
  }

  async function handleRankingsCommand(interaction: any): Promise<Response> {
    const division = getOptionValue(interaction.data.options, "division");
    const region = getOptionValue(interaction.data.options, "region");

    if (!division) return ephemeral("Please choose a division.");

    await ensureFightersLoaded();

    const fighters = getRanked(division as any, undefined, region).slice(0, 10);
    if (!fighters.length) return ephemeral(`No fighters found in **${division}**.`);

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds: [
          {
            color: BRAND_COLOR,
            author: {
              name: "Matchroom Boxing",
              icon_url:
                "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
            },
            title: `Boxing ${division} Rankings${region && region !== "all" ? ` — ${region}` : ""}`,
            description: `"Let's look at the **${division}** division. Some hungry fighters here..."`,
            fields: fighters.map((f: any, i: number) => ({
              name: `${f.rank === 0 ? "Crown" : "#" + (i + 1)} ${f.displayName} (@${f.username})`,
              value: `Record: ${f.wins}-${f.losses}-${f.draws} | Streak: ${f.streak || "N/A"}`,
              inline: false,
            })),
            footer: {
              text: "Matchroom Boxing Beta",
              icon_url:
                "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
            },
            timestamp: new Date().toISOString(),
          },
        ],
        flags: 64,
      },
    });
  }

  async function handleChampionsCommand(interaction: any): Promise<Response> {
    await ensureFightersLoaded();
    const champs = getChampions();
    if (!champs.length) return ephemeral("No champions found.");

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds: [
          {
            color: BRAND_COLOR,
            author: {
              name: "Matchroom Boxing",
              icon_url:
                "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
            },
            title: "Current Champions",
            description:
              '"These are the men and women who run this circus. Champions don\'t wait they take."',
            fields: champs.map((c: any) => ({
              name: `${c.division} Champion`,
              value: `**${c.displayName}** ${formatRecord(c)}`,
              inline: true,
            })),
            footer: {
              text: "Matchroom Boxing Beta",
              icon_url:
                "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
            },
            timestamp: new Date().toISOString(),
          },
        ],
        flags: 64,
      },
    });
  }

  async function handleFighterCommand(interaction: any): Promise<Response> {
    await ensureFightersLoaded();
    const opts = resolveFighterId(interaction);
    if (!opts) return ephemeral("Could not identify you.");
    const fighter = lookupFighter(opts);
    if (!fighter)
      return ephemeral("That user hasn't registered as a fighter yet. Use /register first.");

    const cacheBuster = `${fighter.wins}-${fighter.losses}-${fighter.draws}-${fighter.kos}-${Date.now()}`;
    const imageUrl = workerOrigin
      ? `${workerOrigin}/stat-card/${fighter.username}.png?r=${cacheBuster}`
      : null;

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds: [
          {
            ...baseFighterEmbed(fighter),
            ...(imageUrl ? { image: { url: imageUrl } } : {}),
            fields: [
              { name: "Promoter's Note", value: promoterLine(fighter), inline: false },
              { name: "Division", value: fighter.division, inline: true },
              {
                name: "Rank",
                value: fighter.rank === 0 ? "Champion" : `#${fighter.rank}`,
                inline: true,
              },
              { name: "Record", value: formatRecord(fighter), inline: true },
              { name: "Stance", value: fighter.stance, inline: true },
              { name: "Streak", value: fighter.streak || "N/A", inline: true },
              ...(formatBelts(fighter.beltsHeld)
                ? [{ name: "Belts Held", value: formatBelts(fighter.beltsHeld)!, inline: false }]
                : []),
              ...(imageUrl
                ? [
                    {
                      name: "Card",
                      value: `[View Full Stat Card](${imageUrl.replace(/\.png$/, "")})`,
                      inline: false,
                    },
                  ]
                : []),
            ],
          },
        ],
      },
    });
  }

  async function handleUnregisterCommand(interaction: any): Promise<Response> {
    const discordId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!discordId) return ephemeral("Could not identify you.");

    const appId = interaction.application_id;
    const intToken = interaction.token;

    const bgTask = (async () => {
      try {
        const supabase = getSupabaseAdmin();

        const { data: fighter } = await supabase
          .from("fighters")
          .select("display_name, guild_id, division")
          .eq("discord_id", discordId)
          .single();

        if (!fighter) {
          await editDeferredResponse(
            appId,
            intToken,
            "You're not registered! Use `/register` to create a fighter.",
          );
          return;
        }

        await supabase.from("fighters").delete().eq("discord_id", discordId);

        const unregGuildId = fighter.guild_id || interaction.guild_id;
        if (unregGuildId) {
          await setNickname(unregGuildId, discordId, `${fighter.display_name} [ Retired ]`);
          if (fighter.division)
            await removeRole(unregGuildId, discordId, DIVISION_ROLES[fighter.division]);
          await removeRole(unregGuildId, discordId, AMATEUR_ROLE);
          await removeRole(unregGuildId, discordId, PRO_BOXER_ROLE);
        }

        await loadDataFromSupabase();
        await refreshDOContext();
        await editDeferredResponse(
          appId,
          intToken,
          `${fighter.display_name} has been retired. Use \`/register\` to create a new fighter anytime.`,
        );
      } catch (err) {
        console.error("[Unregister] Background error:", err);
        await editDeferredResponse(appId, intToken, "Unregister failed. Try again.");
      }
    })();

    if (waitUntil) waitUntil(bgTask);

    return jsonResponse({ type: 5 });
  }

  async function handleRegisterModal(interaction: any): Promise<Response> {
    const discordId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!discordId) return ephemeral("Could not identify you.");

    const components = interaction.data.components;
    const getValue = (customId: string) => {
      const row = components.find((c: any) =>
        c.components.some((cc: any) => cc.custom_id === customId),
      );
      const comp = row?.components.find((cc: any) => cc.custom_id === customId);
      return comp && "value" in comp ? comp.value : "";
    };

    const displayName = getValue("display_name");
    const username = getValue("username");
    const rawStance = getValue("fighting_style").trim();

    const VALID_STANCES = ["Orthodox", "Southpaw", "Switch"];
    const resolvedStance = VALID_STANCES.find((s) => s.toLowerCase() === rawStance.toLowerCase());

    if (!displayName || !username) return ephemeral("All fields are required.");
    if (!resolvedStance)
      return ephemeral("Fighting Style must be one of: Orthodox, Southpaw, or Switch.");

    const appId = interaction.application_id;
    const intToken = interaction.token;

    const bgTask = (async () => {
      try {
        const supabase = getSupabaseAdmin();
        const guildId = interaction.guild_id ?? "";

        const { error } = await supabase.from("fighters").insert({
          username,
          display_name: displayName,
          nickname: "",
          division: "Heavyweight",
          rank: 999,
          wins: 0,
          losses: 0,
          draws: 0,
          kos: 0,
          stance: resolvedStance,
          belts: 0,
          belts_held: "",
          debut: new Date().toISOString().split("T")[0],
          streak: "",
          bio: "",
          discord_id: discordId,
          guild_id: guildId,
        });

        if (error) {
          const msg = error.message ?? "";
          if (msg.includes("duplicate key") || msg.includes("unique constraint"))
            await editDeferredResponse(
              appId,
              intToken,
              "You're already registered! Use `/stats` to view your profile.",
            );
          else await editDeferredResponse(appId, intToken, `Registration failed: ${msg}`);
          return;
        }

        await loadDataFromSupabase();
        await refreshDOContext();

        if (guildId) {
          await setNickname(guildId, discordId, `${displayName} | 0-0-0 | 0KOs`);
        }

        await editDeferredResponse(
          appId,
          intToken,
          `"Now tell me — what division are you fighting in, **${displayName}**?"`,
          DIVISION_BUTTONS,
        );
      } catch (err) {
        console.error("[RegisterModal] Background error:", err);
        await editDeferredResponse(appId, intToken, "Registration failed. Please try again.");
      }
    })();

    if (waitUntil) waitUntil(bgTask);

    // Ephemeral — only the user who registered sees this
    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: "Registering you as a fighter...", flags: 64 },
    });
  }

  async function handleDivisionButton(interaction: any): Promise<Response> {
    const discordId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!discordId) return ephemeral("Could not identify you.");

    const customId = interaction.data.custom_id;
    const parts = customId.split("_");
    parts.shift();
    const division = parts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

    if (!(DIVISIONS as readonly string[]).includes(division)) return ephemeral("Invalid division.");

    const appId = interaction.application_id;
    const intToken = interaction.token;

    const bgTask = (async () => {
      try {
        const supabase = getSupabaseAdmin();

        const { data: fighter, error: lookupErr } = await supabase
          .from("fighters")
          .select("display_name, guild_id, division")
          .eq("discord_id", discordId)
          .single();

        if (lookupErr || !fighter) {
          await editDeferredResponse(
            appId,
            intToken,
            "You're not registered! Use `/register` first.",
          );
          return;
        }

        if (fighter.rank !== 999) {
          await editDeferredResponse(
            appId,
            intToken,
            "You already picked a division! One shot per fighter.",
            [],
          );
          return;
        }

        const { error } = await supabase
          .from("fighters")
          .update({ division })
          .eq("discord_id", discordId);
        if (error) {
          await editDeferredResponse(
            appId,
            intToken,
            "❌ Failed to set division. Try again later.",
          );
          return;
        }

        const { count } = await supabase
          .from("fighters")
          .select("*", { count: "exact", head: true })
          .eq("division", division)
          .gt("rank", 0)
          .neq("discord_id", discordId);

        await supabase
          .from("fighters")
          .update({ rank: (count ?? 0) + 1 })
          .eq("discord_id", discordId);

        await recalculateDivisionRanks(division);

        const roleGuildId = fighter.guild_id || interaction.guild_id;
        if (roleGuildId) {
          const roleId = DIVISION_ROLES[division];
          if (roleId) await addRole(roleGuildId, discordId, roleId);
          await addRole(roleGuildId, discordId, AMATEUR_ROLE);
          await setNickname(roleGuildId, discordId, `${fighter.display_name} | 0-0-0 | 0KOs`);
        }

        await loadDataFromSupabase();
        await refreshDOContext();

        await editDeferredResponse(
          appId,
          intToken,
          `Division locked in! One last thing — which region will **${fighter.display_name}** fight out of?`,
          REGION_BUTTONS,
        );
      } catch (err) {
        console.error("[DivisionButton] Background error:", err);
        await editDeferredResponse(
          appId,
          intToken,
          "❌ Something went wrong picking your division. Try `/register` again.",
        );
      }
    })();

    if (waitUntil) waitUntil(bgTask);

    return jsonResponse({ type: 6 });
  }

  async function handleRegionButton(interaction: any): Promise<Response> {
    const discordId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!discordId) return ephemeral("Could not identify you.");

    const customId = interaction.data.custom_id;
    const region = customId.replace("reg_", "").toUpperCase().replace(/-/g, " ");

    const VALID_REGIONS = ["ASIA", "EUROPE", "NORTH AMERICA"];
    if (!VALID_REGIONS.includes(region)) return ephemeral("Invalid region.");

    const appId = interaction.application_id;
    const intToken = interaction.token;

    const bgTask = (async () => {
      try {
        const supabase = getSupabaseAdmin();

        const { data: fighter, error: lookupErr } = await supabase
          .from("fighters")
          .select("display_name, guild_id, division, discord_id, region")
          .eq("discord_id", discordId)
          .single();

        if (lookupErr || !fighter) {
          await editDeferredResponse(
            appId,
            intToken,
            "You're not registered! Use `/register` first.",
          );
          return;
        }

        if (fighter.region) {
          await editDeferredResponse(
            appId,
            intToken,
            `You already picked a region (**${fighter.region}**)! One shot per fighter.`,
            [],
          );
          return;
        }

        const { error } = await supabase
          .from("fighters")
          .update({ region })
          .eq("discord_id", discordId);
        if (error) {
          await editDeferredResponse(appId, intToken, "❌ Failed to set region. Try again later.");
          return;
        }

        await loadDataFromSupabase();
        await refreshDOContext();

        // Assign region role
        const regionRoleId = REGION_ROLES[region];
        if (regionRoleId && fighter.guild_id) {
          await addRole(fighter.guild_id, discordId, regionRoleId);
        }

        await editDeferredResponse(
          appId,
          intToken,
          `Registration complete! **${fighter.display_name}** is fighting at **${fighter.division}** out of **${region}**. Time to climb the ranks, kid.`,
          [],
        );
      } catch (err) {
        console.error("[RegionButton] Background error:", err);
        await editDeferredResponse(
          appId,
          intToken,
          "❌ Something went wrong. Try `/register` again.",
        );
      }
    })();

    if (waitUntil) waitUntil(bgTask);
    return jsonResponse({ type: 6 });
  }

  async function handleSignupCommand(interaction: any): Promise<Response> {
    const eventSlug = getOptionValue(interaction.data.options, "slug");
    if (!eventSlug) return ephemeral("Please provide an event slug.");

    await ensureEventsLoaded();

    const event = EVENTS.find((e: any) => e.slug === eventSlug);
    if (!event) {
      const list = EVENTS.filter((e: any) => e.status === "upcoming")
        .map((e: any) => `\`${e.slug}\` — ${e.name}`)
        .join("\n");
      return ephemeral(
        `Event **${eventSlug}** not found.${list ? "\n\n**Upcoming events:**\n" + list : ""}`,
      );
    }

    const siteUrl = env.VITE_SITE_URL ?? "https://matchroom-beta.vercel.app";
    const dateStr = new Date(event.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const embed: any = {
      title: `🥊 Sign Up — ${event.name}`,
      url: `${siteUrl}/events/${event.slug}`,
      color: BRAND_COLOR,
      description: `Click the button below to sign up for **${event.name}**. A private ticket channel will open where staff can discuss your contract.`,
      fields: [
        { name: "📅 Date", value: dateStr, inline: true },
        { name: "📍 Arena", value: event.arena, inline: true },
        { name: "🔔 Status", value: "Upcoming", inline: true },
      ],
      author: {
        name: "Matchroom Boxing",
        icon_url:
          "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
      },
      footer: {
        text: "Matchroom Boxing Beta",
        icon_url:
          "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
      },
      timestamp: new Date().toISOString(),
    };
    if (event.image) embed.image = { url: event.image };

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds: [embed],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 3,
                label: "✍️ Sign Up & Open Ticket",
                custom_id: `signup_${event.slug}`,
              },
            ],
          },
        ],
      },
    });
  }

  async function handleSignupButton(interaction: any): Promise<Response> {
    const discordId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!discordId) return ephemeral("Could not identify you.");

    const fighter = FIGHTERS.find((f: any) => f.discordId === discordId);
    if (!fighter) return ephemeral("You're not registered yet! Use `/register` first.");

    const eventSlug = interaction.data.custom_id.replace("signup_", "");
    const guildId = interaction.guild_id;
    if (!guildId) return ephemeral("This can only be used in a server.");

    if (_ticketChannels[eventSlug]) {
      return ephemeral(`A ticket for this event is already open: <#${_ticketChannels[eventSlug]}>`);
    }

    await ensureEventsLoaded();
    await ensureSignupsLoaded();

    const event = EVENTS.find((e: any) => e.slug === eventSlug);
    if (!event) return ephemeral("Event not found.");

    const existing = getSignupsForEvent(eventSlug);
    if (existing.some((s: any) => s.fighterUsername === fighter.username)) {
      return ephemeral(`You're already signed up for **${event.name}**!`);
    }

    const channelName = `ticket-${sanitizeChannelName(eventSlug)}`;

    try {
      const createRes = await discordFetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
        method: "POST",
        headers: discordHeaders(),
        body: JSON.stringify({
          name: channelName,
          type: 0,
          parent_id: SIGNUP_CATEGORY_ID,
          permission_overwrites: [
            { id: guildId, type: 0, deny: "1024", allow: "0" },
            { id: discordId, type: 1, allow: "1024", deny: "0" },
            { id: STAFF_ROLE_ID, type: 1, allow: "1024", deny: "0" },
          ],
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({ message: createRes.statusText }));
        console.error("[Signup] Channel creation failed:", err);
        return ephemeral("❌ Failed to create ticket channel. Please try again.");
      }

      const channel = (await createRes.json()) as any;
      _ticketChannels[eventSlug] = channel.id;

      const supabase = getSupabaseAdmin();
      const { error: dbErr } = await supabase.from("event_signups").insert({
        event_slug: eventSlug,
        fighter_username: fighter.username,
      });

      if (dbErr) {
        console.error("[Signup] Insert error:", dbErr);
        return ephemeral("❌ Failed to sign up. Try again later.");
      }

      clearSignupsCache();

      // Send admin webhook
      const webhookUrl = env.ADMIN_WEBHOOK_URL;
      if (webhookUrl) {
        const date = event.date
          ? new Date(event.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "TBD";
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `🔔 **${fighter.displayName}** (@${fighter.username}) signed up for **${event.name}** (${date}) — ticket: <#${channel.id}>`,
          }),
        }).catch(() => {});
      }

      // Send intro message in ticket
      const dateStr = event.date
        ? new Date(event.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "TBD";
      const introEmbed: any = {
        title: `📋 Contract — ${event.name}`,
        color: BRAND_COLOR,
        description: `Welcome, **${fighter.displayName}**! A staff member will be with you shortly to discuss your contract for this event.`,
        fields: [
          { name: "Fighter", value: `${fighter.displayName} (@${fighter.username})`, inline: true },
          { name: "Event", value: event.name, inline: true },
          { name: "Date", value: dateStr, inline: true },
          { name: "Arena", value: event.arena, inline: true },
          {
            name: "Record",
            value: `${fighter.wins}-${fighter.losses}-${fighter.draws} (${fighter.kos} KOs)`,
            inline: true,
          },
          ...(fighter.division
            ? [{ name: "Division", value: fighter.division, inline: true }]
            : []),
        ],
        author: {
          name: "Matchroom Boxing",
          icon_url:
            "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
        },
        timestamp: new Date().toISOString(),
      };

      await discordFetch(`${DISCORD_API}/channels/${channel.id}/messages`, {
        method: "POST",
        headers: discordHeaders(),
        body: JSON.stringify({
          embeds: [introEmbed],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 4,
                  label: "🔒 Close Ticket",
                  custom_id: `close_${eventSlug}_${fighter.username}`,
                },
              ],
            },
          ],
        }),
      });

      return jsonResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `✅ Ticket opened: <#${channel.id}>`,
          flags: 64,
        },
      });
    } catch (err) {
      console.error("[Signup] Error:", err);
      return ephemeral("❌ Something went wrong. Try again.");
    }
  }

  async function handleCloseTicket(interaction: any): Promise<Response> {
    const channelId = interaction.channel_id;
    if (!channelId) return ephemeral("This can only be used in a server.");

    try {
      await discordFetch(`${DISCORD_API}/channels/${channelId}`, {
        method: "DELETE",
        headers: discordHeaders(),
      });

      return jsonResponse({
        type: InteractionResponseType.UpdateMessage,
        data: {
          content: "🔒 Ticket closed and deleted",
          components: [],
        },
      });
    } catch (err) {
      console.error("[CloseTicket] Error:", err);
      return ephemeral("❌ Failed to delete ticket.");
    }
  }

  async function handleHelpCommand(): Promise<Response> {
    const lines = [
      "**Matchroom Boxing Beta — Commands**",
      "",
      "**Fighter**",
      "`/register` — Create your fighter profile",
      "`/fighter [user]` — Look up a fighter's profile",
      "`/stats [user]` — Full fighter stats + stat card image",
      "`/achievement` — View your achievements",
      "`/unregister` — Delete your fighter permanently",
      "",
      "**Rankings**",
      "`/rankings [division]` — See top fighters in a division",
      "`/champions` — List all division champions",
      "",
      "**Events**",
      "`/signup` — Sign up for an upcoming event",
      "`/predict [slug] [fighter]` — Predict the winner of an event",
      "`/predictions [slug]` — See prediction breakdown for an event",
      "`/ticket` — Open a support ticket for an event",
      "`/close-ticket` — Close your active ticket",
      "",
      "**Info**",
      "`/news` — Latest boxing news",
      "`/video [id]` — Watch a video from the library",
      "`/ask [question]` — Ask the AI assistant anything",
      "`/emojistealbulk` — Bulk-steal custom emojis from other servers",
      "`/help` — Show this message",
      "",
      "Tip: Type `/` in any channel to browse all commands!",
    ];
    return ephemeral(lines.join("\n"));
  }

  async function handleNewsCommand(interaction: any): Promise<Response> {
    await ensureArticlesLoaded();
    const siteUrl = env.VITE_SITE_URL ?? "https://matchroom-beta.vercel.app";
    const slug = getOptionValue(interaction.data.options, "slug");

    let articles: any[];
    if (slug) {
      const article = getArticleBySlug(slug);
      if (!article) {
        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: `Article **${slug}** not found.`, flags: 64 },
        });
      }
      articles = [article];
    } else {
      const sorted = [...ARTICLES].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      articles = sorted.slice(0, 1);
    }

    if (!articles.length) {
      return jsonResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: "No news articles found.", flags: 64 },
      });
    }

    const embeds = articles.map((article) => {
      const embed: any = {
        title: article.title,
        url: `${siteUrl}/news/${article.slug}`,
        color: BRAND_COLOR,
        description:
          article.excerpt.length > 4096 ? article.excerpt.slice(0, 4093) + "..." : article.excerpt,
        fields: [
          { name: "Category", value: article.category, inline: true },
          { name: "Author", value: article.author, inline: true },
          {
            name: "Date",
            value: new Date(article.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            inline: true,
          },
        ],
        author: {
          name: "📰 Matchroom Boxing News",
          icon_url:
            "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
        },
        footer: {
          text: "Matchroom Boxing Beta",
          icon_url:
            "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
        },
        timestamp: new Date(article.date).toISOString(),
      };
      if (article.image) embed.image = { url: article.image };
      return embed;
    });

    const buttons = articles.map((article: any) => ({
      type: 2,
      style: 5,
      label: "📖 Read Article",
      url: `${siteUrl}/news/${article.slug}`,
    }));

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds,
        components: [
          {
            type: 1,
            components: buttons,
          },
        ],
      },
    });
  }

  async function handleEventCommand(interaction: any): Promise<Response> {
    await ensureEventsLoaded();
    const siteUrl = env.VITE_SITE_URL ?? "https://matchroom-beta.vercel.app";
    const slug = getOptionValue(interaction.data.options, "slug");

    const event = slug ? EVENTS.find((e: any) => e.slug === slug) : nextEvent();

    if (!event) {
      return jsonResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: slug ? `Event **${slug}** not found.` : "No upcoming events.",
          flags: 64,
        },
      });
    }

    const dateStr = new Date(event.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const slotOrder = ["main", "comain", "maincard", "prelim"];
    const grouped = slotOrder
      .map((slot) => {
        const fights = event.card.filter((c: any) => c.slot === slot);
        if (!fights.length) return null;
        const lines = fights.map((f: any) => {
          const a = getByUsername(f.a);
          const b = getByUsername(f.b);
          const aName = a?.displayName ?? f.a;
          const bName = b?.displayName ?? f.b;
          const weight = f.weight ? ` (${f.weight})` : "";
          const title = f.title ? `\n<:trophy:1516823334640156762> ${f.title}` : "";
          return `${aName} vs ${bName}${weight}${title}`;
        });
        return {
          name: CARD_SLOT_LABELS[slot as keyof typeof CARD_SLOT_LABELS],
          value: lines.join("\n"),
          inline: false,
        };
      })
      .filter(Boolean);

    const embed: any = {
      title: event.name,
      url: `${siteUrl}/events/${event.slug}`,
      color: BRAND_COLOR,
      description: event.tagline || null,
      fields: [
        { name: "📅 Date", value: dateStr, inline: true },
        { name: "📍 Arena", value: event.arena, inline: true },
        ...(event.status === "upcoming"
          ? [{ name: "🔔 Status", value: "Upcoming", inline: true }]
          : []),
        ...grouped,
      ],
      author: {
        name: "🥊 Matchroom Boxing Events",
        icon_url:
          "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
      },
      footer: {
        text: "Matchroom Boxing Beta",
        icon_url:
          "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
      },
      timestamp: new Date(event.date).toISOString(),
    };
    if (event.image) embed.image = { url: event.image };

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds: [embed],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 3,
                label: "✍️ Sign Up & Open Ticket",
                custom_id: `signup_${event.slug}`,
              },
            ],
          },
        ],
      },
    });
  }

  async function handleVideoCommand(interaction: any): Promise<Response> {
    await ensureVideosLoaded();
    const siteUrl = env.VITE_SITE_URL ?? "https://matchroom-beta.vercel.app";
    const id = getOptionValue(interaction.data.options, "id");

    if (!id) {
      return jsonResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Please provide a video ID: `/video <id>`",
          flags: 64,
        },
      });
    }

    const video = getVideoById(id);
    if (!video) {
      return jsonResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: `Video **${id}** not found.`, flags: 64 },
      });
    }

    const embed: any = {
      title: video.title,
      url: `${siteUrl}/videos/${video.id}`,
      color: BRAND_COLOR,
      description: [
        `🏷️ **Category:** ${video.category}`,
        `👁️ **Views:** ${video.views}`,
        video.fighters.length > 0 ? `🥊 **Fighters:** ${video.fighters.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      author: {
        name: "📺 Matchroom Boxing Videos",
        icon_url:
          "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
      },
      footer: {
        text: "Matchroom Boxing Beta",
        icon_url:
          "https://cdn.discordapp.com/emojis/1516827130934071456.webp?size=40&quality=lossless",
      },
    };

    const excerptLine = video.excerpt ? video.excerpt : null;

    const content = [
      `🎬 **Matchroom Highlights**`,
      excerptLine ? `*${excerptLine}*` : null,
      "",
      `[▶ Watch Video](${video.video_url})`,
    ]
      .filter(Boolean)
      .join("\n");

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content,
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: "📄 Website",
                url: `${siteUrl}/videos/${video.id}`,
              },
            ],
          },
        ],
      },
    });
  }

  async function handleEmojiStealBulk(interaction: any): Promise<Response> {
    const guildId = interaction.guild_id;
    if (!guildId) return ephemeral("This command can only be used in a server.");

    const MANAGE_EXPRESSIONS = 1n << 26n;
    const appPerms = BigInt(interaction.app_permissions || "0");
    if (!(appPerms & MANAGE_EXPRESSIONS)) {
      return ephemeral(
        "I need the **Manage Expressions** permission in this server to add emojis.",
      );
    }

    const emojiString = getOptionValue(interaction.data.options, "emojis");
    if (!emojiString) return ephemeral("Please provide emoji references.");

    const emojiRegex = /<(a)?:(\w+):(\d+)>/g;
    const matches: { name: string; id: string; animated: boolean }[] = [];
    let match;
    while ((match = emojiRegex.exec(emojiString)) !== null) {
      matches.push({ animated: match[1] === "a", name: match[2], id: match[3] });
    }

    if (matches.length === 0)
      return ephemeral(
        "No valid emoji references found. Use format: `<:name:id>` or `<a:name:id>`",
      );

    if (matches.length > 20)
      return ephemeral("Maximum 20 emojis at a time. Run the command again for more.");

    const appId = interaction.application_id;
    const intToken = interaction.token;

    const bgTask = (async () => {
      const successes: string[] = [];
      const failures: { name: string; reason: string }[] = [];

      for (const emoji of matches) {
        try {
          const ext = emoji.animated ? "gif" : "png";
          const imgRes = await retryFetch(`https://cdn.discordapp.com/emojis/${emoji.id}.${ext}`, {
            method: "GET",
          });

          if (!imgRes.ok) {
            failures.push({ name: emoji.name, reason: `CDN returned ${imgRes.status}` });
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }

          const buffer = await imgRes.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);
          const dataUri = `data:image/${ext};base64,${base64}`;

          const createRes = await discordFetch(`${DISCORD_API}/guilds/${guildId}/emojis`, {
            method: "POST",
            headers: discordHeaders(),
            body: JSON.stringify({ name: emoji.name, image: dataUri }),
          });

          if (createRes.ok) {
            successes.push(emoji.name);
          } else {
            const errData = (await createRes
              .json()
              .catch(() => ({ message: createRes.statusText }))) as { message: string };
            failures.push({
              name: emoji.name,
              reason: errData.message || `HTTP ${createRes.status}`,
            });
          }
        } catch (err) {
          failures.push({
            name: emoji.name,
            reason: err instanceof Error ? err.message : "Unknown error",
          });
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      const lines: string[] = [];
      if (successes.length > 0) {
        lines.push(`✅ **Stolen ${successes.length}/${matches.length} emojis**`);
        const names = successes.map((n) => `:${n}:`).join(" ");
        lines.push(names);
      }
      if (failures.length > 0) {
        lines.push(...failures.map((f) => `❌ **${f.name}** — ${f.reason}`));
      }

      await editDeferredResponse(appId, intToken, lines.join("\n"));
    })();

    if (waitUntil) waitUntil(bgTask);
    return jsonResponse({ type: 5 });
  }

  async function handleDiscordInteraction(request: Request): Promise<Response | null> {
    const url = new URL(request.url);

    if (request.method === "POST") {
      const publicKey = env.DISCORD_PUBLIC_KEY;
      if (!publicKey) return jsonResponse({ error: "DISCORD_PUBLIC_KEY not set" }, 500);

      const signature = request.headers.get("x-signature-ed25519") ?? "";
      const timestamp = request.headers.get("x-signature-timestamp") ?? "";
      const rawBody = await request.text();
      if (!rawBody) return jsonResponse({ error: "Empty body" }, 400);

      const isValid = await verifyKey(rawBody, signature, timestamp, publicKey);
      if (!isValid) return jsonResponse({ error: "Invalid signature" }, 401);

      const interaction = JSON.parse(rawBody);

      if (interaction.type === InteractionType.Ping) {
        return jsonResponse({ type: InteractionResponseType.Pong });
      }

      if (interaction.type === InteractionType.ApplicationCommand) {
        const commandName = interaction.data.name;

        if (commandName === "register") {
          return jsonResponse({
            type: 9,
            data: {
              title: "Register as a Fighter",
              custom_id: "register_modal",
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 4,
                      custom_id: "display_name",
                      label: "Fighter Name",
                      style: 1,
                      placeholder: "e.g. Mike Tyson",
                      min_length: 1,
                      max_length: 100,
                      required: true,
                    },
                  ],
                },
                {
                  type: 1,
                  components: [
                    {
                      type: 4,
                      custom_id: "username",
                      label: "Username",
                      style: 1,
                      placeholder: "e.g. iron_mike",
                      min_length: 1,
                      max_length: 50,
                      required: true,
                    },
                  ],
                },
                {
                  type: 1,
                  components: [
                    {
                      type: 4,
                      custom_id: "fighting_style",
                      label: "Fighting Style",
                      style: 1,
                      placeholder: "Orthodox, Southpaw, or Switch",
                      min_length: 1,
                      max_length: 20,
                      required: true,
                    },
                  ],
                },
              ],
            },
          });
        }

        if (commandName === "stats") return handleStatsCommand(interaction);
        if (commandName === "rankings") return handleRankingsCommand(interaction);
        if (commandName === "champions") return handleChampionsCommand(interaction);
        if (commandName === "fighter") return await handleFighterCommand(interaction);
        if (commandName === "unregister") return handleUnregisterCommand(interaction);
        if (commandName === "signup") return handleSignupCommand(interaction);
        if (commandName === "news") return handleNewsCommand(interaction);
        if (commandName === "event") return handleEventCommand(interaction);
        if (commandName === "help") return handleHelpCommand();
        if (commandName === "emojistealbulk") return handleEmojiStealBulk(interaction);
        if (commandName === "achievement") return await handleAchievementCommand(interaction);
        if (commandName === "predict") return handlePredictCommand(interaction);
        if (commandName === "predictions") return handlePredictionsCommand(interaction);
        if (commandName === "video") return handleVideoCommand(interaction);
      }

      if (
        interaction.type === InteractionType.ModalSubmit &&
        interaction.data.custom_id === "register_modal"
      ) {
        return handleRegisterModal(interaction);
      }

      if (interaction.type === InteractionType.MessageComponent) {
        const customId = interaction.data.custom_id;
        if (customId?.startsWith("div_")) {
          return handleDivisionButton(interaction);
        }
        if (customId?.startsWith("reg_")) {
          return handleRegionButton(interaction);
        }
        if (customId?.startsWith("signup_")) {
          return handleSignupButton(interaction);
        }
        if (customId?.startsWith("close_")) {
          return handleCloseTicket(interaction);
        }
      }

      return jsonResponse({ error: "Unknown interaction type" }, 400);
    }

    return null;
  }

  async function registerCommands() {
    const appId = env.DISCORD_APPLICATION_ID;
    if (!appId || !BOT_TOKEN) {
      console.error(
        "Cannot register commands: DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN not set",
      );
      return;
    }
    const commands = [
      {
        name: "register",
        description: "Register as a fighter in Matchroom Boxing Beta",
        type: 1,
        contexts: [0, 1, 2],
      },
      {
        name: "stats",
        description: "View your fighter stats",
        type: 1,
        contexts: [0, 1, 2],
      },
      {
        name: "rankings",
        description: "Show top fighters in a division",
        type: 1,
        contexts: [0, 1, 2],
        options: [
          {
            type: 3,
            name: "division",
            description: "Choose a weight division",
            required: true,
            choices: [
              { name: "Flyweight", value: "Flyweight" },
              { name: "Bantamweight", value: "Bantamweight" },
              { name: "Featherweight", value: "Featherweight" },
              { name: "Lightweight", value: "Lightweight" },
              { name: "Welterweight", value: "Welterweight" },
              { name: "Middleweight", value: "Middleweight" },
              { name: "Cruiserweight", value: "Cruiserweight" },
              { name: "Heavyweight", value: "Heavyweight" },
            ],
          },
          {
            type: 3,
            name: "region",
            description: "Filter by region (optional)",
            required: false,
            choices: [
              { name: "All Regions", value: "all" },
              { name: "🌏 ASIA", value: "ASIA" },
              { name: "🌍 EUROPE", value: "EUROPE" },
              { name: "🌎 NORTH AMERICA", value: "NORTH AMERICA" },
            ],
          },
        ],
      },
      {
        name: "champions",
        description: "List all current division champions",
        type: 1,
        contexts: [0, 1, 2],
      },
      {
        name: "fighter",
        description: "Look up a fighter's profile and stats",
        type: 1,
        contexts: [0, 1, 2],
        options: [
          {
            type: 6,
            name: "user",
            description: "Discord user to look up (optional)",
            required: false,
          },
          {
            type: 3,
            name: "username",
            description: "Fighter name to look up (optional)",
            required: false,
          },
        ],
      },
      {
        name: "unregister",
        description: "Delete your fighter permanently",
        type: 1,
        contexts: [0, 1, 2],
      },
      {
        name: "signup",
        description: "Post a signup embed with ticket button for an event",
        type: 1,
        default_member_permissions: "8",
        contexts: [0],
        options: [
          {
            type: 3,
            name: "slug",
            description: "Event slug (e.g. fight-night-1)",
            required: true,
          },
        ],
      },
      {
        name: "help",
        description: "Show available commands and how to use them",
        type: 1,
        contexts: [0, 1, 2],
      },
      {
        name: "news",
        description: "Post the latest news articles with images to this channel",
        type: 1,
        default_member_permissions: "8",
        contexts: [0],
        options: [
          {
            type: 3,
            name: "slug",
            description: "Article slug (optional — defaults to latest article)",
            required: false,
          },
        ],
      },
      {
        name: "event",
        description: "Post event details with fight card and poster to this channel",
        type: 1,
        default_member_permissions: "8",
        contexts: [0],
        options: [
          {
            type: 3,
            name: "slug",
            description: "Event slug (optional — defaults to next upcoming event)",
            required: false,
          },
        ],
      },
      {
        name: "achievement",
        description: "View a fighter's earned achievements and milestones",
        type: 1,
        contexts: [0, 1, 2],
        options: [
          {
            type: 6,
            name: "user",
            description: "Discord user to look up (optional)",
            required: false,
          },
          {
            type: 3,
            name: "username",
            description: "Fighter name to look up (optional)",
            required: false,
          },
        ],
      },
      {
        name: "predict",
        description: "Predict who will win in an upcoming event",
        type: 1,
        contexts: [0, 1, 2],
        options: [
          {
            type: 3,
            name: "slug",
            description: "Event slug (e.g. fight-night-1)",
            required: true,
          },
          {
            type: 3,
            name: "fighter",
            description: "Fighter username you predict will win",
            required: true,
          },
        ],
      },
      {
        name: "predictions",
        description: "View prediction breakdown for an event",
        type: 1,
        contexts: [0, 1, 2],
        options: [
          {
            type: 3,
            name: "slug",
            description: "Event slug (e.g. fight-night-1)",
            required: true,
          },
        ],
      },
      {
        name: "emojistealbulk",
        description: "Bulk-steal custom emojis from other servers by pasting emoji references",
        type: 1,
        contexts: [0],
        options: [
          {
            type: 3,
            name: "emojis",
            description: "Paste emoji references, e.g. <:name:123> <a:name:456>",
            required: true,
          },
        ],
      },
      {
        name: "video",
        description: "Watch a video from the library",
        type: 1,
        contexts: [0, 1, 2],
        options: [
          {
            type: 3,
            name: "id",
            description: "Video ID (slug) to watch",
            required: true,
          },
        ],
      },
    ];

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const body = JSON.stringify(commands);
        const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
          method: "PUT",
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body,
        });
        const data = await res.json().catch(() => []);
        if (res.ok) {
          console.log("Registered " + (Array.isArray(data) ? data.length : 0) + " slash commands");
          return;
        }
        console.error("Command registration failed:", res.status, JSON.stringify(data));
        return;
      } catch (err) {
        const isLast = attempt === maxRetries;
        console.log(
          `[Retry] registerCommands attempt ${attempt}/${maxRetries} failed: ${err instanceof Error ? err.message : err}${isLast ? "" : ", retrying in " + 1000 * 2 ** (attempt - 1) + "ms"}`,
        );
        if (isLast) {
          console.error("Command registration error:", err);
          return;
        }
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      }
    }
  }

  return { handleDiscordInteraction, registerCommands };
}
