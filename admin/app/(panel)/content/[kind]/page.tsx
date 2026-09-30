import { ArrowDown, ArrowUp, ExternalLink, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { moveContent, toggleStatus } from "@/app/(panel)/content/actions";
import { Badge, ButtonLink, Card, Notice, PageHeader, inputClass } from "@/components/ui";
import { env } from "@/lib/env";
import { kindSpec } from "@/lib/content-kinds";
import type { ContentKind } from "@/lib/content-schema";
import { listItems } from "@/lib/content-store";

type Props = {
  readonly params: Promise<{ kind: string }>;
  readonly searchParams: Promise<{ q?: string; deleted?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: kindSpec((await params).kind)?.plural ?? "Content" };
}

function cell(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "number" && Number.isInteger(value) && value >= 1000) return value.toLocaleString("en-US");
  return String(value);
}

export default async function ContentListPage({ params, searchParams }: Props) {
  const { kind } = await params;
  const { q = "", deleted } = await searchParams;
  const spec = kindSpec(kind);
  if (!spec) notFound();
  if (spec.singleton) redirect(`/content/${kind}/settings`);

  const items = await listItems(kind as ContentKind);
  const query = q.trim().toLowerCase();
  const visible = query
    ? items.filter((item) => `${item.slug} ${String(item.data[spec.titleField] ?? "")}`.toLowerCase().includes(query))
    : items;
  const site = env().PUBLIC_SITE_URL.replace(/\/$/, "");

  return (
    <>
      <PageHeader
        title={spec.plural}
        description={spec.description}
        actions={
          spec.fixedSet ? null : (
            <ButtonLink href={`/content/${kind}/new`}>
              <Plus size={16} aria-hidden /> New {spec.label.toLowerCase()}
            </ButtonLink>
          )
        }
      />
      {deleted ? <div className="mb-4"><Notice tone="success">Deleted “{deleted}”. Publish the site to remove it from the live pages.</Notice></div> : null}
      <Card className="p-0">
        <form className="border-b border-ink-200 p-4" role="search">
          <label htmlFor="q" className="sr-only">Search {spec.plural.toLowerCase()}</label>
          <input id="q" name="q" defaultValue={q} placeholder={`Search ${spec.plural.toLowerCase()}…`} className={`${inputClass} max-w-sm`} />
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-xs text-ink-600 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                {spec.listColumns?.map((column) => (
                  <th key={column.field} scope="col" className="px-4 py-3 font-semibold">{column.label}</th>
                ))}
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Updated</th>
                <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {visible.map((item, index) => (
                <tr key={item.slug} className="align-middle">
                  <td className="px-4 py-3">
                    <Link href={`/content/${kind}/${item.slug}`} className="font-semibold text-ink-900 hover:underline">
                      {cell(item.data[spec.titleField])}
                    </Link>
                    <p className="font-mono text-xs text-ink-500">{item.slug}</p>
                  </td>
                  {spec.listColumns?.map((column) => (
                    <td key={column.field} className="px-4 py-3 text-ink-700">{cell(item.data[column.field])}</td>
                  ))}
                  <td className="px-4 py-3">
                    <form action={toggleStatus.bind(null, kind, item.slug)}>
                      <button type="submit" title={item.status === "published" ? "Click to unpublish" : "Click to publish"}>
                        {item.status === "published" ? <Badge tone="green">Published</Badge> : <Badge tone="amber">Draft</Badge>}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-600">
                    {item.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {spec.sitePath && item.status === "published" ? (
                        <a href={`${site}${spec.sitePath(item.slug)}`} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-ink-600 hover:bg-ink-100" title="View on site">
                          <ExternalLink size={16} aria-label="View on site" />
                        </a>
                      ) : null}
                      {!query ? (
                        <>
                          <form action={moveContent.bind(null, kind, item.slug, -1)}>
                            <button type="submit" disabled={index === 0} className="rounded p-1.5 text-ink-600 hover:bg-ink-100 disabled:opacity-30" title="Move up">
                              <ArrowUp size={16} aria-label="Move up" />
                            </button>
                          </form>
                          <form action={moveContent.bind(null, kind, item.slug, 1)}>
                            <button type="submit" disabled={index === visible.length - 1} className="rounded p-1.5 text-ink-600 hover:bg-ink-100 disabled:opacity-30" title="Move down">
                              <ArrowDown size={16} aria-label="Move down" />
                            </button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 ? (
                <tr><td colSpan={5 + (spec.listColumns?.length ?? 0)} className="px-4 py-10 text-center text-ink-500">Nothing here yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-ink-500">Order here is the order on the site. Changes go live when you publish the site.</p>
    </>
  );
}
