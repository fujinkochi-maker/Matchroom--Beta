import { memo } from "react";
import { useCountdown } from "@/hooks/use-countdown";

export const Countdown = memo(function Countdown({
  targetISO,
  compact,
}: {
  targetISO: string;
  compact?: boolean;
}) {
  const { d, h, m, s } = useCountdown(targetISO);
  const items = [
    { v: d, l: "Days" },
    { v: h, l: "Hrs" },
    { v: m, l: "Min" },
    { v: s, l: "Sec" },
  ];
  return (
    <div className={`grid grid-cols-4 ${compact ? "gap-1" : "gap-2"}`}>
      {items.map((it) => (
        <div
          key={it.l}
          className={`border border-border bg-background ${compact ? "px-2 py-1" : "px-3 py-2"} text-center`}
        >
          <p
            className={`font-mono ${compact ? "text-base" : "text-2xl"} font-bold tabular-nums text-foreground`}
          >
            {String(it.v).padStart(2, "0")}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {it.l}
          </p>
        </div>
      ))}
    </div>
  );
});
