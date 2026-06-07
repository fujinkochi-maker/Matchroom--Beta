import { createFileRoute, Link, useRouter, Outlet, useLocation } from "@tanstack/react-router";
import { ChevronUp, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ensureArticlesLoaded, ARTICLES, clearArticlesCache } from "@/data/fighters";
import { deleteArticle } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { useState, useMemo } from "react";
import {
  ADMIN_HEADING,
  ADMIN_SUBTITLE,
  ADMIN_BTN_ADD,
  ADMIN_TABLE_WRAP,
  ADMIN_TABLE_ROW,
} from "@/lib/admin-styles";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const CATEGORIES = [
  "Breaking News",
  "Fight Results",
  "Rankings",
  "Event Announcements",
  "Interviews",
];

export const Route = createFileRoute("/admin/articles")({
  loader: async () => {
    await ensureArticlesLoaded();
  },
  component: AdminArticles,
});

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronUp className="ml-1 inline h-3 w-3 opacity-30" />;
  return dir === "asc" ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

function AdminArticles() {
  const router = useRouter();
  const location = useLocation();
  const articles = ARTICLES;
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
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
    return articles.filter((a) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search.trim() || a.slug.toLowerCase().includes(q) || a.title.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "All" || a.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [articles, search, categoryFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "slug":
          cmp = a.slug.localeCompare(b.slug);
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "featured":
          cmp = (a.featured ? 1 : 0) - (b.featured ? 1 : 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  if (location.pathname !== "/admin/articles") return <Outlet />;

  const handleDelete = async (slug: string) => {
    const token = getAdminToken();
    if (!token) return;
    await deleteArticle({ data: { token, slug } });
    clearArticlesCache();
    await router.invalidate();
    toast.success("Article deleted");
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
          <h1 className={ADMIN_HEADING}>Articles</h1>
          <p className={ADMIN_SUBTITLE}>{articles.length} articles</p>
        </div>
        <Link to="/admin/articles/new" className={ADMIN_BTN_ADD}>
          <Plus className="h-4 w-4" /> New Article
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by slug or title..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {sorted.length} of {articles.length} articles
        </p>
      </div>
      <div className={ADMIN_TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="border-b border-border">
              <SortTh label="Slug" sortKey="slug" />
              <SortTh label="Title" sortKey="title" />
              <SortTh label="Category" sortKey="category" />
              <SortTh label="Date" sortKey="date" />
              <SortTh label="Featured" sortKey="featured" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((a) => (
              <tr key={a.slug} className={ADMIN_TABLE_ROW}>
                <td className="px-4 py-3 font-medium">{a.slug}</td>
                <td className="px-4 py-3">{a.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.date}</td>
                <td className="px-4 py-3">
                  {a.featured ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      Featured
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/admin/articles/$slug/edit"
                      params={{ slug: a.slug }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(a.slug)}
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
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No articles yet.
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
        title="Delete Article"
        description={`Are you sure you want to delete "${deleteTarget}"? This cannot be undone.`}
      />
    </div>
  );
}
