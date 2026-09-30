import { Rocket } from "lucide-react";
import type { Metadata } from "next";

import { publishSite } from "@/app/(panel)/publish/actions";
import { Badge, Button, Card, Notice, PageHeader } from "@/components/ui";
import { changesSinceLastPublish, publishProblems } from "@/lib/content-store";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Publish" };

type Props = { readonly searchParams: Promise<{ result?: string }> };

const RESULTS: Record<string, { tone: "success" | "error" | "warning"; text: string }> = {
  started: { tone: "success", text: "Publishing started. The live site updates in about 1–3 minutes, once the build finishes." },
  failed: { tone: "error", text: "The site could not be asked to rebuild. Nothing changed on the live site. Try again, or check the deploy hook." },
  blocked: { tone: "error", text: "Not published: fix the problems listed below first." },
  "no-hook": { tone: "warning", text: "Publishing is not set up: SITE_DEPLOY_HOOK_URL is missing." },
  "too-soon": { tone: "warning", text: "A publish was started less than a minute ago. It will include your latest changes if it has not started building yet." },
};

export default async function PublishPage({ searchParams }: Props) {
  const { result } = await searchParams;
  const [problems, pending, history] = await Promise.all([
    publishProblems(),
    changesSinceLastPublish(),
    db().query<{ requested_at: Date; ok: boolean; note: string | null; email: string | null }>(
      `select p.requested_at, p.ok, p.note, u.email from site_publishes p left join admin_users u on u.id = p.requested_by
        order by p.requested_at desc limit 15`,
    ),
  ]);
  const hookConfigured = Boolean(env().SITE_DEPLOY_HOOK_URL);
  const message = result ? RESULTS[result] : undefined;

  return (
    <>
      <PageHeader
        title="Publish"
        description="Edits are saved straight away but only appear on the live site after you publish. Publishing rebuilds the site from everything marked Published."
      />
      {message ? <div className="mb-4"><Notice tone={message.tone}>{message.text}</Notice></div> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="font-semibold">Ready to publish?</h2>
          <p className="mt-1 text-sm text-ink-600">
            {pending.since
              ? `${pending.changed} ${pending.changed === 1 ? "item has" : "items have"} changed since the last publish on ${pending.since.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" })}.`
              : "The site has not been published from the admin yet."}
          </p>
          {problems.length > 0 ? (
            <div className="mt-4">
              <Notice tone="error">
                <p className="font-semibold">{problems.length} {problems.length === 1 ? "problem stops" : "problems stop"} the site from building:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {problems.slice(0, 30).map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
                <p className="mt-2">Usually a published item points at something that is now a draft or deleted. Publish it, or remove the reference.</p>
              </Notice>
            </div>
          ) : (
            <p className="mt-4 text-sm text-jungle-700">All checks pass.</p>
          )}
          <form action={publishSite} className="mt-6">
            <Button type="submit" disabled={problems.length > 0 || !hookConfigured}>
              <Rocket size={16} aria-hidden /> Publish the site
            </Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Recent publishes</h2>
          <ul className="space-y-2 text-sm">
            {history.rows.map((row) => (
              <li key={row.requested_at.toISOString()} className="flex items-start justify-between gap-3">
                <div>
                  <p>{row.requested_at.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" })}</p>
                  <p className="text-xs text-ink-500">{row.email ?? "Unknown"}{row.note ? ` · ${row.note}` : ""}</p>
                </div>
                {row.ok ? <Badge tone="green">Started</Badge> : <Badge tone="red">Failed</Badge>}
              </li>
            ))}
            {history.rows.length === 0 ? <li className="text-ink-500">None yet.</li> : null}
          </ul>
        </Card>
      </div>
    </>
  );
}
