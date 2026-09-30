import type { Metadata } from "next";
import Link from "next/link";

import { purgeOldEnquiries } from "@/app/(panel)/enquiries/actions";
import { Badge, Button, Card, Notice, PageHeader, cx, inputClass } from "@/components/ui";
import { db } from "@/lib/db";
import { STATUS_TONE } from "@/lib/enquiry-status";
import { RETENTION_MONTHS } from "@/lib/retention";

export const metadata: Metadata = { title: "Enquiries" };

type Props = { readonly searchParams: Promise<{ status?: string; kind?: string; q?: string; purged?: string }> };

interface Row {
  id: string;
  kind: "booking" | "ride";
  plan_choice: string | null;
  package_slug: string | null;
  traveller_name: string;
  email: string;
  /** A calendar date, read as text so no time zone can shift it. */
  travel_date: string | null;
  party_size: number | null;
  email_status: string;
  status: keyof typeof STATUS_TONE;
  created_at: Date;
}

export default async function EnquiriesPage({ searchParams }: Props) {
  const { status = "", kind = "", q = "", purged } = await searchParams;
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (status in STATUS_TONE) conditions.push(`status = $${values.push(status)}`);
  if (kind === "booking" || kind === "ride") conditions.push(`kind = $${values.push(kind)}`);
  if (q.trim()) {
    conditions.push(`(id ilike $${values.push(`%${q.trim()}%`)} or traveller_name ilike $${values.length} or email ilike $${values.length})`);
  }
  const { rows } = await db().query<Row>(
    `select id, kind, plan_choice, package_slug, traveller_name, email, travel_date::text as travel_date, party_size, email_status, status, created_at
       from booking_requests ${conditions.length ? `where ${conditions.join(" and ")}` : ""}
      order by created_at desc limit 200`,
    values,
  );
  const { rows: old } = await db().query<{ count: string }>(
    "select count(*) from booking_requests where created_at < now() - make_interval(months => $1)",
    [RETENTION_MONTHS],
  );
  const oldCount = Number(old[0]?.count ?? 0);
  const calendarDate = (value: string | null) =>
    value ? new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";
  const date = (value: Date | null) => (value ? value.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Colombo" }) : "—");

  return (
    <>
      <PageHeader
        title="Enquiries"
        description={`Booking and ride requests from the website. Each is also emailed to the team. Personal data is kept for ${RETENTION_MONTHS} months.`}
      />
      {purged ? <div className="mb-4"><Notice tone="success">Deleted {purged} enquiries older than {RETENTION_MONTHS} months.</Notice></div> : null}
      {oldCount > 0 ? (
        <div className="mb-4">
          <Notice tone="warning">
            <form action={purgeOldEnquiries} className="flex flex-wrap items-center justify-between gap-3">
              <span>{oldCount} enquiries are older than {RETENTION_MONTHS} months and should be deleted.</span>
              <Button type="submit" variant="danger">Delete them now</Button>
            </form>
          </Notice>
        </div>
      ) : null}

      <Card className="p-0">
        <form className="flex flex-wrap gap-3 border-b border-ink-200 p-4" role="search">
          <input name="q" defaultValue={q} placeholder="Reference, name or email…" aria-label="Search enquiries" className={`${inputClass} max-w-xs`} />
          <select name="status" defaultValue={status} aria-label="Status" className={`${inputClass} w-auto`}>
            <option value="">All statuses</option>
            {Object.keys(STATUS_TONE).map((s) => (
              <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select name="kind" defaultValue={kind} aria-label="Type" className={`${inputClass} w-auto`}>
            <option value="">Bookings and rides</option>
            <option value="booking">Bookings</option>
            <option value="ride">Rides</option>
          </select>
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-xs text-ink-600 uppercase">
              <tr>
                {["Received", "Reference", "Traveller", "Type", "Travel date", "People", "Status"].map((heading) => (
                  <th key={heading} scope="col" className="px-4 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((row) => (
                <tr key={row.id} className={cx(row.status === "new" && "bg-warning-50/40")}>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-600">{date(row.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/enquiries/${encodeURIComponent(row.id)}`} className="font-mono font-semibold whitespace-nowrap hover:underline">{row.id}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.traveller_name}</p>
                    <p className="text-xs text-ink-500">{row.email}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {row.kind === "ride" ? "Single ride" : row.plan_choice === "package" ? `Trip: ${row.package_slug ?? "?"}` : "Custom trip"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-700">{calendarDate(row.travel_date)}</td>
                  <td className="px-4 py-3 text-ink-700">{row.party_size ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
                      {row.email_status !== "sent" ? <Badge tone="red">not emailed</Badge> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-500">No enquiries match.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
