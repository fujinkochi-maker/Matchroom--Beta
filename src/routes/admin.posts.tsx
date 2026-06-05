import { createFileRoute, Link, useRouter, Outlet, useLocation } from "@tanstack/react-router";
import { ChevronUp, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
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
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/admin/posts")({
  loader: async () => {
    await ensurePostsLoaded();
  },
  component: AdminPosts,
});

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronUp className="ml-1 inline h-3 w-3 opacity-30" />;
  return dir === "asc" ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

function AdminPosts() {
  const router = useRouter();
  const location = useLocation();
  const posts = POSTS;
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) => p.content.toLowerCase().includes(q) || p.authorDisplayName.toLowerCase().includes(q),
    );
  }, [posts, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "content":
          cmp = a.content.localeCompare(b.content);
          break;
        case "authorType":
          cmp = a.authorType.localeCompare(b.authorType);
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  if (location.pathname !== "/admin/posts") return <Outlet />;

  const handleDelete = async (postId: string) => {
    const token = getAdminToken();
    if (!token) return;
    await deletePost({ data: { token, postId } });
    await router.invalidate();
    toast.success("Post deleted");
  };

  function SortTh({
    label,
    sortKey: sk,
    className,
  }: {
    label: string;
    sortKey: string;
    className?: string;
  }) {
    const active = sortKey === sk;
    return (
      <th
        className={cn("cursor-pointer px-4 py-3 font-semibold select-none", className)}
        onClick={() => handleSort(sk)}
      >
        {label}
        <SortIcon active={active} dir={sortDir} />
      </th>
    );
  }

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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by content or author..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          {sorted.length} of {posts.length} posts
        </p>
      </div>
      <div className={ADMIN_TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="border-b border-border">
              <SortTh label="Content" sortKey="content" />
              <SortTh label="Author" sortKey="authorType" />
              <th className="px-4 py-3 font-semibold">Tags</th>
              <SortTh label="Date" sortKey="createdAt" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((p) => (
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
                  <div className="flex items-center gap-2">
                    <Link
                      to="/admin/posts/$id/edit"
                      params={{ id: p.id }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(p.id)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No posts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-input px-3 py-1 text-sm disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-input px-3 py-1 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
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
