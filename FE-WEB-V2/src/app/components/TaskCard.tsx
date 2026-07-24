import React from "react";
import { motion } from "motion/react";
import {
  Sparkles, Clock, AlertTriangle, CheckCircle, Flame, Zap,
} from "lucide-react";
import { TaskDto } from "../services/tasksApi";

const riskConfig: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
  LOW: { color: "#10B981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)", label: "Safe", icon: <CheckCircle size={11} /> },
  MEDIUM: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)", label: "At Risk", icon: <AlertTriangle size={11} /> },
  HIGH: { color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)", label: "High Risk", icon: <Flame size={11} /> },
  CRITICAL: { color: "#DC2626", bg: "rgba(220, 38, 38, 0.12)", border: "rgba(220, 38, 38, 0.5)", label: "Critical", icon: <Zap size={11} /> },
};

const priorityDot: Record<string, string> = {
  Low: "#94A3B8",
  Medium: "#3B82F6",
  High: "#F97316",
};

const PALETTE = ["#6366f1", "#0891b2", "#d97706", "#dc2626", "#059669", "#7c3aed"];
const avatarColor = (userId: number) => PALETTE[userId % PALETTE.length];
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

interface TaskCardProps {
  task: TaskDto;
  onClick: (task: TaskDto) => void;
  index: number;
}

const daysUntil = (dateStr: string) => {
  const today = new Date();
  const due = new Date(dateStr);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const TaskCard = ({ task, onClick, index }: TaskCardProps) => {
  const risk = riskConfig[task.riskLevel] ?? riskConfig.LOW;
  const priorityColor = priorityDot[task.priority] ?? "#94A3B8";
  const days = task.deadline ? daysUntil(task.deadline) : null;
  const isCritical = task.riskLevel === "CRITICAL";
  const isOverdue = days !== null && days < 0;
  const assignee = task.assignees[0];

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
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Top Row: Priority dot + Risk Badge */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColor }} />
          <span className="text-[10px] font-medium text-gray-500">{task.priority} priority</span>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0 text-[10px] font-semibold"
          style={{ color: risk.color, backgroundColor: risk.bg, border: `1px solid ${risk.border}` }}
        >
          {risk.icon}
          {risk.label}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-800 mb-1.5 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
        {task.title}
      </h3>

      {/* Progress bar */}
      {task.status === "InProgress" && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400">Progress</span>
            <span className="text-[10px] font-semibold text-gray-600">{task.progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gray-700"
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* AI Summary (only if the backend actually generated one) */}
      {task.aiSummary && (
        <div className="mb-2.5 px-2.5 py-2 rounded-xl flex items-start gap-2 bg-gray-50">
          <Sparkles size={12} className="text-gray-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-2">{task.aiSummary}</p>
        </div>
      )}

      {/* Bottom Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {assignee ? (
            <>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ring-2 ring-white shadow"
                style={{ backgroundColor: avatarColor(assignee.userId) }}
              >
                {initials(assignee.userName)}
              </div>
              <span className="text-[10px] text-gray-500 font-medium">{assignee.userName.split(" ")[0]}</span>
            </>
          ) : (
            <span className="text-[10px] text-gray-400 italic">Unassigned</span>
          )}
        </div>

        {task.deadline && (
          <div className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : (days ?? 99) <= 2 ? "text-orange-500" : "text-gray-400"}`}>
            <Clock size={11} />
            <span className="text-[10px] font-medium">
              {isOverdue ? `${Math.abs(days!)}d late` : days === 0 ? "Today" : `${days}d`}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
