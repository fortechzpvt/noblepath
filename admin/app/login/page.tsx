import type { Metadata } from "next";

import { PasswordForm } from "@/app/login/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-center text-sm font-bold tracking-widest text-jungle-700">NOBLE PATH</p>
        <h1 className="mt-2 text-center text-2xl font-bold">Admin sign in</h1>
        <div className="mt-8 rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
          <PasswordForm />
        </div>
        <p className="mt-6 text-center text-xs text-ink-500">
          Authorised staff only. Every sign-in is recorded.
        </p>
      </div>
    </main>
  );
}
