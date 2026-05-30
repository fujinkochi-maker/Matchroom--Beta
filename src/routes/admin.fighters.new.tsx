import { createFileRoute, useRouter } from "@tanstack/react-router";
import { FighterForm, type FighterFormData } from "@/components/admin/FighterForm";
import { createFighter, upsertFightHistory } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin/fighters/new")({
  component: NewFighter,
});

function NewFighter() {
  const router = useRouter();

  const handleSubmit = async (data: FighterFormData) => {
    const token = getAdminToken();
    if (!token) throw new Error("Not authenticated");
    const { history, ...payload } = data;
    await createFighter({ data: { token, ...payload } });
    if (history && history.length > 0) {
      await upsertFightHistory({ data: { token, fighterUsername: payload.username, history } });
    }
    router.navigate({ to: "/admin/fighters" });
  };

  return (
    <div>
      <h1 className="font-display text-2xl uppercase tracking-wider">New Fighter</h1>
      <div className="mt-6 max-w-2xl rounded-lg border border-border bg-background p-6">
        <FighterForm onSubmit={handleSubmit} submitLabel="Create Fighter" />
      </div>
    </div>
  );
}
