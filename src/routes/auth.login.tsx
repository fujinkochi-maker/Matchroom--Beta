import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/auth/login")({
  component: DiscordAuthRedirect,
});

function DiscordAuthRedirect() {
  useEffect(() => {
    const clientId = "1510196940304810095";
    const redirectUri = `${window.location.origin}/auth/discord/callback`;
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify+guilds.join`;
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting to Discord...</p>
    </div>
  );
}
