import { useState, useRef, useEffect } from "react";
import { FIGHTERS } from "@/data/fighters";
import { ADMIN_INPUT } from "@/lib/admin-styles";

export function FighterAutocomplete({
  value,
  onChange,
  placeholder,
  filterUsernames,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  filterUsernames?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  const pool = filterUsernames
    ? FIGHTERS.filter((f) => filterUsernames.includes(f.username))
    : FIGHTERS;

  const query = input.toLowerCase();
  const suggestions = pool.filter(
    (f) =>
      f.username.toLowerCase().includes(query) ||
      f.displayName.toLowerCase().includes(query),
  ).slice(0, 15);

  const exactMatch = pool.find((f) => f.username === input.trim() || f.displayName.toLowerCase() === input.trim().toLowerCase());

  useEffect(() => {
    const f = pool.find((p) => p.username === value);
    setInput(f ? f.displayName : value);
  }, [value, pool]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        className={ADMIN_INPUT}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      {open && input.trim() && !exactMatch && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
          {suggestions.map((f) => (
            <button
              key={f.username}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={(e) => {
                e.preventDefault();
                setInput(f.displayName);
                onChange(f.username);
                setOpen(false);
              }}
            >
              <span className="font-medium">{f.displayName}</span>
              <span className="text-muted-foreground">@{f.username}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {f.wins}-{f.losses}-{f.draws}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
