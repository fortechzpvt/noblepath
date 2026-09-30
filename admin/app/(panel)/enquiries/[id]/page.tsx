import { ChevronLeft, Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateEnquiry } from "@/app/(panel)/enquiries/actions";
import { Badge, Button, Card, Notice, PageHeader, inputClass } from "@/components/ui";
import { db } from "@/lib/db";
import { STATUS_TONE, type EnquiryStatus } from "@/lib/enquiry-status";

type Props = {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ saved?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: decodeURIComponent((await params).id) };
}

/** "arrivalDate" → "Arrival date". */
function humanise(key: string): string {
  const words = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").toLowerCase();
  return words[0]!.toUpperCase() + words.slice(1);
}

/** Renders the stored request, whatever its shape, as nested readable fields. */
function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="text-ink-400">—</span>;
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  if (typeof value !== "object") return <span className="whitespace-pre-wrap">{String(value)}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-ink-400">None</span>;
    return (
      <ol className="space-y-2">
        {value.map((item, index) => (
          <li key={index} className="rounded-lg bg-ink-50 p-2">
            <Value value={item} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[180px_1fr]">
      {Object.entries(value as Record<string, unknown>).map(([key, inner]) => (
        <div key={key} className="contents">
          <dt className="text-ink-500">{humanise(key)}</dt>
          <dd className="min-w-0 text-ink-900">
            <Value value={inner} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function EnquiryPage({ params, searchParams }: Props) {
  const id = decodeURIComponent((await params).id);
  const { saved } = await searchParams;
  const { rows } = await db().query<{
    id: string;
    kind: string;
    traveller_name: string;
    email: string;
    payload: unknown;
    email_status: string;
    status: EnquiryStatus;
    notes: string | null;
    created_at: Date;
  }>("select id, kind, traveller_name, email, payload, email_status, status, notes, created_at from booking_requests where id = $1", [id]);
  const row = rows[0];
  if (!row) notFound();

  return (
    <>
      <Link href="/enquiries" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-ink-900">
        <ChevronLeft size={16} aria-hidden /> Enquiries
      </Link>
      <PageHeader
        title={row.traveller_name}
        description={
          <>
            <span className="font-mono">{row.id}</span> · {row.kind === "ride" ? "Single ride" : "Booking request"} · received{" "}
            {row.created_at.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" })} (Sri Lanka time)
          </>
        }
        actions={
          <a href={`mailto:${row.email}?subject=${encodeURIComponent(`Your Noble Path request ${row.id}`)}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-jungle-700 px-4 text-sm font-semibold text-white hover:bg-jungle-800">
            <Mail size={16} aria-hidden /> Reply by email
          </a>
        }
      />
      {saved ? <div className="mb-4"><Notice tone="success">Saved.</Notice></div> : null}
      {row.email_status !== "sent" ? (
        <div className="mb-4">
          <Notice tone="warning">This request was saved but the notification email {row.email_status === "failed" ? "failed to send" : "was not configured"}. Make sure someone has picked it up.</Notice>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="mb-4 font-semibold">Request</h2>
          <div className="text-sm">
            <Value value={row.payload} />
          </div>
        </Card>
        <Card className="h-fit">
          <h2 className="mb-3 font-semibold">Follow-up</h2>
          <p className="mb-4 text-sm">
            Current status: <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
          </p>
          <form action={updateEnquiry.bind(null, row.id)} className="space-y-4">
            <label className="block text-sm font-semibold">
              Status
              <select name="status" defaultValue={row.status} className={`${inputClass} mt-1`}>
                {Object.keys(STATUS_TONE).map((s) => (
                  <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Internal notes
              <textarea name="notes" rows={6} defaultValue={row.notes ?? ""} className={`${inputClass} mt-1`} placeholder="Only visible in the admin." />
            </label>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
