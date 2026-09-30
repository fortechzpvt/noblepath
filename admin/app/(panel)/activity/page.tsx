import type { Metadata } from "next";

import { Badge, Card, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Activity log" };

const TONE: Record<string, "red" | "green" | "amber" | "neutral"> = {
  "login.failed": "red",
  "login.refused": "red",
  "site.publish-failed": "red",
  "login.succeeded": "green",
  "site.published": "green",
  "content.deleted": "amber",
  "media.deleted": "amber",
  "enquiry.purged": "amber",
};

/** Everything done in the admin, newest first (D-36). Failed sign-ins show here too. */
export default async function ActivityPage() {
  const { rows } = await db().query<{ id: string; action: string; entity: string | null; created_at: Date; email: string | null }>(
    `select a.id, a.action, a.entity, a.created_at, u.email
       from audit_log a left join admin_users u on u.id = a.user_id
      order by a.created_at desc limit 300`,
  );
  return (
    <>
      <PageHeader title="Activity log" description="Every sign-in, failed sign-in, edit, upload and publish. The last 300 entries." />
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-xs text-ink-600 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">When (Sri Lanka)</th>
                <th scope="col" className="px-4 py-3 font-semibold">What</th>
                <th scope="col" className="px-4 py-3 font-semibold">Item</th>
                <th scope="col" className="px-4 py-3 font-semibold">Who</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2.5 whitespace-nowrap text-ink-600">
                    {row.created_at.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Colombo" })}
                  </td>
                  <td className="px-4 py-2.5"><Badge tone={TONE[row.action] ?? "neutral"}>{row.action}</Badge></td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-700">{row.entity ?? ""}</td>
                  <td className="px-4 py-2.5 text-ink-700">{row.email ?? "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
