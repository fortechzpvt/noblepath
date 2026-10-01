/**
 * Build step: pull published content from Supabase into the site (D-36).
 *
 * Runs before every `next dev`, `next build` and typecheck (`predev`,
 * `prebuild`, `pretypecheck` in package.json). It writes
 * `content/generated/snapshot.json`, which `lib/content-source.ts` imports, and
 * copies every uploaded image the published content uses into `public/media/`.
 *
 * - No `CONTENT_DATABASE_URL`: writes an empty placeholder, and the site uses
 *   the content bundled in `content/*.ts`. That is how local development works
 *   without a database.
 * - `REQUIRE_DATABASE_CONTENT=true` (set in production): a missing URL, an
 *   unreachable database, an empty table or content that fails validation all
 *   fail the build. The hosting platform then keeps serving the previous
 *   deployment, instead of silently publishing stale bundled content.
 *
 * Connects as `np_site_build`, which can read only the `published_content`
 * view and the media bytes (`db/roles.sql` in the `noblepathadmin` repository).
 */
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Client } from "pg";

import { findContentProblems } from "../lib/content-integrity";
import { snapshotSchema, type ContentKind, type ContentSnapshot } from "../lib/content-schema";
import { pgConfig } from "../lib/pg-config";

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "content", "generated");
const OUT_FILE = path.join(OUT_DIR, "snapshot.json");
const MEDIA_DIR = path.join(ROOT, "public", "media");

const url = process.env.CONTENT_DATABASE_URL;
const required = process.env.REQUIRE_DATABASE_CONTENT === "true";

function writePlaceholder(reason: string): void {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify({ version: 0, reason }) + "\n");
  console.log(`[pull-content] Using the bundled content in content/*.ts (${reason}).`);
}

function fail(message: string): never {
  console.error(`[pull-content] ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (!url) {
    if (required) fail("REQUIRE_DATABASE_CONTENT is true but CONTENT_DATABASE_URL is not set.");
    writePlaceholder("CONTENT_DATABASE_URL is not set");
    return;
  }

  const client = new Client(pgConfig(url));
  try {
    await client.connect();
  } catch (error) {
    const message = `Could not connect to the content database: ${(error as Error).message}`;
    if (required) fail(message);
    writePlaceholder("the content database could not be reached");
    console.warn(`[pull-content] ${message}`);
    return;
  }

  try {
    const { rows } = await client.query<{ kind: ContentKind; data: unknown }>(
      "select kind, data from published_content order by kind, position, slug",
    );

    const of = (kind: ContentKind) => rows.filter((row) => row.kind === kind).map((row) => row.data);
    const candidate = {
      version: 1,
      generatedAt: new Date().toISOString(),
      regions: of("region"),
      destinations: of("destination"),
      experiences: of("experience"),
      trips: of("trip"),
      accommodations: of("accommodation"),
      activityCategories: of("activity-category"),
      activities: of("activity"),
      vehicles: of("vehicle"),
      site: of("site")[0] ?? null,
    };

    if (candidate.destinations.length === 0) {
      const message = "The database has no published destinations. Run `npm run db:seed` or publish content first.";
      if (required) fail(message);
      writePlaceholder("the content database is empty");
      console.warn(`[pull-content] ${message}`);
      return;
    }

    const parsed = snapshotSchema.safeParse(candidate);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, 20)
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
      fail(`Published content failed validation:\n${issues}`);
    }
    const snapshot: ContentSnapshot = parsed.data;

    // Cross-references, checked here with a readable list (D-39, F-39-25).
    // "Publish" checks them in the admin, but unpublishing or deleting an item
    // does not, and any later build (a code push, a redeploy) then failed deep
    // inside lib/content.ts with a stack trace instead of saying what to fix.
    const problems = findContentProblems(snapshot);
    if (problems.length > 0) {
      fail(
        `Published content has broken references. Fix these in the admin, then Publish:\n` +
          problems.slice(0, 20).map((problem) => `  - ${problem}`).join("\n"),
      );
    }

    // Every image the published content uses must exist (D-39, F-39-26).
    // Before, a typo in a /images/… path or a /media/<id>.webp for an upload
    // stored as .jpg passed validation and shipped a broken image.
    const json = JSON.stringify(snapshot);
    const sitePaths = new Set([...json.matchAll(/"(\/images\/[^"]+)"/g)].map((match) => match[1]!));
    const missingSiteImages = [...sitePaths].filter((src) => !existsSync(path.join(ROOT, "public", src)));
    if (missingSiteImages.length > 0) {
      fail(`Published content uses site images that do not exist:\n${missingSiteImages.map((src) => `  - ${src}`).join("\n")}`);
    }

    // Copy the uploaded images that published content actually uses, into a
    // fresh folder that replaces the old one only once every file is written,
    // so a failure never leaves public/media empty.
    const referenced = new Map<string, string>(); // id -> ext the content asks for
    for (const match of json.matchAll(/\/media\/([0-9a-f-]{36})\.(jpg|webp|png)/g)) {
      referenced.set(match[1]!, match[2]!);
    }
    const staging = `${MEDIA_DIR}.next-build`;
    rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true });
    if (referenced.size > 0) {
      const media = await client.query<{ id: string; ext: string; bytes: Buffer }>(
        "select id, ext, bytes from media where id = any($1::uuid[])",
        [[...referenced.keys()]],
      );
      const problems: string[] = [];
      for (const [id, ext] of referenced) {
        const row = media.rows.find((candidate) => candidate.id === id);
        if (!row) problems.push(`/media/${id}.${ext} (no such upload)`);
        else if (row.ext !== ext) problems.push(`/media/${id}.${ext} (the upload is .${row.ext})`);
      }
      if (problems.length > 0) fail(`Published content uses uploaded images that cannot be served:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
      for (const file of media.rows) writeFileSync(path.join(staging, `${file.id}.${file.ext}`), file.bytes);
    }
    rmSync(MEDIA_DIR, { recursive: true, force: true });
    renameSync(staging, MEDIA_DIR);

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, JSON.stringify(snapshot) + "\n");
    console.log(
      `[pull-content] ${snapshot.destinations.length} destinations, ${snapshot.experiences.length} experiences, ` +
        `${snapshot.trips.length} trips, ${snapshot.accommodations.length} stays, ${snapshot.activities.length} activities, ` +
        `${referenced.size} uploaded images.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => fail((error as Error).message));
