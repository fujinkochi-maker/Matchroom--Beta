import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { updatePost } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ensurePostsLoaded, ensureFightersLoaded, POSTS, FIGHTERS } from "@/data/fighters";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  ADMIN_INPUT,
  ADMIN_HEADING,
  ADMIN_SUBTITLE,
  ADMIN_LABEL,
  ADMIN_BTN_PRIMARY,
  ADMIN_ERROR,
  adminCard,
} from "@/lib/admin-styles";

export const Route = createFileRoute("/admin/posts/$id/edit")({
  loader: async () => {
    await Promise.all([ensurePostsLoaded(), ensureFightersLoaded()]);
  },
  component: EditPost,
});

function EditPost() {
  const { id } = Route.useParams();
  const router = useRouter();
  const fighters = FIGHTERS;
  const post = POSTS.find((p) => p.id === id);
  if (!post) throw notFound();

  const [content, setContent] = useState(post.content);
  const [imageUrl, setImageUrl] = useState(post.imageUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(post.videoUrl ?? "");
  const [selectedFighters, setSelectedFighters] = useState<string[]>(post.tags);
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
      await updatePost({
        data: {
          token,
          postId: id,
          content,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
          tags: selectedFighters,
        },
      });
      toast.success("Post updated");
      router.navigate({ to: "/admin/posts" });
    } catch (err) {
      setError((err as Error).message ?? "Failed to update post");
    }
  };

  const charCount = content.length;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin/posts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className={ADMIN_HEADING}>Edit Post</h1>
          <p className={ADMIN_SUBTITLE}>{id}</p>
        </div>
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
            <p className="mt-1 text-xs text-muted-foreground">{charCount}/2000</p>
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

          {error && <p className={ADMIN_ERROR}>{error}</p>}
          <button type="submit" className={ADMIN_BTN_PRIMARY} disabled={!content.trim()}>
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
