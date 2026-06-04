import { verifyKey } from "discord-interactions";
import { InteractionType, InteractionResponseType } from "discord-api-types/v10";
import { createClient } from "@supabase/supabase-js";
import { setSupabaseEnv } from "@/lib/supabase";
import {
  FIGHTERS,
  getRanked,
  getChampions,
  getByUsername,
  loadDataFromSupabase,
} from "@/data/fighters";

const DISCORD_API = "https://discord.com/api/v10";

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

export function createHandler(
  env: Record<string, string>,
  waitUntil?: (promise: Promise<unknown>) => void,
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
          "https://cdn.discordapp.com/emojis/1294761893288677406.webp?size=40&quality=lossless",
      },
      footer: {
        text: "Matchroom Boxing Beta • Fan-made",
        icon_url:
          "https://cdn.discordapp.com/emojis/1294761893288677406.webp?size=40&quality=lossless",
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
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`Discord createDM: ${res.status} ${err.message}`);
    }
    const { id } = await res.json();
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
    ["Light Heavyweight", "Cruiserweight", "Heavyweight"].map((d) => ({
      type: 2,
      style: 2,
      label: d,
      custom_id: `div_${d.toLowerCase().replace(/\s+/g, "_")}`,
    })),
  ].map((row) => ({ type: 1, components: row }));

  const DIVISION_ROLES: Record<string, string> = {
    Flyweight: "1510667123549147136",
    Bantamweight: "1510667122932449552",
    Featherweight: "1510667122219421716",
    Lightweight: "1510667121649123418",
    Welterweight: "1510667120562929854",
    Middleweight: "1510667119560364196",
    "Light Heavyweight": "1510665783037137017",
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
        .select("username, rank")
        .eq("division", division)
        .order("rank", { ascending: true });

      if (!fighters) return;

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

  function handleStatsCommand(interaction: any): Response {
    const discordId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!discordId) return ephemeral("Could not identify you.");

    const fighter = FIGHTERS.find((f: any) => f.discordId === discordId);
    if (!fighter)
      return ephemeral("You're not registered yet! Use `/register` to create your fighter.");

    if (fighter.wins >= 3) {
      const promoGuildId = fighter.guildId || interaction.guild_id;
      if (promoGuildId) {
        addRole(promoGuildId, discordId, PRO_BOXER_ROLE);
        removeRole(promoGuildId, discordId, AMATEUR_ROLE);
      }
    }

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds: [
          {
            ...baseFighterEmbed(fighter),
            fields: [
              { name: "Promoter's Note", value: promoterLine(fighter), inline: false },
              { name: "Division", value: fighter.division || "TBD", inline: true },
              {
                name: "Rank",
                value: fighter.rank === 0 ? "Champion" : `#${fighter.rank}`,
                inline: true,
              },
              { name: "Record", value: formatRecord(fighter), inline: true },
              { name: "Stance", value: fighter.stance, inline: true },
              { name: "Streak", value: fighter.streak || "N/A", inline: true },
              ...(fighter.belts_held
                ? [{ name: "Belts Held", value: fighter.belts_held, inline: false }]
                : []),
            ],
          },
        ],
        flags: 64,
      },
    });
  }

  function handleRankingsCommand(interaction: any): Response {
    const division = getOptionValue(interaction.data.options, "division");
    if (!division) return ephemeral("Please choose a division.");

    const fighters = getRanked(division as any).slice(0, 10);
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
                "https://cdn.discordapp.com/emojis/1294761893288677406.webp?size=40&quality=lossless",
            },
            title: `Boxing ${division} Rankings`,
            description: `"Let's look at the **${division}** division. Some hungry fighters here..."`,
            fields: fighters.map((f: any, i: number) => ({
              name: `${f.rank === 0 ? "Crown" : "#" + (i + 1)} ${f.displayName} (@${f.username})`,
              value: `Record: ${f.wins}-${f.losses}-${f.draws} | Streak: ${f.streak || "N/A"}`,
              inline: false,
            })),
            footer: {
              text: "Matchroom Boxing Beta Fan-made",
              icon_url:
                "https://cdn.discordapp.com/emojis/1294761893288677406.webp?size=40&quality=lossless",
            },
            timestamp: new Date().toISOString(),
          },
        ],
        flags: 64,
      },
    });
  }

  function handleChampionsCommand(interaction: any): Response {
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
                "https://cdn.discordapp.com/emojis/1294761893288677406.webp?size=40&quality=lossless",
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
              text: "Matchroom Boxing Beta Fan-made",
              icon_url:
                "https://cdn.discordapp.com/emojis/1294761893288677406.webp?size=40&quality=lossless",
            },
            timestamp: new Date().toISOString(),
          },
        ],
        flags: 64,
      },
    });
  }

  function handleFighterCommand(interaction: any): Response {
    const username = getOptionValue(interaction.data.options, "username");
    if (!username) return ephemeral("Please provide a username.");

    const fighter = getByUsername(username);
    if (!fighter) return ephemeral(`Fighter **${username}** not found.`);

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        embeds: [
          {
            ...baseFighterEmbed(fighter),
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
              ...(fighter.belts_held
                ? [{ name: "Belts Held", value: fighter.belts_held, inline: false }]
                : []),
            ],
          },
        ],
        flags: 64,
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

    if (!displayName || !username) return ephemeral("All fields are required.");

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
          division: "",
          rank: 999,
          wins: 0,
          losses: 0,
          draws: 0,
          kos: 0,
          stance: "Orthodox",
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

        if (fighter.division) {
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
          `Division locked in. **${fighter.display_name}** is now fighting at **${division}**. The Promoter is watching.`,
          [],
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
              ],
            },
          });
        }

        if (commandName === "stats") return handleStatsCommand(interaction);
        if (commandName === "rankings") return handleRankingsCommand(interaction);
        if (commandName === "champions") return handleChampionsCommand(interaction);
        if (commandName === "fighter") return handleFighterCommand(interaction);
        if (commandName === "unregister") return handleUnregisterCommand(interaction);
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
              { name: "Light Heavyweight", value: "Light Heavyweight" },
              { name: "Cruiserweight", value: "Cruiserweight" },
              { name: "Heavyweight", value: "Heavyweight" },
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
            type: 3,
            name: "username",
            description: "The fighter's username (e.g. iron_mike)",
            required: true,
          },
        ],
      },
      {
        name: "unregister",
        description: "Delete your fighter permanently",
        type: 1,
        contexts: [0, 1, 2],
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
