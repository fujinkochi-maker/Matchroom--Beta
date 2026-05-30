/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { updateArticle } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { loadDataFromSupabase, FIGHTERS, ARTICLES } from "@/data/fighters";
import { ImageUpload } from "@/components/admin/ImageUpload";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const selectClass = inputClass;
const textareaClass =
  "h-auto w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]";

const CATEGORIES = [
  "Breaking News",
  "Fight Results",
  "Rankings",
  "Event Announcements",
  "Interviews",
] as const;

export const Route = createFileRoute("/admin/articles/$slug/edit")({
  loader: async () => {
    await loadDataFromSupabase();
  },
  component: EditArticle,
});

function EditArticle() {
  const { slug } = Route.useParams();
  const router = useRouter();
  const fighters = FIGHTERS;
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) throw notFound();

  const [title, setTitle] = useState(article.title);
  const [excerpt, setExcerpt] = useState(article.excerpt);
  const [body, setBody] = useState(article.body);
  const [category, setCategory] = useState(article.category);
  const [author, setAuthor] = useState(article.author);
  const [date, setDate] = useState(article.date);
  const [featured, setFeatured] = useState(article.featured ?? false);
  const [imageUrl, setImageUrl] = useState(article.image ?? "");
  const [selectedFighters, setSelectedFighters] = useState<string[]>(article.fighters);
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
      await updateArticle({
        data: {
          token,
          slug,
          title,
          excerpt,
          body,
          category: category as any,
          author,
          date,
          featured,
          imageUrl: imageUrl || undefined,
          fighters: selectedFighters,
        },
      });
      router.navigate({ to: "/admin/articles" });
    } catch (err) {
      setError(err?.message ?? "Failed to update article");
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl uppercase tracking-wider">Edit Article</h1>
      <p className="mt-1 text-sm text-muted-foreground">{slug}</p>
      <div className="mt-6 max-w-3xl rounded-lg border border-border bg-background p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
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
                onChange={(e) => setCategory(e.target.value as any)}
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
              <label className="mb-1 block text-sm font-medium">Author</label>
              <input
                className={inputClass}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
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
              <label className="mb-1 block text-sm font-medium">Image</label>
              <ImageUpload bucket="article-images" value={imageUrl} onUploaded={setImageUrl} />
            </div>
            <div className="flex items-center gap-2 sm:pt-6">
              <input
                type="checkbox"
                id="featured"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="featured" className="text-sm font-medium">
                Featured
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Excerpt</label>
            <textarea
              className={textareaClass}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Body</label>
            <textarea
              className={textareaClass}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
            />
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
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
