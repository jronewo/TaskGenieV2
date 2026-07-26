import React from "react";
import { motion } from "motion/react";
import { ArrowLeft, Plus, UserPlus } from "lucide-react";
import { KanbanBoard } from "./KanbanBoard";
import type { Project, Task } from "../data/tmaiData";

interface ProjectWorkspaceProps {
  project: Project;
  tasks: Task[];
  view: "kanban" | "list";
  canInvite: boolean;
  onBack: () => void;
  onNewTask: () => void;
  onInvite?: () => void;
  onTaskClick: (task: Task) => void;
  onStatusChange?: (taskId: string, status: Task["status"]) => void;
}

const statusLabel: Record<Task["status"], string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  review: "In Review",
  done: "Done",
};

export function ProjectWorkspace({
  project,
  tasks,
  view,
  canInvite,
  onBack,
  onNewTask,
  onInvite,
  onTaskClick,
  onStatusChange,
}: ProjectWorkspaceProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="shrink-0 px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="h-8 w-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{project.icon}</span>
              <h2 className="text-sm font-bold text-gray-900 truncate">{project.name}</h2>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  project.projectType === "Personal"
                    ? "bg-violet-50 text-violet-700 border border-violet-100"
                    : "bg-blue-50 text-blue-700 border border-blue-100"
                }`}
              >
                {project.projectType === "Personal" ? "Personal" : "Team"}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {tasks.length} tasks · Risk score {project.riskScore}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canInvite && onInvite && (
            <button
              type="button"
              onClick={onInvite}
              className="h-8 px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <UserPlus size={13} />
              Invite
            </button>
          )}
          <motion.button
            type="button"
            onClick={onNewTask}
            className="h-8 px-3 rounded-md text-xs font-semibold text-white flex items-center gap-1.5"
            style={{ background: "#1A237E" }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={13} />
            New Task
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="text-4xl mb-3">{project.icon}</div>
            <h3 className="text-sm font-semibold text-gray-800">No tasks yet</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Create your first task in <strong>{project.name}</strong> to start tracking work.
            </p>
            <button
              type="button"
              onClick={onNewTask}
              className="mt-4 h-8 px-4 rounded-md text-xs font-semibold text-white"
              style={{ background: "#1A237E" }}
            >
              <Plus size={13} className="inline mr-1 -mt-0.5" />
              Create first task
            </button>
          </div>
        ) : view === "kanban" ? (
          <KanbanBoard
            tasks={tasks}
            onTaskClick={onTaskClick}
            onAddTask={onNewTask}
            onStatusChange={onStatusChange}
          />
        ) : (
          <div className="h-full overflow-y-auto bg-white border border-gray-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-gray-600">Task</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600 w-28">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600 w-28">Deadline</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600 w-36">Assignee</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600 w-24 text-center">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{task.title}</td>
                    <td className="px-4 py-3 text-gray-600">{statusLabel[task.status]}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {task.deadline
                        ? new Date(task.deadline).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{task.assignee.name}</td>
                    <td className="px-4 py-3 text-center font-mono text-gray-700">{task.progress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
