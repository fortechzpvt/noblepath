import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";

/**
 * Serves an uploaded image to the signed-in admin, for previews (D-36). The
 * public site does not use this route: its build copies the images it needs
 * into its own public/media/ folder.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  await requireAdmin();
  const match = /^([0-9a-f-]{36})\.(jpg|webp|png)$/.exec((await params).file);
  if (!match) return new NextResponse(null, { status: 404 });
  const { rows } = await db().query<{ bytes: Buffer; mime: string }>("select bytes, mime from media where id = $1 and ext = $2", [
    match[1],
    match[2],
  ]);
  const row = rows[0];
  if (!row) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "private, max-age=3600",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
