const DISCORD_INVITE = "https://discord.gg/PB8vesEaTs";

export default defineEventHandler((event) => {
  return sendRedirect(event, DISCORD_INVITE, 302);
});
