import React from "react";
import { motion } from "motion/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { LayoutDashboard, AlertTriangle, Loader2, ChevronRight } from "lucide-react";
import { useWorkspace, summariseWorkspace } from "../hooks/useWorkspace";
import { TaskDetailDto } from "../services/taskApi";

const STATUS_COLORS: Record<string, string> = {
  Done: "#10B981",
  InProgress: "#1E88E5",
  Todo: "#94A3B8",
};

interface MobileDashboardProps {
  onTaskPress?: (task: TaskDetailDto) => void;
}

/** Compact view of the same real workspace data the desktop shell shows. */
export const MobileDashboard = ({ onTaskPress }: MobileDashboardProps) => {
  const { projects, tasks, loading, error } = useWorkspace();
  const s = summariseWorkspace(projects, tasks);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-xs text-gray-500">
        <Loader2 size={14} className="animate-spin" aria-hidden /> Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {error}
      </div>
    );
  }

  const statusData = [
    { name: "Done", value: s.doneTasks },
    { name: "InProgress", value: s.inProgressTasks },
    { name: "Todo", value: s.todoTasks },
  ].filter((d) => d.value > 0);

  const openTasks = tasks.filter((t) => t.status !== "Done").slice(0, 8);

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      <header className="flex items-center gap-2">
        <LayoutDashboard size={16} className="text-[#1A237E]" aria-hidden />
        <h1 className="text-sm font-semibold text-gray-900">Dashboard</h1>
      </header>

      {projects.length === 0 ? (
        <p className="py-10 text-center text-xs text-gray-500">No projects yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Completion", value: `${s.completionRate}%`, alert: false },
              { label: "Projects", value: s.totalProjects, alert: false },
              { label: "In progress", value: s.inProgressTasks, alert: false },
              { label: "At risk", value: s.highRiskProjects, alert: s.highRiskProjects > 0 },
            ].map((c) => (
              <motion.div
                key={c.label}
                className={`rounded-lg border p-2.5 ${c.alert ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-[10px] uppercase tracking-wide text-gray-500">{c.label}</p>
                <p className="text-base font-semibold text-gray-900">{c.value}</p>
              </motion.div>
            ))}
          </div>

          {statusData.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white p-3">
              <h2 className="mb-1 text-xs font-semibold text-gray-700">Task status</h2>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={58} label>
                    {statusData.map((d) => (
                      <Cell key={d.name} fill={STATUS_COLORS[d.name] ?? "#94A3B8"} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </section>
          )}

          <section className="rounded-lg border border-gray-200 bg-white p-3">
            <h2 className="mb-2 text-xs font-semibold text-gray-700">Open tasks</h2>
            {openTasks.length === 0 ? (
              <p className="py-6 text-center text-[10px] text-gray-400">Nothing open — nice.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {openTasks.map((t) => (
                  <li key={t.taskId}>
                    <button
                      type="button"
                      onClick={() => onTaskPress?.(t)}
                      className="flex w-full items-center gap-2 py-2 text-left"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-900">{t.title ?? "Untitled"}</span>
                      {(t.riskLevel ?? "").toUpperCase() === "HIGH" && (
                        <AlertTriangle size={11} className="shrink-0 text-red-500" aria-label="High risk" />
                      )}
                      <span className="shrink-0 text-[10px] text-gray-400">{t.status}</span>
                      <ChevronRight size={12} className="shrink-0 text-gray-300" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};
