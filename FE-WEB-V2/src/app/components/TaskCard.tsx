import React from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Bug,
  Calendar,
  Check,
  Equal,
  GitBranch,
  Loader2,
  Lock,
  MessageSquare,
  Bookmark,
  SquareCheck,
} from "lucide-react";
import { TaskDetailDto } from "../services/taskApi";
import { ISSUE_TYPE_STYLE, initials, issueKey, issueType, priorityRank } from "../lib/jira";

/** Corner chip. Low is deliberately quiet so that a red one still means something. */
const RISK_CHIP: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-gray-100 text-gray-500",
};

const RISK_DOT: Record<string, { cls: string; label: string }> = {
  HIGH: { cls: "bg-red-500", label: "High risk" },
  MEDIUM: { cls: "bg-amber-500", label: "Medium risk" },
  LOW: { cls: "bg-emerald-500", label: "Low risk" },
};

const TYPE_ICON = { Bug, Story: Bookmark, Task: SquareCheck } as const;

function isOverdue(task: TaskDetailDto): boolean {
  if (!task.deadline || task.status === "Done") return false;
  return new Date(task.deadline) < new Date(new Date().toDateString());
}

interface TaskCardProps {
  task: TaskDetailDto;
  commentCount?: number;
  /** Project name, used to build the issue key (e.g. "WR-42"). */
  projectName?: string | null;
  onClick?: (task: TaskDetailDto) => void;
  onDragStart?: (task: TaskDetailDto) => void;
  isMoving?: boolean;
}

/** A Jira-style issue card: title on top, then a footer of type, key, priority, flags and assignee. */
export const TaskCard = ({ task, commentCount, projectName, onClick, onDragStart, isMoving }: TaskCardProps) => {
  const riskLevel = (task.riskLevel ?? "LOW").toUpperCase();
  const risk = RISK_DOT[riskLevel] ?? RISK_DOT.LOW;
  // A high-risk task is the one thing on a board that must not need a hover to be noticed.
  const highRisk = riskLevel === "HIGH";
  const blockingCount = task.blockingCount ?? 0;
  const waitingOn = (task.dependencies ?? []).filter((d) => (d.status ?? "").toUpperCase() !== "DONE").length;
  const overdue = isOverdue(task);
  const type = issueType(task);
  const TypeIcon = TYPE_ICON[type];
  const rank = priorityRank(task.priority);
  const PriorityIcon = rank.direction === "up" ? ArrowUp : rank.direction === "down" ? ArrowDown : Equal;
  const key = issueKey(projectName, task.taskId);
  const done = task.status === "Done";
  const assignee = task.assignees[0];

  return (
    <motion.div
      layout
      draggable={!!onDragStart}
      onDragStart={() => onDragStart?.(task)}
      onClick={() => onClick?.(task)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(task);
        }
      }}
      aria-label={`${key}: ${task.title ?? "Untitled"}`}
      className={`rounded border-l-2 bg-white p-2.5 shadow-sm transition-shadow ${
        onClick ? "cursor-pointer hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A237E]" : ""
      } ${
        overdue || (highRisk && !done)
          ? "border-l-red-500"
          : done
            ? "border-l-emerald-500"
            : "border-l-transparent"
      } ${
        isMoving ? "opacity-60" : ""
      }`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-2 flex items-start gap-2">
        <p className={`flex-1 text-xs leading-snug text-gray-900 ${done ? "line-through decoration-gray-300" : ""}`}>
          {task.title ?? "Untitled"}
        </p>
        {/* Top-right, not buried in the footer: a card whose risk you have to hunt for is a card
            whose risk nobody acts on. */}
        {!done && (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide ${RISK_CHIP[riskLevel] ?? RISK_CHIP.LOW}`}
            aria-label={risk.label}
            title={risk.label}
          >
            {highRisk && <AlertTriangle size={9} aria-hidden />}
            {riskLevel}
          </span>
        )}
        {isMoving && <Loader2 size={12} className="mt-0.5 shrink-0 animate-spin text-gray-400" aria-hidden />}
      </div>

      {task.description && <p className="mb-2 line-clamp-2 text-[10px] text-gray-500">{task.description}</p>}

      {typeof task.progress === "number" && task.progress > 0 && !done && (
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-[#1A237E]" style={{ width: `${Math.min(100, task.progress)}%` }} />
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
        {/* A classified task shows what it actually is; only unclassified ones fall back to the
            title heuristic. */}
        {task.taskTypeName ? (
          <span
            className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9px] font-semibold text-white"
            style={{ background: task.taskTypeColor ?? "#64748B" }}
            aria-label={`Type: ${task.taskTypeName}`}
          >
            {task.taskTypeName}
          </span>
        ) : (
          <span
            className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm ${ISSUE_TYPE_STYLE[type].cls}`}
            title={ISSUE_TYPE_STYLE[type].title}
            aria-label={`Issue type: ${type}`}
          >
            <TypeIcon size={9} className="text-white" aria-hidden />
          </span>
        )}

        <span className={`font-medium tracking-wide ${done ? "text-gray-400 line-through" : "text-gray-600"}`}>{key}</span>

        {/* The two chips answer different questions: how much work this card is holding up, and
            whether it can be picked up at all. Both stay hidden once the task is done, when
            neither changes what anyone does next. */}
        {!done && blockingCount > 0 && (
          <span
            className="inline-flex shrink-0 items-center gap-0.5 rounded bg-amber-50 px-1 py-0.5 text-[9px] font-semibold text-amber-700"
            title={`${blockingCount} task${blockingCount === 1 ? "" : "s"} waiting on this one`}
          >
            <GitBranch size={9} aria-hidden />
            {blockingCount}
          </span>
        )}
        {!done && waitingOn > 0 && (
          <span
            className="inline-flex shrink-0 items-center gap-0.5 rounded bg-gray-100 px-1 py-0.5 text-[9px] font-semibold text-gray-600"
            title={`Waiting on ${waitingOn} unfinished task${waitingOn === 1 ? "" : "s"}`}
          >
            <Lock size={9} aria-hidden />
            {waitingOn}
          </span>
        )}

        <PriorityIcon size={12} className={rank.color} aria-label={`Priority: ${rank.label}`} />



        {overdue && (
          <span className="inline-flex items-center gap-0.5 text-red-600" title="Past its deadline">
            <AlertTriangle size={10} aria-hidden />
            <span className="sr-only">Overdue</span>
          </span>
        )}

        {task.deadline && !overdue && (
          <span className="inline-flex items-center gap-0.5">
            <Calendar size={10} aria-hidden />
            {task.deadline.slice(5, 10)}
          </span>
        )}

        {typeof commentCount === "number" && commentCount > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <MessageSquare size={10} aria-hidden />
            {commentCount}
          </span>
        )}

        <span className="ml-auto flex shrink-0 items-center gap-1">
          {typeof task.estimatedTime === "number" && task.estimatedTime > 0 && (
            <span className="rounded-full bg-gray-100 px-1.5 py-px text-[9px] font-medium text-gray-600" title="Estimate in hours">
              {task.estimatedTime}
            </span>
          )}
          {done && <Check size={11} className="text-emerald-600" aria-hidden />}
          {assignee ? (
            // The real picture when there is one; initials are the fallback, not the default.
            assignee.avatar ? (
              <img
                src={assignee.avatar}
                alt={assignee.userName ?? `User ${assignee.userId}`}
                title={task.assignees.map((a) => a.userName ?? `User ${a.userId}`).join(", ")}
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1A237E] text-[8px] font-semibold text-white"
                title={task.assignees.map((a) => a.userName ?? `User ${a.userId}`).join(", ")}
              >
                {initials(assignee.userName ?? `U${assignee.userId}`)}
              </span>
            )
          ) : (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-gray-300 text-[8px] text-gray-400"
              title="Unassigned"
            >
              –
            </span>
          )}
        </span>
      </div>
    </motion.div>
  );
};
