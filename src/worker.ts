import { setSupabaseEnv } from "./lib/supabase";
import { DiscordGatewayDO_v2 } from "./durable-object";
import { Resvg, initResvg, resvgWasmModule } from "@cf-wasm/resvg/workerd";

// Re-export for migration compatibility
class DiscordGatewayDO extends DiscordGatewayDO_v2 {}

export { DiscordGatewayDO, DiscordGatewayDO_v2 };

let commandsRegistered = false;

const FONT_URLS = [
  "https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files/inter-latin-400-normal.woff2",
  "https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files/inter-latin-700-normal.woff2",
];

let fontBuffers: Uint8Array[] | null = null;
let fontLoadPromise: Promise<void> | null = null;

async function ensureFonts() {
  if (fontBuffers) return;
  if (fontLoadPromise) return fontLoadPromise;
  fontLoadPromise = (async () => {
    try {
      const results = await Promise.all(
        FONT_URLS.map((url) => fetch(url).then((r) => r.arrayBuffer())),
      );
      fontBuffers = results.map((buf) => new Uint8Array(buf));
    } catch (err) {
      console.error("Font load failed:", err);
      fontLoadPromise = null;
    }
  })();
  return fontLoadPromise;
}

function getFontOpts() {
  if (!fontBuffers) return undefined;
  return {
    font: {
      fontBuffers,
      defaultFontFamily: "Inter",
      sansSerifFamily: "Inter",
      serifFamily: "Inter",
      defaultFontSize: 12,
    },
  };
}

async function ensureResvg() {
  if (initResvg.ready) return;
  if (!initResvg.initialized) {
    await initResvg(resvgWasmModule);
  } else {
    await initResvg.ensure();
  }
}

async function wakeupGateway(env: Record<string, any>) {
  try {
    const doId = env.DISCORD_GATEWAY.idFromName("discord-gateway");
    const stub = env.DISCORD_GATEWAY.get(doId);
    await stub.fetch(`https://do/wakeup?token=${encodeURIComponent(env.DISCORD_BOT_TOKEN || "")}`);
  } catch (err) {
    console.error("[Wakeup] DO not available yet:", err);
  }
}

export default {
  async scheduled(
    _event: any,
    env: Record<string, any>,
    ctx: { waitUntil: (promise: Promise<unknown>) => void },
  ) {
    ctx.waitUntil(wakeupGateway(env));
  },

  async fetch(
    request: Request,
    env: Record<string, any>,
    ctx: { waitUntil: (promise: Promise<unknown>) => void },
  ): Promise<Response> {
    const url = new URL(request.url);

    // Debug endpoint — check DO status
    if (request.method === "GET" && url.pathname === "/debug") {
      try {
        const doId = env.DISCORD_GATEWAY.idFromName("discord-gateway");
        const stub = env.DISCORD_GATEWAY.get(doId);
        const status = await stub.fetch("https://do/status");
        const info = await status.json();
        return new Response(JSON.stringify(info, null, 2), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    // Manual wakeup — force DO reconnect with fresh token
    if (request.method === "GET" && url.pathname === "/wakeup") {
      console.log("[Worker] Token present:", !!env.DISCORD_BOT_TOKEN);
      ctx.waitUntil(wakeupGateway(env));
      return new Response("Wakeup triggered", { status: 200 });
    }

    // Check worker env
    if (request.method === "GET" && url.pathname === "/envcheck") {
      return new Response(
        JSON.stringify({
          hasBotToken: !!env.DISCORD_BOT_TOKEN,
          tokenPrefix: env.DISCORD_BOT_TOKEN ? env.DISCORD_BOT_TOKEN.slice(0, 15) + "..." : null,
          hasAppId: !!env.DISCORD_APPLICATION_ID,
          hasPublicKey: !!env.DISCORD_PUBLIC_KEY,
          hasSupabaseUrl: !!env.VITE_SUPABASE_URL,
          hasSupabaseAnonKey: !!env.VITE_SUPABASE_ANON_KEY,
          hasServiceKey: !!env.SUPABASE_SERVICE_KEY,
          hasSiteUrl: !!env.VITE_SITE_URL,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (request.method === "GET" && url.pathname === "/discord") {
      return Response.redirect("https://discord.gg/PB8vesEaTs", 302);
    }

    // Debug: check font loading status
    if (request.method === "GET" && url.pathname === "/debug/fonts") {
      const testUrl =
        "https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files/inter-latin-400-normal.woff2";
      let testResult = "not tested";
      try {
        const testResp = await fetch(testUrl);
        const testData = await testResp.arrayBuffer();
        testResult = `status=${testResp.status} size=${testData.byteLength}`;
      } catch (e: any) {
        testResult = `error: ${e.message}`;
      }
      return new Response(
        JSON.stringify({
          loaded: !!fontBuffers,
          count: fontBuffers?.length ?? 0,
          sizes: fontBuffers?.map((b) => b.length) ?? [],
          prom: !!fontLoadPromise,
          testUrl,
          testResult,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // Debug: test resvg renders a minimal SVG
    if (request.method === "GET" && url.pathname === "/debug/resvg") {
      try {
        await ensureResvg();
        await ensureFonts();
        const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <rect x="10" y="10" width="180" height="180" rx="10" fill="#dc2626"/>
          <text x="100" y="110" font-family="Inter,sans-serif" font-size="24" fill="#ffffff" text-anchor="middle" font-weight="700">Hello</text>
        </svg>`;
        const resvg = await Resvg.async(testSvg, getFontOpts());
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();
        return new Response(pngBuffer as any, {
          status: 200,
          headers: { "Content-Type": "image/png" },
        });
      } catch (err) {
        return new Response(`resvg error: ${err instanceof Error ? err.message : String(err)}`, {
          status: 500,
        });
      }
    }

    if (request.method === "GET" && url.pathname.startsWith("/stat-card/")) {
      const username = url.pathname.replace("/stat-card/", "").replace(/\.png$|\.svg$/, "");
      if (!username) return new Response("Missing username", { status: 400 });

      const isSvg = url.pathname.endsWith(".svg");

      setSupabaseEnv(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
      const { loadDataFromSupabase, getByUsername } = await import("./data/fighters");
      await loadDataFromSupabase().catch(() => {});

      const fighter = getByUsername(username);
      if (!fighter) return new Response("Fighter not found", { status: 404 });

      const { renderStatCard } = await import("./lib/stat-card");
      const svg = renderStatCard(fighter);

      if (isSvg) {
        return new Response(svg, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=300",
          },
        });
      }

      try {
        await ensureResvg();
        await ensureFonts();
        const resvg = await Resvg.async(svg, getFontOpts());
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        return new Response(pngBuffer as any, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=300",
          },
        });
      } catch (err) {
        return new Response(
          `PNG conversion error: ${err instanceof Error ? err.message : String(err)}`,
          {
            status: 500,
          },
        );
      }
    }

    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    setSupabaseEnv(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

    const { loadDataFromSupabase } = await import("./data/fighters");
    const { createHandler } = await import("./lib/discord-bot");
    const handler = createHandler(env, (p) => ctx.waitUntil(p), url.origin);

    ctx.waitUntil(
      loadDataFromSupabase()
        .then(() => console.log("Fighter cache loaded"))
        .catch((err) => console.error("Cache load failed:", err)),
    );

    if (!commandsRegistered) {
      commandsRegistered = true;
      ctx.waitUntil(
        handler
          .registerCommands()
          .then(() => console.log("Commands registered"))
          .catch((err) => {
            console.error("Command registration failed:", err);
            commandsRegistered = false;
          }),
      );
    }

    const response = await handler.handleDiscordInteraction(request);
    return response ?? new Response("OK", { status: 200 });
  },
};
