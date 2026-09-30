import "server-only";

import { findContentProblems, type IntegrityInput } from "@/lib/content-integrity";
import type { ContentKind } from "@/lib/content-schema";
import { KIND_BY_NAME, type KindSpec } from "@/lib/content-kinds";
import { db } from "@/lib/db";

/** Content rows as the admin works with them (D-36). All SQL for `content_items` lives here. */

export type Status = "draft" | "published";

export interface ContentRow {
  readonly slug: string;
  readonly data: Record<string, unknown>;
  readonly status: Status;
  readonly position: number;
  readonly updatedAt: Date;
}

interface Row {
  slug: string;
  data: Record<string, unknown>;
  status: Status;
  position: number;
  updated_at: Date;
}

const toRow = (row: Row): ContentRow => ({
  slug: row.slug,
  data: row.data,
  status: row.status,
  position: row.position,
  updatedAt: row.updated_at,
});

export async function listItems(kind: ContentKind): Promise<ContentRow[]> {
  const { rows } = await db().query<Row>(
    "select slug, data, status, position, updated_at from content_items where kind = $1 order by position, slug",
    [kind],
  );
  return rows.map(toRow);
}

export async function getItem(kind: ContentKind, slug: string): Promise<ContentRow | null> {
  const { rows } = await db().query<Row>(
    "select slug, data, status, position, updated_at from content_items where kind = $1 and slug = $2",
    [kind, slug],
  );
  return rows[0] ? toRow(rows[0]) : null;
}

export interface RefOption {
  readonly value: string;
  readonly label: string;
  readonly draft: boolean;
}

/** Every item of a kind, as options for a picker. Drafts are marked, since the site will not show them. */
export async function refOptions(kind: ContentKind): Promise<RefOption[]> {
  const spec = KIND_BY_NAME.get(kind) as KindSpec;
  const { rows } = await db().query<{ slug: string; title: string | null; status: Status }>(
    "select slug, data ->> $2 as title, status from content_items where kind = $1 order by data ->> $2",
    [kind, spec.titleField],
  );
  return rows.map((row) => ({ value: row.slug, label: row.title ?? row.slug, draft: row.status === "draft" }));
}

export class DuplicateKeyError extends Error {}

export async function saveItem(input: {
  kind: ContentKind;
  slug: string;
  data: unknown;
  status: Status;
  userId: string;
  isNew: boolean;
}): Promise<void> {
  if (input.isNew) {
    const result = await db().query(
      `insert into content_items (kind, slug, data, status, position, updated_by)
       values ($1, $2, $3, $4, coalesce((select max(position) + 1 from content_items where kind = $1), 0), $5)
       on conflict (kind, slug) do nothing`,
      [input.kind, input.slug, JSON.stringify(input.data), input.status, input.userId],
    );
    if (result.rowCount === 0) throw new DuplicateKeyError();
    return;
  }
  await db().query(
    `update content_items set data = $3, status = $4, updated_at = now(), updated_by = $5
      where kind = $1 and slug = $2`,
    [input.kind, input.slug, JSON.stringify(input.data), input.status, input.userId],
  );
}

export async function setStatus(kind: ContentKind, slug: string, status: Status, userId: string): Promise<void> {
  await db().query(
    "update content_items set status = $3, updated_at = now(), updated_by = $4 where kind = $1 and slug = $2",
    [kind, slug, status, userId],
  );
}

export async function deleteItem(kind: ContentKind, slug: string): Promise<void> {
  await db().query("delete from content_items where kind = $1 and slug = $2", [kind, slug]);
}

/** Moves an item one place up or down its list by swapping positions with its neighbour. */
export async function moveItem(kind: ContentKind, slug: string, direction: -1 | 1): Promise<void> {
  const items = await listItems(kind);
  const index = items.findIndex((item) => item.slug === slug);
  const other = items[index + direction];
  if (index < 0 || !other) return;
  // Re-number the whole list first, so equal positions cannot make a swap a no-op.
  const order = items.map((item) => item.slug);
  [order[index], order[index + direction]] = [order[index + direction]!, order[index]!];
  await db().query(
    `update content_items c set position = o.position
       from unnest($2::text[]) with ordinality as o(slug, position)
      where c.kind = $1 and c.slug = o.slug`,
    [kind, order],
  );
}

/** Published content in the shape the integrity rules expect, i.e. what the next build would contain. */
export async function publishedContent(): Promise<IntegrityInput> {
  const { rows } = await db().query<{ kind: ContentKind; data: never }>(
    "select kind, data from content_items where status = 'published' order by kind, position, slug",
  );
  const of = (kind: ContentKind) => rows.filter((row) => row.kind === kind).map((row) => row.data);
  return {
    regions: of("region"),
    destinations: of("destination"),
    experiences: of("experience"),
    trips: of("trip"),
    accommodations: of("accommodation"),
    activities: of("activity"),
    activityCategories: of("activity-category"),
  };
}

export async function publishProblems(): Promise<string[]> {
  return findContentProblems(await publishedContent());
}

export async function contentCounts(): Promise<Record<string, { published: number; draft: number }>> {
  const { rows } = await db().query<{ kind: string; status: Status; count: string }>(
    "select kind, status, count(*) from content_items group by kind, status",
  );
  const counts: Record<string, { published: number; draft: number }> = {};
  for (const row of rows) {
    counts[row.kind] ??= { published: 0, draft: 0 };
    counts[row.kind]![row.status] = Number(row.count);
  }
  return counts;
}

/** Items edited since the site was last published, i.e. what Publish would change. */
export async function changesSinceLastPublish(): Promise<{ since: Date | null; changed: number }> {
  const { rows } = await db().query<{ since: Date | null; changed: string }>(
    `select p.last as since,
            (select count(*) from content_items where p.last is null or updated_at > p.last) as changed
       from (select max(requested_at) filter (where ok) as last from site_publishes) p`,
  );
  return { since: rows[0]?.since ?? null, changed: Number(rows[0]?.changed ?? 0) };
}
