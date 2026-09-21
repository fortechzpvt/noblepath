/**
 * Minimal class-name joiner.
 *
 * Deliberately not `clsx` + `tailwind-merge`: the components in this project
 * compose a fixed set of variants rather than accepting arbitrary overriding
 * class strings, so conflict resolution is unnecessary weight on the bundle.
 */
export function cn(...parts: ReadonlyArray<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
