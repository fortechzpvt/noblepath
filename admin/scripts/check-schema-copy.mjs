// Build guard (D-36): when the site's repository sits next to this app (the
// old monorepo layout), fail if the shared files differ from the site's. In
// the admin's own repository (Vercel) the site is not there, and the
// committed copies are used as they are.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let stale = false;
for (const file of ["content-schema.ts", "content-integrity.ts", "pg-config.ts"]) {
  const source = fileURLToPath(new URL(`../../lib/${file}`, import.meta.url));
  const copy = fileURLToPath(new URL(`../lib/${file}`, import.meta.url));
  if (!existsSync(source)) continue;
  if (readFileSync(source, "utf8") !== readFileSync(copy, "utf8")) {
    console.error(`[check-schema] lib/${file} differs from the site's. Run \`npm run sync-schema\`.`);
    stale = true;
  }
}
if (stale) process.exit(1);
