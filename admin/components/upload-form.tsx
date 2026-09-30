"use client";

import { Upload } from "lucide-react";
import { startTransition, useActionState, useState } from "react";

import { uploadMedia, type UploadState } from "@/app/(panel)/media/actions";
import { Button, Field, Notice, inputClass } from "@/components/ui";

/**
 * Vercel rejects any request body over 4.5 MB before it reaches the app, so
 * photos are shrunk in the browser first (D-36): at most 2400 px wide, which
 * is also the largest size the site serves. The server still decodes and
 * re-encodes every upload, so this is a size step, not a security control.
 */
const MAX_SEND_BYTES = 4 * 1024 * 1024;
const MAX_WIDTH = 2400;

async function shrink(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // The browser cannot decode it (e.g. HEIC outside Safari): send as is if it fits.
    return file;
  }
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  if (scale === 1 && file.size <= MAX_SEND_BYTES) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // Keep transparency for PNG and WebP; photos go as JPEG.
  const type = file.type === "image/png" || file.type === "image/webp" ? "image/webp" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + (type === "image/webp" ? ".webp" : ".jpg");
  return new File([blob], name, { type });
}

export function UploadForm() {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadMedia, {});
  const [preparing, setPreparing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(form: FormData) {
    setLocalError(null);
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      setPreparing(true);
      const ready = await shrink(file);
      setPreparing(false);
      if (ready.size > MAX_SEND_BYTES) {
        setLocalError("That image is too large to upload. Export it as a JPEG under 4 MB and try again.");
        return;
      }
      form.set("file", ready);
    }
    startTransition(() => action(form));
  }

  const busy = pending || preparing;
  const error = localError ?? state.error;
  return (
    <form action={submit} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
      <div className="md:col-span-4">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {state.uploaded && !localError ? (
          <Notice tone="success">
            Uploaded. Use <code className="rounded bg-white px-1 font-mono">{state.uploaded}</code> in any photo field, or pick it from the library there.
          </Notice>
        ) : null}
      </div>
      <Field label="Image" htmlFor="file" hint="JPEG, PNG, WebP, AVIF or HEIC. Large photos are resized before upload.">
        <input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-jungle-50 file:px-3 file:py-2 file:font-semibold file:text-jungle-800" />
      </Field>
      <Field label="Alt text" htmlFor="alt" hint="What the photo shows. Pre-fills the photo field.">
        <input id="alt" name="alt" className={inputClass} />
      </Field>
      <Field label="Credit" htmlFor="credit" hint="Photographer and licence, if not yours.">
        <input id="credit" name="credit" className={inputClass} />
      </Field>
      <Button type="submit" disabled={busy}>
        <Upload size={16} aria-hidden /> {preparing ? "Preparing…" : pending ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}
