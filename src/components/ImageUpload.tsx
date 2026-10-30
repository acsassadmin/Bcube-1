import { useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

const BUCKET = "site-media";

type ImageUploadProps = {
  initialUrl?: string | null;
  onUploaded?: (url: string) => void;
  showPreview?: boolean;
};

function fileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && /^[a-z0-9]{2,5}$/.test(extension)) return extension;
  return file.type === "image/png" ? "png" : "jpg";
}

export default function ImageUpload({
  initialUrl = null,
  onUploaded,
  showPreview = true,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl);
  const uuid = uuidv4();
  async function upload(file: File) {
    setUploading(true);
    setError(null);

    try {
      const path = `${Date.now()}-${uuid}.${fileExtension(file)}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type,
      });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (!data?.publicUrl) throw new Error("The uploaded image URL could not be created.");

      setImageUrl(data.publicUrl);
      onUploaded?.(data.publicUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(`Upload failed: ${message}`);
    } finally {
      setUploading(false);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    void upload(file);
  }

  return (
    <div className="space-y-3">
      <label
        className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 ${
          uploading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {uploading ? "Uploading…" : "Upload image"}
        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {uploading && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading your image…
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {showPreview && imageUrl && (
        <img
          src={imageUrl}
          alt="Uploaded preview"
          className="block w-full max-w-sm rounded-2xl border border-border bg-muted object-contain"
        />
      )}
    </div>
  );
}
