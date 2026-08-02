import React from "react";
import { motion } from "motion/react";
import { TrendingUp, AlertTriangle, CheckCircle, Zap, Loader2 } from "lucide-react";
import { useWorkspace, summariseWorkspace } from "../hooks/useWorkspace";

/** Every figure here is derived from real projects/tasks returned by the API. */
export const StatsBar = () => {
  const { projects, tasks, loading, error } = useWorkspace();
  const s = summariseWorkspace(projects, tasks);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-[11px] text-gray-500">
        <Loader2 size={13} className="animate-spin" aria-hidden /> Loading workspace…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="px-4 py-3 text-[11px] text-red-600">
        {error}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="px-4 py-3 text-[11px] text-gray-500">
        No projects yet — create one to see live statistics here.
      </div>
    );
  }

  const stats = [
    {
      label: "Completion Rate",
      value: `${s.completionRate}%`,
      sub: `${s.doneTasks}/${s.totalTasks} tasks`,
      icon: CheckCircle,
      color: "#10B981",
      bg: "rgba(16, 185, 129, 0.1)",
    },
    {
      label: "At-Risk Projects",
      value: `${s.highRiskProjects}`,
      sub: s.highRiskProjects === 0 ? "All on track" : "Need attention",
      icon: AlertTriangle,
      color: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.1)",
    },
    {
      label: "In Progress",
      value: `${s.inProgressTasks}`,
      sub: `${s.todoTasks} still to do`,
      icon: Zap,
      color: "#7C4DFF",
      bg: "rgba(124, 77, 255, 0.1)",
    },
    {
      label: "Avg Progress",
      value: `${s.averageProgress}%`,
      sub: `across ${s.totalProjects} project(s)`,
      icon: TrendingUp,
      color: "#1E88E5",
      bg: "rgba(30, 136, 229, 0.1)",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4 py-3">
      {stats.map(({ label, value, sub, icon: Icon, color, bg }, i) => (
        <motion.div
          key={label}
          className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white px-3 py-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ background: bg }}>
            <Icon size={15} style={{ color }} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
            <p className="text-sm font-semibold text-gray-900">{value}</p>
            <p className="truncate text-[10px] text-gray-400">{sub}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
