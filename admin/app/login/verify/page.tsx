import type { Metadata } from "next";

import { CodeForm } from "@/app/login/auth-forms";
import { signOut } from "@/app/login/actions";
import { requireMfaPending } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Verify" };

export default async function VerifyPage() {
  const user = await requireMfaPending();
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-center text-sm font-bold tracking-widest text-jungle-700">NOBLE PATH</p>
        <h1 className="mt-2 text-center text-2xl font-bold">Two-step verification</h1>
        <p className="mt-2 text-center text-sm text-ink-600">Signing in as {user.email}</p>
        <div className="mt-8 rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
          <CodeForm />
        </div>
        <form action={signOut} className="mt-4 text-center">
          <button type="submit" className="text-sm text-ink-600 underline underline-offset-4">
            Use a different account
          </button>
        </form>
      </div>
    </main>
  );
}
