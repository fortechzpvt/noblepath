import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for secrets stored in the database (D-36): the TOTP secret. A
 * database dump without ADMIN_ENCRYPTION_KEY cannot be used to generate
 * sign-in codes. Format: `v1.<iv>.<tag>.<ciphertext>`, base64url.
 */
function key(raw: string): Buffer {
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length !== 32) throw new Error("ADMIN_ENCRYPTION_KEY must be 32 bytes, base64-encoded.");
  return buffer;
}

export function seal(plaintext: string, rawKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(rawKey), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), ciphertext].map((part) => (typeof part === "string" ? part : part.toString("base64url"))).join(".");
}

export function open(sealed: string, rawKey: string): string {
  const [version, iv, tag, ciphertext] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Unrecognised sealed value.");
  const decipher = createDecipheriv("aes-256-gcm", key(rawKey), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
