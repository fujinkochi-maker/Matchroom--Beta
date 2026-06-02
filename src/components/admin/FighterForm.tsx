import { useState } from "react";
import type { Fighter } from "@/data/types";
import { ImageUpload } from "./ImageUpload";
import { Plus, Trash2 } from "lucide-react";
import { ADMIN_INPUT, ADMIN_LABEL, ADMIN_BTN_PRIMARY, ADMIN_ERROR } from "@/lib/admin-styles";

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
] as const;

const STANCES = ["Orthodox", "Southpaw", "Switch"] as const;

interface FighterFormProps {
  defaultValues?: Partial<Fighter>;
  onSubmit: (data: FighterFormData) => Promise<void>;
  submitLabel: string;
}

export interface FighterFormData {
  username: string;
  displayName: string;
  nickname: string;
  division: string;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
  kos: number;
  stance: string;
  belts: number;
  debut: string;
  streak: string;
  bio: string;
  imageUrl?: string;
  history?: { opponent: string; result: string; method: string; date: string; event: string }[];
}

function inp(extra?: string) {
  return `${ADMIN_INPUT} ${extra ?? ""}`;
}

export function FighterForm({ defaultValues, onSubmit, submitLabel }: FighterFormProps) {
  const [form, setForm] = useState<FighterFormData>({
    username: defaultValues?.username ?? "",
    displayName: defaultValues?.displayName ?? "",
    nickname: defaultValues?.nickname ?? "",
    division: defaultValues?.division ?? DIVISIONS[0],
    rank: defaultValues?.rank ?? 0,
    wins: defaultValues?.wins ?? 0,
    losses: defaultValues?.losses ?? 0,
    draws: defaultValues?.draws ?? 0,
    kos: defaultValues?.kos ?? 0,
    stance: defaultValues?.stance ?? STANCES[0],
    belts: defaultValues?.belts ?? 0,
    debut: defaultValues?.debut ?? "",
    streak: defaultValues?.streak ?? "",
    bio: defaultValues?.bio ?? "",
    imageUrl: defaultValues?.image ?? "",
    history: defaultValues?.history ? defaultValues.history.map((h) => ({ ...h })) : [],
  });
  const [activeBelts, setActiveBelts] = useState<string[]>(() => {
    const held = defaultValues?.beltsHeld;
    return held ? held.split(",").filter(Boolean) : [];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof FighterFormData, value: FighterFormData[keyof FighterFormData]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const beltCount = activeBelts.length;
      await onSubmit({ ...form, belts: beltCount, beltsHeld: activeBelts.join(",") });
    } catch (err) {
      setError((err as Error).message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className={ADMIN_ERROR}>{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" required>
          <input
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            className={inp()}
            required
          />
        </Field>
        <Field label="Display Name" required>
          <input
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            className={inp()}
            required
          />
        </Field>
        <Field label="Nickname">
          <input
            value={form.nickname}
            onChange={(e) => set("nickname", e.target.value)}
            className={inp()}
          />
        </Field>
        <Field label="Division" required>
          <select
            value={form.division}
            onChange={(e) => set("division", e.target.value)}
            className={inp()}
            required
          >
            {DIVISIONS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Rank">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={form.rank}
              onChange={(e) => set("rank", Number(e.target.value))}
              className={inp("bg-muted/50")}
              disabled
            />
            <span className="text-xs text-muted-foreground">Auto-calculated</span>
          </div>
        </Field>
        <Field label="Stance" required>
          <select
            value={form.stance}
            onChange={(e) => set("stance", e.target.value)}
            className={inp()}
            required
          >
            {STANCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Wins">
          <input
            type="number"
            min={0}
            value={form.wins}
            onChange={(e) => set("wins", Number(e.target.value))}
            className={inp()}
          />
        </Field>
        <Field label="Losses">
          <input
            type="number"
            min={0}
            value={form.losses}
            onChange={(e) => set("losses", Number(e.target.value))}
            className={inp()}
          />
        </Field>
        <Field label="Draws">
          <input
            type="number"
            min={0}
            value={form.draws}
            onChange={(e) => set("draws", Number(e.target.value))}
            className={inp()}
          />
        </Field>
        <Field label="KOs">
          <input
            type="number"
            min={0}
            value={form.kos}
            onChange={(e) => set("kos", Number(e.target.value))}
            className={inp()}
          />
        </Field>
        <div className="col-span-full text-xs text-muted-foreground">
          Stats auto-calculate from fight history on save. Manual fields are fallback.
        </div>
        <Field label="Belts Held">
          <div className="flex flex-wrap gap-4">
            {["WBC", "WBA", "WBO", "IBF"].map((b) => (
              <label key={b} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={activeBelts.includes(b)}
                  onChange={() => {
                    setActiveBelts((prev) =>
                      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b],
                    );
                    if (!activeBelts.includes(b)) set("rank", 0);
                  }}
                  className="h-4 w-4 accent-primary"
                />
                {b}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Debut" required>
          <input
            value={form.debut}
            onChange={(e) => set("debut", e.target.value)}
            className={inp()}
            placeholder="e.g. 2024-03-15"
            required
          />
        </Field>
        <Field label="Streak">
          <input
            value={form.streak}
            onChange={(e) => set("streak", e.target.value)}
            className={inp()}
            placeholder="e.g. 5W"
          />
        </Field>
        <Field label="Image">
          <ImageUpload value={form.imageUrl} onUploaded={(url) => set("imageUrl", url)} />
        </Field>
      </div>
      <Field label="Bio">
        <textarea
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          className={inp("min-h-[80px]")}
        />
      </Field>

      <div>
        <label className={ADMIN_LABEL}>Fight History</label>
        <div className="space-y-2">
          {(form.history ?? []).map((h, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2"
            >
              <input
                value={h.opponent}
                onChange={(e) => {
                  const h2 = [...(form.history ?? [])];
                  h2[i] = { ...h2[i], opponent: e.target.value };
                  set("history", h2);
                }}
                placeholder="Opponent"
                className="h-8 w-28 rounded border border-input bg-transparent px-2 text-xs"
              />
              <select
                value={h.result}
                onChange={(e) => {
                  const h2 = [...(form.history ?? [])];
                  h2[i] = { ...h2[i], result: e.target.value };
                  set("history", h2);
                }}
                className="h-8 rounded border border-input bg-transparent px-2 text-xs"
              >
                <option value="W">W</option>
                <option value="L">L</option>
                <option value="D">D</option>
              </select>
              <input
                value={h.method}
                onChange={(e) => {
                  const h2 = [...(form.history ?? [])];
                  h2[i] = { ...h2[i], method: e.target.value };
                  set("history", h2);
                }}
                placeholder="Method"
                className="h-8 w-24 rounded border border-input bg-transparent px-2 text-xs"
              />
              <input
                value={h.date}
                onChange={(e) => {
                  const h2 = [...(form.history ?? [])];
                  h2[i] = { ...h2[i], date: e.target.value };
                  set("history", h2);
                }}
                placeholder="Date"
                className="h-8 w-24 rounded border border-input bg-transparent px-2 text-xs"
              />
              <input
                value={h.event}
                onChange={(e) => {
                  const h2 = [...(form.history ?? [])];
                  h2[i] = { ...h2[i], event: e.target.value };
                  set("history", h2);
                }}
                placeholder="Event"
                className="h-8 w-28 rounded border border-input bg-transparent px-2 text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  set(
                    "history",
                    (form.history ?? []).filter((_, j) => j !== i),
                  )
                }
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            set("history", [
              ...(form.history ?? []),
              { opponent: "", result: "W", method: "", date: "", event: "" },
            ])
          }
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
        >
          <Plus className="h-3.5 w-3.5" /> Add Fight
        </button>
      </div>

      <button type="submit" disabled={busy} className={ADMIN_BTN_PRIMARY}>
        {busy ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={ADMIN_LABEL}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
