"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/session";
import { publishProblems } from "@/lib/content-store";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Rebuilds the public site from the published content (D-36) by calling its
 * deploy hook. The build pulls content from the database, validates it and
 * copies uploaded images; if anything fails, the host keeps serving the
 * previous version.
 */
export async function publishSite(): Promise<void> {
  const user = await requireAdmin();
  const hook = env().SITE_DEPLOY_HOOK_URL;
  if (!hook) redirect("/publish?result=no-hook");

  const problems = await publishProblems();
  if (problems.length > 0) redirect("/publish?result=blocked");

  // One publish a minute is plenty; this stops a double click queueing two builds.
  const { rows } = await db().query<{ recent: boolean }>(
    "select exists (select 1 from site_publishes where ok and requested_at > now() - interval '60 seconds') as recent",
  );
  if (rows[0]?.recent) redirect("/publish?result=too-soon");

  let ok = false;
  let statusCode: number | null = null;
  let note: string | null = null;
  try {
    const response = await fetch(hook, { method: "POST", signal: AbortSignal.timeout(15_000), cache: "no-store" });
    statusCode = response.status;
    ok = response.ok;
    if (!ok) note = `Deploy hook answered ${response.status}.`;
  } catch (error) {
    note = error instanceof Error && error.name === "TimeoutError" ? "Deploy hook timed out." : "Deploy hook could not be reached.";
  }

  await db().query("insert into site_publishes (requested_by, ok, status_code, note) values ($1, $2, $3, $4)", [
    user.id,
    ok,
    statusCode,
    note,
  ]);
  await audit(user.id, ok ? "site.published" : "site.publish-failed", undefined, { statusCode });
  revalidatePath("/publish");
  redirect(`/publish?result=${ok ? "started" : "failed"}`);
}
