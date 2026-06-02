import { createFileRoute, useRouter } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { recalculateAllRankings, getRankingsForAdmin } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import {
  ADMIN_HEADING,
  ADMIN_SUBTITLE,
  ADMIN_BTN_PRIMARY,
  ADMIN_TABLE_WRAP,
  ADMIN_TABLE_ROW,
} from "@/lib/admin-styles";

export const Route = createFileRoute("/admin/rankings")({
  component: AdminRankings,
});

function AdminRankings() {
  const router = useRouter();
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchRankings = async () => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    try {
      const { rankings: data } = await getRankingsForAdmin({ data: { token } });
      setRankings(data);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load rankings");
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    const token = getAdminToken();
    if (!token) return;
    setBusy(true);
    try {
      await recalculateAllRankings({ data: { token } });
      toast.success("All rankings recalculated");
      await fetchRankings();
    } catch (err) {
      toast.error((err as Error).message || "Recalculation failed");
    } finally {
      setBusy(false);
    }
  };

  const grouped = rankings.reduce(
    (acc: Record<string, any[]>, r: any) => {
      const key = `${r.division}::${r.body}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={ADMIN_HEADING}>Rankings</h1>
          <p className={ADMIN_SUBTITLE}>Auto-calculated from fight records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchRankings} disabled={loading} className={ADMIN_BTN_PRIMARY}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Load
          </button>
          <button onClick={handleRecalculate} disabled={busy} className={ADMIN_BTN_PRIMARY}>
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Recalculate All
          </button>
        </div>
      </div>

      {Object.entries(grouped).length === 0 && !loading && (
        <p className="mt-8 text-center text-muted-foreground">
          Click "Load" to view rankings, then "Recalculate All" to compute them from fight records.
        </p>
      )}

      {Object.entries(grouped).map(([key, entries]) => {
        const [division, body] = key.split("::");
        return (
          <div key={key} className="mt-6">
            <h2 className="mb-2 font-display text-lg uppercase">
              {division} — {body === "OVERALL" ? "Overall" : body}
            </h2>
            <div className={ADMIN_TABLE_WRAP}>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 font-semibold">Rank</th>
                    <th className="px-4 py-3 font-semibold">Fighter</th>
                    <th className="px-4 py-3 font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {entries
                    .sort((a: any, b: any) => a.rank - b.rank)
                    .map((r: any) => (
                      <tr key={`${r.fighter_username}-${r.body}`} className={ADMIN_TABLE_ROW}>
                        <td className="px-4 py-3">
                          {r.rank === 0 ? (
                            <span className="bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                              Champion
                            </span>
                          ) : (
                            <span className="font-mono">#{r.rank}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">@{r.fighter_username}</td>
                        <td className="px-4 py-3 font-mono">{r.points}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
