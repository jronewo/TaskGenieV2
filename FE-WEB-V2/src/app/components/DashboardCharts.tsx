import React, { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { ProjectDto, TaskSummaryDto } from "../services/projectApi";
import {
  ChartEmpty, ChartLegend, ChartPanel, ChartTooltip, STATUS_COLOR, STATUS_LABELS,
} from "./charts/chartTheme";

const STATUS_ORDER = ["Todo", "InProgress", "InReview", "Done"] as const;

interface Props {
  projects: ProjectDto[];
  tasks: TaskSummaryDto[];
}

/**
 * Charts over the workspace the signed-in user can actually see. Every figure is derived from the
 * rows the API returned — there is no sample series here, so an empty workspace renders empty.
 *
 * Deliberately one panel: the per-project breakdown and the risk bars were removed earlier because
 * they repeated what the project grid below already shows, and the guard test in
 * `__tests__/DashboardCharts.test.tsx` keeps them from creeping back.
 */
export const DashboardCharts = ({ projects, tasks }: Props) => {
  const statusData = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        name: STATUS_LABELS[status],
        status,
        value: tasks.filter((t) => (t.status ?? "Todo") === status).length,
      })).filter((slice) => slice.value > 0),
    [tasks]
  );

  const doneCount = tasks.filter((t) => t.status === "Done").length;
  const completion = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

  if (projects.length === 0) return null;

  return (
    <ChartPanel
      title="Task status"
      subtitle={`${tasks.length} task trong các dự án của bạn`}
      icon={<PieIcon size={14} strokeWidth={1.9} />}
    >
        {statusData.length === 0 ? (
        <ChartEmpty message="Chưa có task nào." />
      ) : (
        <>
          {/* The donut hole carries the number people came for, instead of leaving a blank. */}
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {statusData.map((slice) => (
                    <Cell key={slice.status} fill={STATUS_COLOR[slice.status]} />
                  ))}
                </Pie>
                <Tooltip content={ChartTooltip("task")} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-xl font-bold text-strong tabular-nums">
                {completion}%
              </span>
              <span className="text-[9px] text-subtle tabular-nums">
                {doneCount}/{tasks.length} xong
              </span>
            </div>
          </div>
          {/* One item per row: the panel is a third of the page wide now, so a wrapped
              horizontal legend would break mid-label. */}
          <ChartLegend
            layout="stack"
            items={statusData.map((s) => ({
              label: s.name,
              value: s.value,
              color: STATUS_COLOR[s.status],
            }))}
          />
        </>
      )}
    </ChartPanel>
  );
};
