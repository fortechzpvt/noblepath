"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { UploadError, cleanFileName, processUpload } from "@/lib/media";

export interface UploadState {
  readonly error?: string;
  readonly uploaded?: string;
}

export async function uploadMedia(_previous: UploadState, form: FormData): Promise<UploadState> {
  const user = await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File)) return { error: "Choose an image to upload." };
  const alt = String(form.get("alt") ?? "").trim().slice(0, 300);
  const credit = String(form.get("credit") ?? "").trim().slice(0, 200) || null;

  try {
    const image = await processUpload(file);
    const { rows } = await db().query<{ id: string }>(
      `insert into media (file_name, ext, mime, width, height, byte_size, bytes, alt, credit, uploaded_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
      [cleanFileName(file.name), image.ext, image.mime, image.width, image.height, image.bytes.length, image.bytes, alt, credit, user.id],
    );
    const path = `/media/${rows[0]!.id}.${image.ext}`;
    await audit(user.id, "media.uploaded", path, { width: image.width, height: image.height });
    revalidatePath("/media");
    return { uploaded: path };
  } catch (error) {
    if (error instanceof UploadError) return { error: error.message };
    throw error;
  }
}

export async function deleteMedia(id: string): Promise<void> {
  const user = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  // Refuse while any content (draft or published) still uses it.
  const { rows } = await db().query<{ count: string }>(
    "select count(*) from content_items where data::text like '%' || $1 || '%'",
    [`/media/${id}.`],
  );
  if (Number(rows[0]?.count ?? 0) > 0) return;
  await db().query("delete from media where id = $1", [id]);
  await audit(user.id, "media.deleted", id);
  revalidatePath("/media");
}
