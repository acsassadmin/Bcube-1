import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
/**
 * Bucket holding customer artwork uploaded in the product configurator.
 * Private bucket: files are read back through long-lived signed URLs.
 */
export const PRODUCT_UPLOADS_BUCKET = "product-uploads";

/** Signed URL lifetime (1 year) — long enough for cart + order fulfilment. */
const SIGNED_URL_TTL = 60 * 60 * 24 * 365;

export type UploadedPhoto = {
  /** Storage path inside the bucket (persist this with the order). */
  path: string;
  /** Signed URL used to render the artwork in the preview. */
  url: string;
};

function safeExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return file.type === "image/png" ? "png" : "jpg";
}

/** Uploads customer artwork to Supabase Storage and returns a readable URL. */
export async function uploadProductPhoto(file: File, slug: string): Promise<UploadedPhoto> {
  const { data: auth } = await supabase.auth.getUser();
  const uuid = uuidv4();
  const owner = auth.user?.id ?? "guest";
  const path = `${owner}/${slug}/${uuid}.${safeExtension(file)}`;

  const { error } = await supabase.storage
    .from(PRODUCT_UPLOADS_BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from(PRODUCT_UPLOADS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !data?.signedUrl) throw signError ?? new Error("Could not read uploaded file");

  return { path, url: data.signedUrl };
}

/** Re-signs a stored path (e.g. when an old signed URL has expired). */
export async function signProductPhoto(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from(PRODUCT_UPLOADS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}
