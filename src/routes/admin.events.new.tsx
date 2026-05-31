import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { createEvent } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ensureFightersLoaded, FIGHTERS } from "@/data/fighters";
import { DIVISIONS } from "@/data/types";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  ADMIN_INPUT,
  ADMIN_TEXTAREA,
  ADMIN_HEADING,
  ADMIN_LABEL,
  ADMIN_BTN_PRIMARY,
  ADMIN_ERROR,
  adminCard,
} from "@/lib/admin-styles";
interface CardRow {
  fighterA: string;
  fighterB: string;
  weight: string;
}
export const Route = createFileRoute("/admin/events/new")({
  loader: async () => {
    await ensureFightersLoaded();
  },
  component: NewEvent,
});
function NewEvent() {
  const router = useRouter();
  const fighters = FIGHTERS;
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [arena, setArena] = useState("");
  const [mainEventA, setMainEventA] = useState("");
  const [mainEventB, setMainEventB] = useState("");
  const [mainEventTitle, setMainEventTitle] = useState("");
  const [status, setStatus] = useState<"upcoming" | "past">("upcoming");
  const [tagline, setTagline] = useState("");
  const [card, setCard] = useState<CardRow[]>([]);
  const [imageUrl, setImageUrl] = useState("");
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
      await createEvent({
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
      toast.success("Event created");
      router.navigate({ to: "/admin/events" });
    } catch (err) {
      setError(err?.message ?? "Failed to create event");
    }
  };
  return (
    <div>
      {" "}
      <h1 className={ADMIN_HEADING}>New Event</h1>{" "}
      <div className={adminCard("3xl")}>
        {" "}
        <form onSubmit={handleSubmit} className="space-y-6">
          {" "}
          <div className="grid gap-4 sm:grid-cols-2">
            {" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Slug</label>{" "}
              <input
                className={ADMIN_INPUT}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Name</label>{" "}
              <input
                className={ADMIN_INPUT}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Date</label>{" "}
              <input
                className={ADMIN_INPUT}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Arena</label>{" "}
              <input
                className={ADMIN_INPUT}
                value={arena}
                onChange={(e) => setArena(e.target.value)}
                required
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Main Event A</label>{" "}
              <select
                className={ADMIN_INPUT}
                value={mainEventA}
                onChange={(e) => setMainEventA(e.target.value)}
                required
              >
                {" "}
                <option value="">Select fighter</option>{" "}
                {fighters.map((f) => (
                  <option key={f.username} value={f.username}>
                    {" "}
                    {f.username}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Main Event B</label>{" "}
              <select
                className={ADMIN_INPUT}
                value={mainEventB}
                onChange={(e) => setMainEventB(e.target.value)}
                required
              >
                {" "}
                <option value="">Select fighter</option>{" "}
                {fighters.map((f) => (
                  <option key={f.username} value={f.username}>
                    {" "}
                    {f.username}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Main Event Title</label>{" "}
              <input
                className={ADMIN_INPUT}
                value={mainEventTitle}
                onChange={(e) => setMainEventTitle(e.target.value)}
                required
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Status</label>{" "}
              <select
                className={ADMIN_INPUT}
                value={status}
                onChange={(e) => setStatus(e.target.value as "upcoming" | "past")}
              >
                {" "}
                <option value="upcoming">Upcoming</option> <option value="past">Past</option>{" "}
              </select>{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className={ADMIN_LABEL}>Tagline</label>{" "}
            <textarea
              className={ADMIN_TEXTAREA}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              rows={3}
            />{" "}
          </div>{" "}
          <div>
            {" "}
            <label className={ADMIN_LABEL}>Image</label>{" "}
            <ImageUpload bucket="event-images" value={imageUrl} onUploaded={setImageUrl} />{" "}
          </div>{" "}
          <div>
            {" "}
            <div className="mb-2 flex items-center justify-between">
              {" "}
              <label className="text-sm font-medium">Card</label>{" "}
              <button
                type="button"
                onClick={addCardRow}
                className="rounded-md bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark"
              >
                {" "}
                + Add Row{" "}
              </button>{" "}
            </div>{" "}
            {card.map((row, idx) => (
              <div key={idx} className="mb-2 grid gap-2 sm:grid-cols-4">
                {" "}
                <select
                  className={ADMIN_INPUT}
                  value={row.fighterA}
                  onChange={(e) => updateCardRow(idx, "fighterA", e.target.value)}
                  required
                >
                  {" "}
                  <option value="">Fighter A</option>{" "}
                  {fighters.map((f) => (
                    <option key={f.username} value={f.username}>
                      {" "}
                      {f.username}{" "}
                    </option>
                  ))}{" "}
                </select>{" "}
                <select
                  className={ADMIN_INPUT}
                  value={row.fighterB}
                  onChange={(e) => updateCardRow(idx, "fighterB", e.target.value)}
                  required
                >
                  {" "}
                  <option value="">Fighter B</option>{" "}
                  {fighters.map((f) => (
                    <option key={f.username} value={f.username}>
                      {" "}
                      {f.username}{" "}
                    </option>
                  ))}{" "}
                </select>{" "}
                <select
                  className={ADMIN_INPUT}
                  value={row.weight}
                  onChange={(e) => updateCardRow(idx, "weight", e.target.value)}
                  required
                >
                  {" "}
                  {DIVISIONS.map((d) => (
                    <option key={d} value={d}>
                      {" "}
                      {d}{" "}
                    </option>
                  ))}{" "}
                </select>{" "}
                <button
                  type="button"
                  onClick={() => removeCardRow(idx)}
                  className="h-10 rounded-md bg-destructive/10 px-3 text-sm text-destructive hover:bg-destructive/20"
                >
                  {" "}
                  Remove{" "}
                </button>{" "}
              </div>
            ))}{" "}
          </div>{" "}
          {error && <p className={ADMIN_ERROR}>{error}</p>}{" "}
          <button type="submit" className={ADMIN_BTN_PRIMARY}>
            {" "}
            Create Event{" "}
          </button>{" "}
        </form>{" "}
      </div>{" "}
    </div>
  );
}
