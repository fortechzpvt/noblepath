/**
 * Pure helpers for the cookie-free visitor statistics (D-36).
 *
 * Kept free of request and database code so they can be tested on their own.
 * Nothing here returns anything that identifies a person: paths are stripped of
 * query strings, referrers are reduced to a site name, and devices to one of
 * three classes.
 */

export type DeviceClass = "mobile" | "tablet" | "desktop";

/** Crawlers, link previewers, monitors and headless browsers are not visitors. */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|fetch|monitor|lighthouse|headless|phantom|curl|wget|python|axios|node-fetch|go-http|java\/|facebookexternalhit|embedly|whatsapp|telegram|discord/i;

export function isBot(userAgent: string): boolean {
  return userAgent.trim() === "" || BOT_PATTERN.test(userAgent);
}

export function deviceOf(userAgent: string): DeviceClass {
  if (/ipad|tablet|kindle|silk|playbook/i.test(userAgent) || (/android/i.test(userAgent) && !/mobile/i.test(userAgent))) {
    return "tablet";
  }
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(userAgent)) return "mobile";
  return "desktop";
}

/**
 * The page path as counted: no query string or fragment (they can carry
 * personal data such as an email address in a campaign link), no trailing
 * slash, lower-case, at most 200 characters. `null` for anything that is not a
 * page on this site.
 */
export function normalizePath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  let value = raw.split(/[?#]/)[0]!.toLowerCase();
  if (value.length > 1) value = value.replace(/\/+$/, "");
  if (value.length > 200 || !/^\/[a-z0-9\-/._~%]*$/.test(value)) return null;
  if (value.startsWith("/api/") || value.startsWith("/_next/")) return null;
  return value;
}

/** The referring site's host name, without `www.`; empty for direct visits and our own pages. */
export function referrerHost(raw: unknown, ownHost: string): string {
  if (typeof raw !== "string" || raw === "") return "";
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    if (host === ownHost.toLowerCase().replace(/^www\./, "")) return "";
    return host.length <= 100 ? host : "";
  } catch {
    return "";
  }
}

/** ISO 3166 alpha-2 country from the hosting platform's geo header, or "??". */
export function countryOf(headerValue: string | null): string {
  const value = (headerValue ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(value) && value !== "XX" ? value : "??";
}
