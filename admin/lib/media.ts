import "server-only";

import sharp, { type Metadata } from "sharp";

/**
 * Upload processing (D-36). Every image is decoded and re-encoded, never
 * stored as uploaded:
 * - the real format is read from the file's content, not its name or the
 *   browser's claim, and only photographs (JPEG, PNG, WebP, AVIF, HEIC) are accepted;
 * - it is rotated upright and resized to at most 2400 px wide, the size the
 *   site's largest images are served from;
 * - all metadata is dropped, including EXIF GPS location and camera serials;
 * - photos become JPEG (quality 82); images with transparency become WebP.
 */
/** Vercel refuses request bodies over 4.5 MB; the browser shrinks photos below this first. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_WIDTH = 2400;
const ACCEPTED = new Set(["jpeg", "png", "webp", "avif", "heif"]);

export interface ProcessedImage {
  readonly bytes: Buffer;
  readonly ext: "jpg" | "webp";
  readonly mime: "image/jpeg" | "image/webp";
  readonly width: number;
  readonly height: number;
}

export class UploadError extends Error {}

export async function processUpload(file: File): Promise<ProcessedImage> {
  if (file.size === 0) throw new UploadError("Choose an image to upload.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("That image is over 4 MB. Export a smaller JPEG and try again.");
  const input = Buffer.from(await file.arrayBuffer());

  let meta: Metadata;
  try {
    // limitInputPixels guards against decompression bombs.
    meta = await sharp(input, { limitInputPixels: 100_000_000 }).metadata();
  } catch {
    throw new UploadError("That file is not an image we can read.");
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) throw new UploadError("Upload a JPEG, PNG, WebP, AVIF or HEIC photo.");

  const pipeline = sharp(input, { limitInputPixels: 100_000_000 })
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true });
  const transparent = meta.hasAlpha === true;
  const { data, info } = transparent
    ? await pipeline.webp({ quality: 85 }).toBuffer({ resolveWithObject: true })
    : await pipeline.jpeg({ quality: 82, mozjpeg: true, progressive: true }).toBuffer({ resolveWithObject: true });

  return {
    bytes: data,
    ext: transparent ? "webp" : "jpg",
    mime: transparent ? "image/webp" : "image/jpeg",
    width: info.width,
    height: info.height,
  };
}

/** A safe display name from whatever the browser sent. */
export function cleanFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[^\w\- ]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "image";
}
