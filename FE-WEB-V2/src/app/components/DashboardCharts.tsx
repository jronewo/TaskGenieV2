import React, { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ProjectDto, TaskSummaryDto } from "../services/projectApi";
import { ChartEmpty, ChartLegend, ChartPanel, ChartTooltip, STATUS_COLOR } from "./charts/chartTheme";

const STATUS_ORDER = ["Todo", "InProgress", "InReview", "Done"] as const;

const STATUS_LABELS: Record<string, string> = {
  Todo: "To do",
  InProgress: "In progress",
  InReview: "In review",
  Done: "Done",
};

interface Props {
  projects: ProjectDto[];
  tasks: TaskSummaryDto[];
}

/**
 * Charts over the workspace the signed-in user can actually see. Every figure is derived from the
 * rows the API returned — there is no sample series here, so an empty workspace renders empty.
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
    <div className="p-4 pb-0">
      <ChartPanel title="Task status" subtitle={`${tasks.length} task trong các dự án của bạn`}>
        {statusData.length === 0 ? (
          <ChartEmpty message="Chưa có task nào." />
        ) : (
          <>
            {/* The donut hole carries the number people came for, instead of leaving a blank. */}
            <div className="relative h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={70}
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
                <span className="text-lg font-semibold text-gray-900">{completion}%</span>
                <span className="text-[9px] text-gray-500">
                  {doneCount}/{tasks.length} xong
                </span>
              </div>
            </div>
            <ChartLegend
              items={statusData.map((s) => ({
                label: s.name,
                value: s.value,
                color: STATUS_COLOR[s.status],
              }))}
            />
          </>
        )}
      </ChartPanel>

    </div>
  );
};
