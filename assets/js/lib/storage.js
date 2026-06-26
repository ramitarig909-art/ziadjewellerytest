/* =====================================================================
 *  storage.js — Supabase Storage helpers with automatic image
 *  compression + thumbnail generation (done in the browser via <canvas>).
 * ===================================================================== */
import { sb, BUCKET_PRODUCTS } from "./supabase.js";

/**
 * Resize + compress an image file to a JPEG/WebP blob.
 * @param {File|Blob} file
 * @param {number} maxSize  longest edge in px
 * @param {number} quality  0..1
 * @returns {Promise<Blob>}
 */
export function compressImage(file, maxSize = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (Math.max(w, h) > maxSize) {
        const r = maxSize / Math.max(w, h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Invalid image")); };
    img.src = url;
  });
}

const rand = () => Math.random().toString(36).slice(2, 9);

/**
 * Upload one image: stores a full-size (compressed) version AND a thumbnail.
 * @returns {Promise<{url:string, thumb_url:string, path:string, thumb_path:string, size:number}>}
 */
export async function uploadImage(file, { bucket = BUCKET_PRODUCTS, folder = "products" } = {}) {
  const base = `${folder}/${Date.now()}-${rand()}`;
  const fullPath = `${base}.jpg`;
  const thumbPath = `${base}-thumb.jpg`;

  // Compress full + thumbnail in parallel
  const [full, thumb] = await Promise.all([
    compressImage(file, 1600, 0.82),
    compressImage(file, 480, 0.7)
  ]);

  const up = async (path, blob) => {
    const { error } = await sb.storage.from(bucket).upload(path, blob, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false
    });
    if (error) throw error;
    return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const [url, thumb_url] = await Promise.all([up(fullPath, full), up(thumbPath, thumb)]);
  return { url, thumb_url, path: fullPath, thumb_path: thumbPath, size: full.size + thumb.size };
}

/** Extract the storage object path from a public URL. */
export function pathFromUrl(url, bucket = BUCKET_PRODUCTS) {
  if (!url) return null;
  const marker = `/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

/** Delete a stored image (and its thumbnail) by public URL. */
export async function deleteByUrl(url, bucket = BUCKET_PRODUCTS) {
  const p = pathFromUrl(url, bucket);
  if (!p) return;
  const paths = [p, p.replace(/\.jpg$/, "-thumb.jpg")];
  await sb.storage.from(bucket).remove(paths);
}

/** Sum the size of every object in a bucket (for the dashboard card). */
export async function bucketUsage(bucket = BUCKET_PRODUCTS) {
  let total = 0, folders = [""];
  // shallow walk: top level + one nested level is enough for our layout
  for (const prefix of folders) {
    const { data } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
    (data || []).forEach((o) => {
      if (o.id) total += o.metadata?.size || 0;
      else folders.push(prefix ? `${prefix}/${o.name}` : o.name);
    });
  }
  return total;
}
