// Copies the shared content schema, integrity rules and Postgres TLS settings
// from the public site's repository into this app (D-36). The site's copies
// are the originals; edit them there, then run:
//
//   npm run sync-schema -- /path/to/NobalPath        (site repository root)
//
// Without a path it looks for the site one folder up (the old monorepo layout).
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(process.argv[2] ?? path.join(here, "..", ".."));
const FILES = ["content-schema.ts", "content-integrity.ts", "pg-config.ts"];

if (!existsSync(path.join(siteRoot, "lib", "content-schema.ts"))) {
  console.error(`[sync-schema] No lib/content-schema.ts under ${siteRoot}. Pass the site repository's path.`);
  process.exit(1);
}
for (const file of FILES) {
  copyFileSync(path.join(siteRoot, "lib", file), path.join(here, "..", "lib", file));
  console.log(`[sync-schema] Copied lib/${file}`);
}
