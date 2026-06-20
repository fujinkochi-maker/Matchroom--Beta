import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Play, Users } from "lucide-react";
import { useState } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";
import {
  ensureVideosLoaded,
  ensureFightersLoaded,
  VIDEOS,
  getVideoById,
  getByUsername,
} from "@/data/fighters";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/videos/$id")({
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: VideoDetailSkeleton,
  loader: async ({ params }) => {
    await Promise.all([ensureVideosLoaded(), ensureFightersLoaded()]);
    const video = getVideoById(params.id);
    if (!video) throw notFound();
    const videoFighters = video.fighters.map((u) => getByUsername(u)).filter(Boolean);
    return { video, videoFighters };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData.video.title} — Matchroom Boxing Beta` }],
  }),
  component: VideoDetailPage,
});

function VideoDetailPage() {
  const { video, videoFighters } = Route.useLoaderData();
  const [playing, setPlaying] = useState(false);

  return (
    <>
      <VideoPlayer
        src={playing ? (video.video_url ?? "") : ""}
        title={video.title}
        open={playing}
        onClose={() => setPlaying(false)}
      />

      <section className="bg-foreground text-background">
        <div className="container-x py-6">
          <Link
            to="/videos"
            className="inline-flex items-center gap-1 text-sm text-background/60 hover:text-background"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Videos
          </Link>
        </div>
      </section>

      <section className="bg-foreground/10 text-background">
        <div className="container-x pb-10 pt-4">
          <div
            className="relative aspect-video w-full overflow-hidden border border-background/20 cursor-pointer"
            onClick={() => video.video_url && setPlaying(true)}
          >
            {video.thumbnail ? (
              <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-foreground/5">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-primary">
                  <Play className="h-10 w-10 fill-current text-primary-foreground" />
                </div>
              </div>
            )}
            {video.video_url && (
              <div className="absolute inset-0 bg-black/20 grid place-items-center opacity-0 hover:opacity-100 transition-opacity">
                <div className="grid h-20 w-20 place-items-center rounded-full bg-primary">
                  <Play className="h-8 w-8 fill-current text-primary-foreground" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container-x py-8">
        <div className="max-w-3xl">
          <span className="inline-block bg-primary px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary-foreground">
            {video.category}
          </span>
          <h1 className="mt-3 font-display text-3xl uppercase md:text-5xl">{video.title}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>&#128065; {video.views} views</span>
          </div>
        </div>

        {videoFighters.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl uppercase">
              <Users className="h-5 w-5" /> Fighters
            </h2>
            <div className="flex flex-wrap gap-4">
              {videoFighters.map((f: any) => (
                <Link
                  key={f.username}
                  to="/boxers/$username"
                  params={{ username: f.username }}
                  className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
                >
                  <div className="h-8 w-8 overflow-hidden rounded-full bg-muted">
                    {f.image ? (
                      <img
                        src={f.image}
                        alt={f.displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-primary/20 text-xs font-bold text-primary">
                        {f.displayName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{f.displayName}</p>
                    <p className="text-xs text-muted-foreground">{f.division}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function VideoDetailSkeleton() {
  return (
    <>
      <section className="bg-foreground text-background">
        <div className="container-x py-6">
          <Skeleton className="h-4 w-32" />
        </div>
      </section>
      <section className="bg-foreground/10 text-background">
        <div className="container-x pb-10 pt-4">
          <Skeleton className="aspect-video w-full" />
        </div>
      </section>
      <section className="container-x py-8">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-3 h-10 w-3/4" />
        <Skeleton className="mt-2 h-4 w-48" />
      </section>
    </>
  );
}
