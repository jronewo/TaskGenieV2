import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Inbox } from "lucide-react";
import { TaskDetailDto, TaskStatus } from "../types";
import { TaskCard } from "./TaskCard";

const statusColumns: { id: TaskStatus; label: string; color: string }[] = [
  { id: "Todo", label: "To Do", color: "#1E88E5" },
  { id: "InProgress", label: "In Progress", color: "#7C4DFF" },
  { id: "Done", label: "Done", color: "#10B981" },
];

interface KanbanBoardProps {
  tasks: TaskDetailDto[];
  onTaskClick: (task: TaskDetailDto) => void;
  onTaskStatusChange: (taskId: number, status: TaskStatus) => void;
  onAddTask: (status: TaskStatus) => void;
}

export const KanbanBoard = ({ tasks, onTaskClick, onTaskStatusChange, onAddTask }: KanbanBoardProps) => {
  const [draggedTask, setDraggedTask] = useState<TaskDetailDto | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getColumnTasks = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  const handleDrop = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== columnId) {
      onTaskStatusChange(draggedTask.taskId, columnId);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4 px-1">
      {statusColumns.map((col) => {
        const colTasks = getColumnTasks(col.id);
        const isDragOver = dragOverColumn === col.id;

        return (
          <motion.div
            key={col.id}
            className="flex flex-col rounded-2xl w-72 shrink-0 transition-all"
            style={{
              background: isDragOver ? "rgba(26,35,126,0.04)" : "#F8FAFC",
              border: isDragOver ? "2px dashed #1A237E" : "2px solid transparent",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(col.id);
            }}
            onDrop={(e) => handleDrop(e, col.id)}
            onDragLeave={() => setDragOverColumn(null)}
          >
            <div className="flex items-center gap-2 p-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
              <span className="text-sm font-bold text-gray-700 flex-1">{col.label}</span>
              <span className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center bg-gray-100 text-gray-500">
                {colTasks.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5 min-h-[200px]">
              <AnimatePresence>
                {colTasks.map((task, index) => (
                  <div
                    key={task.taskId}
                    draggable
                    onDragStart={() => setDraggedTask(task)}
                    className={`${draggedTask?.taskId === task.taskId ? "opacity-40" : ""} cursor-grab active:cursor-grabbing`}
                  >
                    <TaskCard task={task} onClick={onTaskClick} index={index} />
                  </div>
                ))}
              </AnimatePresence>

              {colTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                  <Inbox size={26} className="mb-2" />
                  <p className="text-xs">Drop tasks here</p>
                </div>
              )}

              <motion.button
                className="w-full flex items-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all text-sm"
                onClick={() => onAddTask(col.id)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={14} />
                Add task
              </motion.button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
