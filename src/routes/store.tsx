import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag, Sparkles } from "lucide-react";
import { useState } from "react";
import { PRODUCTS, CATS, ensureProductsLoaded } from "@/data/fighters";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/store")({
  loader: async () => {
    await ensureProductsLoaded();
    return { products: PRODUCTS };
  },
  head: () => ({
    meta: [
      { title: "Store — Matchroom Boxing Beta" },
      {
        name: "description",
        content:
          "Official Matchroom Boxing Beta merchandise. Hoodies, gloves, caps, and limited championship collections.",
      },
      { property: "og:title", content: "Matchroom Store — Boxing Beta" },
      {
        property: "og:description",
        content: "Official Boxing Beta merchandise and limited drops.",
      },
    ],
  }),
  component: StorePage,
});

function StorePage() {
  const { products } = Route.useLoaderData();
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const list = products.filter((p) => cat === "All" || p.category === cat);
  const featured =
    products.find((p) => p.category === "Limited Drop" && (p.stock ?? 0) < 10) ?? products[0];

  if (products.length === 0) {
    return (
      <>
        <Toaster position="bottom-right" />
        <section className="bg-foreground text-background">
          <div className="container-x py-14">
            <p className="eyebrow text-primary">
              <span className="h-px w-7 bg-primary" />
              Store
            </p>
            <h1 className="mt-2 font-display text-6xl uppercase md:text-7xl">No products yet</h1>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" />
      <section className="bg-foreground text-background">
        <div className="container-x grid items-center gap-8 py-14 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow text-primary">
              <span className="h-px w-7 bg-primary" />
              Featured Drop
            </p>
            <h1 className="mt-2 font-display text-5xl uppercase md:text-7xl">{featured.name}</h1>
            <p className="mt-2 text-background/70">
              Limited Edition • Only {featured.stock ?? 0} remaining
            </p>
            <p className="mt-3 text-3xl font-bold">${featured.price}</p>
            <button
              onClick={() => toast.success(`${featured.name} added to cart`)}
              className="mt-5 inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-primary-dark"
            >
              <ShoppingBag className="h-4 w-4" /> Add to Cart
            </button>
          </div>
          <div
            className="aspect-square w-full max-w-md justify-self-center border border-background/20 bg-foreground/10"
            style={
              featured.image
                ? {
                    backgroundImage: `url(${featured.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          />
        </div>
      </section>

      <section className="container-x py-12">
        <div className="mb-8 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                cat === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary hover:text-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col border border-border bg-card transition-shadow hover:shadow-card"
            >
              <div
                className="relative aspect-square bg-foreground/10"
                style={
                  p.image
                    ? {
                        backgroundImage: `url(${p.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                {p.limited && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    <Sparkles className="h-3 w-3" /> Limited
                  </span>
                )}
                {p.limited && (p.stock ?? 0) < 15 && (
                  <span className="absolute right-2 top-2 bg-foreground/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-background">
                    Only {p.stock} left
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {p.category}
                </p>
                <p className="mt-1 font-semibold leading-tight">{p.name}</p>
                <p className="mt-2 font-display text-xl">${p.price}</p>
                <button
                  onClick={() => toast.success(`${p.name} added to cart`)}
                  className="mt-3 inline-flex items-center justify-center gap-2 border border-foreground bg-background px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
