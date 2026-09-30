"use client";

import { useState } from "react";

import { SERIES } from "@/lib/chart-colors";

/**
 * Dashboard charts (D-36). Plain SVG, no chart library. Following the dataviz
 * rules the project uses: one axis, thin marks with 4px rounded data ends, a
 * 2px gap between bars, recessive grid, a hover tooltip on every mark, a
 * legend whenever there are two series, text in ink colours (never the series
 * colour), and a table view for every chart.
 *
 * Series colours live in lib/chart-colors.ts.
 */

const W = 640;
const H = 200;
const PAD = { top: 12, right: 8, bottom: 26, left: 36 };

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude * 4 >= value) ?? 10;
  return step * magnitude * 4;
}

/** A bar with only its top corners rounded, anchored to the baseline. */
function barPath(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

interface Stack {
  readonly label: string;
  /** Tooltip heading, e.g. a full date. */
  readonly title: string;
  readonly values: readonly number[];
  /** Extra tooltip lines. */
  readonly extra?: readonly string[];
}

export function BarChart({
  title,
  series,
  data,
  labelEvery = 1,
}: {
  readonly title: string;
  readonly series: readonly { readonly name: string; readonly color: string }[];
  readonly data: readonly Stack[];
  readonly labelEvery?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((d) => d.values.reduce((sum, v) => sum + v, 0));
  const max = niceMax(Math.max(0, ...totals));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, data.length);
  const gap = 2;
  const barW = Math.max(2, Math.min(28, slot - gap));
  const y = (value: number) => PAD.top + innerH - (value / max) * innerH;
  const ticks = [0, max / 2, max];
  const active = hover === null ? null : data[hover];

  return (
    <figure>
      {series.length > 1 ? (
        <ul className="mb-2 flex flex-wrap gap-4 text-xs text-ink-700" aria-label="Legend">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#eceeec" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end" fontSize={11} fill="#6b726d">
                {Math.round(tick).toLocaleString("en-US")}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = PAD.left + i * slot + (slot - barW) / 2;
            let base = 0;
            const segments = d.values.map((value, s) => {
              const top = base + value;
              // 2px surface gap between stacked segments.
              const height = y(base) - y(top) - (s > 0 && value > 0 ? gap : 0);
              const segment = { y: y(top), height, color: series[s]!.color, value };
              base = top;
              return segment;
            });
            const lastVisible = segments.map((seg) => seg.value > 0).lastIndexOf(true);
            return (
              <g key={d.label} opacity={hover === null || hover === i ? 1 : 0.45}>
                {segments.map((seg, s) =>
                  seg.value > 0 ? (
                    s === lastVisible ? (
                      <path key={s} d={barPath(x, seg.y, barW, seg.height)} fill={seg.color} />
                    ) : (
                      <rect key={s} x={x} y={seg.y} width={barW} height={Math.max(0, seg.height)} fill={seg.color} />
                    )
                  ) : null,
                )}
                {/* Hit target: the whole column, much larger than the bar. */}
                <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
                {i % labelEvery === 0 ? (
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#6b726d">
                    {d.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="#8a918c" strokeWidth={1} />
        </svg>
        {active && hover !== null ? (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-36 -translate-x-1/2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs shadow-md"
            // Kept inside the card at either end of the axis.
            style={{ left: `${Math.min(82, Math.max(18, ((PAD.left + hover * slot + slot / 2) / W) * 100))}%` }}
          >
            <p className="font-semibold text-ink-900">{active.title}</p>
            {series.map((s, index) => (
              <p key={s.name} className="mt-0.5 flex items-center gap-1.5 text-ink-700">
                <span aria-hidden className="inline-block size-2 rounded-sm" style={{ background: s.color }} />
                {s.name}: <span className="font-semibold text-ink-900">{(active.values[index] ?? 0).toLocaleString("en-US")}</span>
              </p>
            ))}
            {active.extra?.map((line) => (
              <p key={line} className="mt-0.5 text-ink-600">{line}</p>
            ))}
          </div>
        ) : null}
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-ink-600">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-ink-500">
              <th className="py-1 font-medium">Period</th>
              {series.map((s) => (
                <th key={s.name} className="py-1 font-medium">{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t border-ink-100">
                <td className="py-1">{d.title}</td>
                {d.values.map((v, i) => (
                  <td key={i} className="py-1">{v.toLocaleString("en-US")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** A ranked list with proportional bars. Values are printed, so no tooltip is needed. */
export function RankedBars({ items, empty }: { readonly items: readonly { label: string; value: number }[]; readonly empty: string }) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-ink-500">{empty}</p>;
  const max = Math.max(...items.map((item) => item.value));
  return (
    <ol className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="truncate text-ink-800" title={item.label}>{item.label}</span>
            <span className="font-semibold text-ink-900 tabular-nums">{item.value.toLocaleString("en-US")}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-ink-100">
            <div className="h-1.5 rounded-full" style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: SERIES.primary }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
