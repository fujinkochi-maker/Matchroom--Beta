import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { FighterForm, type FighterFormData } from "@/components/admin/FighterForm";
import { createFighter, upsertFightHistory } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { clearFightersCache } from "@/data/fighters";
import { ADMIN_HEADING, adminCard } from "@/lib/admin-styles";
export const Route = createFileRoute("/admin/fighters/new")({ component: NewFighter });
function NewFighter() {
  const router = useRouter();
  const handleSubmit = async (data: FighterFormData) => {
    const token = getAdminToken();
    if (!token) throw new Error("Not authenticated");
    await createFighter({ data: { token, ...data } });
    if (data.history && data.history.length > 0) {
      await upsertFightHistory({
        data: { token, fighterUsername: data.username, history: data.history },
      });
    }
    clearFightersCache();
    toast.success("Fighter created");
    router.navigate({ to: "/admin/fighters" });
  };
  return (
    <div>
      {" "}
      <h1 className={ADMIN_HEADING}>New Fighter</h1>{" "}
      <div className={adminCard("2xl")}>
        {" "}
        <FighterForm onSubmit={handleSubmit} submitLabel="Create Fighter" />{" "}
      </div>{" "}
    </div>
  );
}
