import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Sparkles } from "lucide-react";
import { Task, TaskStatus, Priority, teamMembers, projects } from "../data/tmaiData";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (task: Task) => void;
  defaultStatus?: TaskStatus;
}

interface FormState {
  title: string;
  description: string;
  priority: Priority;
  deadline: string;
  assigneeId: string;
  projectId: string;
}

const emptyForm: FormState = {
  title: "",
  description: "",
  priority: "medium",
  deadline: "",
  assigneeId: teamMembers[0]?.id ?? "",
  projectId: projects[0]?.id ?? "",
};

// Rough AI-style effort estimate — deterministic stand-in for a real prediction model.
const durationEstimate: Record<Priority, { days: number; confidence: number }> = {
  low: { days: 3, confidence: 88 },
  medium: { days: 6, confidence: 81 },
  high: { days: 9, confidence: 74 },
  urgent: { days: 2, confidence: 68 },
};

export const CreateTaskModal = ({ open, onClose, onCreate, defaultStatus }: CreateTaskModalProps) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const estimate = durationEstimate[form.priority];

  const handleClose = () => {
    setForm(emptyForm);
    setError("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (!form.deadline) {
      setError("Deadline is required.");
      return;
    }

    const assignee = teamMembers.find((m) => m.id === form.assigneeId) ?? teamMembers[0];
    const status = defaultStatus ?? "backlog";
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim() || "No description provided.",
      status,
      priority: form.priority,
      risk: "safe",
      riskScore: 10,
      assignee,
      deadline: form.deadline,
      projectId: form.projectId,
      tags: [],
      progress: status === "done" ? 100 : 0,
      aiInsight: "No AI insights yet — this task was just created.",
      comments: 0,
      attachments: 0,
      storyPoints: 3,
    };

    onCreate(newTask);
    handleClose();
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
                  <label className="font-bold text-gray-700 uppercase text-[10px]">Project</label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm((prev) => ({ ...prev, projectId: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#1A237E]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 uppercase text-[10px]">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as Priority }))}
                    className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#1A237E]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 uppercase text-[10px]">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#1A237E]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 uppercase text-[10px]">Assignee</label>
                  <select
                    value={form.assigneeId}
                    onChange={(e) => setForm((prev) => ({ ...prev, assigneeId: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[#1A237E]"
                  >
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-2 text-indigo-700">
                <Sparkles size={12} className="shrink-0" />
                <span>
                  AI estimate: <strong>~{estimate.days} days</strong> of effort · {estimate.confidence}% confidence
                </span>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1A237E] text-white font-bold rounded hover:bg-[#0D1757]"
                >
                  Create Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
