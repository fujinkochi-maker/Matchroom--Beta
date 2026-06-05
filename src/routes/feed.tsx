import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Heart, Trash2, ImageIcon, Loader2 } from "lucide-react";
import {
  ensureFightersLoaded,
  ensurePostsLoaded,
  loadMorePosts,
  hasMorePosts,
  clearPostCache,
  POSTS,
  FIGHTERS,
} from "@/data/fighters";
import { getFighterSession, clearFighterSession, isFighterLoggedIn } from "@/lib/discord-auth";
import { createPost, deletePost, likePost, unlikePost } from "@/lib/admin.server";
import { toast, Toaster } from "sonner";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { FighterAvatar } from "@/components/FighterAvatar";
import type { Post } from "@/data/types";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/feed")({
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: FeedSkeleton,
  loader: async () => {
    await Promise.all([ensureFightersLoaded(), ensurePostsLoaded()]);
    return { posts: POSTS, fighters: FIGHTERS };
  },
  component: FeedPage,
});

function FeedPage() {
  const router = useRouter();
  const session = getFighterSession();
  const loggedIn = isFighterLoggedIn();
  const { posts, fighters } = Route.useLoaderData();
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Auto-refresh on tab focus
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        router.invalidate();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [router]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePosts() && !loadingMore) {
          setLoadingMore(true);
          loadMorePosts()
            .then(() => router.invalidate())
            .finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [router, loadingMore]);

  return (
    <>
      <Toaster />
      {!loggedIn ? (
        <div className="container-x py-12">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl uppercase">
              <span className="red-bar" />
              The Ring Feed
            </h1>
            <p className="mt-3 text-muted-foreground">
              Latest updates, news, and chatter from the Boxing Beta community.
            </p>
            <Link
              to="/auth/login"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90"
            >
              Login with Discord
            </Link>
            <div className="mt-12 space-y-4 text-left">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} fighters={fighters} />
              ))}
              {posts.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">No posts yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="container-x py-12">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-3xl uppercase">
                <span className="red-bar" />
                The Ring Feed
              </h1>
              <button
                onClick={() => {
                  clearFighterSession();
                  router.invalidate();
                }}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Logout
              </button>
            </div>

            <PostComposer session={session!} router={router} fighters={fighters} />

            <div className="mt-8 space-y-4">
              {[...posts]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    session={session}
                    router={router}
                    fighters={fighters}
                  />
                ))}
              {posts.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  No posts yet. Be the first!
                </p>
              )}
              <div ref={sentinelRef} className="flex justify-center py-6">
                {loadingMore ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : !hasMorePosts() && posts.length > 0 ? (
                  <span className="text-xs text-muted-foreground">You've seen it all</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PostComposer({
  session,
  router,
  fighters,
}: {
  session: { token: string; username: string; displayName: string; image?: string };
  router: ReturnType<typeof useRouter>;
  fighters: typeof FIGHTERS;
}) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);

  const filteredTagSuggestions =
    tagInput.length > 0
      ? fighters
          .filter(
            (f) =>
              f.displayName.toLowerCase().includes(tagInput.toLowerCase()) &&
              !tags.includes(f.username),
          )
          .slice(0, 5)
      : [];

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await createPost({
        data: {
          token: session.token,
          content: content.trim(),
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
          tags,
        },
      });
      setContent("");
      setImageUrl("");
      setVideoUrl("");
      setTags([]);
      setExpanded(false);
      clearPostCache();
      await router.invalidate();
      toast.success("Posted!");
    } catch (err) {
      toast.error((err as Error).message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const handleCancel = () => {
    setExpanded(false);
    setContent("");
    setImageUrl("");
    setVideoUrl("");
    setTags([]);
    setShowImageUpload(false);
    setShowVideoInput(false);
  };

  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        className="mt-6 flex cursor-text items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
      >
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
          <FighterAvatar name={session.displayName} src={session.image} square />
        </div>
        <span className="text-sm text-muted-foreground">What's on your mind?</span>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
          <FighterAvatar name={session.displayName} src={session.image} />
        </div>
        <div className="flex-1 space-y-3">
          <textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full resize-none border-0 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            maxLength={2000}
            autoFocus
          />

          {showImageUpload && (
            <div>
              <ImageUpload bucket="post-images" value={imageUrl} onUploaded={setImageUrl} />
            </div>
          )}

          {showVideoInput && (
            <input
              placeholder="Video URL (YouTube, etc.)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            />
          )}

          {/* Tag input */}
          <div className="relative">
            <input
              placeholder="Tag fighters — type a name..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            />
            {filteredTagSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
                {filteredTagSuggestions.map((f) => (
                  <button
                    key={f.username}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setTags((prev) => [...prev, f.username]);
                      setTagInput("");
                    }}
                  >
                    <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
                      <FighterAvatar name={f.displayName} src={f.image} square />
                    </div>
                    {f.displayName} (@{f.username})
                  </button>
                ))}
              </div>
            )}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => {
                const fighter = fighters.find((f) => f.username === t);
                return (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    @{fighter?.displayName ?? t}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((u) => u !== t))}
                      className="ml-0.5 text-primary/60 hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowImageUpload(!showImageUpload);
                  setShowVideoInput(false);
                }}
                className={`rounded-md px-2 py-1 text-xs font-medium ${showImageUpload ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
              >
                <ImageIcon className="mr-1 inline h-3.5 w-3.5" />
                Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowVideoInput(!showVideoInput);
                  setShowImageUpload(false);
                }}
                className={`rounded-md px-2 py-1 text-xs font-medium ${showVideoInput ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
              >
                Video
              </button>
              <span className="text-xs text-muted-foreground">{content.length}/2000</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handlePost}
                disabled={!content.trim() || posting}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({
  post,
  session,
  router,
  fighters,
}: {
  post: Post;
  session?: { token: string; username: string; displayName: string; image?: string } | null;
  router?: ReturnType<typeof useRouter>;
  fighters: typeof FIGHTERS;
}) {
  const [liked, setLiked] = useState(post.likedByCurrentUser);
  const [likeCount, setLikeCount] = useState(post.likes);

  const handleLike = async () => {
    if (!session?.token) return;
    try {
      if (liked) {
        await unlikePost({ data: { token: session.token, postId: post.id } });
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        await likePost({ data: { token: session.token, postId: post.id } });
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    } catch {
      // best-effort
    }
  };

  const handleDelete = async () => {
    if (!session?.token) return;
    try {
      await deletePost({ data: { token: session.token, postId: post.id } });
      clearPostCache();
      await router?.invalidate();
      toast.success("Post deleted");
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete");
    }
  };

  const canDelete = session?.username === post.authorUsername;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        {post.authorUsername ? (
          <Link
            to="/boxers/$username"
            params={{ username: post.authorUsername }}
            className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted"
          >
            <FighterAvatar name={post.authorDisplayName} src={post.authorImage} square />
          </Link>
        ) : (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
            <FighterAvatar name={post.authorDisplayName} src={post.authorImage} square />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {post.authorUsername ? (
                <Link
                  to="/boxers/$username"
                  params={{ username: post.authorUsername }}
                  className="text-sm font-semibold hover:text-primary"
                >
                  {post.authorDisplayName}
                </Link>
              ) : (
                <span className="text-sm font-semibold">{post.authorDisplayName}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {post.authorType === "admin" ? "Admin" : `@${post.authorUsername}`}
              </span>
              <span className="text-xs text-muted-foreground">{formatTime(post.createdAt)}</span>
            </div>
            {canDelete && (
              <button
                onClick={handleDelete}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <p className="mt-2 whitespace-pre-wrap text-sm">{post.content}</p>

          {post.imageUrl && (
            <div className="mt-3 overflow-hidden rounded-lg border border-border aspect-square">
              <img
                src={post.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {post.videoUrl && (
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <iframe
                src={post.videoUrl.replace("watch?v=", "embed/").split("&")[0]}
                className="aspect-video w-full"
                allowFullScreen
                title="Video"
              />
            </div>
          )}

          {post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {post.tags.map((t) => {
                const fighter = fighters.find((f) => f.username === t);
                return (
                  <Link
                    key={t}
                    to="/boxers/$username"
                    params={{ username: t }}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-primary"
                  >
                    @{fighter?.displayName ?? t}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={!session?.token}
              className={`inline-flex items-center gap-1 text-xs font-medium ${liked ? "text-primary" : "text-muted-foreground"} hover:text-primary disabled:opacity-50`}
            >
              <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
              {likeCount > 0 && likeCount}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function FeedSkeleton() {
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-4 w-full" />
                  <Skeleton className="mt-1 h-4 w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
