import { INTERESTS } from "@/components/plan/plan-intake";
import type { Interest, Pace, PlanInput } from "@/lib/types";

/**
 * `localStorage` key and payload version for a saved `/plan` itinerary.
 *
 * The version is part of the key rather than the payload so that a future,
 * incompatible shape simply does not collide with this one — an old payload
 * is then ignored by construction instead of needing a migration path.
 */
export const PLAN_STORAGE_KEY = "np.plan.v1";

export interface StoredPlan {
  readonly input: PlanInput;
  /** Engine that produced the day order below. Edits are dropped if it changed. */
  readonly engineVersion: string;
  /** Original day numbers in the traveller's chosen order; `null` when untouched. */
  readonly dayOrder: readonly number[] | null;
}

function isPace(value: unknown): value is Pace {
  return value === "relaxed" || value === "balanced" || value === "packed";
}

function isInterest(value: unknown): value is Interest {
  return typeof value === "string" && INTERESTS.includes(value as Interest);
}

/**
 * Parse a stored plan defensively.
 *
 * Anything in `localStorage` is editable by the visitor and survives across
 * deployments, so it is treated as untrusted input: every field is checked, and
 * a single bad value discards the whole payload rather than producing a
 * half-valid `PlanInput` that the engine then has to cope with.
 */
export function parseStoredPlan(raw: string): StoredPlan | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;

  const input = record.input;
  if (typeof input !== "object" || input === null) return null;
  const inputRecord = input as Record<string, unknown>;

  const days = inputRecord.days;
  const arrivalMonth = inputRecord.arrivalMonth;
  if (typeof days !== "number" || !Number.isFinite(days)) return null;
  if (typeof arrivalMonth !== "number" || !Number.isFinite(arrivalMonth)) return null;

  const interests = Array.isArray(inputRecord.interests)
    ? inputRecord.interests.filter(isInterest)
    : [];

  const dayOrder =
    Array.isArray(record.dayOrder) &&
    record.dayOrder.every((value) => typeof value === "number" && Number.isFinite(value))
      ? (record.dayOrder as readonly number[])
      : null;

  return {
    input: {
      days,
      arrivalMonth,
      interests,
      ...(isPace(inputRecord.pace) ? { pace: inputRecord.pace } : {}),
      ...(typeof inputRecord.startingPoint === "string"
        ? { startingPoint: inputRecord.startingPoint }
        : {}),
    },
    engineVersion: typeof record.engineVersion === "string" ? record.engineVersion : "",
    dayOrder,
  };
}

/** Safe, synchronous, one-shot read — for a mount effect elsewhere (e.g. the booking form). */
export function readStoredPlan(): StoredPlan | null {
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (raw === null) return null;
    return parseStoredPlan(raw);
  } catch {
    // Storage throws in private mode; callers just see no saved plan.
    return null;
  }
}
