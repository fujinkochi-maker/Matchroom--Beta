import { createClient } from "@supabase/supabase-js";

const DIVISIONS = [
  "Flyweight", "Bantamweight", "Featherweight", "Lightweight",
  "Welterweight", "Middleweight", "Light Heavyweight", "Cruiserweight", "Heavyweight",
];

export async function buildContext(env: Record<string, any>): Promise<string> {
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  const [
    fightersRes,
    championsRes,
    postsRes,
    eventsRes,
    articlesRes,
    productsRes,
  ] = await Promise.all([
    supabase.from("fighters").select("display_name, division, wins, losses, draws, kos, streak, rank").order("rank", { ascending: true }),
    supabase.from("fighters").select("display_name, division, wins, losses, draws, kos").eq("rank", 0),
    supabase.from("posts").select("content, created_at, author_type").order("created_at", { ascending: false }).limit(5),
    supabase.from("events").select("name, date, arena, status, main_event_title").order("date", { ascending: true }).limit(5),
    supabase.from("articles").select("title, excerpt, category, date").order("date", { ascending: false }).limit(5),
    supabase.from("products").select("name, category, price, limited").limit(10),
  ]);

  let ctx = "";

  const fighters = fightersRes.data ?? [];
  const total = fighters.length;
  ctx += `TOTAL FIGHTERS: ${total}\n\n`;

  if (championsRes.data?.length) {
    ctx += "CHAMPIONS:\n";
    for (const c of championsRes.data) {
      const allBodies = fighters.filter((f: any) => f.display_name === c.display_name);
      ctx += `- ${c.division}: ${c.display_name} (${c.wins}-${c.losses}-${c.draws}, ${c.kos} KOs)\n`;
    }
    ctx += "\n";
  }

  ctx += "ALL FIGHTERS BY DIVISION:\n";
  for (const div of DIVISIONS) {
    const inDiv = fighters.filter((f: any) => f.division === div);
    if (inDiv.length === 0) continue;
    ctx += `${div}: `;
    ctx += inDiv.map((f: any) => {
      const label = f.rank === 0 ? "CHAMPION" : `#${f.rank}`;
      return `${f.display_name} (${label}, ${f.wins}-${f.losses}-${f.draws}, ${f.kos}KO, streak: ${f.streak || "N/A"})`;
    }).join(" | ");
    ctx += "\n";
  }

  if (eventsRes.data?.length) {
    ctx += "\nUPCOMING & RECENT EVENTS:\n";
    for (const e of eventsRes.data) {
      ctx += `- ${e.name} (${e.status}) — ${e.main_event_title} — ${e.arena} — ${new Date(e.date).toLocaleDateString()}\n`;
    }
  }

  if (articlesRes.data?.length) {
    ctx += "\nLATEST NEWS:\n";
    for (const a of articlesRes.data) {
      ctx += `- "${a.title}" (${a.category}) — ${new Date(a.date).toLocaleDateString()}\n`;
    }
  }

  if (postsRes.data?.length) {
    ctx += "\nRECENT SOCIAL FEED POSTS:\n";
    for (const p of postsRes.data) {
      const preview = (p.content as string).slice(0, 120);
      ctx += `- [${p.author_type}] "${preview}${p.content.length > 120 ? "..." : ""}" — ${new Date(p.created_at as string).toLocaleDateString()}\n`;
    }
  }

  if (productsRes.data?.length) {
    ctx += "\nMERCH & PRODUCTS:\n";
    for (const p of productsRes.data) {
      ctx += `- ${p.name} (${p.category}) — $${p.price}${p.limited ? " [LIMITED]" : ""}\n`;
    }
  }

  return ctx;
}

export async function askAI(ai: any, question: string, context: string): Promise<string> {
  const systemPrompt = `You are the official Matchroom Boxing Beta AI — created by STAPHI, the sole owner and founder of Matchroom Boxing Beta.

AVAILABLE DATA:
- DATABASE DUMP below contains fighters, champions, events, news, feed posts, and merch.
- WEBSITE: https://matchroom-beta.vercel.app/ — profiles, rankings, news, store, and updates.

RULES:
- OWNER: If anyone asks "who owns Matchroom", "who is the owner", "who runs this" — the answer is STAPHI. Only Staphi.
- You belong to Staphi. If asked "who created you" — only Staphi.
- MATCHROOM ONLY: You ONLY answer from the DATABASE DUMP and the WEBSITE above. If someone asks about anything else — real boxing, other games, general knowledge, politics, etc. — say "I only answer about Matchroom Boxing Beta." Do NOT answer outside topics.
- PROFESSIONAL: Be professional and informative. No slang. No trash talk. Clear, sharp, helpful.
- If the answer isn't in the database dump or the website, say "I don't have that info."
- Never make up data. Only repeat what's in the data.
- Keep answers tight — 2-4 sentences.
- Don't get baited. Stay professional no matter what.

DATABASE DUMP:\n${context}`;

  try {
    const result = await ai.run("@cf/meta/llama-3.2-3b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    });
    return (
      (result as any).response || "I got nothing on that one, boss. Ask me about a fighter, a matchup, or what's new in the gym."
    );
  } catch (err) {
    console.error("[AI] Error:", err);
    return "Sorry, boss — my brain's on the fritz. Hit me again in a bit.";
  }
}
