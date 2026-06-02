import { getAdminSupabase } from "@/lib/supabase-admin";

const BODIES = ["WBC", "WBA", "IBF", "WBO", "OVERALL"] as const;
export type RankingBody = (typeof BODIES)[number];

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

function streakBonus(streak: string): number {
  if (!streak) return 0;
  const n = parseInt(streak, 10);
  if (isNaN(n)) return 0;
  return streak.endsWith("W") ? n * 3 : 0;
}

const FORMULAS: Record<
  RankingBody,
  (f: { wins: number; losses: number; kos: number; streak: string }) => number
> = {
  OVERALL: (f) => f.wins * 10 + f.kos * 5 - f.losses * 8,
  WBC: (f) => f.wins * 10 + f.kos * 8 - f.losses * 6,
  WBA: (f) => f.wins * 12 - f.losses * 10,
  IBF: (f) => f.wins * 8 + f.kos * 3 - f.losses * 10,
  WBO: (f) => f.wins * 10 + streakBonus(f.streak) - f.losses * 7,
};

function calculatePoints(
  fighter: { wins: number; losses: number; kos: number; streak: string },
  body: RankingBody,
): number {
  return FORMULAS[body](fighter);
}

export async function recalculateDivision(division: string) {
  const supabase = getAdminSupabase();

  const { data: fighters } = await supabase
    .from("fighters")
    .select("username, wins, losses, draws, kos, streak, belts_held")
    .eq("division", division);

  if (!fighters?.length) return;

  // Delete old rankings for this division
  await supabase.from("rankings").delete().eq("division", division);

  const newRankings: {
    fighter_username: string;
    body: string;
    rank: number;
    division: string;
    points: number;
  }[] = [];

  for (const body of BODIES) {
    const champions = new Set(
      fighters.filter((f: any) => (f.belts_held ?? "").includes(body)).map((f: any) => f.username),
    );

    const contenders = fighters
      .filter((f: any) => !champions.has(f.username))
      .map((f: any) => ({
        username: f.username,
        points: calculatePoints(f, body),
      }))
      .sort((a, b) => b.points - a.points);

    for (const champ of champions) {
      newRankings.push({
        fighter_username: champ,
        body,
        rank: 0,
        division,
        points: 9999,
      });
    }

    contenders.forEach((f, i) => {
      newRankings.push({
        fighter_username: f.username,
        body,
        rank: i + 1,
        division,
        points: f.points,
      });
    });
  }

  if (newRankings.length > 0) {
    await supabase.from("rankings").insert(newRankings);
  }
}

export async function recalculateAll() {
  for (const div of DIVISIONS) {
    await recalculateDivision(div);
  }
}

export async function getRankings(division: string, body: RankingBody = "OVERALL") {
  const supabase = getAdminSupabase();
  const { data } = await supabase
    .from("rankings")
    .select("*")
    .eq("division", division)
    .eq("body", body)
    .order("rank", { ascending: true });
  return data ?? [];
}

export async function getRankingsForFighter(username: string) {
  const supabase = getAdminSupabase();
  const { data } = await supabase
    .from("rankings")
    .select("*")
    .eq("fighter_username", username)
    .order("body", { ascending: true });
  return data ?? [];
}
