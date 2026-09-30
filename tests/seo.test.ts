import assert from "node:assert/strict";
import { test } from "node:test";

import { PRODUCTION_SITE_URL, breadcrumbJsonLd, clip, indexableFor, jsonLdScript, pageMetadata } from "../lib/seo";

test("only the live origin in Vercel production (or off Vercel) is indexable", () => {
  assert.equal(indexableFor(PRODUCTION_SITE_URL, "production"), true);
  assert.equal(indexableFor(`${PRODUCTION_SITE_URL}/`, undefined), true);
  // A preview with the production URL copied into its settings must not be indexed.
  assert.equal(indexableFor(PRODUCTION_SITE_URL, "preview"), false);
  assert.equal(indexableFor("https://noblepath-git-main-fortechz.vercel.app", "production"), false);
  assert.equal(indexableFor("https://noblepathsrilanka.com", "production"), false);
  assert.equal(indexableFor("http://localhost:3000", undefined), false);
});

test("meta descriptions are clipped on a word boundary", () => {
  assert.equal(clip("Short enough."), "Short enough.");
  const long = "Sigiriya rises from the plain like a fortress. ".repeat(6);
  const clipped = clip(long, 155);
  assert.ok(clipped.length <= 155, `length ${clipped.length}`);
  assert.ok(clipped.endsWith("…"));
  assert.ok(!/\s…$/.test(clipped));
});

test("every page gets its own canonical, og:url and og:title", () => {
  const meta = pageMetadata({ title: "Sri Lanka Itineraries", description: "d", path: "/trips" });
  assert.deepEqual(meta.alternates, { canonical: "/trips" });
  assert.equal((meta.openGraph as { url: string }).url, "/trips");
  assert.equal((meta.openGraph as { title: string }).title, "Sri Lanka Itineraries | Noble Path");
});

test("breadcrumbs use absolute URLs and 1-based positions", () => {
  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Trips", path: "/trips" },
  ]);
  assert.equal(crumbs.itemListElement[1]?.position, 2);
  assert.match(crumbs.itemListElement[1]?.item ?? "", /^https?:\/\/[^/]+\/trips$/);
});

test("JSON-LD cannot close its own script element", () => {
  const html = jsonLdScript({ name: "</script><script>alert(1)</script>" }).__html;
  assert.ok(!html.includes("</script>"));
  assert.ok(html.includes("\\u003c/script>"));
});
