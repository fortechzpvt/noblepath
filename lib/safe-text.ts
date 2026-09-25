import { z } from "zod";

/**
 * Shared input hygiene for the enquiry endpoints (security review D-24,
 * findings F-5, F-6 and F-8). Used by `lib/validation.ts` and
 * `lib/ride-validation.ts`, and by both email builders.
 */

/**
 * Characters that can break or disguise a single line in the plain-text staff
 * email: control characters (`\p{Cc}`, CR/LF included), format characters
 * (`\p{Cf}`: bidi overrides, zero-width spaces and joiners) and the Unicode
 * line/paragraph separators (U+2028, U+2029). A name or a place never
 * legitimately needs them, and allowing them lets a sender forge an extra
 * `Email:` line or make two different strings look like the same place.
 */
//
// Exception: ZWNJ and ZWJ (U+200C, U+200D) are format characters that
// Sinhala and Tamil need to spell ordinary words (e.g. the "Sri" in
// "Sri Lanka" written in Sinhala), so they stay allowed.
//
// Every code point is built with fromCharCode: U+2028/U+2029 written
// literally are themselves line terminators and would break this source line.
const SEPARATORS = String.fromCharCode(0x2028, 0x2029);
const JOINERS = String.fromCharCode(0x200c, 0x200d);
const UNSAFE_CLASS = `(?![${JOINERS}])[\\p{Cc}\\p{Cf}${SEPARATORS}]`;
export const UNSAFE_LINE_CHARS = new RegExp(UNSAFE_CLASS, "u");
const UNSAFE_LINE_CHARS_GLOBAL = new RegExp(`(?:${UNSAFE_CLASS})+`, "gu");

/** `true` when a value is safe to print as one line in the staff email. */
export function isSingleLineText(value: string): boolean {
  return !UNSAFE_LINE_CHARS.test(value);
}

/**
 * Collapses every unsafe character to a space for the one field that becomes
 * a mail header. Resend takes a JSON payload, so classic CRLF header
 * injection does not apply, but stripping costs nothing and removes the
 * question entirely.
 */
export function sanitiseSubjectFragment(value: string): string {
  return value.replace(UNSAFE_LINE_CHARS_GLOBAL, " ").replace(/\s+/g, " ").trim();
}

/**
 * Honeypot field (`website`). It never fails validation, whatever its type or
 * length: a 400 naming this field would tell a bot exactly which check it
 * tripped (F-6). Any non-empty value collapses to `"filled"`, so the actual
 * content is never kept, logged or emailed.
 */
export const honeypotSchema = z
  .unknown()
  .transform((value): string =>
    value === undefined || value === null || (typeof value === "string" && value.trim() === "")
      ? ""
      : "filled",
  );

/** Digits only, so `"0x5"` or `"1e1"` never pass as a count and get emailed as sent (F-8). */
export const DIGITS_ONLY = /^\d{1,3}$/;
