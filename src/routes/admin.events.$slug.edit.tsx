import { createFileRoute, useRouter, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { updateEvent } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { loadDataFromSupabase, FIGHTERS, EVENTS } from "@/data/fighters";
import { DIVISIONS } from "@/data/types";
import { ImageUpload } from "@/components/admin/ImageUpload";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const selectClass = inputClass;
const textareaClass =
  "h-auto w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]";

interface CardRow {
  fighterA: string;
  fighterB: string;
  weight: string;
}

export const Route = createFileRoute("/admin/events/$slug/edit")({
  loader: async () => {
    await loadDataFromSupabase();
  },
  component: EditEvent,
});

function EditEvent() {
  const { slug } = Route.useParams();
  const router = useRouter();
  const fighters = FIGHTERS;
  const event = EVENTS.find((e) => e.slug === slug);
  if (!event) throw notFound();

  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [arena, setArena] = useState(event.arena);
  const [mainEventA, setMainEventA] = useState(event.mainEvent.a);
  const [mainEventB, setMainEventB] = useState(event.mainEvent.b);
  const [mainEventTitle, setMainEventTitle] = useState(event.mainEvent.title);
  const [status, setStatus] = useState<"upcoming" | "past">(event.status);
  const [tagline, setTagline] = useState(event.tagline);
  const [imageUrl, setImageUrl] = useState(event.image ?? "");
  const [card, setCard] = useState<CardRow[]>(
    event.card.map((c) => ({ fighterA: c.a, fighterB: c.b, weight: c.weight })),
  );
  const [error, setError] = useState("");

  const addCardRow = () => {
    setCard([...card, { fighterA: "", fighterB: "", weight: "Heavyweight" }]);
  };

  const removeCardRow = (idx: number) => {
    setCard(card.filter((_, i) => i !== idx));
  };

  const updateCardRow = (idx: number, field: keyof CardRow, value: string) => {
    setCard(card.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const token = getAdminToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }
    try {
      await updateEvent({
        data: {
          token,
          slug,
          name,
          date,
          arena,
          mainEventA,
          mainEventB,
          mainEventTitle,
          status,
          tagline,
          card,
          imageUrl: imageUrl || undefined,
        },
      });
      router.navigate({ to: "/admin/events" });
    } catch (err) {
      setError(err?.message ?? "Failed to update event");
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl uppercase tracking-wider">Edit Event</h1>
      <p className="mt-1 text-sm text-muted-foreground">{slug}</p>
      <div className="mt-6 max-w-3xl rounded-lg border border-border bg-background p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Date</label>
              <input
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Arena</label>
              <input
                className={inputClass}
                value={arena}
                onChange={(e) => setArena(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Main Event Title</label>
              <input
                className={inputClass}
                value={mainEventTitle}
                onChange={(e) => setMainEventTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Main Event A</label>
              <select
                className={selectClass}
                value={mainEventA}
                onChange={(e) => setMainEventA(e.target.value)}
                required
              >
                <option value="">Select fighter</option>
                {fighters.map((f) => (
                  <option key={f.username} value={f.username}>
                    {f.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Main Event B</label>
              <select
                className={selectClass}
                value={mainEventB}
                onChange={(e) => setMainEventB(e.target.value)}
                required
              >
                <option value="">Select fighter</option>
                {fighters.map((f) => (
                  <option key={f.username} value={f.username}>
                    {f.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select
                className={selectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as "upcoming" | "past")}
              >
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tagline</label>
            <textarea
              className={textareaClass}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Image</label>
            <ImageUpload bucket="event-images" value={imageUrl} onUploaded={setImageUrl} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Card</label>
              <button
                type="button"
                onClick={addCardRow}
                className="rounded-md bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark"
              >
                + Add Row
              </button>
            </div>
            {card.map((row, idx) => (
              <div key={idx} className="mb-2 grid gap-2 sm:grid-cols-4">
                <select
                  className={selectClass}
                  value={row.fighterA}
                  onChange={(e) => updateCardRow(idx, "fighterA", e.target.value)}
                  required
                >
                  <option value="">Fighter A</option>
                  {fighters.map((f) => (
                    <option key={f.username} value={f.username}>
                      {f.username}
                    </option>
                  ))}
                </select>
                <select
                  className={selectClass}
                  value={row.fighterB}
                  onChange={(e) => updateCardRow(idx, "fighterB", e.target.value)}
                  required
                >
                  <option value="">Fighter B</option>
                  {fighters.map((f) => (
                    <option key={f.username} value={f.username}>
                      {f.username}
                    </option>
                  ))}
                </select>
                <select
                  className={selectClass}
                  value={row.weight}
                  onChange={(e) => updateCardRow(idx, "weight", e.target.value)}
                  required
                >
                  {DIVISIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeCardRow(idx)}
                  className="h-10 rounded-md bg-destructive/10 px-3 text-sm text-destructive hover:bg-destructive/20"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          )}
          <button
            type="submit"
            className="rounded-md bg-primary px-6 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
