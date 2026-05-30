import { createFileRoute, useRouter, notFound } from "@tanstack/react-router";
import { FighterForm, type FighterFormData } from "@/components/admin/FighterForm";
import { updateFighter, upsertFightHistory } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { loadDataFromSupabase, getByUsername } from "@/data/fighters";

export const Route = createFileRoute("/admin/fighters/$username/edit")({
  loader: async () => {
    await loadDataFromSupabase();
  },
  component: EditFighter,
});

function EditFighter() {
  const { username } = Route.useParams();
  const router = useRouter();
  const fighter = getByUsername(username);
  if (!fighter) throw notFound();

  const handleSubmit = async (data: FighterFormData) => {
    const token = getAdminToken();
    if (!token) throw new Error("Not authenticated");
    const { history, ...payload } = data;
    await updateFighter({ data: { token, originalUsername: username, ...payload } });
    await upsertFightHistory({
      data: { token, fighterUsername: payload.username, history: history ?? [] },
    });
    router.navigate({ to: "/admin/fighters" });
  };

  return (
    <div>
      <h1 className="font-display text-2xl uppercase tracking-wider">Edit Fighter</h1>
      <p className="mt-1 text-sm text-muted-foreground">@{username}</p>
      <div className="mt-6 max-w-2xl rounded-lg border border-border bg-background p-6">
        <FighterForm defaultValues={fighter} onSubmit={handleSubmit} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
