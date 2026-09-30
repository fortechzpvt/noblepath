import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { removeContent, saveContent } from "@/app/(panel)/content/actions";
import { ContentEditor, type MediaOption } from "@/components/content-editor";
import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/ui";
import { kindSpec, type FieldSpec } from "@/lib/content-kinds";
import type { ContentKind } from "@/lib/content-schema";
import { getItem, refOptions, type RefOption } from "@/lib/content-store";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

type Props = {
  readonly params: Promise<{ kind: string; slug: string }>;
  readonly searchParams: Promise<{ saved?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kind, slug } = await params;
  const spec = kindSpec(kind);
  return { title: slug === "new" ? `New ${spec?.label.toLowerCase() ?? "item"}` : `${spec?.label ?? "Edit"}: ${slug}` };
}

/** Every kind this form needs picker options for. */
function referencedKinds(fields: readonly FieldSpec[]): ContentKind[] {
  const kinds = new Set<ContentKind>();
  for (const field of fields) {
    if (field.type === "ref" || field.type === "refs") kinds.add(field.ref);
    if (field.type === "rows") {
      for (const column of field.columns) {
        if ((column.type === "select" || column.type === "refs") && "ref" in column && column.ref) kinds.add(column.ref);
      }
    }
  }
  return [...kinds];
}

export default async function EditPage({ params, searchParams }: Props) {
  const { kind, slug } = await params;
  const { saved } = await searchParams;
  const spec = kindSpec(kind);
  if (!spec) notFound();

  const isNew = slug === "new" && !spec.singleton;
  if (isNew && spec.fixedSet) notFound();
  const item = isNew ? null : await getItem(kind as ContentKind, slug);
  if (!isNew && !item) notFound();

  const refs: Record<string, RefOption[]> = {};
  for (const ref of referencedKinds(spec.fields)) refs[ref] = await refOptions(ref);

  const media: MediaOption[] = spec.fields.some((field) => field.type === "image")
    ? (
        await db().query<{ id: string; ext: string; file_name: string; alt: string; credit: string | null }>(
          "select id, ext, file_name, alt, credit from media order by created_at desc limit 500",
        )
      ).rows.map((row) => ({ src: `/media/${row.id}.${row.ext}`, label: row.file_name, alt: row.alt, credit: row.credit }))
    : [];

  const title = spec.singleton
    ? spec.plural
    : isNew
      ? `New ${spec.label.toLowerCase()}`
      : String(item?.data[spec.titleField] ?? slug).split("\n")[0]!;
  const site = env().PUBLIC_SITE_URL.replace(/\/$/, "");

  return (
    <>
      {spec.singleton ? null : (
        <Link href={`/content/${kind}`} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-ink-900">
          <ChevronLeft size={16} aria-hidden /> {spec.plural}
        </Link>
      )}
      <PageHeader
        title={title}
        description={spec.singleton ? spec.description : isNew ? spec.description : undefined}
        actions={
          <>
            {!isNew && spec.sitePath && item?.status === "published" ? (
              <a href={`${site}${spec.sitePath(slug)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-white px-4 text-sm font-semibold hover:bg-ink-100">
                <ExternalLink size={16} aria-hidden /> View on site
              </a>
            ) : null}
            {!isNew && !spec.fixedSet && !spec.singleton ? (
              <DeleteButton action={removeContent.bind(null, kind, slug)} label={`“${title}”`} />
            ) : null}
          </>
        }
      />
      <ContentEditor
        fields={spec.fields}
        keyField={spec.keyField}
        isNew={isNew}
        itemKey={isNew ? null : slug}
        initial={item?.data ?? {}}
        status={item?.status ?? "draft"}
        refs={refs}
        media={media}
        siteUrl={site}
        action={saveContent.bind(null, kind, isNew ? null : slug)}
        savedNotice={saved === "1"}
      />
    </>
  );
}
