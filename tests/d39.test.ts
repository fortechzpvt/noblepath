import assert from "node:assert/strict";
import { test } from "node:test";

import { colomboDay } from "../lib/analytics";
import { generateBookingRequestId } from "../lib/booking-request";
import { storable, storableText } from "../lib/safe-text";

test("text Postgres would refuse is cleaned before storing (F-39-13)", () => {
  assert.equal(storableText("a\u0000b"), "ab");
  assert.equal(storableText("Jo\ud800"), "Jo�");
  assert.equal(storableText("ශ්‍රී ලංකා"), "ශ්‍රී ලංකා");
  const cleaned = storable({ name: "x\u0000", list: ["\udc00", 3], nested: { ok: true } }) as Record<string, unknown>;
  assert.deepEqual(cleaned, { name: "x", list: ["�", 3], nested: { ok: true } });
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(cleaned)));
});

test("statistics days and reference ids use the Sri Lanka date (F-39-19, F-39-20)", () => {
  // 2026-10-01 20:00 UTC is 2026-10-02 01:30 in Colombo (UTC+5:30).
  const lateUtc = new Date(Date.UTC(2026, 9, 1, 20, 0));
  assert.equal(colomboDay(lateUtc), "2026-10-02");
  assert.match(generateBookingRequestId(lateUtc), /^NP-20261002-[A-Z0-9]{6}$/);
  // 2026-10-01 18:29 UTC is still 23:59 on the 1st in Colombo.
  assert.equal(colomboDay(new Date(Date.UTC(2026, 9, 1, 18, 29))), "2026-10-01");
});
