"use client";

import { useId, useRef, useState } from "react";
import { Check } from "lucide-react";

import { ErrorSummary, FieldGroup, SelectField, TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { interestName } from "@/lib/format";
import type { Interest, Pace, PlanInput } from "@/lib/types";

/**
 * Every interest tag, in the order they are offered.
 *
 * Declared here rather than derived from content: the list is the full `Interest`
 * union from `lib/types.ts`, and the order is an editorial choice about which
 * reasons-to-travel we lead with, not a property of the data.
 */
export const INTERESTS: readonly Interest[] = [
  "culture",
  "nature",
  "beach",
  "wildlife",
  "adventure",
  "food",
  "wellness",
];

/** Maximum interests selectable, per user-flows §F3.1. */
const MAX_INTERESTS = 6;

const MONTHS: ReadonlyArray<{ readonly value: number; readonly label: string }> = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const PACES: ReadonlyArray<{ readonly value: Pace; readonly label: string; readonly hint: string }> = [
  { value: "relaxed", label: "Relaxed", hint: "Longer stays, fewer places" },
  { value: "balanced", label: "Balanced", hint: "The usual compromise" },
  { value: "packed", label: "Packed", hint: "See more, move more" },
];

const chipBase =
  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-pill border px-4 text-body-sm " +
  "transition-[background-color,border-color,color] duration-[var(--dur-2)] ease-[var(--ease-standard)]";
const chipOff =
  "border-border bg-surface font-medium text-ink-600 hover:border-border-strong hover:bg-sand-100 hover:text-ink-900";
const chipOn = "border-jungle-700 bg-jungle-700 font-semibold text-white hover:bg-jungle-600";

interface FormError {
  readonly fieldId: string;
  readonly message: string;
}

/**
 * Plan intake (FR-4.1, page-specs §6.1).
 *
 * The submit button is never disabled: a disabled button tells a screen-reader
 * user nothing about why they are stuck. Invalid submits render a focusable
 * error summary instead (user-flows §F3.1).
 */
export function PlanIntake({
  initialInput,
  onSubmit,
  submitLabel = "Build my plan",
}: {
  readonly initialInput?: PlanInput;
  readonly onSubmit: (input: PlanInput) => void;
  readonly submitLabel?: string;
}) {
  const baseId = useId();
  const daysId = `${baseId}-days`;
  const monthId = `${baseId}-month`;
  const summaryId = `${baseId}-errors`;
  const summaryRef = useRef<HTMLDivElement>(null);

  const [days, setDays] = useState<string>(
    initialInput ? String(initialInput.days) : "10",
  );
  const [arrivalMonth, setArrivalMonth] = useState<string>(
    initialInput ? String(initialInput.arrivalMonth) : "",
  );
  const [interests, setInterests] = useState<readonly Interest[]>(
    initialInput?.interests ?? [],
  );
  const [pace, setPace] = useState<Pace>(initialInput?.pace ?? "balanced");
  const [errors, setErrors] = useState<readonly FormError[]>([]);

  const errorFor = (fieldId: string): string | undefined =>
    errors.find((error) => error.fieldId === fieldId)?.message;

  function toggleInterest(interest: Interest): void {
    setInterests((current) => {
      if (current.includes(interest)) {
        return current.filter((value) => value !== interest);
      }
      if (current.length >= MAX_INTERESTS) return current;
      return [...current, interest];
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const parsedDays = Number(days);
    const parsedMonth = Number(arrivalMonth);
    const found: FormError[] = [];

    if (!Number.isInteger(parsedDays) || parsedDays < 2 || parsedDays > 30) {
      found.push({
        fieldId: daysId,
        message: "Enter how many days you have, between 2 and 30.",
      });
    }
    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      found.push({
        fieldId: monthId,
        message: "Choose the month you arrive — it changes the route we suggest.",
      });
    }

    setErrors(found);

    if (found.length > 0) {
      // Focus the summary, not the first field: the traveller needs to know how
      // many things need attention before being dropped into one of them.
      summaryRef.current?.focus();
      return;
    }

    onSubmit({
      days: parsedDays,
      arrivalMonth: parsedMonth,
      interests,
      pace,
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <ErrorSummary
        ref={summaryRef}
        id={summaryId}
        title={
          errors.length === 1
            ? "One thing needs your attention"
            : `${errors.length} things need your attention`
        }
        errors={errors}
      />

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm md:p-8">
        <h2 className="text-h4 text-ink-900">How long, and when?</h2>
        <p className="mt-1.5 text-small text-text-meta">
          Sri Lanka has two opposing monsoons, so the month you arrive decides which coast we
          send you to. It is not an optional detail.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <TextField
            id={daysId}
            label="Days in Sri Lanka"
            type="number"
            inputMode="numeric"
            min={2}
            max={30}
            step={1}
            value={days}
            onChange={(event) => setDays(event.target.value)}
            description="Counting the day you land and the day you fly out."
            error={errorFor(daysId)}
            autoComplete="off"
          />

          <SelectField
            id={monthId}
            label="Month you arrive"
            value={arrivalMonth}
            onChange={(event) => setArrivalMonth(event.target.value)}
            error={errorFor(monthId)}
          >
            <option value="">Choose a month</option>
            {MONTHS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm md:p-8">
        <FieldGroup
          legend="What are you here for?"
          description={`Pick up to ${MAX_INTERESTS}, or pick none and we will route you through the island's strongest places instead.`}
        >
          <ul className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => {
              const selected = interests.includes(interest);
              const full = !selected && interests.length >= MAX_INTERESTS;

              return (
                <li key={interest}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    disabled={full}
                    onClick={() => toggleInterest(interest)}
                    className={cn(
                      chipBase,
                      selected ? chipOn : chipOff,
                      full && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {selected ? <Check size={16} aria-hidden /> : null}
                    {interestName(interest)}
                  </button>
                </li>
              );
            })}
          </ul>

          <p aria-live="polite" className="mt-3 text-small text-text-meta">
            {interests.length} of {MAX_INTERESTS} selected
            {interests.length >= MAX_INTERESTS
              ? " — deselect one to choose something else"
              : ""}
          </p>
        </FieldGroup>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm md:p-8">
        <FieldGroup
          legend="Pace"
          description="How much moving around you are willing to do."
        >
          <div className="flex flex-wrap gap-2">
            {PACES.map((option) => (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name={`${baseId}-pace`}
                  value={option.value}
                  checked={pace === option.value}
                  onChange={() => setPace(option.value)}
                  className="np-sr-only peer"
                />
                <span
                  className={cn(
                    chipBase,
                    chipOff,
                    "peer-checked:border-jungle-700 peer-checked:bg-jungle-700 peer-checked:font-semibold peer-checked:text-white",
                    "peer-checked:hover:border-jungle-600 peer-checked:hover:bg-jungle-600 peer-checked:hover:text-white",
                    "peer-focus-visible:shadow-[var(--focus-ring)]",
                  )}
                >
                  {option.label}
                </span>
              </label>
            ))}
          </div>

          <p className="mt-3 text-small text-text-meta">
            {PACES.find((option) => option.value === pace)?.hint}
          </p>
        </FieldGroup>
      </div>

      <div>
        <Button type="submit" variant="solid" size="lg" className="w-full md:w-auto">
          {submitLabel}
        </Button>
        <p className="mt-3 text-small text-text-meta">
          Nothing is sent anywhere. The plan is built in your browser and you can change
          every day of it afterwards.
        </p>
      </div>
    </form>
  );
}
