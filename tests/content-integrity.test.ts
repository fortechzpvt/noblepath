import assert from "node:assert/strict";
import { test } from "node:test";

import { accommodations } from "../content/accommodations";
import { activities, activityCategories } from "../content/activities";
import { destinations } from "../content/destinations";
import { experiences } from "../content/experiences";
import { regions } from "../content/regions";
import { trips } from "../content/trips";
import { findContentProblems } from "../lib/content-integrity";

const bundled = { regions, destinations, experiences, trips, accommodations, activities, activityCategories };

test("the bundled content has no broken references", () => {
  assert.deepEqual(findContentProblems(bundled), []);
});

test("removing a destination that others use is reported, as the admin's Publish page shows", () => {
  const problems = findContentProblems({ ...bundled, destinations: destinations.filter((d) => d.slug !== "ella") });
  assert.ok(problems.some((problem) => problem.includes('unknown destination "ella"')));
});

test("a package day over the 300-minute drive limit is reported", () => {
  const [first, ...rest] = trips;
  const longDay = { ...first!, days: first!.days.map((day, i) => (i === 0 ? { ...day, driveMinutes: 301 } : day)) };
  const problems = findContentProblems({ ...bundled, trips: [longDay, ...rest] });
  assert.ok(problems.some((problem) => problem.includes("over the 300 minute limit")));
});

test("credit links must be https: no javascript: or data: URLs", async () => {
  const { imageSchema } = await import("../lib/content-schema");
  const base = { src: "/images/x.jpg", alt: "A photo" };
  assert.equal(
    imageSchema.safeParse({ ...base, credit: "A. Photographer", sourceUrl: "https://commons.wikimedia.org/wiki/File:X.jpg" })
      .success,
    true,
  );
  assert.equal(imageSchema.safeParse({ ...base, sourceUrl: "javascript:alert(1)" }).success, false);
  assert.equal(imageSchema.safeParse({ ...base, licenceUrl: "data:text/html,hi" }).success, false);
  assert.equal(imageSchema.safeParse({ ...base, sourceUrl: "http://example.com" }).success, false);
  assert.equal(imageSchema.safeParse({ ...base, src: "javascript:alert(1)" }).success, false);
});

test("a photo with a source or licence link must carry a credit (F-39-24)", async () => {
  const { imageSchema } = await import("../lib/content-schema");
  const base = { src: "/images/x.jpg", alt: "A photo" };
  assert.equal(imageSchema.safeParse(base).success, true);
  assert.equal(imageSchema.safeParse({ ...base, licenceUrl: "https://creativecommons.org/licenses/by/4.0/" }).success, false);
  assert.equal(imageSchema.safeParse({ ...base, sourceUrl: "https://example.com/x", credit: "  " }).success, false);
  assert.equal(
    imageSchema.safeParse({ ...base, credit: "Jane Doe", licenceUrl: "https://creativecommons.org/licenses/by/4.0/" }).success,
    true,
  );
});
