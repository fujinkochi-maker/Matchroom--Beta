import { createFileRoute, useRouter, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { updateProduct } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ensureProductsLoaded, PRODUCTS } from "@/data/fighters";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  ADMIN_INPUT,
  ADMIN_HEADING,
  ADMIN_SUBTITLE,
  ADMIN_LABEL,
  ADMIN_BTN_PRIMARY,
  ADMIN_ERROR,
  adminCard,
} from "@/lib/admin-styles";
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
    await ensureProductsLoaded();
  },
  component: EditProduct,
});
function EditProduct() {
  const { id } = Route.useParams();
  const router = useRouter();
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) throw notFound();
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(product.category);
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
        data: { token, id, name, category, price, limited, stock, imageUrl: imageUrl || undefined },
      });
      router.navigate({ to: "/admin/products" });
    } catch (err) {
      setError(err?.message ?? "Failed to update product");
    }
  };
  return (
    <div>
      {" "}
      <h1 className={ADMIN_HEADING}>Edit Product</h1> <p className={ADMIN_SUBTITLE}>{id}</p>{" "}
      <div className={adminCard("2xl")}>
        {" "}
        <form onSubmit={handleSubmit} className="space-y-6">
          {" "}
          <div className="grid gap-4 sm:grid-cols-2">
            {" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Name</label>{" "}
              <input
                className={ADMIN_INPUT}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Category</label>{" "}
              <select
                className={ADMIN_INPUT}
                value={category}
                onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
                required
              >
                {" "}
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {" "}
                    {c}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Price</label>{" "}
              <input
                type="number"
                min={0}
                className={ADMIN_INPUT}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Stock</label>{" "}
              <input
                type="number"
                min={0}
                className={ADMIN_INPUT}
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                required
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>Image</label>{" "}
              <ImageUpload bucket="product-images" value={imageUrl} onUploaded={setImageUrl} />{" "}
            </div>{" "}
            <div className="flex items-center gap-2 sm:pt-6">
              {" "}
              <input
                type="checkbox"
                id="limited"
                checked={limited}
                onChange={(e) => setLimited(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />{" "}
              <label htmlFor="limited" className="text-sm font-medium">
                {" "}
                Limited Edition{" "}
              </label>{" "}
            </div>{" "}
          </div>{" "}
          {error && <p className={ADMIN_ERROR}>{error}</p>}{" "}
          <button type="submit" className={ADMIN_BTN_PRIMARY}>
            {" "}
            Save Changes{" "}
          </button>{" "}
        </form>{" "}
      </div>{" "}
    </div>
  );
}
