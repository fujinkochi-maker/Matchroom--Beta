import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { FighterAvatar } from "./FighterAvatar";
import { BeltIcon } from "./BeltIcon";
import type { Fighter } from "@/data/types";
import { getChampionTitle } from "@/data/fighters";

export const FighterCard = memo(function FighterCard({
  fighter,
  displayRank,
}: {
  fighter: Fighter;
  displayRank?: number;
}) {
  const kos = Math.round((fighter.kos / Math.max(fighter.wins, 1)) * 100);
  const rank = displayRank ?? fighter.rank;
  return (
    <div className="group relative overflow-hidden border border-border bg-card shadow-card transition-shadow duration-200 hover:-translate-y-1 hover:shadow-red">
      <Link to="/boxers/$username" params={{ username: fighter.username }} className="block">
        <div className="relative">
          <FighterAvatar name={fighter.displayName} src={fighter.image} />
          <div className="absolute left-0 top-0 bg-primary px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
            {fighter.rank === 0 ? getChampionTitle(fighter.beltsHeld) : `#${rank}`}
          </div>
          {fighter.beltsHeld ? (
            <div className="absolute right-1 top-1 flex flex-wrap gap-1">
              {fighter.beltsHeld.split(",").map((b) => (
                <BeltIcon key={b} name={b} className="h-5 w-auto drop-shadow" />
              ))}
            </div>
          ) : (
            fighter.belts > 0 && (
              <div className="absolute right-0 top-0 bg-foreground/90 px-2 py-1 text-xs font-bold text-background">
                {fighter.belts}× Belt
              </div>
            )
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/95 via-foreground/60 to-transparent p-3">
            <p className="font-display text-lg uppercase leading-none text-background">
              {fighter.displayName}
            </p>
            <p className="text-xs text-background/70">@{fighter.username}</p>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 border-t border-border px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold uppercase tracking-wider text-muted-foreground">
            {fighter.division}
          </span>
          <span className="flex items-center gap-2">
            {fighter.region && <span className="text-muted-foreground">{fighter.region}</span>}
            <span className="font-mono text-foreground">
              {fighter.wins}-{fighter.losses}-{fighter.draws}
            </span>
            <span className="font-mono text-primary">{kos}% KO</span>
          </span>
        </div>
      </Link>
    </div>
  );
});
