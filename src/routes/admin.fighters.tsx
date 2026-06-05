import { createFileRoute, Link, useRouter, Outlet, useLocation } from "@tanstack/react-router";
import { ChevronUp, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ensureFightersLoaded, FIGHTERS } from "@/data/fighters";
import { deleteFighter } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { useState, useMemo } from "react";
import { DIVISIONS } from "@/data/types";
import {
  ADMIN_HEADING,
  ADMIN_SUBTITLE,
  ADMIN_BTN_ADD,
  ADMIN_TABLE_WRAP,
  ADMIN_TABLE_ROW,
} from "@/lib/admin-styles";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/admin/fighters")({
  loader: async () => {
    await ensureFightersLoaded();
  },
  component: AdminFighters,
});

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronUp className="ml-1 inline h-3 w-3 opacity-30" />;
  return dir === "asc" ? (
    <ChevronUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline h-3 w-3" />
  );
}

function AdminFighters() {
  const router = useRouter();
  const location = useLocation();
  const fighters = FIGHTERS;
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("All");
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
    return fighters.filter((f) => {
      const matchesSearch =
        f.username.toLowerCase().includes(search.toLowerCase()) ||
        f.displayName.toLowerCase().includes(search.toLowerCase());
      const matchesDivision = divisionFilter === "All" || f.division === divisionFilter;
      return matchesSearch && matchesDivision;
    });
  }, [fighters, search, divisionFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "username":
          cmp = a.username.localeCompare(b.username);
          break;
        case "displayName":
          cmp = a.displayName.localeCompare(b.displayName);
          break;
        case "division":
          cmp = a.division.localeCompare(b.division);
          break;
        case "rank":
          cmp = a.rank - b.rank;
          break;
        case "wins":
          cmp = a.wins - b.wins;
          break;
        case "stance":
          cmp = (a.stance ?? "").localeCompare(b.stance ?? "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  if (location.pathname !== "/admin/fighters") return <Outlet />;

  const handleDelete = async (username: string) => {
    const token = getAdminToken();
    if (!token) return;
    await deleteFighter({ data: { token, username } });
    await router.invalidate();
    toast.success("Fighter deleted");
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
          <h1 className={ADMIN_HEADING}>Fighters</h1>
          <p className={ADMIN_SUBTITLE}>{fighters.length} fighters</p>
        </div>
        <Link to="/admin/fighters/new" className={ADMIN_BTN_ADD}>
          <Plus className="h-4 w-4" /> New Fighter
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name or username..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={divisionFilter}
          onChange={(e) => {
            setDivisionFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="All">All Divisions</option>
          {DIVISIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {sorted.length} of {fighters.length} fighters
        </p>
      </div>
      <div className={ADMIN_TABLE_WRAP}>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="border-b border-border">
              <SortTh label="Username" sortKey="username" />
              <SortTh label="Display Name" sortKey="displayName" />
              <SortTh label="Division" sortKey="division" />
              <SortTh label="Rank" sortKey="rank" />
              <SortTh label="Record" sortKey="wins" />
              <SortTh label="Stance" sortKey="stance" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((f) => (
              <tr key={f.username} className={ADMIN_TABLE_ROW}>
                <td className="px-4 py-3 font-medium">@{f.username}</td>
                <td className="px-4 py-3">{f.displayName}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.division}</td>
                <td className="px-4 py-3">{f.rank === 0 ? "Champion" : `#${f.rank}`}</td>
                <td className="px-4 py-3">
                  {f.wins}-{f.losses}-{f.draws}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{f.stance}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/admin/fighters/$username/edit"
                      params={{ username: f.username }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(f.username)}
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
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No fighters yet.
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
        title="Delete Fighter"
        description={`Are you sure you want to delete "${deleteTarget}"? This cannot be undone.`}
      />
    </div>
  );
}
