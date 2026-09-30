/**
 * Dashboard series colours (D-36). A plain module, not part of the "use client"
 * chart file, so server components receive the values rather than a client
 * reference.
 *
 * Green #1b7a3e (bookings, and single-series charts) and amber #b8801f
 * (rides), checked with the dataviz palette validator against the white card
 * surface: all checks pass, colour-blind separation 8.3 ΔE. The brand's
 * jungle-700 was too grey (low chroma) to use as a data colour.
 */
export const SERIES = { primary: "#1b7a3e", secondary: "#b8801f" } as const;
