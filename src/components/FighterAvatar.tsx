import { memo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  className?: string;
  square?: boolean;
  src?: string;
}

export const FighterAvatar = memo(function FighterAvatar({ name, className, square, src }: Props) {
  if (src) {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-gradient-to-br from-foreground/90 to-foreground",
          square ? "aspect-square" : "aspect-[3/4]",
          className,
        )}
        aria-label={name}
      >
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn(
        "relative flex items-center justify-center bg-muted",
        square ? "aspect-square" : "aspect-[3/4]",
        className,
      )}
      aria-label={name}
    >
      <span className="text-lg font-bold uppercase text-muted-foreground">{initials}</span>
    </div>
  );
});
