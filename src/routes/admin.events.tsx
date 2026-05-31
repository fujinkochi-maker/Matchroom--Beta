import { createFileRoute, Link, useRouter, Outlet, useLocation } from "@tanstack/react-router";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { loadDataFromSupabase, EVENTS } from "@/data/fighters";
import { deleteEvent } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { useState } from "react";

export const Route = createFileRoute("/admin/events")({
  loader: async () => {
    await loadDataFromSupabase();
  },
  component: AdminEvents,
});

function AdminEvents() {
  const router = useRouter();
  const location = useLocation();
  const events = EVENTS;
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (location.pathname !== "/admin/events") return <Outlet />;

  const handleDelete = async (slug: string) => {
    const token = getAdminToken();
    if (!token) return;
    await deleteEvent({ data: { token, slug } });
    router.invalidate();
    toast.success("Event deleted");
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wider">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">{events.length} events</p>
        </div>
        <Link
          to="/admin/events/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" /> New Event
        </Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Main Event</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.slug} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{e.slug}</td>
                <td className="px-4 py-3">{e.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.date}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {e.mainEvent.a} vs {e.mainEvent.b}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      e.status === "upcoming"
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/admin/events/$slug/edit"
                      params={{ slug: e.slug }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(e.slug)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No events yet.
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
        title="Delete Event"
        description={`Are you sure you want to delete "${deleteTarget}"? This cannot be undone.`}
      />
    </div>
  );
}
