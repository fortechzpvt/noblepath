import type { Metadata } from "next";
import Link from "next/link";

import { BarChart, RankedBars } from "@/components/charts";
import { Card, Notice, PageHeader } from "@/components/ui";
import { SERIES } from "@/lib/chart-colors";
import { changesSinceLastPublish, contentCounts } from "@/lib/content-store";
import { dailyTraffic, devices, kpis, monthlyEnquiries, topCountries, topPages, topReferrers, topRequestedTrips } from "@/lib/stats";

export const metadata: Metadata = { title: "Dashboard" };

function change(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "No change" : "New this period";
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent >= 0 ? "+" : ""}${percent}% vs previous 30 days`;
}

function Stat({ label, value, note, href }: { label: string; value: number; note?: string; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-ink-600">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value.toLocaleString("en-US")}</p>
      {note ? <p className="mt-1 text-xs text-ink-500">{note}</p> : null}
    </>
  );
  return (
    <Card className={href ? "transition-colors hover:border-jungle-600" : undefined}>
      {href ? <Link href={href} className="block">{body}</Link> : body}
    </Card>
  );
}

const CONTENT_LABELS: Record<string, string> = {
  trip: "Trips",
  destination: "Destinations",
  experience: "Experiences",
  accommodation: "Stays",
  activity: "Activities",
};

export default async function DashboardPage() {
  const [k, traffic, months, pages, countries, deviceSplit, referrers, trips, counts, pending] = await Promise.all([
    kpis(),
    dailyTraffic(),
    monthlyEnquiries(),
    topPages(),
    topCountries(),
    devices(),
    topReferrers(),
    topRequestedTrips(),
    contentCounts(),
    changesSinceLastPublish(),
  ]);

  const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short" });

  return (
    <>
      <PageHeader title="Dashboard" description="Enquiries, visitors and content at a glance. Visitor figures are cookie-free counts in Sri Lanka time." />

      {k.emailFailures > 0 ? (
        <div className="mb-4">
          <Notice tone="warning">
            {k.emailFailures} new {k.emailFailures === 1 ? "enquiry was" : "enquiries were"} saved but not emailed. <Link href="/enquiries?status=new" className="font-semibold underline">Review them</Link>.
          </Notice>
        </div>
      ) : null}
      {pending.changed > 0 ? (
        <div className="mb-4">
          <Notice>
            {pending.changed} content {pending.changed === 1 ? "change is" : "changes are"} not live yet. <Link href="/publish" className="font-semibold underline">Publish the site</Link> when you are ready.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New enquiries to handle" value={k.newEnquiries} href="/enquiries?status=new" />
        <Stat label="Enquiries, last 30 days" value={k.enquiries30} note={change(k.enquiries30, k.enquiriesPrev30)} />
        <Stat label="Page views, last 30 days" value={k.views30} note={change(k.views30, k.viewsPrev30)} />
        <Stat label="Visitors, last 30 days" value={k.visitors30} note="Unique per day, added up" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Page views per day</h2>
          <p className="mb-3 text-xs text-ink-500">Last 30 days. Hover a day for visitors.</p>
          <BarChart
            title="Page views per day, last 30 days"
            series={[{ name: "Page views", color: SERIES.primary }]}
            labelEvery={5}
            data={traffic.map((d) => ({
              label: dayLabel(d.day),
              title: new Date(`${d.day}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" }),
              values: [d.views],
              extra: [`Visitors: ${d.visitors.toLocaleString("en-US")}`],
            }))}
          />
        </Card>
        <Card>
          <h2 className="font-semibold">Enquiries per month</h2>
          <p className="mb-3 text-xs text-ink-500">Booking requests and single rides, last 12 months.</p>
          <BarChart
            title="Enquiries per month, last 12 months"
            series={[
              { name: "Bookings", color: SERIES.primary },
              { name: "Rides", color: SERIES.secondary },
            ]}
            data={months.map((m) => ({
              label: monthLabel(m.month),
              title: new Date(`${m.month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
              values: [m.bookings, m.rides],
            }))}
          />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <h2 className="mb-4 font-semibold">Top pages</h2>
          <RankedBars items={pages} empty="No visits recorded yet." />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Most requested trips</h2>
          <RankedBars items={trips} empty="No trip requests yet." />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Countries</h2>
          <RankedBars items={countries.map((c) => ({ ...c, label: c.label === "??" ? "Unknown" : c.label }))} empty="No visits recorded yet." />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Devices</h2>
          <RankedBars items={deviceSplit.map((d) => ({ ...d, label: d.label[0]!.toUpperCase() + d.label.slice(1) }))} empty="No visits recorded yet." />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Where visitors came from</h2>
          <RankedBars items={referrers} empty="No referring sites yet. Direct visits are not listed." />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Content</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(CONTENT_LABELS).map(([kind, label]) => (
              <li key={kind} className="flex justify-between">
                <Link href={`/content/${kind}`} className="text-ink-800 hover:underline">{label}</Link>
                <span className="tabular-nums">
                  <span className="font-semibold">{counts[kind]?.published ?? 0}</span>
                  <span className="text-ink-500"> live{counts[kind]?.draft ? ` · ${counts[kind]!.draft} draft` : ""}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
