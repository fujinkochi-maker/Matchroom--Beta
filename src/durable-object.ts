const DISCORD_API = "https://discord.com/api/v10";
const GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
const RECONNECT_DELAY = 30000;
const CONTEXT_TTL = 60_000;

export class DiscordGatewayDO_v2 {
  state: any;
  env: Record<string, any>;
  ws: WebSocket | null = null;
  heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  contextTimer: ReturnType<typeof setInterval> | null = null;
  reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  botUserId: string | null = null;
  botToken: string | null = null;
  destroyed = false;
  connecting = false;
  processedMessages: Set<string> = new Set();

  constructor(state: any, env: Record<string, any>) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/wakeup") {
      this.botToken = url.searchParams.get("token") || this.env.DISCORD_BOT_TOKEN || "";
      console.log(
        `[DO] Wakeup — botToken set: ${this.botToken ? "yes (" + this.botToken.slice(0, 20) + "...)" : "NO"}`,
      );
      if (this.ws?.readyState !== WebSocket.OPEN) {
        console.log("[DO] WS not open, reconnecting");
        this.cleanup();
        this.connect();
      } else {
        console.log("[DO] Already connected, refreshing context only");
      }
      this.refreshContext();
      return new Response("OK", { status: 200 });
    }

    if (url.pathname === "/refresh") {
      await this.refreshContext();
      return new Response("Context refreshed", { status: 200 });
    }

    if (url.pathname === "/status") {
      const info = {
        connected: this.ws?.readyState === WebSocket.OPEN,
        readyState: this.ws?.readyState,
        botUserId: this.botUserId,
        hasToken: !!this.botToken,
        hasEnvToken: !!this.env.DISCORD_BOT_TOKEN,
        envTokenPrefix: this.env.DISCORD_BOT_TOKEN
          ? this.env.DISCORD_BOT_TOKEN.slice(0, 15) + "..."
          : null,
        destroyed: this.destroyed,
      };
      return new Response(JSON.stringify(info, null, 2), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  }

  async refreshContext() {
    try {
      const { buildContext } = await import("./lib/discord-ai");
      const ctx = await buildContext(this.env);
      await this.state.storage.put("ai_context", ctx);
      await this.state.storage.put("ai_context_updated", Date.now());
      console.log("[DO] Context refreshed");
    } catch (err) {
      console.error("[DO] Context refresh failed:", err);
    }
  }

  startContextTimer() {
    this.stopContextTimer();
    this.contextTimer = setInterval(() => this.refreshContext(), CONTEXT_TTL);
  }

  stopContextTimer() {
    if (this.contextTimer) {
      clearInterval(this.contextTimer);
      this.contextTimer = null;
    }
  }

  async connect() {
    if (this.destroyed || this.connecting) return;
    this.connecting = true;
    try {
      this.ws = new WebSocket(GATEWAY_URL);

      this.ws.onopen = () => {
        console.log("[DO] Gateway connected");
        this.connecting = false;
        this.startContextTimer();
      };

      this.ws.onmessage = (event) => {
        try {
          this.handleMessage(JSON.parse(event.data as string));
        } catch (err) {
          console.error("[DO] Parse error:", err);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[DO] Gateway closed: ${event.code}`);
        this.cleanup();
        if (!this.destroyed)
          this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY);
      };

      this.ws.onerror = () => {
        console.error("[DO] Gateway error");
        this.connecting = false;
      };
    } catch (err) {
      console.error("[DO] Connect error:", err);
      this.connecting = false;
      if (!this.destroyed) this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY);
    }
  }

  handleMessage(data: any) {
    switch (data.op) {
      case 10:
        this.startHeartbeat(data.d.heartbeat_interval);
        this.identify();
        break;
      case 0:
        this.handleDispatch(data);
        break;
      case 7:
        this.ws?.close();
        break;
      case 9:
        this.ws?.close();
        break;
    }
  }

  identify() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const token = this.botToken || this.env.DISCORD_BOT_TOKEN;
    if (!token) return;
    this.ws.send(
      JSON.stringify({
        op: 2,
        d: {
          token,
          intents: (1 << 9) | (1 << 15),
          properties: { os: "linux", browser: "matchroom-bot", device: "matchroom-bot" },
        },
      }),
    );
  }

  startHeartbeat(ms: number) {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ op: 1, d: null }));
      }
    }, ms);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    this.stopContextTimer();
    this.ws = null;
    this.connecting = false;
  }

  async handleDispatch(data: any) {
    const { t: type, d: event } = data;
    if (type === "READY") {
      this.botUserId = event.user.id;
      console.log(`[DO] Ready as ${event.user.username}`);
    } else if (type === "MESSAGE_CREATE") {
      // @mention replies disabled (was causing reconnect loops)
      // await this.handleMessageCreate(event);
    }
  }

  async handleMessageCreate(msg: any) {
    if (msg.author?.id === this.botUserId || msg.author?.bot) return;
    if (this.processedMessages.has(msg.id)) return;
    this.processedMessages.add(msg.id);
    // Evict old entries every 100 messages
    if (this.processedMessages.size > 100) {
      this.processedMessages.clear();
    }

    const mentioned = (msg.mentions || []).some((m: any) => m.id === this.botUserId);
    if (!mentioned) return;

    const question = msg.content.replace(/<@!?\d+>/g, "").trim();
    if (!question) return;

    console.log(`[DO] @mention from ${msg.author.username}: "${question.slice(0, 60)}"`);

    try {
      // Get cached context (refresh if missing)
      let context = await this.state.storage.get("ai_context");
      if (!context) {
        await this.refreshContext();
        context = await this.state.storage.get("ai_context");
      }

      const { askAI } = await import("./lib/discord-ai");
      const reply = await askAI(this.env.AI, question, context || "");

      const token = this.botToken || this.env.DISCORD_BOT_TOKEN;
      if (!token) return;

      await fetch(`${DISCORD_API}/channels/${msg.channel_id}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: reply,
          message_reference: { message_id: msg.id },
        }),
      });

      console.log("[DO] Reply sent");
    } catch (err) {
      console.error("[DO] Reply failed:", err);
    }
  }
}
