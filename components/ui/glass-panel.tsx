import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Frosted surface over photography.
 *
 * `tone` selects the colour layer. That layer alone must carry the text contrast:
 * `backdrop-filter` is progressive enhancement and averages highlights rather
 * than removing them, so a glass panel carrying text uses `text` (0.55) or
 * stronger — design-system §10.3.
 */
export function GlassPanel({
  children,
  tone = "default",
  className,
}: {
  readonly children: ReactNode;
  readonly tone?: "default" | "text" | "strong" | "light";
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "np-glass rounded-xl",
        tone === "text" && "np-glass-text",
        tone === "strong" && "np-glass-strong",
        tone === "light" && "np-glass-light",
        className,
      )}
    >
      {children}
    </div>
  );
}
