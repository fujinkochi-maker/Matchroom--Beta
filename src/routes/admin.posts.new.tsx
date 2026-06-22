import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { createPost } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ensureFightersLoaded, FIGHTERS } from "@/data/fighters";
import { ArrowLeft, Search } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  ADMIN_INPUT,
  ADMIN_HEADING,
  ADMIN_LABEL,
  ADMIN_BTN_PRIMARY,
  ADMIN_ERROR,
  adminCard,
} from "@/lib/admin-styles";

export const Route = createFileRoute("/admin/posts/new")({
  loader: async () => {
    await ensureFightersLoaded();
  },
  component: NewPost,
});

function NewPost() {
  const router = useRouter();
  const fighters = FIGHTERS;
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedFighters, setSelectedFighters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const filteredFighters = fighters.filter(
    (f) =>
      f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );
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
      await createPost({
        data: {
          token,
          content,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
          tags: selectedFighters,
        },
      });
      toast.success("Post created");
      router.navigate({ to: "/admin/posts" });
    } catch (err) {
      setError((err as Error).message ?? "Failed to create post");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin/posts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className={ADMIN_HEADING}>New Post</h1>
      </div>
      <div className={adminCard("3xl")}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={ADMIN_LABEL}>Content</label>
            <textarea
              className="h-auto w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">{content.length}/2000</p>
          </div>

          <div>
            <label className={ADMIN_LABEL}>Image</label>
            <ImageUpload bucket="post-images" value={imageUrl} onUploaded={setImageUrl} />
          </div>

          <div>
            <label className={ADMIN_LABEL}>Video URL</label>
            <input
              className={ADMIN_INPUT}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div>
            <label className={ADMIN_LABEL}>Tag Fighters</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={ADMIN_INPUT + " pl-9"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fighters by name or username..."
              />
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Showing {filteredFighters.length} of {fighters.length} fighters
              {selectedFighters.length > 0 && ` (${selectedFighters.length} selected)`}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 max-h-80 overflow-y-auto">
              {filteredFighters.map((f) => (
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

          {error && <p className={ADMIN_ERROR}>{error}</p>}
          <button type="submit" className={ADMIN_BTN_PRIMARY} disabled={!content.trim()}>
            Create Post
          </button>
        </form>
      </div>
    </div>
  );
}
