import { getAdminSupabase } from "../src/lib/supabase-admin";
import { REGIONS } from "../src/data/types";

async function main() {
  const supabase = getAdminSupabase();
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

  for (const div of DIVISIONS) {
    for (const region of REGIONS) {
      const { data: fighters, error } = await supabase
        .from("fighters")
        .select("username")
        .eq("division", div)
        .eq("region", region);

      if (error) {
        console.log(`[ERROR] ${div}/${region}: ${error.message}`);
      } else {
        console.log(`[${div}/${region}] ${fighters?.length ?? 0} fighters`);
      }
    }
  }

  const { data: asiaRankings, error: rErr } = await supabase
    .from("rankings")
    .select("division, body, fighter_username, rank, region")
    .eq("region", "ASIA");

  if (rErr) {
    console.log("[RANKINGS ERROR]", rErr.message);
  } else {
    console.log(`[ASIA RANKINGS] ${asiaRankings?.length ?? 0} entries`);
    for (const r of asiaRankings ?? []) {
      console.log(`  ${r.division}/${r.body} #${r.rank}: ${r.fighter_username}`);
    }
  }
}

main().catch(console.error);
