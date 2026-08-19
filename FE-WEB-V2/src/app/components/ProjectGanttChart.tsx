import React, { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, eachWeekOfInterval, format, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { GanttChartSquare, Loader2 } from "lucide-react";
import { taskApi, TaskDetailDto } from "../services/taskApi";
import { ApiError } from "../services/apiClient";
import { ChartEmpty, ChartPanel, STATUS_COLOR, CHART_COLORS } from "./charts/chartTheme";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message || `Request failed (${err.status}).`;
  return "Could not load the schedule. Please try again.";
}

const ROW_H = 32;
const HEADER_H = 24;
const PX_PER_DAY = 22;
const LEFT_COL_W = 168;

interface ScheduledTask {
  task: TaskDetailDto;
  start: Date;
  end: Date;
}

interface Props {
  projectId: number;
  onOpenTask?: (taskId: number) => void;
}

/**
 * One bar per task, positioned by real StartDate → Deadline, filled to Progress. Tasks missing
 * either date can't be placed on a timeline, so they're listed separately rather than silently
 * dropped. Dependency arrows are deliberately not drawn here — the "Dependency graph" view already
 * covers that, and mixing both concerns into one chart makes neither easy to read.
 */
export const ProjectGanttChart = ({ projectId, onOpenTask }: Props) => {
  const [tasks, setTasks] = useState<TaskDetailDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    taskApi
      .byProject(projectId)
      .then((list) => {
        if (!cancelled) setTasks(list);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const { scheduled, unscheduledCount } = useMemo(() => {
    const withDates: ScheduledTask[] = [];
    let missing = 0;
    for (const task of tasks) {
      if (task.startDate && task.deadline) {
        withDates.push({ task, start: startOfDay(parseISO(task.startDate)), end: startOfDay(parseISO(task.deadline)) });
      } else {
        missing += 1;
      }
    }
    withDates.sort((a, b) => a.start.getTime() - b.start.getTime());
    return { scheduled: withDates, unscheduledCount: missing };
  }, [tasks]);

  const range = useMemo(() => {
    if (scheduled.length === 0) return null;
    const rangeStart = scheduled.reduce((min, s) => (s.start < min ? s.start : min), scheduled[0].start);
    const rangeEnd = scheduled.reduce((max, s) => (s.end > max ? s.end : max), scheduled[0].end);
    return { rangeStart, rangeEnd };
  }, [scheduled]);

  const dayOffset = (d: Date) => (range ? differenceInCalendarDays(d, range.rangeStart) : 0);
  const timelineDays = range ? differenceInCalendarDays(range.rangeEnd, range.rangeStart) + 1 : 0;
  const timelineWidth = Math.max(timelineDays * PX_PER_DAY, 240);
  const chartHeight = HEADER_H + scheduled.length * ROW_H;

  const weekTicks = useMemo(() => {
    if (!range) return [];
    return eachWeekOfInterval({ start: range.rangeStart, end: range.rangeEnd }, { weekStartsOn: 1 });
  }, [range]);

  const today = startOfDay(new Date());
  const todayInRange = range ? isWithinInterval(today, { start: range.rangeStart, end: range.rangeEnd }) : false;

  const body = () => {
    if (loading) {
      return (
        <p className="flex items-center justify-center gap-2 py-10 text-[11px] text-subtle">
          <Loader2 size={13} className="animate-spin" aria-hidden /> Loading schedule…
        </p>
      );
    }
    if (error) {
      return (
        <p role="alert" className="py-10 text-center text-[11px] text-red-600 dark:text-red-400">
          {error}
        </p>
      );
    }
    if (scheduled.length === 0) {
      return (
        <ChartEmpty
          message={
            unscheduledCount > 0
              ? `${unscheduledCount} task(s) have no start date and/or deadline yet — set both to see them here.`
              : "This project has no tasks yet."
          }
        />
      );
    }

    return (
      <>
        <div className="flex">
          <div className="shrink-0" style={{ width: LEFT_COL_W }}>
            <div style={{ height: HEADER_H }} />
            {scheduled.map(({ task }) => (
              <button
                key={task.taskId}
                type="button"
                onClick={() => onOpenTask?.(task.taskId)}
                title={task.title ?? undefined}
                style={{ height: ROW_H }}
                className="flex w-full items-center truncate pr-2 text-left text-[11px] text-default hover:text-strong hover:underline"
              >
                <span className="truncate">{task.title ?? `Task #${task.taskId}`}</span>
              </button>
            ))}
          </div>

          <div className="min-w-0 flex-1 overflow-x-auto">
            <svg width={timelineWidth} height={chartHeight} role="img" aria-label="Project Gantt timeline">
              {weekTicks.map((tick) => {
                const x = dayOffset(tick) * PX_PER_DAY;
                return (
                  <g key={tick.toISOString()}>
                    <line x1={x} y1={0} x2={x} y2={chartHeight} stroke="currentColor" strokeOpacity={0.08} />
                    <text x={x + 3} y={14} fontSize={9} fill="currentColor" opacity={0.6}>
                      {format(tick, "dd/MM")}
                    </text>
                  </g>
                );
              })}

              {todayInRange && (
                <line
                  x1={dayOffset(today) * PX_PER_DAY}
                  y1={0}
                  x2={dayOffset(today) * PX_PER_DAY}
                  y2={chartHeight}
                  stroke={CHART_COLORS.high}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              )}

              {scheduled.map(({ task, start, end }, i) => {
                const x = dayOffset(start) * PX_PER_DAY;
                const width = Math.max((differenceInCalendarDays(end, start) + 1) * PX_PER_DAY, 6);
                const y = HEADER_H + i * ROW_H + 6;
                const barH = ROW_H - 12;
                const color = STATUS_COLOR[task.status ?? "Todo"] ?? CHART_COLORS.todo;
                const progress = Math.min(100, Math.max(0, task.progress ?? 0));

                return (
                  <g
                    key={task.taskId}
                    transform={`translate(${x}, ${y})`}
                    onClick={() => onOpenTask?.(task.taskId)}
                    style={{ cursor: onOpenTask ? "pointer" : "default" }}
                  >
                    <title>
                      {`${task.title ?? "Untitled"}\n${task.startDate} → ${task.deadline}\n${progress}% complete`}
                    </title>
                    <rect width={width} height={barH} rx={4} fill={color} opacity={0.22} />
                    <rect width={(width * progress) / 100} height={barH} rx={4} fill={color} />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {unscheduledCount > 0 && (
          <p className="mt-3 text-[10px] text-subtle">
            {unscheduledCount} task(s) not shown — missing a start date and/or deadline.
          </p>
        )}
      </>
    );
  };

  return (
    <ChartPanel title="Gantt · Project schedule" icon={<GanttChartSquare size={14} aria-hidden />}>
      {body()}
    </ChartPanel>
  );
};
