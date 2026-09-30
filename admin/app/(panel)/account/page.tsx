import type { Metadata } from "next";

import { signOutEverywhereElse } from "@/app/(panel)/account/actions";
import { PasswordForm } from "@/components/password-form";
import { Button, Card, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Account & security" };

export default async function AccountPage() {
  const user = await requireAdmin();
  const [{ rows: sessions }, { rows: info }] = await Promise.all([
    db().query<{ created_at: Date; last_seen_at: Date; user_agent: string | null }>(
      "select created_at, last_seen_at, user_agent from admin_sessions where user_id = $1 and stage = 'active' and expires_at > now() order by last_seen_at desc",
      [user.id],
    ),
    db().query<{ last_login_at: Date | null; password_changed_at: Date }>(
      "select last_login_at, password_changed_at from admin_users where id = $1",
      [user.id],
    ),
  ]);
  const when = (date: Date | null | undefined) =>
    date ? date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }) : "—";

  return (
    <>
      <PageHeader title="Account & security" description={`Signed in as ${user.email}. Two-step verification is on.`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Change password</h2>
          <p className="mb-4 text-sm text-ink-600">Last changed {when(info[0]?.password_changed_at)}.</p>
          <PasswordForm />
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold">Signed-in sessions</h2>
          <p className="mb-4 text-sm text-ink-600">Sessions end after 12 hours, or 60 minutes without activity.</p>
          <ul className="space-y-3 text-sm">
            {sessions.map((session, index) => (
              <li key={index} className="rounded-lg border border-ink-200 p-3">
                <p className="truncate font-medium" title={session.user_agent ?? ""}>{session.user_agent || "Unknown browser"}</p>
                <p className="text-xs text-ink-500">Signed in {when(session.created_at)} · last active {when(session.last_seen_at)}</p>
              </li>
            ))}
          </ul>
          <form action={signOutEverywhereElse} className="mt-4">
            <Button type="submit" variant="secondary">Sign out all other sessions</Button>
          </form>
          <h2 className="mt-8 mb-1 font-semibold">Lost your phone?</h2>
          <p className="text-sm text-ink-600">
            Two-step verification is reset from a trusted computer with <code className="rounded bg-ink-100 px-1">npm run admin:create -- --reset-2fa</code>, which prints a new QR code. See docs/deployment/admin.md.
          </p>
        </Card>
      </div>
    </>
  );
}
