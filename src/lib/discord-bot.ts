import { verifyKey } from "discord-interactions";
import { InteractionType, InteractionResponseType } from "discord-api-types/v10";
import { createClient } from "@supabase/supabase-js";

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
    await fetch(
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

/* DM helpers for Matchroom Promoter flow */
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

function discordHeaders() {
  return {
    Authorization: `Bot ${BOT_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function createDM(userId: string): Promise<string> {
  const res = await fetch(`${DISCORD_API}/users/@me/channels`, {
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
  await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: discordHeaders(),
    body: JSON.stringify(body),
  });
}

async function editMessage(
  channelId: string,
  messageId: string,
  content: string,
  components?: any[],
) {
  const body: any = { content };
  if (components) body.components = components;
  await fetch(`${DISCORD_API}/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    headers: discordHeaders(),
    body: JSON.stringify(body),
  });
}

async function setNickname(guildId: string, userId: string, nick: string) {
  try {
    await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
      method: "PATCH",
      headers: discordHeaders(),
      body: JSON.stringify({ nick }),
    });
  } catch (err) {
    console.error("Nickname change failed:", err);
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

async function sendPromoterDM(
  discordId: string,
  displayName: string,
  interaction?: { token: string; application_id: string },
) {
  try {
    const dmId = await createDM(discordId);
    await sendMessage(
      dmId,
      `🥊 **Matchroom Promoter**\n\n` +
        `"Welcome to the big leagues, **${displayName}**. I've seen potential in you.\n\n` +
        `Now tell me — what division are you fighting in?"`,
      DIVISION_BUTTONS,
    );
  } catch (err) {
    console.error("Promoter DM failed:", err);
    if (interaction) {
      try {
        await fetch(
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

      if (commandName === "stats") {
        const discordId = interaction.member?.user?.id ?? interaction.user?.id;
        if (!discordId) return ephemeral("Could not identify you.");

        const supabase = getSupabaseAdmin();
        const { data: fighter } = await supabase
          .from("fighters")
          .select("*")
          .eq("discord_id", discordId)
          .single();

        if (!fighter) {
          return ephemeral("You're not registered yet! Use `/register` to create your fighter.");
        }

        const rank = fighter.rank === 0 ? "**★ Champion**" : `Ranked #${fighter.rank}`;
        const record = formatRecord(fighter);
        const belts = fighter.belts_held ? `\n**Belts Held:** ${fighter.belts_held}` : "";

        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            embeds: [
              {
                title: `${fighter.display_name}`,
                description: [
                  `**Division:** ${fighter.division}`,
                  `**Rank:** ${rank}`,
                  `**Record:** ${record}`,
                  `**Stance:** ${fighter.stance}`,
                  `**Streak:** ${fighter.streak || "N/A"}`,
                  belts,
                ].join("\n"),
                color: 0xdc2626,
                footer: { text: `@${fighter.username}` },
              },
            ],
            flags: 64,
          },
        });
      }

      if (commandName === "rankings") {
        const division = getOptionValue(interaction.data.options, "division");
        if (!division) return ephemeral("Please choose a division.");

        const supabase = getSupabaseAdmin();
        const { data: fighters, error } = await supabase
          .from("fighters")
          .select("*")
          .eq("division", division)
          .order("rank", { ascending: true })
          .limit(10);

        if (error || !fighters?.length) {
          return ephemeral(`No fighters found in **${division}**.`);
        }

        const lines = fighters.map((f: any) => {
          const rank = f.rank === 0 ? "👑" : `#${f.rank}`;
          const record = `${f.wins}-${f.losses}-${f.draws}`;
          return `${rank} **${f.display_name}** — ${record} (${f.username})`;
        });

        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            embeds: [
              {
                title: `🏆 ${division} Rankings`,
                description: lines.join("\n"),
                color: 0xdc2626,
              },
            ],
            flags: 64,
          },
        });
      }

      if (commandName === "champions") {
        const supabase = getSupabaseAdmin();
        const { data: champs, error } = await supabase
          .from("fighters")
          .select("*")
          .eq("rank", 0)
          .order("division", { ascending: true });

        if (error || !champs?.length) {
          return ephemeral("No champions found.");
        }

        const lines = champs.map((c: any) => `👑 **${c.display_name}** — ${c.division}`);

        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            embeds: [
              {
                title: "Current Champions",
                description: lines.join("\n"),
                color: 0xdc2626,
              },
            ],
            flags: 64,
          },
        });
      }

      if (commandName === "fighter") {
        const username = getOptionValue(interaction.data.options, "username");
        if (!username) return ephemeral("Please provide a username.");

        const supabase = getSupabaseAdmin();
        const { data: fighter, error } = await supabase
          .from("fighters")
          .select("*")
          .eq("username", username)
          .single();

        if (error || !fighter) {
          return ephemeral(`Fighter **${username}** not found.`);
        }

        const rank = fighter.rank === 0 ? "**★ Champion**" : `Ranked #${fighter.rank}`;
        const record = formatRecord(fighter);
        const belts = fighter.belts_held ? `\n**Belts Held:** ${fighter.belts_held}` : "";

        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            embeds: [
              {
                title: `${fighter.display_name}`,
                description: [
                  `**Division:** ${fighter.division}`,
                  `**Rank:** ${rank}`,
                  `**Record:** ${record}`,
                  `**Stance:** ${fighter.stance}`,
                  `**Streak:** ${fighter.streak || "N/A"}`,
                  belts,
                ].join("\n"),
                color: 0xdc2626,
                footer: { text: `@${fighter.username}` },
              },
            ],
            flags: 64,
          },
        });
      }

      if (commandName === "unregister") {
        const discordId = interaction.member?.user?.id ?? interaction.user?.id;
        if (!discordId) return ephemeral("Could not identify you.");

        const supabase = getSupabaseAdmin();

        const { data: fighter } = await supabase
          .from("fighters")
          .select("display_name")
          .eq("discord_id", discordId)
          .single();

        if (!fighter) {
          return ephemeral("You're not registered! Use `/register` to create a fighter.");
        }

        const { error } = await supabase.from("fighters").delete().eq("discord_id", discordId);

        if (error) {
          return jsonResponse({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: `Failed to unregister: ${error.message}`, flags: 64 },
          });
        }

        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `✅ **${fighter.display_name}** has been retired. Use \`/register\` to create a new fighter anytime.`,
            flags: 64,
          },
        });
      }
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
      });

      if (error) {
        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: `Registration failed: ${error.message}`, flags: 64 },
        });
      }

      // Auto-nick + promoter DM (fire-and-forget)
      const guildId = interaction.guild_id;
      if (guildId) {
        setNickname(guildId, discordId, displayName);
      }
      sendPromoterDM(discordId, displayName, {
        token: interaction.token,
        application_id: interaction.application_id,
      });

      return jsonResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `📬 **Matchroom Promoter** is sliding into your DMs... Check your inbox!`,
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
          .select("username, display_name")
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

        // Acknowledge the button click
        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `✅ Division set to **${division}**. Good luck, **${fighter.display_name}**!`,
            flags: 64,
          },
        });
      }
    }

    return jsonResponse({ error: "Unknown interaction type" }, 400);
  }

  return null;
}
