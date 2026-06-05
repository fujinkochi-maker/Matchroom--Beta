import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { createArticle } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ensureFightersLoaded, FIGHTERS } from "@/data/fighters";
import { ArrowLeft } from "lucide-react";
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
const CATEGORIES = [
  "Breaking News",
  "Fight Results",
  "Rankings",
  "Event Announcements",
  "Interviews",
] as const;
export const Route = createFileRoute("/admin/articles/new")({
  loader: async () => {
    await ensureFightersLoaded();
  },
  component: NewArticle,
});
function NewArticle() {
  const router = useRouter();
  const fighters = FIGHTERS;
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState("");
  const [featured, setFeatured] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
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
      await createArticle({
        data: {
          token,
          slug,
          title,
          excerpt,
          body,
          category,
          author,
          date,
          featured,
          imageUrl: imageUrl || undefined,
          fighters: selectedFighters,
        },
      });
      toast.success("Article created");
      router.navigate({ to: "/admin/articles" });
    } catch (err) {
      setError(err?.message ?? "Failed to create article");
    }
  };
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin/articles" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className={ADMIN_HEADING}>New Article</h1>
      </div>
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
                onChange={(e) => setCategory(e.target.value)}
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
              <label className={ADMIN_LABEL}>Author</label>{" "}
              <input
                className={ADMIN_INPUT}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
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
              <label className={ADMIN_LABEL}>Image</label>{" "}
              <ImageUpload bucket="article-images" value={imageUrl} onUploaded={setImageUrl} />{" "}
            </div>{" "}
            <div className="flex items-center gap-2 sm:pt-6">
              {" "}
              <input
                type="checkbox"
                id="featured"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />{" "}
              <label htmlFor="featured" className="text-sm font-medium">
                {" "}
                Featured{" "}
              </label>{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className={ADMIN_LABEL}>Excerpt</label>{" "}
            <textarea
              className={ADMIN_TEXTAREA}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
            />{" "}
          </div>{" "}
          <div>
            {" "}
            <label className={ADMIN_LABEL}>Body</label>{" "}
            <textarea
              className={ADMIN_TEXTAREA}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
            />{" "}
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
            Create Article{" "}
          </button>{" "}
        </form>{" "}
      </div>{" "}
    </div>
  );
}
