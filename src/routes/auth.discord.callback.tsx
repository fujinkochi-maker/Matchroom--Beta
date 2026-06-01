import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { discordLogin } from "@/lib/admin.server";
import { setFighterSession } from "@/lib/discord-auth";

export const Route = createFileRoute("/auth/discord/callback")({
  component: DiscordCallback,
});

function DiscordCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("Logging in...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      setStatus("Authentication failed. Close this tab and try again.");
      return;
    }

    (async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/discord/callback`;
        const result = await discordLogin({ data: { code, redirectUri } });
        setFighterSession(result);
        setStatus("Login successful! Redirecting...");
        router.navigate({ to: "/feed" });
      } catch (err) {
        setStatus((err as Error).message || "Login failed. Close this tab and try again.");
      }
    })();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  );
}
