import React from "react";

/**
 * Shared chart styling.
 *
 * recharts renders its default tooltip and axes straight into the SVG with hardcoded light colours,
 * so every chart in the app arrived as a white box floating over a dark page with axis labels that
 * overlapped as soon as a project had a long name. These pieces are the fix, in one place, so a new
 * chart inherits the look instead of re-deriving it.
 */

/** One palette, so the same thing is the same colour on every chart. */
export const CHART_COLORS = {
  todo: "#94A3B8",
  inProgress: "#3B82F6",
  inReview: "#F59E0B",
  done: "#10B981",
  low: "#10B981",
  medium: "#F59E0B",
  high: "#EF4444",
  critical: "#B91C1C",
  brand: "#6366F1",
  open: "#818CF8",
} as const;

export const STATUS_COLOR: Record<string, string> = {
  Todo: CHART_COLORS.todo,
  InProgress: CHART_COLORS.inProgress,
  InReview: CHART_COLORS.inReview,
  Done: CHART_COLORS.done,
};

export const RISK_COLOR: Record<string, string> = {
  LOW: CHART_COLORS.low,
  MEDIUM: CHART_COLORS.medium,
  HIGH: CHART_COLORS.high,
  CRITICAL: CHART_COLORS.critical,
};

/** Axis ticks read from the theme rather than recharts' hardcoded near-black. */
export const axisTick = { fontSize: 10, fill: "currentColor" } as const;

export const axisProps = {
  tick: axisTick,
  axisLine: false,
  tickLine: false,
  stroke: "currentColor",
} as const;

interface TooltipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
  payload?: Record<string, unknown>;
}

/**
 * Tooltip drawn as normal DOM, which means it inherits the page theme instead of fighting it.
 * Pass `unit` to label the number ("task", "dự án") — a bare count in a floating box is a riddle.
 */
export const ChartTooltip =
  (unit?: string) =>
  ({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string | number }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-lg">
        {label != null && label !== "" && (
          <p className="mb-1 text-[10px] font-semibold text-gray-900">{label}</p>
        )}
        {payload.map((entry, i) => (
          <p key={i} className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: entry.color }}
              aria-hidden
            />
            {entry.name != null && <span>{entry.name}:</span>}
            <span className="font-semibold text-gray-900">
              {entry.value}
              {unit ? ` ${unit}` : ""}
            </span>
          </p>
        ))}
      </div>
    );
  };

/**
 * Legend as a plain list, since recharts' own legend cannot show the figure beside the label —
 * and a colour swatch whose number you have to hover for is half a legend.
 */
export const ChartLegend = ({
  items,
}: {
  items: { label: string; value: number | string; color: string }[];
}) => (
  <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
    {items.map((item) => (
      <li key={item.label} className="flex items-center gap-1.5 text-[10px] text-gray-600">
        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: item.color }} aria-hidden />
        {item.label}
        <span className="font-semibold text-gray-900">{item.value}</span>
      </li>
    ))}
  </ul>
);

/** A titled chart card — one frame for every panel so the dashboard reads as one grid. */
export const ChartPanel = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <section className="tg-chart rounded-xl border border-gray-200 bg-white p-4">
    <h3 className="text-xs font-semibold text-gray-900">{title}</h3>
    {subtitle && <p className="mt-0.5 text-[10px] text-gray-500">{subtitle}</p>}
    <div className="mt-3">{children}</div>
  </section>
);

/** Shown instead of an axis-only chart frame when there is genuinely nothing to plot. */
export const ChartEmpty = ({ message }: { message: string }) => (
  <p className="py-10 text-center text-[11px] text-gray-500">{message}</p>
);

/** Truncates a label to fit an axis without turning the chart into overlapping mush. */
export function shortLabel(value: string, max = 16): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
