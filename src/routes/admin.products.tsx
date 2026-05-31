import { createFileRoute, Link, useRouter, Outlet, useLocation } from "@tanstack/react-router";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { loadDataFromSupabase, PRODUCTS } from "@/data/fighters";
import { deleteProduct } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { useState } from "react";

export const Route = createFileRoute("/admin/products")({
  loader: async () => {
    await loadDataFromSupabase();
  },
  component: AdminProducts,
});

function AdminProducts() {
  const router = useRouter();
  const location = useLocation();
  const products = PRODUCTS;
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (location.pathname !== "/admin/products") return <Outlet />;

  const handleDelete = async (id: string) => {
    const token = getAdminToken();
    if (!token) return;
    await deleteProduct({ data: { token, id } });
    router.invalidate();
    toast.success("Product deleted");
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wider">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">{products.length} products</p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" /> New Product
        </Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Limited</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{p.id}</td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                <td className="px-4 py-3">£{p.price}</td>
                <td className="px-4 py-3">
                  {p.limited ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Limited
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.stock}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/admin/products/$id/edit"
                      params={{ id: p.id }}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(p.id)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No products yet.
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
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget}"? This cannot be undone.`}
      />
    </div>
  );
}
