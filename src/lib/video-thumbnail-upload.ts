export async function autoGenerateThumbnail(
  videoUrl: string,
  folder: string,
): Promise<string | null> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  try {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadedmetadata", () => {
        const seekTime = Math.min(2, Math.max(1, video.duration * 0.25));
        video.currentTime = seekTime;
      });
      video.addEventListener("seeked", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("Video load failed")), { once: true });
      video.load();
      setTimeout(() => reject(new Error("Video load timeout")), 30000);
    });

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8),
    );
    if (!blob) return null;

    const { getSupabase } = await import("@/lib/supabase");
    const supabase = getSupabase();
    const ts = Date.now();
    const storagePath = folder + "/thumb_" + ts + ".jpg";
    const { error: uploadErr } = await supabase.storage.from("videos").upload(storagePath, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/jpeg",
    });
    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from("videos").getPublicUrl(storagePath);
    return urlData.publicUrl;
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}
