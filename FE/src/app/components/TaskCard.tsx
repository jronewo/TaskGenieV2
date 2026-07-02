import React from "react";
import { motion } from "motion/react";
import {
  Sparkles, Clock, MessageSquare, Paperclip,
  AlertTriangle, CheckCircle, Flame, Zap, ChevronRight
} from "lucide-react";
import { Task, RiskLevel, Priority } from "../data/tmaiData";

const riskConfig: Record<RiskLevel, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
  safe: {
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.3)",
    label: "Safe",
    icon: <CheckCircle size={11} />,
  },
  medium: {
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.1)",
    border: "rgba(245, 158, 11, 0.3)",
    label: "At Risk",
    icon: <AlertTriangle size={11} />,
  },
  high: {
    color: "#EF4444",
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.3)",
    label: "High Risk",
    icon: <Flame size={11} />,
  },
  critical: {
    color: "#DC2626",
    bg: "rgba(220, 38, 38, 0.12)",
    border: "rgba(220, 38, 38, 0.5)",
    label: "Critical",
    icon: <Zap size={11} />,
  },
};

const priorityConfig: Record<Priority, { color: string; dot: string }> = {
  low: { color: "text-gray-400", dot: "#94A3B8" },
  medium: { color: "text-blue-500", dot: "#3B82F6" },
  high: { color: "text-orange-500", dot: "#F97316" },
  urgent: { color: "text-red-500", dot: "#EF4444" },
};

const tagColors = [
  "bg-blue-50 text-blue-600",
  "bg-purple-50 text-purple-600",
  "bg-teal-50 text-teal-600",
  "bg-orange-50 text-orange-600",
  "bg-pink-50 text-pink-600",
];

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  index: number;
}

const daysUntil = (dateStr: string) => {
  const today = new Date("2026-05-10");
  const due = new Date(dateStr);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const TaskCard = ({ task, onClick, index }: TaskCardProps) => {
  const risk = riskConfig[task.risk];
  const priority = priorityConfig[task.priority];
  const days = daysUntil(task.deadline);
  const isCritical = task.risk === "critical";
  const isOverdue = days < 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-white rounded-[12px] p-3.5 cursor-pointer group relative overflow-hidden"
      style={{
        boxShadow: isCritical
          ? "0 2px 12px rgba(220, 38, 38, 0.15), 0 1px 3px rgba(0,0,0,0.06)"
          : "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        border: `1px solid ${isCritical ? "rgba(220, 38, 38, 0.2)" : "rgba(0,0,0,0.06)"}`,
      }}
      onClick={() => onClick(task)}
      whileHover={{
        y: -2,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
      }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Critical pulse border */}
      {isCritical && (
        <motion.div
          className="absolute inset-0 rounded-[12px] pointer-events-none"
          style={{ border: "1px solid rgba(220, 38, 38, 0.4)" }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Top Row: Priority dot + Tags + Risk Badge */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priority.dot }} />
          {task.tags.slice(0, 2).map((tag, i) => (
            <span
              key={tag}
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${tagColors[i % tagColors.length]}`}
            >
              {tag}
            </span>
          ))}
        </div>
        <motion.div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0 text-[10px] font-semibold"
          style={{
            color: risk.color,
            backgroundColor: risk.bg,
            border: `1px solid ${risk.border}`,
          }}
          animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {risk.icon}
          {risk.label}
        </motion.div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-800 mb-1.5 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
        {task.title}
      </h3>

      {/* Progress bar */}
      {task.status === "in_progress" && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400">Progress</span>
            <span className="text-[10px] font-semibold text-gray-600">{task.progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: task.progress > 75
                  ? "linear-gradient(90deg, #10B981, #34D399)"
                  : "linear-gradient(90deg, #7C4DFF, #1E88E5)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* AI Insight */}
      <motion.div
        className="mb-2.5 px-2.5 py-2 rounded-xl flex items-start gap-2"
        style={{ background: "linear-gradient(135deg, rgba(124,77,255,0.06), rgba(30,136,229,0.06))" }}
        whileHover={{ background: "linear-gradient(135deg, rgba(124,77,255,0.1), rgba(30,136,229,0.1))" }}
      >
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Sparkles size={12} className="text-purple-500 mt-0.5 shrink-0" />
        </motion.div>
        <p className="text-[10px] text-purple-700 leading-relaxed line-clamp-2">{task.aiInsight}</p>
      </motion.div>

      {/* Bottom Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <img
            src={task.assignee.avatar}
            alt={task.assignee.name}
            className="w-6 h-6 rounded-full object-cover ring-2 ring-white shadow"
          />
          <span className="text-[10px] text-gray-500 font-medium">{task.assignee.name.split(" ")[0]}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : days <= 2 ? "text-orange-500" : "text-gray-400"}`}>
            <Clock size={11} />
            <span className="text-[10px] font-medium">
              {isOverdue ? `${Math.abs(days)}d late` : days === 0 ? "Today" : `${days}d`}
            </span>
          </div>

          <div className="flex items-center gap-1 text-gray-400">
            <MessageSquare size={11} />
            <span className="text-[10px]">{task.comments}</span>
          </div>

          <div className="flex items-center gap-1 text-gray-400">
            <Paperclip size={11} />
            <span className="text-[10px]">{task.attachments}</span>
          </div>
        </div>
      </div>

      {/* Story points */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
          style={{ background: "#EEF2FF", color: "#4F46E5" }}
        >
          {task.storyPoints} pts
        </span>
      </div>
    </motion.div>
  );
};
