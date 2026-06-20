import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  title: string;
  open: boolean;
  onClose: () => void;
}

export function VideoPlayer({ src, title, open, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) {
      videoRef.current?.pause();
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl overflow-hidden rounded-lg bg-black shadow-2xl">
        <div className="flex items-center justify-between bg-foreground/10 px-4 py-3">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <video
          ref={videoRef}
          src={src}
          controls
          autoPlay
          className="w-full aspect-video"
          playsInline
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}
