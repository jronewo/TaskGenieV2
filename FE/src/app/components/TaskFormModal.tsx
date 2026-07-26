import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Project, Task, TaskStatus, Priority } from "../data/tmaiData";

export interface TaskFormValues {
  title: string;
  description: string;
  projectId: string;
  deadline: string;
  priority: Priority;
  status: TaskStatus;
}

interface TaskFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  projects: Project[];
  initial?: Partial<TaskFormValues>;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const defaultValues: TaskFormValues = {
  title: "",
  description: "",
  projectId: "",
  deadline: "",
  priority: "medium",
  status: "todo",
};

export function TaskFormModal({
  open,
  mode,
  projects,
  initial,
  onClose,
  onSubmit,
  onDelete,
}: TaskFormModalProps) {
  const [form, setForm] = useState<TaskFormValues>(defaultValues);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    setForm({
      ...defaultValues,
      ...initial,
      projectId: initial?.projectId ?? projects[0]?.id ?? "",
    });
  }, [open, initial, projects]);

  if (!open) return null;

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.projectId) return;
    setSaving(true);
    try {
      await onSubmit({ ...form, title: form.title.trim() });
      onClose();
    } catch {
      // Parent shows toast; keep modal open
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-xs" onClick={onClose} />
      <motion.div
        className="relative bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden z-10"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="p-4 bg-[#1A237E] text-white flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            {mode === "create" ? <Plus size={13} /> : <Pencil size={13} />}
            {mode === "create" ? "New Task" : "Edit Task"}
          </span>
          <button type="button" onClick={onClose} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-gray-600 uppercase text-[10px]">Title *</label>
            <input
              required
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Task title"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1A237E]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-gray-600 uppercase text-[10px]">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What needs to be done?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1A237E] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-gray-600 uppercase text-[10px]">Project *</label>
              <select
                required
                value={form.projectId}
                onChange={(e) => set("projectId", e.target.value)}
                disabled={mode === "edit"}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-[#1A237E] disabled:bg-gray-50"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-gray-600 uppercase text-[10px]">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-[#1A237E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-gray-600 uppercase text-[10px]">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as Priority)}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-[#1A237E]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            {mode === "edit" && (
              <div className="space-y-1">
                <label className="font-semibold text-gray-600 uppercase text-[10px]">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as TaskStatus)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-[#1A237E]"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between gap-2">
            {mode === "edit" && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  confirmDelete
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600"
                }`}
              >
                <Trash2 size={12} />
                {confirmDelete ? "Confirm delete?" : "Delete"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 text-xs bg-[#1A237E] text-white rounded-lg font-semibold disabled:opacity-60"
              >
                {saving ? "Saving..." : mode === "create" ? "Create Task" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function taskToFormValues(task: Task): Partial<TaskFormValues> {
  const deadline = task.deadline
    ? task.deadline.includes("T")
      ? task.deadline.slice(0, 10)
      : task.deadline.slice(0, 10)
    : "";
  return {
    title: task.title,
    description: task.description,
    projectId: task.projectId ?? "",
    deadline,
    priority: task.priority,
    status: task.status,
  };
}
