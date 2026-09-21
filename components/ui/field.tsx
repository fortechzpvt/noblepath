import type { ReactNode } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Accessible form-field primitives (components.md §11).
 *
 * The wiring these components exist to centralise:
 *  - every control has a real `<label>`; a placeholder is never the label
 *  - `aria-describedby` lists the error **first**, then the description (§11.3)
 *  - `aria-invalid` is set from the same `error` prop that paints the border,
 *    so the visual state and the announced state cannot drift apart
 *
 * Control geometry is 56 px below 768 and 48 px above: 16 px type is mandatory
 * on mobile or iOS Safari zooms the viewport on focus (§11.1).
 */

const controlBase =
  "w-full rounded-sm border-[1.5px] bg-white px-4 text-body text-ink-900 " +
  "placeholder:text-text-placeholder " +
  "transition-[border-color,background-color] duration-[var(--dur-2)] ease-[var(--ease-standard)] " +
  "disabled:cursor-not-allowed disabled:border-sand-200 disabled:bg-sand-100 disabled:text-ink-400";

const controlHeight = "h-14 md:h-12";

function controlTone(hasError: boolean): string {
  return hasError
    ? "border-error-600 bg-error-50 focus-visible:border-error-600"
    : "border-ink-400 hover:border-ink-500 focus-visible:border-jungle-600";
}

function describedBy(
  hasError: boolean,
  errorId: string,
  hasDescription: boolean,
  descriptionId: string,
): string | undefined {
  const ids = [hasError ? errorId : null, hasDescription ? descriptionId : null].filter(
    (value): value is string => value !== null,
  );
  return ids.length > 0 ? ids.join(" ") : undefined;
}

interface FieldShellProps {
  readonly id: string;
  readonly label: string;
  /** Optional fields are marked, required ones are not — most fields are required (§11.1). */
  readonly optional?: boolean;
  readonly description?: string;
  readonly error?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

function FieldShell({
  id,
  label,
  optional,
  description,
  error,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="text-body-sm font-semibold text-ink-900">
        {label}
        {optional ? (
          <span className="ml-1.5 text-small font-normal text-text-meta">(optional)</span>
        ) : null}
      </label>

      {description ? (
        <p id={`${id}-description`} className="mt-1.5 text-small text-text-meta">
          {description}
        </p>
      ) : null}

      <div className="mt-2">{children}</div>

      {error ? (
        <p
          id={`${id}-error`}
          className="mt-2 flex items-start gap-2 text-small text-error-600"
        >
          <AlertCircle size={16} aria-hidden className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

type NativeInputProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  "id" | "className" | "aria-invalid" | "aria-describedby"
>;

export function TextField({
  id,
  label,
  optional,
  description,
  error,
  className,
  ...inputProps
}: Omit<FieldShellProps, "children"> & NativeInputProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      optional={optional}
      description={description}
      error={error}
      className={className}
    >
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(
          Boolean(error),
          `${id}-error`,
          Boolean(description),
          `${id}-description`,
        )}
        className={cn(controlBase, controlHeight, controlTone(Boolean(error)))}
        {...inputProps}
      />
    </FieldShell>
  );
}

type NativeSelectProps = Omit<
  React.ComponentPropsWithoutRef<"select">,
  "id" | "className" | "aria-invalid" | "aria-describedby"
>;

export function SelectField({
  id,
  label,
  optional,
  description,
  error,
  className,
  children,
  ...selectProps
}: Omit<FieldShellProps, "children"> & NativeSelectProps & { readonly children: ReactNode }) {
  return (
    <FieldShell
      id={id}
      label={label}
      optional={optional}
      description={description}
      error={error}
      className={className}
    >
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(
            Boolean(error),
            `${id}-error`,
            Boolean(description),
            `${id}-description`,
          )}
          className={cn(
            controlBase,
            controlHeight,
            controlTone(Boolean(error)),
            "appearance-none pr-11",
          )}
          {...selectProps}
        >
          {children}
        </select>
        <ChevronDown
          size={20}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-500"
        />
      </div>
    </FieldShell>
  );
}

type NativeTextareaProps = Omit<
  React.ComponentPropsWithoutRef<"textarea">,
  "id" | "className" | "aria-invalid" | "aria-describedby"
>;

export function TextareaField({
  id,
  label,
  optional,
  description,
  error,
  className,
  ...textareaProps
}: Omit<FieldShellProps, "children"> & NativeTextareaProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      optional={optional}
      description={description}
      error={error}
      className={className}
    >
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(
          Boolean(error),
          `${id}-error`,
          Boolean(description),
          `${id}-description`,
        )}
        className={cn(controlBase, controlTone(Boolean(error)), "min-h-30 resize-y py-3")}
        {...textareaProps}
      />
    </FieldShell>
  );
}

/** A `<fieldset>` whose `<legend>` carries the same weight as a field label. */
export function FieldGroup({
  legend,
  description,
  error,
  children,
  className,
}: {
  readonly legend: string;
  readonly description?: string;
  readonly error?: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <fieldset className={cn("min-w-0 border-0 p-0", className)}>
      <legend className="text-body-sm font-semibold text-ink-900">{legend}</legend>
      {description ? (
        <p className="mt-1.5 text-small text-text-meta">{description}</p>
      ) : null}
      <div className="mt-3">{children}</div>
      {error ? (
        <p className="mt-2 flex items-start gap-2 text-small text-error-600">
          <AlertCircle size={16} aria-hidden className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
}

/**
 * Form-level error summary (§11.3).
 *
 * `role="alert"` plus `tabIndex={-1}`: the caller focuses this node after a
 * failed submit, so the errors are announced once and the keyboard user lands
 * on a list of in-page links rather than being dropped into the first field
 * with no idea how many others failed.
 */
export function ErrorSummary({
  id,
  title,
  errors,
  ref,
}: {
  readonly id: string;
  readonly title: string;
  readonly errors: ReadonlyArray<{ readonly fieldId: string; readonly message: string }>;
  readonly ref?: React.Ref<HTMLDivElement>;
}) {
  if (errors.length === 0) return null;

  return (
    <div
      ref={ref}
      id={id}
      role="alert"
      tabIndex={-1}
      className="rounded-lg border border-error-200 bg-error-50 p-4 md:p-5"
    >
      <p className="flex items-start gap-2 text-h5 text-error-600">
        <AlertCircle size={20} aria-hidden className="mt-0.5 shrink-0" />
        <span>{title}</span>
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {errors.map((entry) => (
          <li key={entry.fieldId}>
            <a
              href={`#${entry.fieldId}`}
              className="inline-flex min-h-11 items-center rounded-xs text-body-sm text-error-600 underline underline-offset-4"
            >
              {entry.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
