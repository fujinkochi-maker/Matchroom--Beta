import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { updateVideo } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ensureFightersLoaded, ensureVideosLoaded, FIGHTERS, VIDEOS } from "@/data/fighters";
import { ArrowLeft } from "lucide-react";
import {
  ADMIN_INPUT,
  ADMIN_HEADING,
  ADMIN_SUBTITLE,
  ADMIN_LABEL,
  ADMIN_BTN_PRIMARY,
  ADMIN_ERROR,
  adminCard,
} from "@/lib/admin-styles";
const CATEGORIES = [
  "Highlights",
  "Full Fights",
  "Knockouts",
  "Training",
  "Faceoffs",
  "Press Conferences",
] as const;
export const Route = createFileRoute("/admin/videos/$id/edit")({
  loader: async () => {
    await Promise.all([ensureVideosLoaded(), ensureFightersLoaded()]);
  },
  component: EditVideo,
});
function EditVideo() {
  const { id } = Route.useParams();
  const router = useRouter();
  const fighters = FIGHTERS;
  const video = VIDEOS.find((v) => v.id === id);
  if (!video) throw notFound();
  const [title, setTitle] = useState(video.title);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(video.category);
  const [duration, setDuration] = useState(video.duration);
  const [views, setViews] = useState(video.views);
  const [selectedFighters, setSelectedFighters] = useState<string[]>(video.fighters);
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
      await updateVideo({
        data: { token, id, title, category, duration, views, fighters: selectedFighters },
      });
      router.navigate({ to: "/admin/videos" });
    } catch (err) {
      setError(err?.message ?? "Failed to update video");
    }
  };
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin/videos" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className={ADMIN_HEADING}>Edit Video</h1>
          <p className={ADMIN_SUBTITLE}>{id}</p>
        </div>
      </div>
      <div className={adminCard("3xl")}>
        {" "}
        <form onSubmit={handleSubmit} className="space-y-6">
          {" "}
          <div className="grid gap-4 sm:grid-cols-2">
            {" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Title</label>{" "}
              <input
                className={ADMIN_INPUT}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Category</label>{" "}
              <select
                className={ADMIN_INPUT}
                value={category}
                onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
                required
              >
                {" "}
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {" "}
                    {c}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Duration</label>{" "}
              <input
                className={ADMIN_INPUT}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Views</label>{" "}
              <input
                className={ADMIN_INPUT}
                value={views}
                onChange={(e) => setViews(e.target.value)}
                required
              />{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className={ADMIN_LABEL}>Fighters</label>{" "}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {" "}
              {fighters.map((f) => (
                <label key={f.username} className="flex items-center gap-2 text-sm">
                  {" "}
                  <input
                    type="checkbox"
                    checked={selectedFighters.includes(f.username)}
                    onChange={() => toggleFighter(f.username)}
                    className="h-4 w-4 rounded border-input"
                  />{" "}
                  {f.displayName} (@{f.username}){" "}
                </label>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {error && <p className={ADMIN_ERROR}>{error}</p>}{" "}
          <button type="submit" className={ADMIN_BTN_PRIMARY}>
            {" "}
            Save Changes{" "}
          </button>{" "}
        </form>{" "}
      </div>{" "}
    </div>
  );
}
