import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";

import { DUMMY_HASH, hashPassword, passwordProblem, verifyPassword } from "../lib/auth/password";
import { open, seal } from "../lib/auth/secret-box";
import { checkTotp, newTotpSecret } from "../lib/auth/totp";
import { Secret, TOTP } from "otpauth";

test("passwords: the right one verifies, a wrong one and the dummy hash do not", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.match(hash, /^scrypt\$17\$8\$1\$/);
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("correct horse battery stapl", hash), false);
  assert.equal(await verifyPassword("anything", DUMMY_HASH), false);
  assert.equal(await verifyPassword("anything", "not-a-hash"), false);
});

test("passwords: policy", () => {
  assert.ok(passwordProblem("short", "owner@x.com"));
  assert.ok(passwordProblem("owner-is-my-password-ok", "owner@x.com"));
  assert.ok(passwordProblem("aaaaaaaaaaaaaaaa", "me@x.com"));
  assert.equal(passwordProblem("river lantern copper meadow", "me@x.com"), null);
});

test("secret box: round trip, wrong key and tampering fail", () => {
  const key = randomBytes(32).toString("base64");
  const sealed = seal("JBSWY3DPEHPK3PXP", key);
  assert.equal(open(sealed, key), "JBSWY3DPEHPK3PXP");
  assert.throws(() => open(sealed, randomBytes(32).toString("base64")));
  const parts = sealed.split(".");
  parts[3] = Buffer.from("tampered").toString("base64url");
  assert.throws(() => open(parts.join("."), key));
});

test("totp: accepts the current code with one step of drift, rejects others", () => {
  const secret = newTotpSecret();
  const now = Date.UTC(2026, 8, 30, 12, 0, 15);
  const gen = (at: number) => new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 }).generate({ timestamp: at });
  const step = Math.floor(now / 30_000);
  assert.equal(checkTotp(secret, "a@b.c", gen(now), now), step);
  assert.equal(checkTotp(secret, "a@b.c", gen(now - 30_000), now), step - 1);
  assert.equal(checkTotp(secret, "a@b.c", gen(now - 90_000), now), null);
  assert.equal(checkTotp(secret, "a@b.c", "12345", now), null);
  assert.equal(checkTotp(secret, "a@b.c", "abcdef", now), null);
});
