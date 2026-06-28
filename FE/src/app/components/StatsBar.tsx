import React from "react";
import { motion } from "motion/react";
import {
  TrendingUp, AlertTriangle, CheckCircle, Zap, Clock, Users, Target, Sparkles
} from "lucide-react";
import { tasks } from "../data/tmaiData";

export const StatsBar = () => {
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const criticalTasks = tasks.filter(t => t.risk === "critical").length;
  const highRisk = tasks.filter(t => t.risk === "high" || t.risk === "critical").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const completionRate = Math.round((doneTasks / totalTasks) * 100);
  const avgRisk = Math.round(tasks.reduce((acc, t) => acc + t.riskScore, 0) / totalTasks);

  const stats = [
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      sub: `${doneTasks}/${totalTasks} tasks`,
      icon: CheckCircle,
      color: "#10B981",
      bg: "rgba(16, 185, 129, 0.1)",
      trend: "+5% this week",
    },
    {
      label: "AI Risk Score",
      value: `${avgRisk}`,
      sub: `${highRisk} high-risk tasks`,
      icon: AlertTriangle,
      color: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.1)",
      trend: criticalTasks > 0 ? `${criticalTasks} critical` : "Managed",
    },
    {
      label: "In Progress",
      value: `${inProgressTasks}`,
      sub: "Active tasks",
      icon: Zap,
      color: "#7C4DFF",
      bg: "rgba(124, 77, 255, 0.1)",
      trend: "Sprint ongoing",
    },
    {
      label: "Team Velocity",
      value: "84",
      sub: "Story points",
      icon: TrendingUp,
      color: "#1E88E5",
      bg: "rgba(30, 136, 229, 0.1)",
      trend: "+12 from last sprint",
    },
    {
      label: "AI Suggestions",
      value: "7",
      sub: "New insights",
      icon: Sparkles,
      color: "#EC4899",
      bg: "rgba(236, 72, 153, 0.1)",
      trend: "3 urgent",
    },
  ];

  return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-gray-100 min-w-fit"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          whileHover={{ y: -1, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: stat.bg }}
          >
            <stat.icon size={18} style={{ color: stat.color }} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-800">{stat.value}</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ color: stat.color, background: stat.bg }}>
                {stat.trend}
              </span>
            </div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
