import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Small, dependency-free UI kit for the admin (D-36). */

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

const buttonStyles = {
  primary: "bg-jungle-700 text-white hover:bg-jungle-800",
  secondary: "border border-ink-200 bg-white text-ink-900 hover:bg-ink-100",
  danger: "border border-danger-600 bg-white text-danger-600 hover:bg-danger-50",
  ghost: "text-ink-700 hover:bg-ink-100",
} as const;

type Variant = keyof typeof buttonStyles;

const buttonBase =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { readonly variant?: Variant }) {
  return <button className={cx(buttonBase, buttonStyles[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { readonly variant?: Variant }) {
  return <Link className={cx(buttonBase, buttonStyles[variant], className)} {...props} />;
}

export function Card({ className, children }: { readonly className?: string; readonly children: ReactNode }) {
  return <section className={cx("rounded-xl border border-ink-200 bg-white p-5", className)}>{children}</section>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  readonly title: string;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-ink-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export const inputClass =
  "block w-full rounded-lg border border-ink-400 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-jungle-600 focus:outline-none focus:ring-2 focus:ring-jungle-100";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  readonly label: string;
  readonly htmlFor: string;
  readonly hint?: string;
  readonly error?: string;
  readonly children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-ink-900">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Notice({ tone = "info", children }: { readonly tone?: "info" | "error" | "success" | "warning"; readonly children: ReactNode }) {
  const styles = {
    info: "border-ink-200 bg-white text-ink-700",
    error: "border-danger-600/30 bg-danger-50 text-danger-600",
    success: "border-jungle-600/30 bg-jungle-50 text-jungle-800",
    warning: "border-warning-700/30 bg-warning-50 text-warning-700",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-lg border px-4 py-3 text-sm", styles[tone])}>
      {children}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { readonly tone?: "neutral" | "green" | "amber" | "red"; readonly children: ReactNode }) {
  const styles = {
    neutral: "bg-ink-100 text-ink-700",
    green: "bg-jungle-50 text-jungle-700",
    amber: "bg-warning-50 text-warning-700",
    red: "bg-danger-50 text-danger-600",
  } as const;
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", styles[tone])}>{children}</span>;
}
