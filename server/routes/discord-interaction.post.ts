import { verifyKey } from "discord-interactions";
import {
  InteractionType,
  InteractionResponseType,
  type APIInteraction,
  type APIModalInteractionResponseCallbackData,
} from "discord-api-types/v10";
import { createClient } from "@supabase/supabase-js";
import satori from "satori";
import sharp from "sharp";

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

/* ---------- Font cache (fetched once) ---------- */

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

/* ---------- Supabase helpers ---------- */

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key);
}

/* ---------- Image generation ---------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
async function generateStatCard(fighter: any): Promise<Buffer> {
  const font = await getFont();

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
          // Accent bar
          { type: "div", props: { style: { height: 4, backgroundColor: "#dc2626" } } },
          // Body
          {
            type: "div",
            props: {
              style: { flex: 1, display: "flex", padding: "24px 28px", gap: 28 },
              children: [
                // Avatar placeholder
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
                        children: fighter.displayName
                          .split(/\s+/)
                          .map((p: string) => p[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase(),
                      },
                    },
                  },
                },
                // Info
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
                          children: fighter.displayName,
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
                      // Stats grid
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
                      // Belts
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

/* ---------- Discord response helpers ---------- */

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/* ---------- Main handler ---------- */

export default defineEventHandler(async (event) => {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return jsonResponse({ error: "DISCORD_PUBLIC_KEY not set" }, 500);

  // Verify signature
  const signature = getHeader(event, "x-signature-ed25519") ?? "";
  const timestamp = getHeader(event, "x-signature-timestamp") ?? "";
  const rawBody = await readRawBody(event, "utf8");
  if (!rawBody) return jsonResponse({ error: "Empty body" }, 400);

  const isValid = await verifyKey(rawBody, signature, timestamp, publicKey);
  if (!isValid) return jsonResponse({ error: "Invalid signature" }, 401);

  const interaction: APIInteraction = JSON.parse(rawBody);

  // PING
  if (interaction.type === InteractionType.Ping) {
    return jsonResponse({ type: InteractionResponseType.Pong });
  }

  // Application command
  if (interaction.type === InteractionType.ApplicationCommand) {
    const commandName = interaction.data.name;

    if (commandName === "register") {
      const modal: APIModalInteractionResponseCallbackData = {
        title: "Register as a Fighter",
        custom_id: "register_modal",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "display_name",
                label: "Display Name",
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
                type: 3,
                custom_id: "division",
                placeholder: "Choose a division",
                options: DIVISIONS.map((d) => ({ label: d, value: d })),
                min_values: 1,
                max_values: 1,
              },
            ],
          },
        ],
      };

      return jsonResponse({
        type: InteractionResponseType.Modal,
        data: modal,
      });
    }

    if (commandName === "stats") {
      const discordId = interaction.member?.user?.id ?? interaction.user?.id;
      if (!discordId)
        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: "Could not identify you.", flags: 64 },
        });

      const supabase = getSupabaseAdmin();
      const { data: fighter } = await supabase
        .from("fighters")
        .select("*")
        .eq("discord_id", discordId)
        .single();

      if (!fighter) {
        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: "You're not registered yet! Use `/register` to create your fighter.",
            flags: 64,
          },
        });
      }

      try {
        const png = await generateStatCard(fighter);
        const imageUrl = await uploadStatCard(discordId, png);

        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            embeds: [{ image: { url: imageUrl }, color: 0xdc2626 }],
            flags: 64,
          },
        });
      } catch (err) {
        return jsonResponse({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: `Error generating stats: ${(err as Error).message}`, flags: 64 },
        });
      }
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
    const division = getValue("division");

    if (!displayName || !username || !division) {
      return jsonResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: "All fields are required.", flags: 64 },
      });
    }

    if (!(DIVISIONS as readonly string[]).includes(division)) {
      return jsonResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: "Invalid division.", flags: 64 },
      });
    }

    const supabase = getSupabaseAdmin();

    // Check if username already taken
    const { data: existing } = await supabase
      .from("fighters")
      .select("username")
      .eq("username", username)
      .maybeSingle();
    if (existing) {
      return jsonResponse({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: `Username "${username}" is already taken. Choose another.`, flags: 64 },
      });
    }

    const { error } = await supabase.from("fighters").insert({
      username,
      display_name: displayName,
      nickname: "",
      division,
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

    return jsonResponse({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `✅ Registered as **${displayName}** (${division})! Use \`/stats\` to view your profile. An admin will add your photo and update your rank.`,
        flags: 64,
      },
    });
  }

  return jsonResponse({ error: "Unknown interaction type" }, 400);
});
