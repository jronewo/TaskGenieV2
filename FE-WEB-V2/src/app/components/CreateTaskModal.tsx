import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2 } from "lucide-react";
import { taskApi, TaskDetailDto, TaskTypeDto } from "../services/taskApi";
import { skillApi } from "../services/adminApi";
import { ApiError } from "../services/apiClient";
import { todayIso, isPastDate } from "../lib/dateGuards";

interface CreateTaskModalProps {
  open: boolean;
  projectId: number | null;
  /** Caps the deadline picker so a task can't be scheduled past the project's own deadline. */
  projectDeadline?: string | null;
  onClose: () => void;
  onCreated: (task: TaskDetailDto) => void;
}

interface FormState {
  title: string;
  description: string;
  priority: string;
  deadline: string;
  startDate: string;
  difficulty: string;
  taskTypeId: string;
}

const EMPTY: FormState = {
  title: "", description: "", priority: "Medium", deadline: "", startDate: "", difficulty: "3", taskTypeId: "",
};

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to add tasks to this project.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

export const CreateTaskModal = ({ open, projectId, projectDeadline, onClose, onCreated }: CreateTaskModalProps) => {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Required skills drive the AI assignment score (skill match is weighted 40%), so a task created
  // without them gets noticeably worse suggestions.
  const [catalog, setCatalog] = useState<{ skillId: number; skillName: string }[]>([]);
  // skillId -> required level (1–5). The level is what makes the match score discriminate: the
  // engine divides the candidate's level by it, so leaving everything at 1 turns 40% of the score
  // into a flat "has the skill at all".
  const [requiredSkills, setRequiredSkills] = useState<Record<number, number>>({});
  const [taskTypes, setTaskTypes] = useState<TaskTypeDto[]>([]);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setRequiredSkills({});
      setError(null);
      // A failed catalog read must not block task creation; the section just stays empty.
      void skillApi.catalog().then(setCatalog).catch(() => setCatalog([]));
      // A 204 or a malformed body arrives as undefined; the picker must not render off it.
      void Promise.resolve(taskApi.types())
        .then((types) => setTaskTypes(Array.isArray(types) ? types : []))
        .catch(() => setTaskTypes([]));
    }
  }, [open]);

  const toggleSkill = (skillId: number) =>
    setRequiredSkills((current) => {
      if (skillId in current) {
        const { [skillId]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [skillId]: 3 };
    });

  const setLevel = (skillId: number, level: number) =>
    setRequiredSkills((current) => ({ ...current, [skillId]: level }));

  const selectedSkills = Object.entries(requiredSkills).map(([skillId, requiredLevel]) => ({
    skillId: Number(skillId),
    requiredLevel,
  }));

  const projectDeadlineDate = projectDeadline ? projectDeadline.slice(0, 10) : null;

  const submit = async () => {
    if (projectId == null || busy) return; // double-submit guard
    if (isPastDate(form.startDate) || isPastDate(form.deadline)) {
      setError("Start date and deadline cannot be in the past.");
      return;
    }
    if (form.startDate && form.deadline && form.startDate > form.deadline) {
      setError("Start date must be on or before the deadline.");
      return;
    }
    if (projectDeadlineDate && form.deadline && form.deadline > projectDeadlineDate) {
      setError("Task deadline cannot be later than the project's deadline.");
      return;
    }
    if (projectDeadlineDate && form.startDate && form.startDate > projectDeadlineDate) {
      setError("Task start date cannot be later than the project's deadline.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await taskApi.create({
        projectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        deadline: form.deadline || null,
        startDate: form.startDate || null,
        difficulty: form.difficulty ? Number(form.difficulty) : null,
        taskTypeId: form.taskTypeId ? Number(form.taskTypeId) : null,
      });
      if (selectedSkills.length > 0) {
        // The task already exists at this point — a rejected skill write is reported, not fatal.
        try {
          await taskApi.setRequiredSkills(created.taskId, selectedSkills);
        } catch (err) {
          setError(`Task created, but its required skills were not saved: ${errorMessage(err)}`);
        }
      }
      onCreated(created);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Create task"
        >
          <motion.div
            className="w-full max-w-lg rounded-xl bg-white p-5"
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">New task</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
                <X size={16} aria-hidden />
              </button>
            </div>

            {projectId == null && (
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Select a project first.
              </p>
            )}
            {error && (
              <div role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-700">Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="What needs doing?"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1A237E]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-700">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1A237E]"
                />
              </label>

              <label className="block">
                {/* Real reference data, not a regex over the title — "Fix the pricing copy" is not
                    a defect, and a Vietnamese title was always filed as a plain Task. */}
                <span className="mb-1 block text-xs font-semibold text-gray-700">Type</span>
                <select
                  value={form.taskTypeId}
                  onChange={(e) => setForm((f) => ({ ...f, taskTypeId: e.target.value }))}
                  aria-label="Task type"
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                >
                  <option value="">Chưa phân loại</option>
                  {taskTypes.map((t) => (
                    <option key={t.taskTypeId} value={t.taskTypeId}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-gray-700">Priority</span>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-gray-700">Difficulty</span>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-gray-700">Start date</span>
                  <input
                    type="date"
                    value={form.startDate}
                    min={todayIso()}
                    max={form.deadline || projectDeadlineDate || undefined}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-gray-700">Deadline</span>
                  <input
                    type="date"
                    value={form.deadline}
                    min={form.startDate || todayIso()}
                    max={projectDeadlineDate || undefined}
                    onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                  />
                  {projectDeadlineDate && (
                    <span className="mt-1 block text-[10px] text-gray-500">
                      Project deadline: {projectDeadlineDate}
                    </span>
                  )}
                </label>
              </div>

              <fieldset>
                <legend className="mb-1 block text-xs font-semibold text-gray-700">
                  Required skills{selectedSkills.length > 0 ? ` (${selectedSkills.length})` : ""}
                </legend>
                <p className="mb-2 text-[10px] text-gray-500">
                  These decide who the AI suggests — skill match is 40% of the assignment score.
                </p>
                {catalog.length === 0 ? (
                  <p className="text-[11px] text-gray-500">
                    No skills in the catalog yet. An administrator can add them under Skills.
                  </p>
                ) : (
                  <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2">
                    {catalog.map((skill) => {
                      const selected = skill.skillId in requiredSkills;
                      return (
                        <button
                          key={skill.skillId}
                          type="button"
                          onClick={() => toggleSkill(skill.skillId)}
                          aria-pressed={selected}
                          className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                            selected
                              ? "bg-[#1A237E] text-white"
                              : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {skill.skillName}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedSkills.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {selectedSkills.map(({ skillId, requiredLevel }) => {
                      const name = catalog.find((c) => c.skillId === skillId)?.skillName ?? `Skill ${skillId}`;
                      return (
                        <li key={skillId} className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-[11px] text-gray-700">{name}</span>
                          <label className="text-[10px] text-gray-500" htmlFor={`req-level-${skillId}`}>
                            Level
                          </label>
                          <select
                            id={`req-level-${skillId}`}
                            value={requiredLevel}
                            onChange={(e) => setLevel(skillId, Number(e.target.value))}
                            aria-label={`Required level for ${name}`}
                            className="rounded-md border border-gray-200 px-1.5 py-1 text-[11px]"
                          >
                            {[1, 2, 3, 4, 5].map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </fieldset>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!form.title.trim() || projectId == null || busy}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1A237E] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
                Create task
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
