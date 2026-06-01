import crypto from "node:crypto";
import { getAdminSupabase } from "./supabase-admin";

const DISCORD_API = "https://discord.com/api/v10";

const SESSION_SECRET =
  process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "matchroom-admin-secret";

function signFighterToken(discordId: string): string {
  const exp = Date.now() + 86_400_000;
  const hmac = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`${exp}.${discordId}`)
    .digest("base64url");
  return `${exp}.${discordId}.${hmac}`;
}

export function validateFighterToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [expStr, discordId, hmac] = parts;
  const exp = Number(expStr);
  if (Date.now() > exp) return null;
  const expected = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`${expStr}.${discordId}`)
    .digest("base64url");
  if (hmac !== expected) return null;
  return discordId;
}

export async function exchangeDiscordCode(
  code: string,
  redirectUri: string,
): Promise<{
  token: string;
  username: string;
  displayName: string;
  image?: string;
  discordId: string;
}> {
  const clientId = process.env.DISCORD_APPLICATION_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Discord OAuth is not configured on the server");
  }

  // Exchange code for access token
  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    scope: "identify",
  });

  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`Discord token exchange failed: ${errBody}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };

  // Fetch user info
  const userRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    throw new Error("Failed to fetch Discord user");
  }

  const user = (await userRes.json()) as {
    id: string;
    global_name?: string;
    username: string;
    avatar?: string;
  };

  // Look up fighter by discordId
  const supabase = getAdminSupabase();
  const { data: fighter } = await supabase
    .from("fighters")
    .select("username, display_name, image_url, discord_id")
    .eq("discord_id", user.id)
    .single();

  if (!fighter) {
    throw new Error(
      "Discord account not registered. Use /register in the Boxing Beta Discord server first.",
    );
  }

  const token = signFighterToken(user.id);

  let avatarUrl: string | undefined;
  if (user.avatar) {
    avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  }

  return {
    token,
    username: fighter.username,
    displayName: fighter.display_name,
    image: fighter.image_url ?? avatarUrl,
    discordId: user.id,
  };
}
