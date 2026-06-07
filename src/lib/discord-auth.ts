const TOKEN_KEY = "matchroom_fighter_token";
const USERNAME_KEY = "matchroom_fighter_username";
const DISPLAY_KEY = "matchroom_fighter_display";
const IMAGE_KEY = "matchroom_fighter_image";
const DISCORD_ID_KEY = "matchroom_fighter_discord_id";

export interface FighterSession {
  token: string;
  username: string;
  displayName: string;
  image?: string;
  discordId?: string;
}

export function setFighterSession(session: FighterSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USERNAME_KEY, session.username);
  localStorage.setItem(DISPLAY_KEY, session.displayName);
  if (session.image) localStorage.setItem(IMAGE_KEY, session.image);
  if (session.discordId) localStorage.setItem(DISCORD_ID_KEY, session.discordId);
}

export function getFighterSession(): FighterSession | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  const displayName = localStorage.getItem(DISPLAY_KEY);
  if (!token || !username || !displayName) return null;
  return {
    token,
    username,
    displayName,
    image: localStorage.getItem(IMAGE_KEY) ?? undefined,
    discordId: localStorage.getItem(DISCORD_ID_KEY) ?? undefined,
  };
}

export function clearFighterSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(DISPLAY_KEY);
  localStorage.removeItem(IMAGE_KEY);
  localStorage.removeItem(DISCORD_ID_KEY);
}

export function isFighterLoggedIn(): boolean {
  return getFighterSession() !== null;
}
