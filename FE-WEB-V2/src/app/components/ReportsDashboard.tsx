import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, LabelList,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { BarChart2, AlertTriangle, Loader2, FolderKanban, CalendarClock } from "lucide-react";
import {
  CHART_COLORS,
  ChartEmpty,
  ChartLegend,
  ChartPanel,
  ChartTooltip,
  RISK_COLOR,
  STATUS_COLOR,
  axisProps,
  shortLabel,
} from "./charts/chartTheme";
import { useWorkspace, summariseWorkspace } from "../hooks/useWorkspace";
import { ProjectGanttChart } from "./ProjectGanttChart";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  Done: "#10B981",
  InProgress: "#1E88E5",
  Todo: "#94A3B8",
};

/** Badge background/text pair per risk level — the same three-tier palette RISK_COLOR (chart bars)
 *  uses, just as a solid-fill pill instead of a bar fill. */
const RISK_BADGE: Record<string, string> = {
  HIGH: "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  MEDIUM: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  LOW: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
};

const ALL = "ALL";

/**
 * Reports for one project at a time, with an "all projects" roll-up still available.
 *
 * There is no reports endpoint on the API — these figures are derived from the same project and
 * task rows the user is already authorised to read, so scoping to a project is a filter here
 * rather than a new server-side query.
 */
export const ReportsDashboard = ({ onOpenTask }: { onOpenTask?: (taskId: number) => void } = {}) => {
  const { projects, tasks, loading, error } = useWorkspace();
  const [scope, setScope] = useState<string>(ALL);

  // A project that disappears (deleted, access revoked) must not strand the page on a dead filter.
  const activeScope = scope !== ALL && projects.some((p) => String(p.projectId) === scope) ? scope : ALL;
  const selected = projects.find((p) => String(p.projectId) === activeScope) ?? null;

  const scopedProjects = useMemo(
    () => (selected ? [selected] : projects),
    [selected, projects]
  );
  const scopedTasks = useMemo(
    () => (selected ? tasks.filter((t) => t.projectId === selected.projectId) : tasks),
    [selected, tasks]
  );

  const s = summariseWorkspace(scopedProjects, scopedTasks);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-4 space-y-4" role="status" aria-label="Loading reports">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert role="alert" variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-4">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <FolderKanban className="mb-3 h-9 w-9 text-subtle" aria-hidden />
            <p className="text-sm font-medium text-strong">No projects yet.</p>
            <p className="mt-1 max-w-md text-xs text-subtle">Reports appear once you have a project with data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusData = [
    { name: "Done", value: s.doneTasks },
    { name: "InProgress", value: s.inProgressTasks },
    { name: "Todo", value: s.todoTasks },
  ].filter((d) => d.value > 0);

  const riskCounts = scopedProjects.reduce<Record<string, number>>((acc, p) => {
    const key = (p.riskLevel ?? "LOW").toUpperCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const riskData = Object.entries(riskCounts).map(([name, value]) => ({ name, value }));

  const perProject = scopedProjects.map((p) => ({
    name: p.name.length > 14 ? `${p.name.slice(0, 13)}…` : p.name,
    progress: p.progress,
    tasks: tasks.filter((t) => t.projectId === p.projectId).length,
  }));

  // Only meaningful for one project: how its own tasks split by priority.
  const priorityData = selected
    ? Object.entries(
        scopedTasks.reduce<Record<string, number>>((acc, t) => {
          const key = t.priority ?? "Medium";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-strong">
            <BarChart2 size={20} className="text-brand" aria-hidden /> Reports
          </h1>
          <p className="mt-0.5 text-sm text-subtle">
            {selected
              ? `${selected.name} — ${s.totalTasks} task(s), ${selected.progress}% progress.`
              : `Live figures across ${s.totalProjects} project(s) and ${s.totalTasks} task(s).`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="report-project" className="flex items-center gap-1.5 text-[11px] text-subtle">
            <FolderKanban size={12} aria-hidden /> Project
          </label>
          <select
            id="report-project"
            value={activeScope}
            onChange={(e) => setScope(e.target.value)}
            className="cursor-pointer rounded-md border border-line bg-surface px-2 py-1.5 text-[11px] text-default outline-none focus:border-[var(--brand-600)]"
          >
            <option value={ALL}>All projects</option>
            {projects.map((p) => (
              <option key={p.projectId} value={String(p.projectId)}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {selected && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-[11px] text-muted">
            <span className="font-semibold text-strong">{selected.name}</span>
            <Badge className={RISK_BADGE[(selected.riskLevel ?? "LOW").toUpperCase()] ?? RISK_BADGE.LOW}>
              {(selected.riskLevel ?? "LOW").toUpperCase()} RISK
            </Badge>
            <span>{selected.status ?? "Planning"}</span>
            {selected.deadline && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock size={11} aria-hidden /> due {selected.deadline.slice(0, 10)}
              </span>
            )}
            {selected.teamName && <span>Team: {selected.teamName}</span>}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-4">
        {[
          { label: "Completion", value: `${s.completionRate}%` },
          { label: "Avg progress", value: `${s.averageProgress}%` },
          { label: "Tasks done", value: `${s.doneTasks}/${s.totalTasks}` },
          { label: selected ? "Risk level" : "At-risk projects", value: selected ? (selected.riskLevel ?? "LOW").toUpperCase() : s.highRiskProjects },
        ].map((card) => (
          <motion.div
            key={card.label}
            className="rounded-xl border border-line bg-card p-3 text-card-foreground"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[10px] uppercase tracking-wide text-subtle">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-strong">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartPanel title={selected ? "Progress" : "Progress by project"}>
          {perProject.length === 0 ? (
            <ChartEmpty message="Chưa có dự án nào." />
          ) : (
            <div style={{ height: Math.max(140, perProject.length * 34) }} className="text-subtle">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={perProject.map((p) => ({ ...p, name: shortLabel(p.name, 18) }))}
                  layout="vertical"
                  margin={{ top: 4, right: 34, left: 4, bottom: 4 }}
                >
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" width={110} {...axisProps} />
                  <Tooltip cursor={{ fill: "rgba(148,163,184,0.12)" }} content={ChartTooltip("%")} />
                  <Bar
                    dataKey="progress"
                    fill={CHART_COLORS.brand}
                    name="Tiến độ"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                    // Otherwise a genuine 0% project renders a zero-width bar — indistinguishable
                    // from the chart being broken. The track makes "zero" visibly a real value.
                    background={{ fill: "rgba(148,163,184,0.14)", radius: [0, 4, 4, 0] }}
                  >
                    <LabelList
                      dataKey="progress"
                      position="right"
                      formatter={(v: number) => `${v}%`}
                      style={{ fontSize: 10, fill: "currentColor" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>

        <ChartPanel title="Task status">
          {statusData.length === 0 ? (
            <ChartEmpty message="Chưa có task nào." />
          ) : (
            <>
              <div className="h-[188px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={46}
                      outerRadius={70}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {statusData.map((d) => (
                        <Cell key={d.name} fill={STATUS_COLOR[d.name] ?? CHART_COLORS.todo} />
                      ))}
                    </Pie>
                    <Tooltip content={ChartTooltip("task")} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                items={statusData.map((d) => ({
                  label: d.name,
                  value: d.value,
                  color: STATUS_COLOR[d.name] ?? CHART_COLORS.todo,
                }))}
              />
            </>
          )}
        </ChartPanel>

        {selected ? (
          <>
            <div className="lg:col-span-2">
              <ChartPanel title="Tasks by priority">
                {priorityData.length === 0 ? (
                  <ChartEmpty message="Dự án này chưa có task nào." />
                ) : (
                  <div style={{ height: Math.max(120, priorityData.length * 34) }} className="text-subtle">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityData} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 4 }}>
                        <XAxis type="number" allowDecimals={false} hide />
                        <YAxis type="category" dataKey="name" width={78} {...axisProps} />
                        <Tooltip cursor={{ fill: "rgba(148,163,184,0.12)" }} content={ChartTooltip("task")} />
                        <Bar dataKey="value" name="Task" fill={CHART_COLORS.brand} radius={[0, 4, 4, 0]} barSize={16}>
                          <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "currentColor" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartPanel>
            </div>

            <div className="lg:col-span-2">
              <ProjectGanttChart projectId={selected.projectId} onOpenTask={onOpenTask} />
            </div>
          </>
        ) : (
          <div className="lg:col-span-2">
            <ChartPanel title="Risk distribution">
              {riskData.length === 0 ? (
                <ChartEmpty message="Chưa có dữ liệu rủi ro." />
              ) : (
                <div style={{ height: Math.max(120, riskData.length * 34) }} className="text-subtle">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskData} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 4 }}>
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis type="category" dataKey="name" width={78} {...axisProps} />
                      <Tooltip cursor={{ fill: "rgba(148,163,184,0.12)" }} content={ChartTooltip("dự án")} />
                      <Bar dataKey="value" name="Dự án" radius={[0, 4, 4, 0]} barSize={16}>
                        {riskData.map((d) => (
                          <Cell key={d.name} fill={RISK_COLOR[d.name] ?? CHART_COLORS.todo} />
                        ))}
                        <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "currentColor" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartPanel>
          </div>
        )}
      </div>
    </div>
  );
};
