import type { Metadata } from "next";

import { deleteMedia } from "@/app/(panel)/media/actions";
import { DeleteButton } from "@/components/delete-button";
import { Badge, Card, PageHeader } from "@/components/ui";
import { UploadForm } from "@/components/upload-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Media library" };

export default async function MediaPage() {
  const { rows } = await db().query<{
    id: string;
    ext: string;
    file_name: string;
    alt: string;
    credit: string | null;
    width: number;
    height: number;
    byte_size: number;
    used: boolean;
  }>(
    `select m.id, m.ext, m.file_name, m.alt, m.credit, m.width, m.height, m.byte_size,
            exists (select 1 from content_items c where c.data::text like '%/media/' || m.id || '.%') as used
       from media m order by m.created_at desc`,
  );

  return (
    <>
      <PageHeader
        title="Media library"
        description="Photos for destinations, experiences, trips and more. Every upload is resized and has its location and camera data removed."
      />
      <Card className="mb-6">
        <UploadForm />
      </Card>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const path = `/media/${row.id}.${row.ext}`;
          return (
            <li key={row.id} className="overflow-hidden rounded-xl border border-ink-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- served by this app for previews */}
              <img src={path} alt={row.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <div className="space-y-2 p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{row.file_name}</p>
                  {row.used ? <Badge tone="green">In use</Badge> : <Badge>Unused</Badge>}
                </div>
                <p className="text-xs text-ink-600">
                  {row.width} × {row.height} · {Math.round(row.byte_size / 1024)} KB
                </p>
                <input readOnly value={path} aria-label="Image path" className="w-full rounded border border-ink-200 bg-ink-50 px-2 py-1 font-mono text-xs" />
                {row.alt ? <p className="text-xs text-ink-600">{row.alt}</p> : <p className="text-xs text-warning-700">No alt text yet</p>}
                {row.credit ? <p className="text-xs text-ink-500">{row.credit}</p> : null}
                {row.used ? null : <DeleteButton action={deleteMedia.bind(null, row.id)} label="this image" />}
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-ink-500">No uploads yet. The site&apos;s existing photos stay where they are and keep working.</p> : null}
    </>
  );
}
