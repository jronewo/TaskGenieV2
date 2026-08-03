import React from "react";

/**
 * Shared chart styling.
 *
 * recharts renders its tooltip and axes straight into the SVG with hardcoded light colours, so every
 * chart used to arrive as a white box floating over a dark page. These pieces are the fix, in one
 * place, so a new chart inherits the look instead of re-deriving it. Everything reads from the brand
 * tokens in `styles/brand.css`, which means light and dark are defined together rather than patched
 * apart afterwards.
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

export const STATUS_LABELS: Record<string, string> = {
  Todo: "To do",
  InProgress: "In progress",
  InReview: "In review",
  Done: "Done",
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
 * Pass `unit` to label the number ("task", "project") — a bare count in a floating box is a riddle.
 */
export const ChartTooltip =
  (unit?: string) =>
  ({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string | number }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 shadow-brand-lg">
        {label != null && label !== "" && (
          <p className="mb-1 text-[10px] font-semibold text-strong">{label}</p>
        )}
        {payload.map((entry, i) => (
          <p key={i} className="flex items-center gap-1.5 text-[10px] text-muted">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: entry.color }}
              aria-hidden
            />
            {entry.name != null && <span>{entry.name}:</span>}
            <span className="font-semibold text-strong tabular-nums">
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
  <ul className="mt-3 flex flex-wrap justify-center gap-x-3.5 gap-y-1.5">
    {items.map((item) => (
      <li key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted">
        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: item.color }} aria-hidden />
        {item.label}
        <span className="font-semibold text-strong tabular-nums">{item.value}</span>
      </li>
    ))}
  </ul>
);

/**
 * A titled chart card — one frame for every panel so the dashboard reads as one grid.
 * `action` takes a control (a filter, a toggle) that belongs to this panel rather than the page.
 */
export const ChartPanel = ({
  title,
  subtitle,
  icon,
  action,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <section
    className={`tg-chart rounded-xl border border-line bg-surface-raised p-4 transition-shadow hover:shadow-brand-md ${className}`}
  >
    <header className="flex items-start gap-2.5">
      {icon && (
        <span className="w-7 h-7 rounded-lg bg-surface-inset text-brand flex items-center justify-center shrink-0 mt-0.5">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[13px] font-semibold text-strong leading-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[10px] text-subtle">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
    <div className="mt-4">{children}</div>
  </section>
);

/** Shown instead of an axis-only chart frame when there is genuinely nothing to plot. */
export const ChartEmpty = ({ message }: { message: string }) => (
  <p className="py-10 text-center text-[11px] text-subtle">{message}</p>
);

/** Truncates a label to fit an axis without turning the chart into overlapping mush. */
export function shortLabel(value: string, max = 16): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
