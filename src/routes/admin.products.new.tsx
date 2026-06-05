import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { createProduct } from "@/lib/admin.server";
import { getAdminToken } from "@/lib/admin-auth";
import { ArrowLeft } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  ADMIN_INPUT,
  ADMIN_HEADING,
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
export const Route = createFileRoute("/admin/products/new")({ component: NewProduct });
function NewProduct() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);
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
        data: { token, id, name, category, price, limited, stock, imageUrl: imageUrl || undefined },
      });
      toast.success("Product created");
      router.navigate({ to: "/admin/products" });
    } catch (err) {
      setError(err?.message ?? "Failed to create product");
    }
  };
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin/products" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className={ADMIN_HEADING}>New Product</h1>
      </div>
      <div className={adminCard("2xl")}>
        {" "}
        <form onSubmit={handleSubmit} className="space-y-6">
          {" "}
          <div className="grid gap-4 sm:grid-cols-2">
            {" "}
            <div>
              {" "}
              <label className={ADMIN_LABEL}>ID</label>{" "}
              <input
                className={ADMIN_INPUT}
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />{" "}
            </div>{" "}
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
                onChange={(e) => setCategory(e.target.value)}
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
            Create Product{" "}
          </button>{" "}
        </form>{" "}
      </div>{" "}
    </div>
  );
}
