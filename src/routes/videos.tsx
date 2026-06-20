import { createFileRoute, Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useState } from "react";
import { VIDEOS, VIDEO_CATS, ensureVideosLoaded } from "@/data/fighters";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/VideoPlayer";

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

function hashHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function VideosPage() {
  const { videos } = Route.useLoaderData();
  const featured = videos[0];
  const [playing, setPlaying] = useState<{ src: string; title: string } | null>(null);

  const closePlayer = () => setPlaying(null);

  if (!featured) {
    return (
      <>
        <section className="bg-surface text-foreground">
          <div className="container-x py-14">
            <p className="eyebrow">
              <span className="h-px w-7 bg-foreground" />
              Videos
            </p>
            <h1 className="mt-2 font-display text-6xl uppercase md:text-7xl">No videos yet</h1>
            <p className="mt-3 text-muted-foreground">Fight highlights and knockouts coming soon.</p>
          </div>
        </section>
      </>
    );
  }
  return (
    <>
      <VideoPlayer
        src={playing?.src ?? ""}
        title={playing?.title ?? ""}
        open={!!playing}
        onClose={closePlayer}
      />
      <section
        className="relative isolate overflow-hidden text-white"
        style={{ backgroundColor: `oklch(0.35 ${0.12 + (hashHue(featured.id) % 30) / 100} ${hashHue(featured.id)})` }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="container-x relative grid items-center gap-8 py-14 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow">
              <span className="h-px w-7 bg-white/70" />
              Watch Now
            </p>
            <h1 className="mt-2 font-display text-5xl uppercase md:text-7xl">{featured.title}</h1>
            <p className="mt-3 text-white/70">
              {featured.category} &bull; {featured.views} views
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {featured.video_url ? (
                <button
                  onClick={() => setPlaying({ src: featured.video_url!, title: featured.title })}
                  className="inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-primary-dark"
                >
                  <Play className="h-4 w-4 fill-current" /> Play Now
                </button>
              ) : (
                <button
                  onClick={() =>
                    document
                      .getElementById("videos-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-primary-dark"
                >
                  <Play className="h-4 w-4 fill-current" /> Browse Videos
                </button>
              )}
              <Link
                to="/videos/$id"
                params={{ id: featured.id }}
                className="inline-flex items-center gap-2 border border-white/30 px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-white/10"
              >
                Details
              </Link>
            </div>
          </div>
          <div
            className="relative aspect-video w-full overflow-hidden border border-white/20 cursor-pointer"
            onClick={() =>
              featured.video_url && setPlaying({ src: featured.video_url, title: featured.title })
            }
          >
            {featured.thumbnail ? (
              <img
                src={featured.thumbnail}
                alt={featured.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <div className="grid h-20 w-20 place-items-center rounded-full bg-primary">
                  <Play className="h-8 w-8 fill-current text-primary-foreground" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="videos-section" className="container-x py-12">
        {VIDEO_CATS.map((c) => (
          <VideoRow key={c} category={c} videos={videos} onPlay={setPlaying} />
        ))}
      </section>
    </>
  );
}

function VideoRow({
  category,
  videos,
  onPlay,
}: {
  category: (typeof VIDEO_CATS)[number];
  videos: typeof VIDEOS;
  onPlay: (v: { src: string; title: string } | null) => void;
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
          <VideoCard key={v.id} v={v} onPlay={onPlay} />
        ))}
      </div>
    </div>
  );
}

function VideoCard({
  v,
  onPlay,
}: {
  v: (typeof VIDEOS)[number];
  onPlay: (v: { src: string; title: string } | null) => void;
}) {
  return (
    <div className="group w-72 shrink-0">
      <div
        className="relative aspect-video overflow-hidden border border-border bg-foreground/10 cursor-pointer"
        onClick={() => v.video_url && onPlay({ src: v.video_url, title: v.title })}
      >
        {v.thumbnail ? (
          <>
            <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 grid place-items-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary transition-transform group-hover:scale-110">
                <Play className="h-6 w-6 fill-current text-primary-foreground" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 opacity-90 transition-opacity group-hover:opacity-100">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:animate-pulse bg-primary/20" />
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary transition-transform group-hover:scale-110">
                <Play className="h-6 w-6 fill-current text-primary-foreground" />
              </div>
            </div>
          </>
        )}
        <span className="absolute left-2 top-2 bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
          {v.category}
        </span>
      </div>
      <Link
        to="/videos/$id"
        params={{ id: v.id }}
        className="mt-2 block text-sm font-semibold hover:text-primary"
      >
        {v.title}
      </Link>
      <p className="text-xs text-muted-foreground">{v.views} views</p>
    </div>
  );
}

function VideosSkeleton() {
  return (
    <>
      <section className="bg-surface text-foreground">
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
