/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { updateProduct } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { loadDataFromSupabase, PRODUCTS } from "@/data/fighters";
import { ImageUpload } from "@/components/admin/ImageUpload";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const selectClass = inputClass;

const CATEGORIES = [
  "Hoodies",
  "Shirts",
  "Gloves",
  "Caps",
  "Champion Collection",
  "Limited Drop",
] as const;

export const Route = createFileRoute("/admin/products/$id/edit")({
  loader: async () => {
    await loadDataFromSupabase();
  },
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  const router = useRouter();
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) throw notFound();

  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(product.price);
  const [limited, setLimited] = useState(product.limited ?? false);
  const [stock, setStock] = useState(product.stock ?? 50);
  const [imageUrl, setImageUrl] = useState(product.image ?? "");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const token = getAdminToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }
    try {
      await updateProduct({
        data: {
          token,
          id,
          name,
          category: category as any,
          price,
          limited,
          stock,
          imageUrl: imageUrl || undefined,
        },
      });
      router.navigate({ to: "/admin/products" });
    } catch (err) {
      setError(err?.message ?? "Failed to update product");
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl uppercase tracking-wider">Edit Product</h1>
      <p className="mt-1 text-sm text-muted-foreground">{id}</p>
      <div className="mt-6 max-w-2xl rounded-lg border border-border bg-background p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select
                className={selectClass}
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Price</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Stock</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Image</label>
              <ImageUpload bucket="product-images" value={imageUrl} onUploaded={setImageUrl} />
            </div>
            <div className="flex items-center gap-2 sm:pt-6">
              <input
                type="checkbox"
                id="limited"
                checked={limited}
                onChange={(e) => setLimited(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="limited" className="text-sm font-medium">
                Limited Edition
              </label>
            </div>
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          )}
          <button
            type="submit"
            className="rounded-md bg-primary px-6 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
