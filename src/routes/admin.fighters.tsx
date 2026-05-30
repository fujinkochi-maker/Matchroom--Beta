import { createFileRoute, Link, useRouter, Outlet, useLocation } from "@tanstack/react-router";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { loadDataFromSupabase, FIGHTERS } from "@/data/fighters";
import { deleteFighter } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { useState } from "react";

export const Route = createFileRoute("/admin/fighters")({
  loader: async () => {
    await loadDataFromSupabase();
  },
  component: AdminFighters,
});

function AdminFighters() {
  const router = useRouter();
  const location = useLocation();
  const fighters = FIGHTERS;
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (location.pathname !== "/admin/fighters") return <Outlet />;

  const handleDelete = async (username: string) => {
    const token = getAdminToken();
    if (!token) return;
    await deleteFighter({ data: { token, username } });
    await loadDataFromSupabase();
    router.invalidate();
    toast.success("Fighter deleted");
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wider">Fighters</h1>
          <p className="mt-1 text-sm text-muted-foreground">{fighters.length} fighters</p>
        </div>
        <Link
          to="/admin/fighters/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" /> New Fighter
        </Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-semibold">Username</th>
              <th className="px-4 py-3 font-semibold">Display Name</th>
              <th className="px-4 py-3 font-semibold">Division</th>
              <th className="px-4 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 font-semibold">Record</th>
              <th className="px-4 py-3 font-semibold">Stance</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {fighters.map((f) => (
              <tr
                key={f.username}
                className="border-b border-border last:border-0 hover:bg-muted/30"
              >
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
            {fighters.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No fighters yet.
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
        title="Delete Fighter"
        description={`Are you sure you want to delete "${deleteTarget}"? This cannot be undone.`}
      />
    </div>
  );
}
