import { createClient } from "@supabase/supabase-js";

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
];

export async function buildContext(env: Record<string, any>): Promise<string> {
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  const [championsRes, totalRes, ...divRes] = await Promise.all([
    supabase
      .from("fighters")
      .select("display_name, division, wins, losses, draws, kos")
      .eq("rank", 0),
    supabase.from("fighters").select("*", { count: "exact", head: true }),
    ...DIVISIONS.map((div) =>
      supabase
        .from("fighters")
        .select("display_name, wins, losses, draws, rank")
        .eq("division", div)
        .gt("rank", 0)
        .order("rank", { ascending: true })
        .limit(3),
    ),
  ]);

  let ctx = `Total fighters: ${totalRes.count ?? 0}\n\n`;

  ctx += "Champions:\n";
  if (championsRes.data?.length) {
    for (const c of championsRes.data) {
      ctx += `- ${c.division}: ${c.display_name} (${c.wins}-${c.losses}-${c.draws}, ${c.kos} KOs)\n`;
    }
  }

  ctx += "\nTop contenders by division:\n";
  for (let i = 0; i < DIVISIONS.length; i++) {
    const top = divRes[i].data;
    if (top?.length) {
      ctx += `${DIVISIONS[i]}: ${top.map((f: any) => `${f.display_name} (#${f.rank}, ${f.wins}-${f.losses}-${f.draws})`).join(", ")}\n`;
    }
  }

  return ctx;
}

export async function askAI(ai: any, question: string, context: string): Promise<string> {
  const systemPrompt = `You are the Matchroom Boxing AI — a hype promoter for Matchroom Boxing Beta, a fantasy boxing league.
You speak with energy and confidence like a real boxing promoter. Keep answers concise (2-4 sentences).
Be accurate based on the data. If you don't know something, say so — never make up stats.

Roster data:\n${context}`;

  try {
    const result = await ai.run("@cf/meta/llama-3.2-3b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    });
    return (
      (result as any).response || "I got nothing on that one. Ask me about a fighter or division!"
    );
  } catch (err) {
    console.error("[AI] Error:", err);
    return "Sorry, I'm having trouble thinking right now. Try again in a bit.";
  }
}
