import { createFileRoute, Link } from "@tanstack/react-router";
import { Newspaper } from "lucide-react";
import { useState } from "react";
import {
  CATEGORIES,
  ARTICLES,
  featuredArticle,
  ensureArticlesLoaded,
  ensureFightersLoaded,
} from "@/data/fighters";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/news/")({
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: NewsSkeleton,
  loader: async () => {
    await Promise.all([ensureArticlesLoaded(), ensureFightersLoaded()]);
    return { articles: ARTICLES, featured: featuredArticle() };
  },
  head: () => ({
    meta: [
      { title: "News — Matchroom Boxing Beta" },
      {
        name: "description",
        content:
          "Breaking news, fight results, rankings updates and interviews from the Matchroom Boxing Beta newsroom.",
      },
      { property: "og:title", content: "News — Matchroom Boxing Beta" },
      {
        property: "og:description",
        content: "The latest from the Matchroom Boxing Beta newsroom.",
      },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const { articles, featured: feat } = Route.useLoaderData();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const rest = feat
    ? articles
        .filter((a) => a.slug !== feat.slug)
        .filter((a) => cat === "All" || a.category === cat)
    : [];

  return (
    <>
      <section className="bg-foreground text-background">
        <div className="container-x py-14">
          <p className="eyebrow text-primary">
            <span className="h-px w-7 bg-primary" />
            Newsroom
          </p>
          <h1 className="mt-2 font-display text-6xl uppercase md:text-7xl">News</h1>
        </div>
      </section>

      <section className="container-x py-12">
        {!feat && rest.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">No news yet. Check back for the latest fight announcements and results.</p>
        ) : (
          <>
            {feat && (
              <Link
                to="/news/$slug"
                params={{ slug: feat.slug }}
                className="group grid overflow-hidden border border-border bg-card md:grid-cols-[1.4fr_1fr]"
              >
                <div
                  className="aspect-[16/10] bg-foreground/10 md:aspect-auto"
                  style={
                    feat.image
                      ? {
                          backgroundImage: `url(${feat.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                />
                <div className="p-6 md:p-10">
                  <span className="inline-block bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Featured • {feat.category}
                  </span>
                  <h2 className="mt-3 font-display text-3xl uppercase leading-tight group-hover:text-primary md:text-5xl">
                    {feat.title}
                  </h2>
                  <p className="mt-3 text-muted-foreground">{feat.excerpt}</p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {new Date(feat.date).toLocaleDateString()} • {feat.author}
                  </p>
                </div>
              </Link>
            )}

            {(feat || rest.length > 0) && (
              <div className="mt-10 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
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
            )}

            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => (
                <Link
                  key={a.slug}
                  to="/news/$slug"
                  params={{ slug: a.slug }}
                  className="group flex flex-col border border-border bg-card"
                >
                  <div
                    className="relative aspect-[16/10] bg-foreground/10"
                    style={
                      a.image
                        ? {
                            backgroundImage: `url(${a.image})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    <Newspaper className="absolute right-3 top-3 h-5 w-5 text-background/40" />
                    <span className="absolute bottom-3 left-3 bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      {a.category}
                    </span>
                  </div>
                  <div className="flex-1 p-5">
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.date).toLocaleDateString()}
                    </p>
                    <h3 className="mt-2 font-display text-lg uppercase leading-tight group-hover:text-primary">
                      {a.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

function NewsSkeleton() {
  return (
    <>
      <section className="bg-foreground text-background">
        <div className="container-x py-14">
          <Skeleton className="h-3 w-24 bg-background/20" />
          <Skeleton className="mt-3 h-14 w-40 bg-background/20" />
        </div>
      </section>
      <section className="container-x py-12">
        <div className="grid overflow-hidden border border-border bg-card md:grid-cols-[1.4fr_1fr]">
          <Skeleton className="aspect-[16/10] w-full rounded-none md:aspect-auto" />
          <div className="p-6 md:p-10">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-12 w-full" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-4 h-3 w-48" />
          </div>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col border border-border bg-card">
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="flex-1 p-5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="mt-2 h-6 w-full" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-1 h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
