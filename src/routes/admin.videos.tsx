import { createFileRoute, Link, useRouter, Outlet, useLocation } from "@tanstack/react-router";
import { ChevronUp, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ensureVideosLoaded, VIDEOS, clearVideosCache } from "@/data/fighters";
import { deleteVideo } from "@/lib/admin.server";
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
  "Highlights",
  "Full Fights",
  "Knockouts",
  "Training",
  "Faceoffs",
  "Press Conferences",
];

export const Route = createFileRoute("/admin/videos")({
  loader: async () => {
    await ensureVideosLoaded();
  },
  component: AdminVideos,
});

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronUp className="ml-1 inline h-3 w-3 opacity-30" />;
  return dir === "asc" ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

function AdminVideos() {
  const router = useRouter();
  const location = useLocation();
  const videos = VIDEOS;
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
    return videos.filter((v) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search.trim() || v.id.toLowerCase().includes(q) || v.title.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "All" || v.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [videos, search, categoryFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id":
          cmp = a.id.localeCompare(b.id);
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "hue":
          cmp = Number(a.hue) - Number(b.hue);
          break;
        case "views":
          cmp = Number(a.views) - Number(b.views);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  if (location.pathname !== "/admin/videos") return <Outlet />;

  const handleDelete = async (id: string) => {
    const token = getAdminToken();
    if (!token) return;
    await deleteVideo({ data: { token, id } });
    clearVideosCache();
    await router.invalidate();
    toast.success("Video deleted");
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
          <h1 className={ADMIN_HEADING}>Videos</h1>
          <p className={ADMIN_SUBTITLE}>{videos.length} videos</p>
        </div>
        <Link to="/admin/videos/new" className={ADMIN_BTN_ADD}>
          <Plus className="h-4 w-4" /> New Video
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by ID or title..."
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
          {sorted.length} of {videos.length} videos
        </p>
      </div>
      <div className={ADMIN_TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="border-b border-border">
              <SortTh label="ID" sortKey="id" />
              <SortTh label="Title" sortKey="title" />
              <SortTh label="Category" sortKey="category" />
              <SortTh label="Hue" sortKey="hue" />
              <SortTh label="Views" sortKey="views" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((v) => (
              <tr key={v.id} className={ADMIN_TABLE_ROW}>
                <td className="px-4 py-3 font-medium">{v.id}</td>
                <td className="px-4 py-3">{v.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{v.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{v.hue}</td>
                <td className="px-4 py-3 text-muted-foreground">{v.views}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/admin/videos/$id/edit"
                      params={{ id: v.id }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(v.id)}
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
                  No videos yet.
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
        title="Delete Video"
        description={`Are you sure you want to delete "${deleteTarget}"? This cannot be undone.`}
      />
    </div>
  );
}
