import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GitBranch, X } from "lucide-react";
import { TaskDetailDto } from "../types";

interface TaskDependencyGraphProps {
  open: boolean;
  tasks: TaskDetailDto[];
  onClose: () => void;
}

const COLUMN_WIDTH = 200;
const NODE_WIDTH = 168;
const NODE_HEIGHT = 52;
const ROW_GAP = 16;

const statusColor: Record<string, string> = {
  Todo: "#1E88E5",
  InProgress: "#7C4DFF",
  Done: "#10B981",
};

function computeLevels(tasks: TaskDetailDto[]): Map<number, number> {
  const levels = new Map<number, number>();
  const byId = new Map(tasks.map((t) => [t.taskId, t]));

  function levelOf(taskId: number, visiting: Set<number>): number {
    if (levels.has(taskId)) return levels.get(taskId) as number;
    if (visiting.has(taskId)) return 0; // cycle guard
    visiting.add(taskId);
    const task = byId.get(taskId);
    const deps = task?.dependencies ?? [];
    const level = deps.length === 0 ? 0 : 1 + Math.max(...deps.map((d) => levelOf(d.dependsOnTaskId, visiting)));
    levels.set(taskId, level);
    visiting.delete(taskId);
    return level;
  }

  tasks.forEach((t) => levelOf(t.taskId, new Set()));
  return levels;
}

export function TaskDependencyGraph({ open, tasks, onClose }: TaskDependencyGraphProps) {
  const { positions, columns, width, height } = useMemo(() => {
    const levels = computeLevels(tasks);
    const columnTasks = new Map<number, TaskDetailDto[]>();
    tasks.forEach((t) => {
      const lvl = levels.get(t.taskId) ?? 0;
      columnTasks.set(lvl, [...(columnTasks.get(lvl) ?? []), t]);
    });
    const positions = new Map<number, { x: number; y: number }>();
    let maxRows = 1;
    columnTasks.forEach((list, lvl) => {
      maxRows = Math.max(maxRows, list.length);
      list.forEach((t, row) => {
        positions.set(t.taskId, { x: lvl * COLUMN_WIDTH + 20, y: row * (NODE_HEIGHT + ROW_GAP) + 20 });
      });
    });
    const maxLevel = Math.max(0, ...Array.from(columnTasks.keys()));
    return {
      positions,
      columns: columnTasks,
      width: (maxLevel + 1) * COLUMN_WIDTH + NODE_WIDTH,
      height: maxRows * (NODE_HEIGHT + ROW_GAP) + 20,
    };
  }, [tasks]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <GitBranch size={15} /> Dependency Graph
              </h3>
              <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {tasks.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">No tasks in this project yet.</div>
              ) : (
                <svg width={Math.max(width, 400)} height={Math.max(height, 200)}>
                  {tasks.flatMap((t) =>
                    t.dependencies.map((d) => {
                      const from = positions.get(d.dependsOnTaskId);
                      const to = positions.get(t.taskId);
                      if (!from || !to) return null;
                      const x1 = from.x + NODE_WIDTH;
                      const y1 = from.y + NODE_HEIGHT / 2;
                      const x2 = to.x;
                      const y2 = to.y + NODE_HEIGHT / 2;
                      const midX = (x1 + x2) / 2;
                      return (
                        <path
                          key={`${d.dependsOnTaskId}-${t.taskId}`}
                          d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                          fill="none"
                          stroke="#CBD5E1"
                          strokeWidth={1.5}
                          markerEnd="url(#arrow)"
                        />
                      );
                    })
                  )}
                  <defs>
                    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="#94A3B8" />
                    </marker>
                  </defs>
                  {tasks.map((t) => {
                    const pos = positions.get(t.taskId);
                    if (!pos) return null;
                    return (
                      <g key={t.taskId} transform={`translate(${pos.x}, ${pos.y})`}>
                        <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx={10} fill="white" stroke={statusColor[t.status ?? "Todo"] ?? "#94A3B8"} strokeWidth={1.5} />
                        <text x={10} y={20} fontSize={10} fill="#94A3B8">
                          #{t.taskId} · {t.status}
                        </text>
                        <text x={10} y={36} fontSize={12} fontWeight={600} fill="#1E293B">
                          {(t.title ?? "").length > 22 ? `${(t.title ?? "").slice(0, 22)}…` : t.title}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
              {columns.size <= 1 && tasks.some((t) => t.dependencies.length > 0) === false && tasks.length > 0 && (
                <p className="mt-3 text-center text-xs text-slate-400">Chưa có dependency nào giữa các task.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
