import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { createVideo } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ensureFightersLoaded, FIGHTERS } from "@/data/fighters";
import { ArrowLeft, Upload, X, ImageIcon } from "lucide-react";
import {
  ADMIN_INPUT,
  ADMIN_HEADING,
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

function FileUpload({
  accept,
  label,
  bucket,
  folder,
  value,
  onChange,
  uploadingLabel,
}: {
  accept: string;
  label: string;
  bucket: string;
  folder: string;
  value: string;
  onChange: (url: string) => void;
  uploadingLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const supabase = getSupabase();
      const ext = file.name.split(".").pop();
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(urlData.publicUrl);
    } catch (err) {
      setError((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className={ADMIN_LABEL}>{label}</label>
      <div className="flex items-center gap-3 mt-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm hover:bg-accent disabled:opacity-50"
        >
          {uploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? uploadingLabel : `Upload ${label}`}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFile}
          className="hidden"
        />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {value && (
        <div className="mt-2 flex items-center gap-3">
          {accept === "image/*" ? (
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {value.startsWith("http") ? (
                <img src={value} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          ) : (
            <span className="truncate text-xs text-muted-foreground max-w-[200px]">{value}</span>
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/admin/videos/new")({
  loader: async () => {
    await ensureFightersLoaded();
  },
  component: NewVideo,
});
function NewVideo() {
  const router = useRouter();
  const fighters = FIGHTERS;
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);
  const [duration, setDuration] = useState("");
  const [views, setViews] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnail, setThumbnail] = useState("");
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
    if (!videoUrl) {
      setError("Please upload a video file.");
      return;
    }
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
          category,
          duration,
          views,
          video_url: videoUrl,
          thumbnail: thumbnail || undefined,
          fighters: selectedFighters,
        },
      });
      toast.success("Video created");
      router.navigate({ to: "/admin/videos" });
    } catch (err) {
      setError(err?.message ?? "Failed to create video");
    }
  };
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin/videos" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className={ADMIN_HEADING}>New Video</h1>
      </div>
      <div className={adminCard("3xl")}>
        {" "}
        <form onSubmit={handleSubmit} className="space-y-6">
          {" "}
          <div className="grid gap-4 sm:grid-cols-2">
            {" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>ID</label>{" "}
              <input
                className={ADMIN_INPUT}
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />{" "}
            </div>{" "}
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
          <div className="space-y-4">
            <FileUpload
              accept="video/mp4,video/webm,video/quicktime"
              label="Video File"
              bucket="videos"
              folder={id || "pending"}
              value={videoUrl}
              onChange={setVideoUrl}
              uploadingLabel="Uploading video..."
            />
            <FileUpload
              accept="image/*"
              label="Thumbnail Image"
              bucket="videos"
              folder={id || "pending"}
              value={thumbnail}
              onChange={setThumbnail}
              uploadingLabel="Uploading thumbnail..."
            />
          </div>
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
            Create Video{" "}
          </button>{" "}
        </form>{" "}
      </div>{" "}
    </div>
  );
}
