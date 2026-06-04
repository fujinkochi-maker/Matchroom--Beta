import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { Fighter } from "@/data/types";
import {
  ARTICLES,
  getArticleBySlug,
  getByUsername,
  ensureArticlesLoaded,
  ensureFightersLoaded,
} from "@/data/fighters";

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ params }) => {
    await Promise.all([ensureArticlesLoaded(), ensureFightersLoaded()]);
    const article = getArticleBySlug(params.slug);
    if (!article) throw notFound();
    const related = ARTICLES.filter((x) => x.slug !== article.slug).slice(0, 4);
    const articleFighters = article.fighters.map((u: string) => getByUsername(u)).filter(Boolean);
    return { article, related, articleFighters, fighters: FIGHTERS };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.article.title} — Matchroom Boxing Beta` },
          { name: "description", content: loaderData.article.excerpt },
          { property: "og:title", content: loaderData.article.title },
          { property: "og:description", content: loaderData.article.excerpt },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="container-x py-24 text-center">
      <h1 className="font-display text-4xl uppercase">Article not found</h1>
      <Link to="/news" className="mt-4 inline-block text-primary">
        ← Back to News
      </Link>
    </div>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { article: a, related, articleFighters } = Route.useLoaderData();
  return (
    <article>
      <header
        className="relative isolate border-b border-border bg-foreground/10 text-background"
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
        <div className="container-x py-16">
          <Link
            to="/news"
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-background/70 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to News
          </Link>
          <p className="mt-4 inline-block bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            {a.category}
          </p>
          <h1 className="mt-3 max-w-4xl font-display text-4xl uppercase leading-tight md:text-6xl">
            {a.title}
          </h1>
          <p className="mt-3 text-sm text-background/70">
            {new Date(a.date).toLocaleDateString()} • {a.author}
          </p>
        </div>
      </header>

      <div className="container-x grid gap-10 py-12 lg:grid-cols-[2fr_1fr]">
        <div className="prose-invert max-w-none">
          <p className="text-lg font-semibold text-foreground">{a.excerpt}</p>
          {a.body.split("\n\n").map((p: string, i: number) => (
            <p key={i} className="mt-5 text-base leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}

          {a.fighters.length > 0 && (
            <div className="mt-10">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Fighters in this story
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {articleFighters.map((f: Fighter) => {
                  if (!f) return null;
                  return (
                    <Link
                      key={f.username}
                      to="/boxers/$username"
                      params={{ username: f.username }}
                      className="group flex items-center gap-3 border border-border bg-card p-2 pr-4 hover:border-primary"
                    >
                      <div className="h-12 w-12 shrink-0">
                        <FighterAvatar name={f.displayName} square src={f.image} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold group-hover:text-primary">
                          {f.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">{f.division}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside>
          <h3 className="font-display text-xl uppercase">
            <span className="red-bar" />
            Related
          </h3>
          <ul className="mt-3 space-y-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  to="/news/$slug"
                  params={{ slug: r.slug }}
                  className="group block border border-border bg-card p-3 hover:border-primary"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {r.category}
                  </p>
                  <p className="mt-1 text-sm font-semibold group-hover:text-primary">{r.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </article>
  );
}
