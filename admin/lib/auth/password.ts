import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with scrypt (D-36), at OWASP's recommended cost:
 * N = 2^17, r = 8, p = 1 (about 128 MB and a few hundred ms per hash, which is
 * the point: a stolen hash is expensive to attack). The cost is stored with
 * the hash so it can be raised later without invalidating old hashes.
 *
 * Format: `scrypt$<log2 N>$<r>$<p>$<salt b64>$<hash b64>`.
 *
 * No `server-only` import: the create-admin script uses this too.
 */
const LOG_N = 17;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 14;

function derive(password: string, salt: Buffer, logN: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const N = 2 ** logN;
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { N, r, p, maxmem: 256 * N * r }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, LOG_N, R, P);
  return ["scrypt", LOG_N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, logN, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !logN || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), Number(logN), Number(r), Number(p));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A hash of a random password, compared against when the email is unknown, so timing does not reveal it. */
export const DUMMY_HASH =
  "scrypt$17$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(KEY_LENGTH).toString("base64");

/** Returns a problem to show, or null when the password is acceptable. */
export function passwordProblem(password: string, email: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > 256) return "Use at most 256 characters.";
  // Short names ("me", "kt") would match too many ordinary words to be useful.
  const name = email.split("@")[0]!.toLowerCase();
  if (name.length >= 4 && password.toLowerCase().includes(name)) return "Do not include your email name.";
  if (new Set(password).size < 6) return "Use more varied characters.";
  return null;
}
