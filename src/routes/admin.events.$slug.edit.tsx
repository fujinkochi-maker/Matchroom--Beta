import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { updateEvent, adminAddSignup, removeSignup } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import {
  ensureFightersLoaded,
  ensureEventsLoaded,
  EVENTS,
  ensureSignupsLoaded,
  EVENT_SIGNUPS,
} from "@/data/fighters";
import { DIVISIONS } from "@/data/types";
import { ArrowLeft } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { FighterAutocomplete } from "@/components/admin/FighterAutocomplete";
import {
  ADMIN_INPUT,
  ADMIN_TEXTAREA,
  ADMIN_HEADING,
  ADMIN_SUBTITLE,
  ADMIN_LABEL,
  ADMIN_BTN_PRIMARY,
  ADMIN_ERROR,
  adminCard,
} from "@/lib/admin-styles";
interface CardRow {
  fighterA: string;
  fighterB: string;
  weight: string;
  slot: string;
  title: string;
}
export const Route = createFileRoute("/admin/events/$slug/edit")({
  loader: async () => {
    await Promise.all([ensureEventsLoaded(), ensureFightersLoaded(), ensureSignupsLoaded()]);
  },
  component: EditEvent,
});
function EditEvent() {
  const { slug } = Route.useParams();
  const router = useRouter();
  const event = EVENTS.find((e) => e.slug === slug);
  if (!event) throw notFound();
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [arena, setArena] = useState(event.arena);
  const [status, setStatus] = useState<"upcoming" | "past">(event.status);
  const [tagline, setTagline] = useState(event.tagline);
  const [imageUrl, setImageUrl] = useState(event.image ?? "");
  const [card, setCard] = useState<CardRow[]>(
    event.card.map((c) => ({
      fighterA: c.a,
      fighterB: c.b,
      weight: c.weight,
      slot: c.slot,
      title: c.title ?? (c.slot === "main" ? event.mainEvent.title : ""),
    })),
  );
  const [error, setError] = useState("");
  const [importUsername, setImportUsername] = useState("");

  const eventSignups = EVENT_SIGNUPS.filter((s) => s.eventSlug === slug);
  const signupUsernames = eventSignups.map((s) => s.fighterUsername);

  const handleImportSignup = async () => {
    const token = getAdminToken();
    if (!token || !importUsername.trim()) return;
    try {
      await adminAddSignup({
        data: { token, eventSlug: slug, fighterUsername: importUsername.trim() },
      });
      setImportUsername("");
      toast.success(`${importUsername.trim()} signed up`);
      router.invalidate();
    } catch (err) {
      toast.error(err?.message ?? "Failed to add signup");
    }
  };

  const handleRemoveSignup = async (id: number) => {
    const token = getAdminToken();
    if (!token) return;
    try {
      await removeSignup({ data: { token, id } });
      toast.success("Signup removed");
      router.invalidate();
    } catch (err) {
      toast.error(err?.message ?? "Failed to remove signup");
    }
  };

  const addCardRow = (slot = "maincard") => {
    setCard([...card, { fighterA: "", fighterB: "", weight: "Heavyweight", slot, title: "" }]);
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
    const mainRow = card.find((r) => r.slot === "main");
    if (!mainRow) {
      setError("Add at least one card row with slot 'Main Event'.");
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
          status,
          tagline,
          card: card.map((r) => ({
            fighterA: r.fighterA,
            fighterB: r.fighterB,
            weight: r.weight,
            slot: r.slot,
            title: r.slot === "main" ? r.title : "",
          })),
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
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin/events" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className={ADMIN_HEADING}>Edit Event</h1>
          <p className={ADMIN_SUBTITLE}>{slug}</p>
        </div>
      </div>
      <div className={adminCard("3xl")}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ADMIN_LABEL}>Name</label>
              <input
                className={ADMIN_INPUT}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={ADMIN_LABEL}>Date</label>
              <input
                className={ADMIN_INPUT}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={ADMIN_LABEL}>Arena</label>
              <input
                className={ADMIN_INPUT}
                value={arena}
                onChange={(e) => setArena(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={ADMIN_LABEL}>Status</label>
              <select
                className={ADMIN_INPUT}
                value={status}
                onChange={(e) => setStatus(e.target.value as "upcoming" | "past")}
              >
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
          </div>
          <div>
            <label className={ADMIN_LABEL}>Tagline</label>
            <textarea
              className={ADMIN_TEXTAREA}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className={ADMIN_LABEL}>Image</label>
            <ImageUpload bucket="event-images" value={imageUrl} onUploaded={setImageUrl} />
          </div>

          <div className="rounded border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Signed-up fighters ({eventSignups.length})
            </p>
            <div className="mb-2 flex gap-2">
              <input
                className={ADMIN_INPUT}
                value={importUsername}
                onChange={(e) => setImportUsername(e.target.value)}
                placeholder="Fighter username to import"
                onKeyDown={(e) => e.key === "Enter" && handleImportSignup()}
              />
              <button
                type="button"
                onClick={handleImportSignup}
                disabled={!importUsername.trim()}
                className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Import
              </button>
            </div>
            {eventSignups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {eventSignups.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {s.fighterUsername}
                    <button
                      type="button"
                      onClick={() => handleRemoveSignup(s.id)}
                      className="ml-0.5 text-primary/60 hover:text-destructive"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
            {eventSignups.length === 0 && (
              <p className="text-xs text-muted-foreground">No signups yet.</p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Card</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addCardRow("main")}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark"
                >
                  + Main Event
                </button>
                <button
                  type="button"
                  onClick={() => addCardRow()}
                  className="rounded-md bg-primary/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary"
                >
                  + Add Row
                </button>
              </div>
            </div>
            {card.map((row, idx) => (
              <div key={idx} className="mb-3 rounded border border-border p-3">
                <div className="mb-2 grid gap-2 sm:grid-cols-5">
                  <FighterAutocomplete
                    value={row.fighterA}
                    onChange={(v) => updateCardRow(idx, "fighterA", v)}
                    placeholder="Fighter A username"
                    filterUsernames={signupUsernames}
                  />
                  <FighterAutocomplete
                    value={row.fighterB}
                    onChange={(v) => updateCardRow(idx, "fighterB", v)}
                    placeholder="Fighter B username"
                    filterUsernames={signupUsernames}
                  />
                  <select
                    className={ADMIN_INPUT}
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
                  <select
                    className={ADMIN_INPUT}
                    value={row.slot}
                    onChange={(e) => updateCardRow(idx, "slot", e.target.value)}
                    required
                  >
                    <option value="prelim">Prelim</option>
                    <option value="maincard">Main Card</option>
                    <option value="comain">Co-Main</option>
                    <option value="main">Main Event</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeCardRow(idx)}
                    className="h-10 rounded-md bg-destructive/10 px-3 text-sm text-destructive hover:bg-destructive/20"
                  >
                    Remove
                  </button>
                </div>
                {row.slot === "main" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Main Event Title
                    </label>
                    <input
                      className={ADMIN_INPUT}
                      value={row.title}
                      onChange={(e) => updateCardRow(idx, "title", e.target.value)}
                      placeholder="e.g. WBC Heavyweight Championship"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          {error && <p className={ADMIN_ERROR}>{error}</p>}
          <button type="submit" className={ADMIN_BTN_PRIMARY}>
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
