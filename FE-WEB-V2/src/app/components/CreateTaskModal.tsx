import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X } from "lucide-react";
import { tasksApi, TaskDto } from "../services/tasksApi";
import { ApiError } from "../services/apiClient";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (task: TaskDto) => void;
  projectId: number | null;
}

interface FormState {
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  deadline: string;
  difficulty: number;
}

const emptyForm: FormState = {
  title: "",
  description: "",
  priority: "Medium",
  deadline: "",
  difficulty: 3,
};

export const CreateTaskModal = ({ open, onClose, onCreate, projectId }: CreateTaskModalProps) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setForm(emptyForm);
    setError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (!projectId) {
      setError("Select a project first.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const created = await tasksApi.create({
        projectId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        deadline: form.deadline || undefined,
        difficulty: form.difficulty,
      });
      onCreate(created);
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/20 backdrop-blur-xs"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative bg-white border-2 border-[#1A237E] rounded-xl w-full max-w-md shadow-2xl overflow-hidden z-10 flex flex-col"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
          >
            <div className="p-4 bg-[#1A237E] text-white flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={13} /> Create Task
              </span>
              <button type="button" onClick={handleClose} className="text-white/70 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-gray-700 uppercase text-[10px]">Task Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Optimize Database Connection Pooling"
                  className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-[#1A237E]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 uppercase text-[10px]">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the work to be done..."
                  className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-[#1A237E] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 uppercase text-[10px]">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as FormState["priority"] }))}
                    className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#1A237E]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 uppercase text-[10px]">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm((prev) => ({ ...prev, difficulty: Number(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#1A237E]"
                  >
                    <option value={1}>1 · Trivial</option>
                    <option value={2}>2 · Easy</option>
                    <option value={3}>3 · Medium</option>
                    <option value={4}>4 · Hard</option>
                    <option value={5}>5 · Very Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 uppercase text-[10px]">Deadline</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#1A237E]"
                />
              </div>

              <p className="text-[10px] text-gray-400">
                Tasks are created unassigned — use AI Recommendations on the task detail page to assign someone.
              </p>

              <div className="pt-3 flex gap-2 justify-end">
                <button type="button" onClick={handleClose} className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 bg-[#1A237E] text-white font-bold rounded hover:bg-[#0D1757] disabled:opacity-60">
                  {saving ? "Creating…" : "Create Task"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
