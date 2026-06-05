import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import { FighterForm, type FighterFormData } from "@/components/admin/FighterForm";
import { updateFighter, upsertFightHistory } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ensureFightersLoaded, getByUsername, clearFightersCache } from "@/data/fighters";
import { ArrowLeft } from "lucide-react";
import { ADMIN_HEADING, ADMIN_SUBTITLE, adminCard } from "@/lib/admin-styles";
export const Route = createFileRoute("/admin/fighters/$username/edit")({
  loader: async () => {
    await ensureFightersLoaded();
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
    await updateFighter({ data: { token, originalUsername: username, ...data } });
    clearFightersCache();
    router.navigate({ to: "/admin/fighters" });
  };
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin/fighters" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className={ADMIN_HEADING}>Edit Fighter</h1>
          <p className={ADMIN_SUBTITLE}>@{username}</p>
        </div>
      </div>
      <div className={adminCard("2xl")}>
        {" "}
        <FighterForm
          defaultValues={fighter}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
        />{" "}
      </div>{" "}
    </div>
  );
}
