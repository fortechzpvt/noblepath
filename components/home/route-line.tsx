/**
 * The dotted route line and its map pin.
 *
 * Purely decorative — design-system §10.5 requires it to be aria-hidden and never
 * the sole carrier of meaning. The geometry is an authored, irregular cubic Bézier
 * rather than a generated arc, so it reads as hand-drawn.
 *
 * The visible stroke uses `stroke-dasharray: 0.5 11` with round caps, which renders
 * as round dots rather than dashes. That dash pattern is already spoken for, so the
 * draw-on cannot also use dashoffset on the same stroke; instead the whole path is
 * revealed through a mask whose own stroke animates from fully-offset to zero.
 * `pathLength={1}` on the mask normalises the geometry so the dash maths is simply
 * 1 → 0 regardless of how the path is later reshaped.
 *
 * Under `prefers-reduced-motion` `.np-route-draw` resolves to a fully-drawn,
 * unanimated state, so the line is present but never animates in.
 */
export function RouteLine({ className }: { readonly className?: string }) {
  const d =
    "M30 18 C 26 74, 44 96, 62 128 S 96 182, 78 214 S 30 250, 58 286 " +
    "S 148 306, 196 318 S 292 330, 342 344 S 404 358, 412 382";

  return (
    <svg
      viewBox="0 0 420 400"
      fill="none"
      role="presentation"
      aria-hidden="true"
      className={className}
      style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.45))" }}
    >
      <defs>
        <mask id="np-route-reveal" maskUnits="userSpaceOnUse">
          <path
            d={d}
            stroke="#FFFFFF"
            strokeWidth={24}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="np-route-draw"
            style={{ ["--np-route-length" as string]: "1" }}
          />
        </mask>
      </defs>

      <path
        d={d}
        stroke="#FFFFFF"
        strokeOpacity="0.92"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="0.5 11"
        mask="url(#np-route-reveal)"
      />
    </svg>
  );
}
