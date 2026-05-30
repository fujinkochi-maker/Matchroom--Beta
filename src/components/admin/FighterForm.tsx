/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import type { Fighter } from "@/data/types";
import { ImageUpload } from "./ImageUpload";
import { Plus, Trash2 } from "lucide-react";

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
  return `h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${extra ?? ""}`;
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
  const [beltWbc, setBeltWbc] = useState(false);
  const [beltWba, setBeltWba] = useState(false);
  const [beltWbo, setBeltWbo] = useState(false);
  const [beltIbf, setBeltIbf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof FighterFormData, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const beltNames = ["WBC", "WBA", "WBO", "IBF"].filter(
        (_, i) => [beltWbc, beltWba, beltWbo, beltIbf][i],
      );
      const beltCount = beltNames.length;
      await onSubmit({ ...form, belts: beltCount, beltsHeld: beltNames.join(",") });
    } catch (err) {
      setError((err as Error).message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
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
          <input
            type="number"
            min={0}
            value={form.rank}
            onChange={(e) => set("rank", Number(e.target.value))}
            className={inp()}
          />
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
        <Field label="Belts Held">
          <div className="flex flex-wrap gap-4">
            {(["WBC", "WBA", "WBO", "IBF"] as const).map((b) => {
              const checked =
                b === "WBC" ? beltWbc : b === "WBA" ? beltWba : b === "WBO" ? beltWbo : beltIbf;
              const toggle =
                b === "WBC"
                  ? () => {
                      setBeltWbc((x) => !x);
                      if (!beltWbc) set("rank", 0);
                    }
                  : b === "WBA"
                    ? () => {
                        setBeltWba((x) => !x);
                        if (!beltWba) set("rank", 0);
                      }
                    : b === "WBO"
                      ? () => {
                          setBeltWbo((x) => !x);
                          if (!beltWbo) set("rank", 0);
                        }
                      : () => {
                          setBeltIbf((x) => !x);
                          if (!beltIbf) set("rank", 0);
                        };
              return (
                <label key={b} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={toggle}
                    className="h-4 w-4 accent-primary"
                  />
                  {b}
                </label>
              );
            })}
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
        <label className="mb-1 block text-sm font-medium">Fight History</label>
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

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-primary px-6 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
      >
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
      <label className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
