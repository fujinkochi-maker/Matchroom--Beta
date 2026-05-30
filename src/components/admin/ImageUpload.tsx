import { useState, useRef } from "react";
import { Upload, X, ImageIcon } from "lucide-react";

interface ImageUploadProps {
  bucket?: string;
  folder?: string;
  onUploaded: (url: string) => void;
  value?: string;
  accept?: string;
}

export function ImageUpload({
  bucket = "fighter-images",
  folder = "public",
  onUploaded,
  value,
  accept = "image/*",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      const { getSupabase } = await import("@/lib/supabase");
      const supabase = getSupabase();
      const ext = file.name.split(".").pop();
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data, error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(urlData.publicUrl);
    } catch (err) {
      setError((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm hover:bg-accent disabled:opacity-50"
        >
          {uploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading..." : "Upload Image"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFile}
          className="hidden"
        />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {value && (
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
            {value.startsWith("http") ? (
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <span className="truncate text-xs text-muted-foreground">{value}</span>
          <button
            type="button"
            onClick={() => onUploaded("")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
