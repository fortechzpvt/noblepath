import { LogOut, Menu } from "lucide-react";

import { signOut } from "@/app/login/actions";
import { Nav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth/session";

/** Every page inside the panel requires a signed-in admin (D-36). */
export default async function PanelLayout({ children }: { readonly children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="lg:grid lg:min-h-svh lg:grid-cols-[256px_1fr]">
      <aside className="border-b border-ink-200 bg-white px-3 py-5 lg:sticky lg:top-0 lg:h-svh lg:overflow-y-auto lg:border-r lg:border-b-0">
        <p className="px-3 text-sm font-bold tracking-widest text-jungle-700">NOBLE PATH</p>
        <p className="px-3 text-xs text-ink-500">Admin</p>
        {/* Phones: the menu folds away so each page starts with its content. */}
        <details className="group mt-4 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold">
            <Menu size={16} aria-hidden /> Menu
          </summary>
          <div className="mt-4">
            <Nav />
          </div>
        </details>
        <div className="mt-6 hidden lg:block">
          <Nav />
        </div>
        <div className="mt-8 border-t border-ink-200 px-3 pt-4">
          <p className="truncate text-xs text-ink-500" title={user.email}>
            {user.email}
          </p>
          <form action={signOut} className="mt-2">
            <button type="submit" className="flex items-center gap-2 text-sm font-medium text-ink-700 hover:text-ink-900">
              <LogOut size={16} aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
