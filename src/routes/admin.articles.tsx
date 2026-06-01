import { createFileRoute, Link, useRouter, Outlet, useLocation } from "@tanstack/react-router";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ensureArticlesLoaded, ARTICLES } from "@/data/fighters";
import { deleteArticle } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { useState } from "react";
import {
  ADMIN_HEADING,
  ADMIN_SUBTITLE,
  ADMIN_BTN_ADD,
  ADMIN_TABLE_WRAP,
  ADMIN_TABLE_ROW,
} from "@/lib/admin-styles";
export const Route = createFileRoute("/admin/articles")({
  loader: async () => {
    await ensureArticlesLoaded();
  },
  component: AdminArticles,
});
function AdminArticles() {
  const router = useRouter();
  const location = useLocation();
  const articles = ARTICLES;
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  if (location.pathname !== "/admin/articles") return <Outlet />;
  const handleDelete = async (slug: string) => {
    const token = getAdminToken();
    if (!token) return;
    await deleteArticle({ data: { token, slug } });
    await router.invalidate();
    toast.success("Article deleted");
  };
  return (
    <div>
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h1 className={ADMIN_HEADING}>Articles</h1>{" "}
          <p className={ADMIN_SUBTITLE}>{articles.length} articles</p>{" "}
        </div>{" "}
        <Link to="/admin/articles/new" className={ADMIN_BTN_ADD}>
          {" "}
          <Plus className="h-4 w-4" /> New Article{" "}
        </Link>{" "}
      </div>{" "}
      <div className={ADMIN_TABLE_WRAP}>
        {" "}
        <table className="w-full text-sm">
          {" "}
          <thead className="bg-muted/50 text-left">
            {" "}
            <tr className="border-b border-border">
              {" "}
              <th className="px-4 py-3 font-semibold">Slug</th>{" "}
              <th className="px-4 py-3 font-semibold">Title</th>{" "}
              <th className="px-4 py-3 font-semibold">Category</th>{" "}
              <th className="px-4 py-3 font-semibold">Date</th>{" "}
              <th className="px-4 py-3 font-semibold">Featured</th>{" "}
              <th className="px-4 py-3 font-semibold" />{" "}
            </tr>{" "}
          </thead>{" "}
          <tbody>
            {" "}
            {articles.map((a) => (
              <tr key={a.slug} className={ADMIN_TABLE_ROW}>
                {" "}
                <td className="px-4 py-3 font-medium">{a.slug}</td>{" "}
                <td className="px-4 py-3">{a.title}</td>{" "}
                <td className="px-4 py-3 text-muted-foreground">{a.category}</td>{" "}
                <td className="px-4 py-3 text-muted-foreground">{a.date}</td>{" "}
                <td className="px-4 py-3">
                  {" "}
                  {a.featured ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      {" "}
                      Featured{" "}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}{" "}
                </td>{" "}
                <td className="px-4 py-3">
                  {" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <Link
                      to="/admin/articles/$slug/edit"
                      params={{ slug: a.slug }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      {" "}
                      <Pencil className="h-4 w-4" />{" "}
                    </Link>{" "}
                    <button
                      onClick={() => setDeleteTarget(a.slug)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      {" "}
                      <Trash2 className="h-4 w-4" />{" "}
                    </button>{" "}
                  </div>{" "}
                </td>{" "}
              </tr>
            ))}{" "}
            {articles.length === 0 && (
              <tr>
                {" "}
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {" "}
                  No articles yet.{" "}
                </td>{" "}
              </tr>
            )}{" "}
          </tbody>{" "}
        </table>{" "}
      </div>{" "}
      <ConfirmDelete
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        title="Delete Article"
        description={`Are you sure you want to delete "${deleteTarget}"? This cannot be undone.`}
      />{" "}
    </div>
  );
}
