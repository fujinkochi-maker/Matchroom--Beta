import { createFileRoute } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { VIDEOS, VIDEO_CATS, ensureVideosLoaded } from "@/data/fighters";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/videos")({
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: VideosSkeleton,
  loader: async () => {
    await ensureVideosLoaded();
    return { videos: VIDEOS };
  },
  head: () => ({
    meta: [
      { title: "Videos — Matchroom Boxing Beta" },
      {
        name: "description",
        content:
          "Highlights, knockouts, full fights, training, faceoffs and press conferences from Boxing Beta.",
      },
      { property: "og:title", content: "Videos — Matchroom Boxing Beta" },
      { property: "og:description", content: "Watch highlights, knockouts, full fights and more." },
    ],
  }),
  component: VideosPage,
});

function VideosPage() {
  const { videos } = Route.useLoaderData();
  const featured = videos[0];
  if (!featured) {
    return (
      <>
        <section className="bg-foreground text-background">
          <div className="container-x py-14">
            <p className="eyebrow text-primary">
              <span className="h-px w-7 bg-primary" />
              Videos
            </p>
            <h1 className="mt-2 font-display text-6xl uppercase md:text-7xl">No videos yet</h1>
            <p className="mt-3 text-background/70">Fight highlights and knockouts coming soon.</p>
          </div>
        </section>
      </>
    );
  }
  return (
    <>
      <section className="relative isolate bg-foreground/10 text-background">
        <div className="container-x grid items-center gap-8 py-14 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow text-primary">
              <span className="h-px w-7 bg-primary" />
              Watch Now
            </p>
            <h1 className="mt-2 font-display text-5xl uppercase md:text-7xl">{featured.title}</h1>
            <p className="mt-3 text-background/70">
              {featured.category} • {featured.duration} • {featured.views} views
            </p>
            <button
              onClick={() => document.getElementById("videos-section")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-6 inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-primary-dark">
              <Play className="h-4 w-4 fill-current" /> Play Feature
            </button>
          </div>
          <div className="relative aspect-video w-full overflow-hidden border border-background/20">
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-primary">
                <Play className="h-8 w-8 fill-current text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="videos-section" className="container-x py-12">
        {VIDEO_CATS.map((c) => (
          <VideoRow key={c} category={c} videos={videos} />
        ))}
      </section>
    </>
  );
}

function VideoRow({
  category,
  videos,
}: {
  category: (typeof VIDEO_CATS)[number];
  videos: typeof VIDEOS;
}) {
  const vids = videos.filter((v) => v.category === category);
  if (vids.length === 0) return null;
  return (
    <div className="mb-10">
      <h2 className="mb-4 font-display text-2xl uppercase">
        <span className="red-bar" />
        {category}
      </h2>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {vids.map((v) => (
          <VideoCard key={v.id} v={v} />
        ))}
      </div>
    </div>
  );
}

function VideoCard({ v }: { v: (typeof VIDEOS)[number] }) {
  return (
    <div className="group w-72 shrink-0">
      <div className="relative aspect-video overflow-hidden border border-border bg-foreground/10">
        <div className="absolute inset-0 opacity-90 transition-opacity group-hover:opacity-100">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:animate-pulse bg-primary/20" />
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary transition-transform group-hover:scale-110">
            <Play className="h-6 w-6 fill-current text-primary-foreground" />
          </div>
        </div>
        <span className="absolute bottom-2 right-2 bg-foreground/80 px-1.5 py-0.5 font-mono text-xs text-background">
          {v.duration}
        </span>
        <span className="absolute left-2 top-2 bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
          {v.category}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold group-hover:text-primary">{v.title}</p>
      <p className="text-xs text-muted-foreground">{v.views} views</p>
    </div>
  );
}

function VideosSkeleton() {
  return (
    <>
      <section className="bg-foreground/10 text-background">
        <div className="container-x py-14">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-12 w-72" />
          <Skeleton className="mt-3 h-4 w-48" />
          <Skeleton className="mt-6 h-12 w-40" />
        </div>
      </section>
      <section className="container-x py-12">
        {[1, 2, 3].map((c) => (
          <div key={c} className="mb-10">
            <Skeleton className="h-6 w-32" />
            <div className="mt-4 flex gap-4">
              {[1, 2, 3].map((v) => (
                <div key={v} className="w-72 shrink-0">
                  <Skeleton className="aspect-video w-full rounded-none" />
                  <Skeleton className="mt-2 h-4 w-3/4" />
                  <Skeleton className="mt-1 h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
