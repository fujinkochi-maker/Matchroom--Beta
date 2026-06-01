import { createFileRoute, Link, useRouter, Outlet, useLocation } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { ensurePostsLoaded, POSTS } from "@/data/fighters";
import { deletePost } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import {
  ADMIN_HEADING,
  ADMIN_SUBTITLE,
  ADMIN_BTN_ADD,
  ADMIN_TABLE_WRAP,
  ADMIN_TABLE_ROW,
} from "@/lib/admin-styles";

export const Route = createFileRoute("/admin/posts")({
  loader: async () => {
    await ensurePostsLoaded();
  },
  component: AdminPosts,
});

function AdminPosts() {
  const router = useRouter();
  const location = useLocation();
  const posts = POSTS;
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (location.pathname !== "/admin/posts") return <Outlet />;

  const handleDelete = async (postId: string) => {
    const token = getAdminToken();
    if (!token) return;
    await deletePost({ data: { token, postId } });
    await router.invalidate();
    toast.success("Post deleted");
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={ADMIN_HEADING}>Feed Posts</h1>
          <p className={ADMIN_SUBTITLE}>{posts.length} posts</p>
        </div>
        <Link to="/admin/posts/new" className={ADMIN_BTN_ADD}>
          <Plus className="h-4 w-4" /> New Post
        </Link>
      </div>
      <div className={ADMIN_TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-semibold">Content</th>
              <th className="px-4 py-3 font-semibold">Author</th>
              <th className="px-4 py-3 font-semibold">Tags</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className={ADMIN_TABLE_ROW}>
                <td className="max-w-xs truncate px-4 py-3 font-medium">{p.content}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.authorDisplayName}
                  <span className="ml-1 text-xs">({p.authorType})</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.tags.length > 0 ? p.tags.join(", ") : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDeleteTarget(p.id)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No posts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDelete
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        title="Delete Post"
        description="Are you sure you want to delete this post? This cannot be undone."
      />
    </div>
  );
}
