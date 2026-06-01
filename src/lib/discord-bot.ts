import { verifyKey } from "discord-interactions";
import { InteractionType, InteractionResponseType } from "discord-api-types/v10";
import { createClient } from "@supabase/supabase-js";
import https from "https";

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

let _interFont: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer> {
  if (!_interFont) {
    const res = await fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeAmM.woff",
    );
    _interFont = await res.arrayBuffer();
  }
  return _interFont;
}

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function generateStatCard(fighter: any): Promise<Buffer> {
  const font = await getFont();
  const satori = (await import("satori")).default;
  const sharp = (await import("sharp")).default;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: 600,
          height: 300,
          backgroundColor: "#0f0f0f",
          color: "#ffffff",
          fontFamily: "Inter",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        },
        children: [
          { type: "div", props: { style: { height: 4, backgroundColor: "#dc2626" } } },
          {
            type: "div",
            props: {
              style: { flex: 1, display: "flex", padding: "24px 28px", gap: 28 },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      width: 140,
                      height: 180,
                      backgroundColor: "#1a1a1a",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: "1px solid #2a2a2a",
                    },
                    children: {
                      type: "span",
                      props: {
                        style: { fontSize: 48, fontWeight: 700, color: "#a1a1a1" },
                        children: fighter.display_name
                          .split(/\s+/)
                          .map((p: string) => p[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase(),
                      },
                    },
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { display: "flex", flexDirection: "column", flex: 1, gap: 8 },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize: 28,
                            fontWeight: 800,
                            letterSpacing: "0.02em",
                            lineHeight: 1.1,
                          },
                          children: fighter.display_name,
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: { fontSize: 13, color: "#a1a1a1", marginTop: 2 },
                          children: `@${fighter.username}`,
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "inline-flex",
                            backgroundColor: "#dc2626",
                            padding: "2px 10px",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            alignSelf: "flex-start",
                          },
                          children: fighter.division,
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: fighter.rank === 0 ? "#dc2626" : "#a1a1a1",
                          },
                          children: fighter.rank === 0 ? "★ Champion" : `Ranked #${fighter.rank}`,
                        },
                      },
                      {
                        type: "div",
                        props: {
                          style: { display: "flex", gap: 12, marginTop: 4 },
                          children: [
                            ["Wins", fighter.wins],
                            ["Losses", fighter.losses],
                            ["Draws", fighter.draws],
                            [
                              "KO %",
                              `${Math.round((fighter.kos / Math.max(fighter.wins, 1)) * 100)}%`,
                            ],
                          ].map(([label, value]) => ({
                            type: "div",
                            props: {
                              style: {
                                backgroundColor: "#1a1a1a",
                                border: "1px solid #2a2a2a",
                                borderRadius: 6,
                                padding: "8px 14px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                minWidth: 60,
                              },
                              children: [
                                {
                                  type: "span",
                                  props: {
                                    style: {
                                      fontSize: 9,
                                      fontWeight: 700,
                                      letterSpacing: "0.15em",
                                      textTransform: "uppercase",
                                      color: "#a1a1a1",
                                    },
                                    children: label,
                                  },
                                },
                                {
                                  type: "span",
                                  props: {
                                    style: { fontSize: 22, fontWeight: 800, marginTop: 2 },
                                    children: String(value),
                                  },
                                },
                              ],
                            },
                          })),
                        },
                      },
                      ...(fighter.belts_held
                        ? [
                            {
                              type: "div" as const,
                              props: {
                                style: { display: "flex", gap: 4, marginTop: 4 },
                                children: fighter.belts_held.split(",").map((b: string) => ({
                                  type: "div" as const,
                                  props: {
                                    style: {
                                      backgroundColor: "#dc2626",
                                      padding: "1px 8px",
                                      fontSize: 9,
                                      fontWeight: 700,
                                      letterSpacing: "0.1em",
                                      borderRadius: 3,
                                    },
                                    children: b,
                                  },
                                })),
                              },
                            },
                          ]
                        : []),
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 600,
      height: 300,
      fonts: [
        { name: "Inter", data: font, weight: 400, style: "normal" },
        { name: "Inter", data: font, weight: 700, style: "normal" },
        { name: "Inter", data: font, weight: 800, style: "normal" },
      ],
    },
  );

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function uploadStatCard(discordId: string, png: Buffer): Promise<string> {
  const supabase = getSupabaseAdmin();
  const path = `stat-cards/${discordId}-${Date.now()}.png`;
  const { error } = await supabase.storage.from("fighter-images").upload(path, png, {
    contentType: "image/png",
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data: urlData } = supabase.storage.from("fighter-images").getPublicUrl(path);
  return urlData.publicUrl;
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

async function sendFollowUp(interaction: any, payload: any) {
  try {
    await discordFetch(
      `${DISCORD_API}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          payload.type !== undefined
            ? payload
            : { type: InteractionResponseType.ChannelMessageWithSource, data: payload },
        ),
      },
    );
  } catch (err) {
    console.error("Follow-up failed:", err);
  }
}

function deferred() {
  return jsonResponse({ type: InteractionResponseType.DeferredChannelMessageWithSource });
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

/* ============ Promoter Voice & Embed Helpers ============ */

const PROMOTER_LINES = {
  champion: [
    "This man is a PROBLEM in the {division} division. Pure violence.",
    "Talk about a specimen. Built different from the rest of us.",
    "He doesn't just win fights, he ends careers.",
    "The aura this guy carries? Championship material.",
    "If you're looking for the baddest man on the planet, stop here.",
  ],
  contender: [
    "Now THIS is a fighter with serious upside. Watch this space.",
    "He's been putting in work and it's starting to show.",
    "The hunger in his eyes? That's championship material right there.",
    "Every time he steps in that ring, he takes a piece of it with him.",
    "He's not just climbing the ranks, he's reshaping them.",
  ],
  undefeated: [
    "Zero losses and counting. That's not luck, that's dominance.",
    "Perfect record for a reason. He makes it look easy.",
    "When you're undefeated, you're not just fighting records, you're fighting history.",
    "That record isn't just impressive, it's intimidating.",
    "He hasn't just avoided losses, he's made opponents wish they never stepped in the ring.",
  ],
  veteran: [
    "He's been in the trenches and came out with stripes to show for it.",
    "Experience like that doesn't just teach you how to fight, it teaches you how to win.",
    "The ring isn't just a place for him, it's where he belongs.",
    "He's seen every style, faced every challenge, and adapted to overcome.",
    "Time in the ring doesn't lie, and neither does his record.",
  ],
  newcomer: [
    "Fresh meat with serious potential. I can see the fire in his eyes.",
    "New face, old school mentality. Respect.",
    "He's just getting started but you can already tell he's built for this.",
    "First impressions matter, and this one? It's gonna leave a mark.",
    "Every champion starts somewhere. This is his somewhere.",
  ],
  brawler: [
    "He doesn't just throw punches, he throws commitment.",
    "When he walks to that ring, you know it's going to be a war.",
    "He's not here to point fight, he's here to make a statement.",
    "The way he fights? That's how legends are made.",
    "He brings pressure like it's going out of style.",
  ],
};

function getPromoterLine(fighter: any): string {
  const division = fighter.division.toLowerCase().replace(/\s+/g, " ");

  // Determine fighter category
  let category: keyof typeof PROMOTER_LINES;
  if (fighter.rank === 0) {
    category = "champion";
  } else if (fighter.wins === 0 && fighter.losses === 0 && fighter.draws === 0) {
    category = "newcomer";
  } else if (fighter.wins >= 10) {
    category = "veteran";
  } else if (fighter.wins >= fighter.losses * 2 && fighter.wins >= 5) {
    category = "contender";
  } else if (fighter.losses === 0 && fighter.wins > 0) {
    category = "undefeated";
  } else if (fighter.kos / Math.max(fighter.wins, 1) > 0.6) {
    category = "brawler";
  } else {
    category = "contender"; // default
  }

  const lines = PROMOTER_LINES[category];
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line.replace("{division}", fighter.division);
}

function promoterEmbed(
  title: string,
  opts?: {
    description?: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    thumbnail?: string;
    image?: string;
    footer?: string;
  },
): any {
  const embed: any = {
    title,
    color: 0xd71920, // Matchroom Red
    timestamp: new Date().toISOString(),
  };

  if (opts?.description) embed.description = opts.description;
  if (opts?.fields) embed.fields = opts.fields;
  if (opts?.thumbnail) embed.thumbnail = { url: opts.thumbnail };
  if (opts?.image) embed.image = { url: opts.image };
  if (opts?.footer) embed.footer = { text: opts.footer };
  else embed.footer = { text: "Matchroom Boxing Beta • Fan-made" };

  // Add author with Matchroom logo (using Supabase storage or Discord CDN)
  // For now, we'll use a placeholder - in production this would be your actual logo
  embed.author = {
    name: "Matchroom Boxing",
    icon_url: "https://i.imgur.com/8k0zZQl.png", // Placeholder - replace with actual logo
  };

  return embed;
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

/* ── Matchroom Promoter voice (fighter-level) ── */

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
  display_name: string;
  wins: number;
  losses: number;
  kos: number;
  rank: number;
}): string {
  const name = fighter.display_name;
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
  display_name: string;
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

/* DM helpers for Matchroom Promoter flow */
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

function discordHeaders() {
  return {
    Authorization: `Bot ${BOT_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/* Discord API calls via https.request with rejectUnauthorized=false for HF Spaces. */
function discordFetch(
  url: string,
  options: { method: string; headers?: Record<string, string>; body?: string },
): Promise<Response> {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: options.method,
        headers: options.headers,
        rejectUnauthorized: false,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve(
            new Response(data, {
              status: res.statusCode,
              statusText: res.statusMessage,
            }),
          ),
        );
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
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

async function editMessage(
  channelId: string,
  messageId: string,
  content?: string,
  components?: any[],
) {
  const body: any = {};
  if (content !== undefined) body.content = content;
  if (components) body.components = components;
  await discordFetch(`${DISCORD_API}/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
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

/* ── Role constants ── */
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

async function checkPromotion(guildId: string | undefined | null, discordId: string, wins: number) {
  if (!guildId) return;
  if (wins >= 3) {
    await addRole(guildId, discordId, PRO_BOXER_ROLE);
    await removeRole(guildId, discordId, AMATEUR_ROLE);
  }
}

async function sendPromoterDM(
  discordId: string,
  displayName: string,
  interaction?: { token: string; application_id: string },
) {
  try {
    const dmId = await createDM(discordId);
    await sendMessage(
      dmId,
      `🥊 **Matchroom Promoter**\n\n"Welcome to the big leagues, **${displayName}**. I've seen potential in you.\n\nBest of luck in your career — make us proud."`,
    );
  } catch (err) {
    console.error("Promoter DM failed:", err);
    if (interaction) {
      try {
        await discordFetch(
          `${DISCORD_API}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content:
                "❌ Couldn't send you a DM. Make sure **DMs from server members** are enabled, then use `/register` again.",
            }),
          },
        );
      } catch {
        // fallback failed too, nothing more we can do
      }
    }
  }
}

/* ── Deferred command handlers (fire-and-forget, respond via webhook PATCH) ── */

async function handleStatsCommand(interaction: any) {
  const discordId = interaction.member?.user?.id ?? interaction.user?.id;
  if (!discordId) { await sendFollowUp(interaction, { content: "Could not identify you.", flags: 64 }); return; }

  const supabase = getSupabaseAdmin();
  const { data: fighter } = await supabase
    .from("fighters")
    .select("*")
    .eq("discord_id", discordId)
    .single();

  if (!fighter) {
    await sendFollowUp(interaction, { content: "You're not registered yet! Use `/register` to create your fighter.", flags: 64 });
    return;
  }

  if (fighter.wins >= 3) {
    const promoGuildId = fighter.guild_id || interaction.guild_id;
    if (promoGuildId) {
      await addRole(promoGuildId, discordId, PRO_BOXER_ROLE);
      await removeRole(promoGuildId, discordId, AMATEUR_ROLE);
    }
  }

  await sendFollowUp(interaction, {
    embeds: [{
      ...baseFighterEmbed(fighter),
      fields: [
        { name: "Promoter's Note", value: promoterLine(fighter), inline: false },
        { name: "Division", value: fighter.division || "TBD", inline: true },
        { name: "Rank", value: fighter.rank === 0 ? "Champion" : `#${fighter.rank}`, inline: true },
        { name: "Record", value: formatRecord(fighter), inline: true },
        { name: "Stance", value: fighter.stance, inline: true },
        { name: "Streak", value: fighter.streak || "N/A", inline: true },
        ...(fighter.belts_held ? [{ name: "Belts Held", value: fighter.belts_held, inline: false }] : []),
      ],
    }],
    flags: 64,
  });
}

async function handleRankingsCommand(interaction: any) {
  const division = getOptionValue(interaction.data.options, "division");
  if (!division) { await sendFollowUp(interaction, { content: "Please choose a division.", flags: 64 }); return; }

  const supabase = getSupabaseAdmin();
  const { data: fighters, error } = await supabase
    .from("fighters")
    .select("*")
    .eq("division", division)
    .order("rank", { ascending: true })
    .limit(10);

  if (error || !fighters?.length) {
    await sendFollowUp(interaction, { content: `No fighters found in **${division}**.`, flags: 64 });
    return;
  }

  await sendFollowUp(interaction, {
    embeds: [{
      color: BRAND_COLOR,
      author: {
        name: "Matchroom Boxing",
        icon_url: "https://cdn.discordapp.com/emojis/1294761893288677406.webp?size=40&quality=lossless",
      },
      title: `Boxing ${division} Rankings`,
      description: "\"Let's look at the **" + division + "** division. Some hungry fighters here...\"",
      fields: fighters.map((f: any, i: number) => ({
        name: `${f.rank === 0 ? "Crown" : "#" + (i + 1)} ${f.display_name} (@${f.username})`,
        value: `Record: ${f.wins}-${f.losses}-${f.draws} | Streak: ${f.streak || "N/A"}`,
        inline: false,
      })),
      footer: { text: "Matchroom Boxing Beta Fan-made", icon_url: "https://cdn.discordapp.com/emojis/1294761893288677406.webp?size=40&quality=lossless" },
      timestamp: new Date().toISOString(),
    }],
    flags: 64,
  });
}

async function handleChampionsCommand(interaction: any) {
  const supabase = getSupabaseAdmin();
  const { data: champs, error } = await supabase
    .from("fighters")
    .select("*")
    .eq("rank", 0)
    .order("division", { ascending: true });

  if (error || !champs?.length) {
    await sendFollowUp(interaction, { content: "No champions found.", flags: 64 });
    return;
  }

  await sendFollowUp(interaction, {
    embeds: [{
      color: BRAND_COLOR,
      author: {
        name: "Matchroom Boxing",
        icon_url: "https://cdn.discordapp.com/emojis/1294761893288677406.webp?size=40&quality=lossless",
      },
      title: "Current Champions",
      description: "\"These are the men and women who run this circus. Champions don't wait they take.\"",
      fields: champs.map((c: any) => ({
        name: `${c.division} Champion`,
        value: `**${c.display_name}** ${formatRecord(c)}`,
        inline: true,
      })),
      footer: { text: "Matchroom Boxing Beta Fan-made", icon_url: "https://cdn.discordapp.com/emojis/1294761893288677406.webp?size=40&quality=lossless" },
      timestamp: new Date().toISOString(),
    }],
    flags: 64,
  });
}

async function handleFighterCommand(interaction: any) {
  const username = getOptionValue(interaction.data.options, "username");
  if (!username) { await sendFollowUp(interaction, { content: "Please provide a username.", flags: 64 }); return; }

  const supabase = getSupabaseAdmin();
  const { data: fighter, error } = await supabase
    .from("fighters")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !fighter) {
    await sendFollowUp(interaction, { content: `Fighter **${username}** not found.`, flags: 64 });
    return;
  }

  await sendFollowUp(interaction, {
    embeds: [{
      ...baseFighterEmbed(fighter),
      fields: [
        { name: "Promoter's Note", value: promoterLine(fighter), inline: false },
        { name: "Division", value: fighter.division, inline: true },
        { name: "Rank", value: fighter.rank === 0 ? "Champion" : `#${fighter.rank}`, inline: true },
        { name: "Record", value: formatRecord(fighter), inline: true },
        { name: "Stance", value: fighter.stance, inline: true },
        { name: "Streak", value: fighter.streak || "N/A", inline: true },
        ...(fighter.belts_held ? [{ name: "Belts Held", value: fighter.belts_held, inline: false }] : []),
      ],
    }],
    flags: 64,
  });
}

async function handleUnregisterCommand(interaction: any) {
  const discordId = interaction.member?.user?.id ?? interaction.user?.id;
  if (!discordId) { await sendFollowUp(interaction, { content: "Could not identify you.", flags: 64 }); return; }

  const supabase = getSupabaseAdmin();
  const { data: fighter } = await supabase
    .from("fighters")
    .select("display_name, guild_id, division")
    .eq("discord_id", discordId)
    .single();

  if (!fighter) {
    await sendFollowUp(interaction, { content: "You're not registered! Use `/register` to create a fighter.", flags: 64 });
    return;
  }

  await supabase.from("fighters").delete().eq("discord_id", discordId);

  const unregGuildId = fighter.guild_id || interaction.guild_id;
  if (unregGuildId) {
    setNickname(unregGuildId, discordId, `${fighter.display_name} [ Retired ]`);
    if (fighter.division) removeRole(unregGuildId, discordId, DIVISION_ROLES[fighter.division]);
    removeRole(unregGuildId, discordId, AMATEUR_ROLE);
    removeRole(unregGuildId, discordId, PRO_BOXER_ROLE);
  }

  await sendFollowUp(interaction, {
    content: `${fighter.display_name} has been retired. Use \`/register\` to create a new fighter anytime.`,
    flags: 64,
  });
}

export async function handleDiscordInteraction(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  // GET /discord → redirect to invite
  if (request.method === "GET" && url.pathname === "/discord") {
    return Response.redirect("https://discord.gg/PB8vesEaTs", 302);
  }

  // POST /discord-interaction → handle interaction
  if (request.method === "POST" && url.pathname === "/discord-interaction") {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    if (!publicKey) return jsonResponse({ error: "DISCORD_PUBLIC_KEY not set" }, 500);

    const signature = request.headers.get("x-signature-ed25519") ?? "";
    const timestamp = request.headers.get("x-signature-timestamp") ?? "";
    const rawBody = await request.text();
    if (!rawBody) return jsonResponse({ error: "Empty body" }, 400);

    const isValid = await verifyKey(rawBody, signature, timestamp, publicKey);
    if (!isValid) return jsonResponse({ error: "Invalid signature" }, 401);

    const interaction = JSON.parse(rawBody);

    // PING
    if (interaction.type === InteractionType.Ping) {
      return jsonResponse({ type: InteractionResponseType.Pong });
    }

    // Application command
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

      if (commandName === "stats") { handleStatsCommand(interaction); return deferred(); }
      if (commandName === "rankings") { handleRankingsCommand(interaction); return deferred(); }
      if (commandName === "champions") { handleChampionsCommand(interaction); return deferred(); }
      if (commandName === "fighter") { handleFighterCommand(interaction); return deferred(); }
      if (commandName === "unregister") { handleUnregisterCommand(interaction); return deferred(); }
    }

    // Modal submit
    if (
      interaction.type === InteractionType.ModalSubmit &&
      interaction.data.custom_id === "register_modal"
    ) {
      const discordId = interaction.member?.user?.id ?? interaction.user?.id;
      if (!discordId) return jsonResponse({ error: "No user" }, 400);

      const components = interaction.data.components;
      const getValue = (customId: string) => {
        const row = components.find((c) => c.components.some((cc) => cc.custom_id === customId));
        const comp = row?.components.find((cc) => cc.custom_id === customId);
        return comp && "value" in comp ? comp.value : "";
      };

      const displayName = getValue("display_name");
      const username = getValue("username");

      if (!displayName || !username) {
        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: "All fields are required.", flags: 64 },
        });
      }

      const supabase = getSupabaseAdmin();

      // Block re-registration
      const { data: existingFighter } = await supabase
        .from("fighters")
        .select("username")
        .eq("discord_id", discordId)
        .maybeSingle();

      if (existingFighter) {
        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: "You're already registered! Use `/stats` to view your profile.",
            flags: 64,
          },
        });
      }

      // Check username uniqueness
      const { data: usernameTaken } = await supabase
        .from("fighters")
        .select("username")
        .eq("username", username)
        .maybeSingle();
      if (usernameTaken) {
        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `Username "${username}" is already taken. Choose another.`,
            flags: 64,
          },
        });
      }

      const registerGuildId = interaction.guild_id ?? "";
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
        guild_id: registerGuildId,
      });

      if (error) {
        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: `Registration failed: ${error.message}`, flags: 64 },
        });
      }

      // Auto-nick + promoter DM
      const guildId = interaction.guild_id;
      if (guildId) {
        console.log(`[Register] Setting nickname for ${discordId} in guild ${guildId}`);
        await setNickname(guildId, discordId, `${displayName} | 0-0-0 | 0KOs`);
      }
      console.log(`[Register] Sending promoter DM to ${discordId}`);
      sendPromoterDM(discordId, displayName, {
        token: interaction.token,
        application_id: interaction.application_id,
      });

      return jsonResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `🥊 **Welcome to the big leagues, ${displayName}!**\n\n"Now tell me — what division are you fighting in?"`,
          components: DIVISION_BUTTONS,
          flags: 64,
        },
      });
    }

    // MessageComponent — division button click
    if (interaction.type === InteractionType.MessageComponent) {
      const customId = interaction.data.custom_id;
      if (customId?.startsWith("div_")) {
        const discordId = interaction.member?.user?.id ?? interaction.user?.id;
        if (!discordId) return jsonResponse({ error: "No user" }, 400);

        // Map "div_flyweight" → "Flyweight"
        const parts = customId.split("_");
        parts.shift(); // remove "div"
        const division = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

        if (!(DIVISIONS as readonly string[]).includes(division)) {
          return jsonResponse({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: `Invalid division.`, flags: 64 },
          });
        }

        const supabase = getSupabaseAdmin();

        // Check fighter exists
        const { data: fighter } = await supabase
          .from("fighters")
          .select("username, display_name, guild_id")
          .eq("discord_id", discordId)
          .single();

        if (!fighter) {
          return jsonResponse({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: "Register with `/register` first!", flags: 64 },
          });
        }

        // Update division
        const { error } = await supabase
          .from("fighters")
          .update({ division })
          .eq("discord_id", discordId);

        if (error) {
          return jsonResponse({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: `Failed to set division: ${error.message}`, flags: 64 },
          });
        }

        // Auto-rank: count non-champion fighters in this division
        const { count } = await supabase
          .from("fighters")
          .select("*", { count: "exact", head: true })
          .eq("division", division)
          .gt("rank", 0);

        await supabase
          .from("fighters")
          .update({ rank: (count ?? 0) + 1 })
          .eq("discord_id", discordId);

        // Assign division role + Amateur role
        const roleGuildId = fighter.guild_id || interaction.guild_id;
        if (roleGuildId) {
          console.log(`[Division] Assigning roles for ${discordId} in guild ${roleGuildId}`);
          const roleId = DIVISION_ROLES[division];
          if (roleId) {
            console.log(`[Division] Adding division role: ${roleId}`);
            await addRole(roleGuildId, discordId, roleId);
          }
          console.log(`[Division] Adding amateur role`);
          await addRole(roleGuildId, discordId, AMATEUR_ROLE);
        }

        // Refresh nickname with record
        const guildId = interaction.guild_id;
        if (guildId) {
          const { data: full } = await supabase
            .from("fighters")
            .select("display_name, wins, losses, draws, kos")
            .eq("discord_id", discordId)
            .single();
          if (full) {
            console.log(`[Division] Updating nickname for ${discordId}`);
            await setNickname(guildId, discordId, formatNickname(full));
          }
        }

        // Remove division buttons from the DM
        const msgChannelId = interaction.message?.channel_id;
        const msgId = interaction.message?.id;
        if (msgChannelId && msgId) {
          editMessage(msgChannelId, msgId, undefined, []);
        }

        // Acknowledge the button click
        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `✅ Division locked in. **${fighter.display_name}** is now fighting at **${division}**. The Promoter is watching.`,
            flags: 64,
          },
        });
      }
    }

    return jsonResponse({ error: "Unknown interaction type" }, 400);
  }

  return null;
}
