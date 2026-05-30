import { createFileRoute, Link, useRouter, Outlet, useLocation } from "@tanstack/react-router";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { loadDataFromSupabase, VIDEOS } from "@/data/fighters";
import { deleteVideo } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { useState } from "react";

export const Route = createFileRoute("/admin/videos")({
  loader: async () => {
    await loadDataFromSupabase();
  },
  component: AdminVideos,
});

function AdminVideos() {
  const router = useRouter();
  const location = useLocation();
  const videos = VIDEOS;
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (location.pathname !== "/admin/videos") return <Outlet />;

  const handleDelete = async (id: string) => {
    const token = getAdminToken();
    if (!token) return;
    await deleteVideo({ data: { token, id } });
    await loadDataFromSupabase();
    router.invalidate();
    toast.success("Video deleted");
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wider">Videos</h1>
          <p className="mt-1 text-sm text-muted-foreground">{videos.length} videos</p>
        </div>
        <Link
          to="/admin/videos/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" /> New Video
        </Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Duration</th>
              <th className="px-4 py-3 font-semibold">Views</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{v.id}</td>
                <td className="px-4 py-3">{v.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{v.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{v.duration}</td>
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
            {videos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No videos yet.
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
        title="Delete Video"
        description={`Are you sure you want to delete "${deleteTarget}"? This cannot be undone.`}
      />
    </div>
  );
}
