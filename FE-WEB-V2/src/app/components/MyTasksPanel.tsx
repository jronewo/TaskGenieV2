import React, { useEffect, useMemo, useState } from "react";
import { CircleDashed, Loader2, PlayCircle, ListChecks, AlertTriangle } from "lucide-react";
import { taskApi, TaskDetailDto } from "../services/taskApi";
import { ProjectDto } from "../services/projectApi";
import { ChartEmpty, ChartPanel, RISK_COLOR } from "./charts/chartTheme";

/**
 * The signed-in user's own open work.
 *
 * Only Todo and In Progress appear: In Review has left their hands and Done needs no action, so
 * listing either turns the panel into a log rather than a queue. The project filter narrows the
 * list without refetching — `/tasks/my` already returns every project the user is assigned in.
 */

const ALL = "all";

const STATUS_GROUPS = [
  {
    key: "Todo",
    label: "To do",
    icon: CircleDashed,
    accent: "#94A3B8",
  },
  {
    key: "InProgress",
    label: "In progress",
    icon: PlayCircle,
    accent: "#3B82F6",
  },
] as const;

function formatDeadline(value?: string | null): { text: string; overdue: boolean } | null {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return { text: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { text: "Due today", overdue: true };
  if (days === 1) return { text: "Due tomorrow", overdue: false };
  return { text: `Due in ${days}d`, overdue: false };
}

const TaskRow = ({
  task,
  projectName,
  onOpen,
}: {
  task: TaskDetailDto;
  projectName: string | null;
  onOpen: (taskId: number) => void;
}) => {
  const due = formatDeadline(task.deadline);
  const risk = (task.riskLevel ?? "").toUpperCase();
  const progress = task.progress ?? 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(task.taskId)}
      className="w-full text-left rounded-lg border border-line bg-surface p-3 hover:border-strong hover:shadow-brand-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-[12px] font-medium text-strong leading-snug flex-1 line-clamp-2">
          {task.title ?? `Task #${task.taskId}`}
        </p>
        {risk && RISK_COLOR[risk] && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 tracking-wide"
            style={{
              color: RISK_COLOR[risk],
              background: `color-mix(in srgb, ${RISK_COLOR[risk]} 14%, transparent)`,
            }}
          >
            {risk}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[10px] text-subtle">
        {projectName && <span className="truncate max-w-[45%]">{projectName}</span>}
        {due && (
          <span className={`inline-flex items-center gap-1 ${due.overdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}`}>
            {due.overdue && <AlertTriangle size={10} />}
            {due.text}
          </span>
        )}
        <span className="ml-auto tabular-nums">{progress}%</span>
      </div>

      <div className="mt-1.5 h-1 rounded-full bg-surface-inset overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--brand-600)] transition-[width] duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </button>
  );
};

export const MyTasksPanel = ({
  projects,
  onOpenTask,
}: {
  projects: ProjectDto[];
  onOpenTask: (taskId: number) => void;
}) => {
  const [tasks, setTasks] = useState<TaskDetailDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>(ALL);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await taskApi.myTasks();
        if (!cancelled) setTasks(list);
      } catch {
        if (!cancelled) {
          setError("Could not load your tasks.");
          setTasks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const projectName = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of projects) map.set(p.projectId, p.name ?? `Project #${p.projectId}`);
    return map;
  }, [projects]);

  /** In Review and Done are deliberately excluded — this panel is a queue, not a history. */
  const openTasks = useMemo(
    () => tasks.filter((t) => (t.status ?? "Todo") === "Todo" || t.status === "InProgress"),
    [tasks]
  );

  /** Only projects the user actually has open work in appear in the filter. */
  const filterOptions = useMemo(() => {
    const ids = new Set<number>();
    for (const t of openTasks) if (t.projectId != null) ids.add(t.projectId);
    return [...ids]
      .map((id) => ({ id, name: projectName.get(id) ?? `Project #${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [openTasks, projectName]);

  const visible = useMemo(
    () => (projectFilter === ALL ? openTasks : openTasks.filter((t) => String(t.projectId) === projectFilter)),
    [openTasks, projectFilter]
  );

  const filterControl = (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">Filter by project</span>
      <select
        value={projectFilter}
        onChange={(e) => setProjectFilter(e.target.value)}
        className="text-[11px] rounded-lg border border-line bg-surface text-default px-2 py-1.5 max-w-[130px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
      >
        <option value={ALL}>All projects</option>
        {filterOptions.map((o) => (
          <option key={o.id} value={String(o.id)}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );

  const body = () => {
    if (loading) {
      return (
        <p className="flex items-center justify-center gap-2 py-10 text-[11px] text-subtle">
          <Loader2 size={13} className="animate-spin" /> Loading your tasks…
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
    if (openTasks.length === 0) {
      return <ChartEmpty message="Nothing assigned to you is open right now." />;
    }
    if (visible.length === 0) {
      return <ChartEmpty message="No open tasks in this project." />;
    }

    /* Stacked, not side by side: the panel is one column of the dashboard now, so two
       inner columns would leave the cards too narrow to read a task title in. */
    return (
      <div className="flex flex-col gap-4">
        {STATUS_GROUPS.map((group) => {
          const rows = visible.filter((t) => (t.status ?? "Todo") === group.key);
          return (
            <div key={group.key} className="min-w-0">
              <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-soft">
                <group.icon size={14} style={{ color: group.accent }} strokeWidth={2} />
                <span className="text-[11px] font-semibold text-strong">{group.label}</span>
                <span
                  className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded"
                  style={{
                    color: group.accent,
                    background: `color-mix(in srgb, ${group.accent} 14%, transparent)`,
                  }}
                >
                  {rows.length}
                </span>
              </div>

              {rows.length === 0 ? (
                <p className="py-6 text-center text-[10px] text-subtle">Nothing here.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {rows.map((task) => (
                    <TaskRow
                      key={task.taskId}
                      task={task}
                      projectName={task.projectId != null ? projectName.get(task.projectId) ?? null : null}
                      onOpen={onOpenTask}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ChartPanel
      title="My tasks"
      subtitle={
        loading
          ? "Loading…"
          : `${visible.length} open task${visible.length === 1 ? "" : "s"} · To do and In progress only`
      }
      icon={<ListChecks size={14} strokeWidth={1.9} />}
      action={filterOptions.length > 0 ? filterControl : undefined}
    >
      {body()}
    </ChartPanel>
  );
};
