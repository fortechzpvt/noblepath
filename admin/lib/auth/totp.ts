import { Secret, TOTP } from "otpauth";

/**
 * Authenticator-app codes (RFC 6238: 6 digits, 30 seconds, SHA-1, which is
 * what every authenticator app supports) (D-36).
 */
const PERIOD = 30;

function totp(secretBase32: string, email: string): TOTP {
  return new TOTP({
    issuer: "Noble Path Admin",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: PERIOD,
    secret: Secret.fromBase32(secretBase32),
  });
}

export function newTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function totpUri(secretBase32: string, email: string): string {
  return totp(secretBase32, email).toString();
}

/**
 * Checks a code, allowing one step of clock drift either way. Returns the time
 * step it matched, so the caller can refuse the same code a second time, or
 * null when it does not match.
 */
export function checkTotp(secretBase32: string, email: string, code: string, now = Date.now()): number | null {
  const token = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return null;
  const delta = totp(secretBase32, email).validate({ token, window: 1, timestamp: now });
  if (delta === null) return null;
  return Math.floor(now / 1000 / PERIOD) + delta;
}
