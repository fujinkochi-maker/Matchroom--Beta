import { createFileRoute, useRouter, notFound } from "@tanstack/react-router";
import { FighterForm, type FighterFormData } from "@/components/admin/FighterForm";
import { updateFighter, upsertFightHistory } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ensureFightersLoaded, getByUsername } from "@/data/fighters";
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
    router.navigate({ to: "/admin/fighters" });
  };
  return (
    <div>
      {" "}
      <h1 className={ADMIN_HEADING}>Edit Fighter</h1> <p className={ADMIN_SUBTITLE}>@{username}</p>{" "}
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
