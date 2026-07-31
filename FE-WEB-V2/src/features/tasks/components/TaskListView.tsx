import React from "react";
import { Link2, Inbox } from "lucide-react";
import { TaskDetailDto } from "../types";
import { daysUntil } from "../../../core/utils/date";

const statusDot: Record<string, string> = {
  Todo: "bg-blue-500",
  InProgress: "bg-violet-500",
  Done: "bg-emerald-500",
};

const riskColor: Record<string, string> = {
  LOW: "text-emerald-600 bg-emerald-50 border-emerald-200",
  MEDIUM: "text-amber-600 bg-amber-50 border-amber-200",
  HIGH: "text-red-600 bg-red-50 border-red-200",
  CRITICAL: "text-red-700 bg-red-100 border-red-300",
};

interface TaskListViewProps {
  tasks: TaskDetailDto[];
  onTaskClick: (task: TaskDetailDto) => void;
}

export const TaskListView = ({ tasks, onTaskClick }: TaskListViewProps) => {
  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-300">
        <Inbox size={28} className="mb-2" />
        <p className="text-xs">No tasks match this view.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-100">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          <tr>
            <th className="px-3.5 py-2.5 font-semibold">Task</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 font-semibold">Priority</th>
            <th className="px-3 py-2.5 font-semibold">Risk</th>
            <th className="px-3 py-2.5 font-semibold">Assignees</th>
            <th className="px-3 py-2.5 font-semibold text-right">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {tasks.map((task) => {
            const days = daysUntil(task.deadline);
            const isOverdue = days !== null && days < 0;
            return (
              <tr key={task.taskId} onClick={() => onTaskClick(task)} className="cursor-pointer hover:bg-gray-50 bg-white">
                <td className="px-3.5 py-2.5 max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[task.status ?? ""] ?? "bg-gray-300"}`} />
                    <span className="text-xs font-medium text-gray-800 truncate">{task.title}</span>
                    {task.dependencies.length > 0 && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5 shrink-0">
                        <Link2 size={10} /> {task.dependencies.length}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600">{task.status}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 capitalize">{task.priority ?? "—"}</td>
                <td className="px-3 py-2.5">
                  {task.riskLevel && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${riskColor[task.riskLevel] ?? "text-gray-500 bg-gray-50 border-gray-200"}`}>
                      {task.riskLevel}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600">
                  {task.assignees.length === 0 ? <span className="text-gray-400">Unassigned</span> : task.assignees.map((a) => a.userName).join(", ")}
                </td>
                <td className={`px-3 py-2.5 text-xs text-right shrink-0 ${isOverdue ? "text-red-500 font-semibold" : "text-gray-500"}`}>
                  {days === null ? "—" : isOverdue ? `${Math.abs(days)}d late` : days === 0 ? "Today" : `${days}d`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
