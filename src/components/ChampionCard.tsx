import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { FighterAvatar } from "./FighterAvatar";
import { BeltIcon } from "./BeltIcon";
import type { Fighter } from "@/data/types";
import { getChampionTitle } from "@/data/fighters";

export const ChampionCard = memo(function ChampionCard({
  fighter,
  beltsHeld = [],
}: {
  fighter: Fighter;
  beltsHeld?: string[];
}) {
  const kos = Math.round((fighter.kos / Math.max(fighter.wins, 1)) * 100);
  return (
    <div className="group relative overflow-hidden border border-border bg-card shadow-card transition-shadow duration-200 hover:-translate-y-1.5 hover:shadow-red">
      <Link to="/boxers/$username" params={{ username: fighter.username }}>
        <div className="relative">
          <FighterAvatar name={fighter.displayName} src={fighter.image} />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/95 via-foreground/30 to-transparent" />
          {beltsHeld.length > 0 ? (
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              {beltsHeld.map((b) => (
                <BeltIcon key={b} name={b} className="h-5 w-auto drop-shadow" />
              ))}
            </div>
          ) : (
            <div className="absolute left-3 top-3 bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
              {getChampionTitle(fighter.beltsHeld)}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {fighter.division}
            </p>
            <h3 className="mt-1 font-display text-2xl uppercase leading-none text-background">
              {fighter.displayName}
            </h3>
            <p className="mt-1 text-xs italic text-background/70">"{fighter.nickname}"</p>

            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-background/20 pt-3">
              <Stat label="Record" value={`${fighter.wins}-${fighter.losses}-${fighter.draws}`} />
              <Stat label="KO %" value={`${kos}%`} />
              <Stat
                label="Belts"
                value={beltsHeld.length > 0 ? beltsHeld.join(" ") : `${fighter.belts}`}
              />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-background/60">{label}</p>
      <p className="font-mono text-sm font-bold text-background">{value}</p>
    </div>
  );
}
