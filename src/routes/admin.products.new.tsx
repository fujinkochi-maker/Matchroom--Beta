/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { createProduct } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
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

export const Route = createFileRoute("/admin/products/new")({
  component: NewProduct,
});

function NewProduct() {
  const router = useRouter();

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [price, setPrice] = useState(0);
  const [limited, setLimited] = useState(false);
  const [stock, setStock] = useState(50);
  const [imageUrl, setImageUrl] = useState("");
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
      await createProduct({
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
      toast.success("Product created");
      router.navigate({ to: "/admin/products" });
    } catch (err) {
      setError(err?.message ?? "Failed to create product");
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl uppercase tracking-wider">New Product</h1>
      <div className="mt-6 max-w-2xl rounded-lg border border-border bg-background p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">ID</label>
              <input
                className={inputClass}
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />
            </div>
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
                onChange={(e) => setCategory(e.target.value)}
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
            Create Product
          </button>
        </form>
      </div>
    </div>
  );
}
