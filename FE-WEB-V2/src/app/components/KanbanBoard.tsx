import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, MoreHorizontal, ChevronDown, Inbox } from "lucide-react";
import { statusColumns, Task, TaskStatus } from "../data/tmaiData";
import { TaskCard } from "./TaskCard";

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onAddTask: (status: TaskStatus) => void;
}

export const KanbanBoard = ({ tasks, onTaskClick, onTaskStatusChange, onAddTask }: KanbanBoardProps) => {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getColumnTasks = (status: TaskStatus) =>
    tasks.filter(t => t.status === status);

  const toggleColumn = (colId: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedTask) {
      onTaskStatusChange(draggedTask.id, columnId as TaskStatus);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const totalPoints = (status: TaskStatus) =>
    getColumnTasks(status).reduce((acc, t) => acc + t.storyPoints, 0);

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4 px-1">
      {statusColumns.map(col => {
        const colTasks = getColumnTasks(col.id as TaskStatus);
        const isCollapsed = collapsedColumns.has(col.id);
        const isDragOver = dragOverColumn === col.id;

        return (
          <motion.div
            key={col.id}
            className={`flex flex-col rounded-2xl transition-all ${isCollapsed ? "w-12" : "w-72 shrink-0"}`}
            animate={{ width: isCollapsed ? 48 : 288 }}
            style={{
              background: isDragOver ? "rgba(26,35,126,0.04)" : "#F8FAFC",
              border: isDragOver ? "2px dashed #1A237E" : "2px solid transparent",
            }}
            onDragOver={e => handleDragOver(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
            onDragLeave={handleDragLeave}
          >
            {/* Column Header */}
            <div className={`flex items-center gap-2 p-3 ${isCollapsed ? "flex-col" : ""}`}>
              {isCollapsed ? (
                <motion.button
                  className="flex flex-col items-center gap-2 py-2"
                  onClick={() => toggleColumn(col.id)}
                  style={{ writingMode: "vertical-rl" }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-xs font-bold text-gray-600" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                    {col.label}
                  </span>
                  <span className="text-xs text-gray-400">{colTasks.length}</span>
                </motion.button>
              ) : (
                <>
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="text-sm font-bold text-gray-700 flex-1">{col.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center bg-gray-100 text-gray-500">
                      {colTasks.length}
                    </span>
                    <motion.button
                      className="w-6 h-6 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400"
                      onClick={() => toggleColumn(col.id)}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ChevronDown size={14} />
                    </motion.button>
                    <motion.button
                      className="w-6 h-6 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400"
                      whileTap={{ scale: 0.9 }}
                    >
                      <MoreHorizontal size={14} />
                    </motion.button>
                  </div>
                </>
              )}
            </div>

            {/* Points indicator */}
            {!isCollapsed && (
              <div className="px-3 pb-2 flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full overflow-hidden bg-gray-200">
                  <motion.div
                    className="h-full rounded-full bg-gray-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((colTasks.length / tasks.length) * 100, 100)}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{totalPoints(col.id as TaskStatus)} pts</span>
              </div>
            )}

            {/* Task Cards */}
            {!isCollapsed && (
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5 min-h-[200px]">
                <AnimatePresence>
                  {colTasks.map((task, index) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => handleDragStart(e, task)}
                      className={`${draggedTask?.id === task.id ? "opacity-40" : ""} cursor-grab active:cursor-grabbing`}
                    >
                      <TaskCard
                        task={task}
                        onClick={onTaskClick}
                        index={index}
                      />
                    </div>
                  ))}
                </AnimatePresence>

                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                    <Inbox size={26} className="mb-2" />
                    <p className="text-xs">Drop tasks here</p>
                  </div>
                )}

                {/* Add task button */}
                <motion.button
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all text-sm"
                  onClick={() => onAddTask(col.id as TaskStatus)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus size={14} />
                  Add task
                </motion.button>
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Add Column */}
      <motion.button
        className="flex flex-col items-center justify-center w-12 shrink-0 rounded-2xl border-2 border-dashed border-gray-200 text-gray-300 hover:border-blue-300 hover:text-blue-400 hover:bg-blue-50/30 transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Plus size={18} />
      </motion.button>
    </div>
  );
};
