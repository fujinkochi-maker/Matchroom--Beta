/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { createVideo } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { loadDataFromSupabase, FIGHTERS } from "@/data/fighters";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const selectClass = inputClass;

const CATEGORIES = [
  "Highlights",
  "Full Fights",
  "Knockouts",
  "Training",
  "Faceoffs",
  "Press Conferences",
] as const;

export const Route = createFileRoute("/admin/videos/new")({
  loader: async () => {
    await loadDataFromSupabase();
  },
  component: NewVideo,
});

function NewVideo() {
  const router = useRouter();
  const fighters = FIGHTERS;

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [duration, setDuration] = useState("");
  const [views, setViews] = useState("");
  const [selectedFighters, setSelectedFighters] = useState<string[]>([]);
  const [error, setError] = useState("");

  const toggleFighter = (username: string) => {
    setSelectedFighters((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username],
    );
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
      await createVideo({
        data: {
          token,
          id,
          title,
          category: category as any,
          duration,
          views,
          fighters: selectedFighters,
        },
      });
      router.navigate({ to: "/admin/videos" });
    } catch (err) {
      setError(err?.message ?? "Failed to create video");
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl uppercase tracking-wider">New Video</h1>
      <div className="mt-6 max-w-3xl rounded-lg border border-border bg-background p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">ID</label>
              <input
                className={inputClass}
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select
                className={selectClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Duration</label>
              <input
                className={inputClass}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Views</label>
              <input
                className={inputClass}
                value={views}
                onChange={(e) => setViews(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Fighters</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {fighters.map((f) => (
                <label key={f.username} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedFighters.includes(f.username)}
                    onChange={() => toggleFighter(f.username)}
                    className="h-4 w-4 rounded border-input"
                  />
                  {f.displayName} (@{f.username})
                </label>
              ))}
            </div>
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          )}
          <button
            type="submit"
            className="rounded-md bg-primary px-6 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
          >
            Create Video
          </button>
        </form>
      </div>
    </div>
  );
}
