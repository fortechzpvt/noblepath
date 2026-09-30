import assert from "node:assert/strict";
import { test } from "node:test";

import { kindSpec } from "../lib/content-kinds";
import { contentSchemas } from "../lib/content-schema";
import { fieldErrors, formToObject } from "../lib/form-data";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

test("a complete trip form parses and validates", () => {
  const spec = kindSpec("trip")!;
  const days = [
    { title: "Arrive", destinationSlug: "negombo", overnightIn: "negombo", driveMinutes: 30, experienceSlugs: [], summary: "Rest." },
    { title: "Leave", destinationSlug: "negombo", overnightIn: "", driveMinutes: 30, experienceSlugs: [], summary: "Fly home." },
  ];
  const object = formToObject(
    spec,
    form([
      ["name", "Short Break"], ["tagline", "Two days"], ["summary", "A short one."], ["durationDays", "2"],
      ["tier", "short"], ["interests", "beach"], ["priceBandPerPerson", "$"], ["priceFromUsd", "$1,250"],
      ["image.src", "/media/00000000-0000-0000-0000-000000000000.jpg"], ["image.alt", "A beach"],
      ["destinationSlugs", '["negombo"]'], ["days", JSON.stringify(days)],
      ["includes", "Driver\nHotels\n"], ["excludes", ""], ["bestMonths", "12"], ["bestMonths", "1"],
    ]),
    "short-break",
  );
  const parsed = contentSchemas.trip.safeParse(object);
  assert.equal(parsed.success, true, JSON.stringify(parsed.error?.issues));
  const trip = parsed.data!;
  assert.equal(trip.priceFromUsd, 1250);
  assert.deepEqual(trip.bestMonths, [1, 12]);
  assert.deepEqual(trip.includes, ["Driver", "Hotels"]);
  assert.equal(trip.days[1]!.overnightIn, null);
  assert.equal(trip.days[1]!.day, 2);
});

test("a blank price means no price, not zero", () => {
  const object = formToObject(kindSpec("vehicle")!, form([["label", "Van"], ["priceFromUsd", ""]]), "van");
  assert.equal("priceFromUsd" in object, false);
  assert.equal(contentSchemas.vehicle.safeParse(object).success, true);
});

test("paragraphs split on blank lines", () => {
  const object = formToObject(kindSpec("destination")!, form([["description", "One\nstill one.\n\nTwo."]]), "x");
  assert.deepEqual(object.description, ["One still one.", "Two."]);
});

test("errors are mapped to form field names in plain words", () => {
  const parsed = contentSchemas.trip.safeParse(formToObject(kindSpec("trip")!, form([["name", ""]]), "ok-slug"));
  assert.equal(parsed.success, false);
  const errors = fieldErrors(parsed.error!);
  assert.equal(errors.name, "Required.");
  assert.equal(errors.durationDays, "Required.");
  assert.ok(errors["image.src"]);
});
