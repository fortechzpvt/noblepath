import assert from "node:assert/strict";
import { test } from "node:test";

import { countryOf, deviceOf, isBot, normalizePath, referrerHost } from "../lib/analytics";

test("paths lose query strings and fragments, which can carry personal data", () => {
  assert.equal(normalizePath("/?utm=me@example.com"), "/");
  assert.equal(normalizePath("/Trips/Classic-Sri-Lanka/#days"), "/trips/classic-sri-lanka");
  assert.equal(normalizePath("//evil.example/x"), null);
  assert.equal(normalizePath("https://evil.example/"), null);
  assert.equal(normalizePath("/api/bookings"), null);
  assert.equal(normalizePath("/<script>"), null);
  assert.equal(normalizePath("/" + "a".repeat(300)), null);
  assert.equal(normalizePath(42), null);
});

test("referrers are reduced to a site name, and our own site is not a referrer", () => {
  assert.equal(referrerHost("https://www.google.com/search?q=sri+lanka", "noblepath.lk"), "google.com");
  assert.equal(referrerHost("https://noblepath.lk/trips", "noblepath.lk"), "");
  assert.equal(referrerHost("not a url", "noblepath.lk"), "");
  assert.equal(referrerHost("", "noblepath.lk"), "");
});

test("devices, bots and countries", () => {
  assert.equal(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148"), "mobile");
  assert.equal(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "tablet");
  assert.equal(deviceOf("Mozilla/5.0 (Linux; Android 14; SM-X710)"), "tablet");
  assert.equal(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)"), "desktop");
  assert.equal(isBot("Googlebot/2.1 (+http://www.google.com/bot.html)"), true);
  assert.equal(isBot("curl/8.4.0"), true);
  assert.equal(isBot(""), true);
  assert.equal(isBot("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605.1.15"), false);
  assert.equal(countryOf("lk"), "LK");
  assert.equal(countryOf("XX"), "??");
  assert.equal(countryOf(null), "??");
  assert.equal(countryOf("<b>"), "??");
});
