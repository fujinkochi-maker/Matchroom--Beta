import { getAdminSupabase } from "@/lib/supabase-admin";
import type { Fighter, Division } from "./types";

const BODIES = ["WBC", "WBA", "IBF", "WBO", "OVERALL"] as const;
export type RankingBody = (typeof BODIES)[number];

interface FighterRow {
  username: string;
  wins: number;
  losses: number;
  draws: number;
  kos: number;
  streak: string;
  belts_held: string | null;
  region: string | null;
}

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
  f: { wins: number; losses: number; kos: number; streak: string },
  body: RankingBody,
): number {
  return FORMULAS[body](f);
}

/** Compute body rankings for a set of fighters */
export function computeRankings(fighters: Fighter[], body: RankingBody, region?: string) {
  const pool = region ? fighters.filter((f) => f.region === region) : fighters;

  const champions = new Set(
    pool.filter((f) => (f.beltsHeld ?? "").includes(body)).map((f) => f.username),
  );

  const contenders = pool
    .filter((f) => !champions.has(f.username))
    .map((f) => ({ username: f.username, points: calculatePoints(f, body) }))
    .sort((a, b) => b.points - a.points);

  const result: { fighter_username: string; rank: number; points: number }[] = [];

  for (const champ of champions) {
    result.push({ fighter_username: champ, rank: 0, points: 9999 });
  }
  contenders.forEach((f, i) => {
    result.push({ fighter_username: f.username, rank: i + 1, points: f.points });
  });

  return result;
}

/** Store global rankings in the db */
export async function recalculateDivision(division: string) {
  const supabase = getAdminSupabase();

  const { data: raw, error } = await supabase
    .from("fighters")
    .select("username, wins, losses, draws, kos, streak, belts_held, region")
    .eq("division", division);

  if (error) {
    console.error(`[${division}] Query error:`, error.message);
    return;
  }
  if (!raw?.length) return;

  const fighters = raw as FighterRow[];

  await supabase.from("rankings").delete().eq("division", division);

  const newRankings: {
    fighter_username: string;
    body: string;
    rank: number;
    division: string;
    points: number;
    region: string;
  }[] = [];

  for (const body of BODIES) {
    const champions = new Set(
      fighters.filter((f) => (f.belts_held ?? "").includes(body)).map((f) => f.username),
    );
    const contenders = fighters
      .filter((f) => !champions.has(f.username))
      .map((f) => ({
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
        region: "",
      });
    }
    contenders.forEach((f, i) => {
      newRankings.push({
        fighter_username: f.username,
        body,
        rank: i + 1,
        division,
        points: f.points,
        region: "",
      });
    });
  }

  if (newRankings.length > 0) {
    const { error: insErr } = await supabase.from("rankings").insert(newRankings);
    if (insErr) console.error(`[${division}] Insert error:`, insErr.message);
  }
}

export async function recalculateAll() {
  const allDivisions: Division[] = [
    "Flyweight",
    "Bantamweight",
    "Featherweight",
    "Lightweight",
    "Welterweight",
    "Middleweight",
    "Cruiserweight",
    "Heavyweight",
  ];
  for (const div of allDivisions) {
    await recalculateDivision(div);
  }
}

export async function getRankings(
  division: string,
  body: RankingBody = "OVERALL",
  region?: string,
) {
  // For regional views, compute on-the-fly from global rankings filtered by region
  if (region && region !== "all") {
    const supabase = getAdminSupabase();
    const { data: raw } = await supabase
      .from("fighters")
      .select("username, wins, losses, draws, kos, streak, belts_held, region")
      .eq("division", division)
      .eq("region", region);
    if (!raw?.length) return [];
    const fighters = raw as FighterRow[];

    const champions = new Set(
      fighters.filter((f) => (f.belts_held ?? "").includes(body)).map((f) => f.username),
    );
    const contenders = fighters
      .filter((f) => !champions.has(f.username))
      .map((f) => ({
        fighter_username: f.username,
        points: calculatePoints(f, body),
      }))
      .sort((a, b) => b.points - a.points);

    const result: {
      fighter_username: string;
      rank: number;
      points: number;
      body: string;
      division: string;
      region: string;
    }[] = [];
    for (const champ of champions) {
      result.push({ fighter_username: champ, body, rank: 0, division, points: 9999, region });
    }
    contenders.forEach((f, i) => {
      result.push({
        fighter_username: f.username,
        body,
        rank: i + 1,
        division,
        points: f.points,
        region,
      });
    });
    return result;
  }

  // Global view: read from stored db table
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
