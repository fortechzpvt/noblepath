"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/session";
import { findContentProblems } from "@/lib/content-integrity";
import { FIXED_KEYS, kindSpec, type KindSpec } from "@/lib/content-kinds";
import { contentSchemas, keyOf, slugSchema, type ContentKind } from "@/lib/content-schema";
import {
  DuplicateKeyError,
  deleteItem,
  getItem,
  moveItem,
  publishedContent,
  saveItem,
  setStatus,
  type Status,
} from "@/lib/content-store";
import { fieldErrors, formToObject } from "@/lib/form-data";

export interface EditorState {
  readonly errors?: Record<string, string>;
  readonly message?: string;
  readonly warnings?: readonly string[];
}

function spec(kind: string): KindSpec {
  const found = kindSpec(kind);
  if (!found) throw new Error("Unknown content kind.");
  return found;
}

/**
 * Create or update one item (D-36). `key` is null when creating. Validation is
 * the kind's schema from lib/content-schema.ts, the same one the site build
 * checks against, so anything saved here will build.
 */
export async function saveContent(
  kind: string,
  key: string | null,
  _previous: EditorState,
  form: FormData,
): Promise<EditorState> {
  const user = await requireAdmin();
  const kindDef = spec(kind);
  const isNew = key === null;
  if (isNew && (kindDef.fixedSet || kindDef.singleton)) return { message: "New items cannot be added to this list." };

  const candidate = formToObject(kindDef, form, isNew ? undefined : key);
  const parsed = contentSchemas[kind as ContentKind].safeParse(candidate);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Some fields need attention." };

  const data = parsed.data as Record<string, unknown>;
  const slug = keyOf(kind as ContentKind, data);
  if (!slugSchema.safeParse(slug).success) return { errors: { [kindDef.keyField]: "Use lower-case letters, numbers and hyphens." } };
  const fixed = FIXED_KEYS[kind as ContentKind];
  if (fixed && !fixed.includes(slug)) return { errors: { [kindDef.keyField]: "This list has a fixed set of entries." } };

  const status: Status = form.get("status") === "published" ? "published" : "draft";
  try {
    await saveItem({ kind: kind as ContentKind, slug, data, status, userId: user.id, isNew });
  } catch (error) {
    if (error instanceof DuplicateKeyError) {
      return { errors: { [kindDef.keyField]: "Another item already uses this. Choose a different one." } };
    }
    throw error;
  }
  await audit(user.id, isNew ? "content.created" : "content.updated", `${kind}/${slug}`, { status });

  revalidatePath(`/content/${kind}`);
  if (isNew) redirect(`/content/${kind}/${slug}?saved=1`);

  // Warn now about anything that would stop the next publish.
  const warnings = findContentProblems(await publishedContent());
  return { message: "Saved.", warnings };
}

export async function toggleStatus(kind: string, slug: string): Promise<void> {
  const user = await requireAdmin();
  spec(kind);
  const item = await getItem(kind as ContentKind, slug);
  if (!item) return;
  const next: Status = item.status === "published" ? "draft" : "published";
  await setStatus(kind as ContentKind, slug, next, user.id);
  await audit(user.id, next === "published" ? "content.published" : "content.unpublished", `${kind}/${slug}`);
  revalidatePath(`/content/${kind}`);
}

export async function removeContent(kind: string, slug: string): Promise<void> {
  const user = await requireAdmin();
  const kindDef = spec(kind);
  if (kindDef.fixedSet || kindDef.singleton) return;
  const item = await getItem(kind as ContentKind, slug);
  if (!item) redirect(`/content/${kind}`);
  await deleteItem(kind as ContentKind, slug);
  // Keep the deleted data in the log, so a mistake can be undone by hand.
  await audit(user.id, "content.deleted", `${kind}/${slug}`, { data: item.data });
  revalidatePath(`/content/${kind}`);
  redirect(`/content/${kind}?deleted=${encodeURIComponent(slug)}`);
}

export async function moveContent(kind: string, slug: string, direction: -1 | 1): Promise<void> {
  const user = await requireAdmin();
  spec(kind);
  await moveItem(kind as ContentKind, slug, direction);
  await audit(user.id, "content.reordered", `${kind}/${slug}`, { direction });
  revalidatePath(`/content/${kind}`);
}
