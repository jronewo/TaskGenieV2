import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { taskApi, TaskDetailDto, TaskDependencyDto } from "../services/taskApi";
import { ApiError } from "../services/apiClient";
import { progressFor } from "../lib/jira";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to complete this task.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

interface ForceCompleteModalProps {
  task: TaskDetailDto;
  /** Dependencies of `task` that aren't Done yet — the ones standing in the way. */
  openDependencies: TaskDependencyDto[];
  onClose: () => void;
  /** Fires once the status change (and any selected dependency completions) has landed server-side. */
  onMoved: (updated: TaskDetailDto) => void;
}

/**
 * Only a Lead ever sees this — it's reached exclusively from an already-gated attempt to move an
 * InReview task to Done while a dependency is still open. Nothing here is forced by default: the
 * Lead opts each dependency in individually, and anything left unchecked stays exactly where it was.
 */
export const ForceCompleteModal = ({ task, openDependencies, onClose, onMoved }: ForceCompleteModalProps) => {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (dependsOnTaskId: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(dependsOnTaskId)) next.delete(dependsOnTaskId);
      else next.add(dependsOnTaskId);
      return next;
    });

  const submit = async () => {
    if (busy) return; // double-submit guard
    setBusy(true);
    setError(null);
    try {
      const updated = await taskApi.updateProgress(task.taskId, {
        status: "Done",
        progress: progressFor("Done", task.progress),
        force: true,
        forceDependencyTaskIds: Array.from(selected),
      });
      onMoved(updated);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Complete task with open dependencies"
      >
        <motion.div
          className="w-full max-w-lg rounded-xl bg-white p-5"
          initial={{ scale: 0.96, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 8 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Complete task anyway?</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
              <X size={16} aria-hidden />
            </button>
          </div>

          <div className="mb-3 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertTriangle size={13} className="mt-px shrink-0" aria-hidden />
            <span>
              This task has {openDependencies.length} open{" "}
              {openDependencies.length === 1 ? "dependency" : "dependencies"} — completing it now will
              leave {openDependencies.length === 1 ? "it" : "them"} unfinished unless you also complete{" "}
              {openDependencies.length === 1 ? "it" : "them"} here.
            </span>
          </div>

          {error && (
            <div role="alert" className="mb-3 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle size={13} className="mt-px shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <ul className="space-y-1.5">
            {openDependencies.map((dep) => (
              <li key={dep.dependencyId}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-2.5 py-2 text-xs hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selected.has(dep.dependsOnTaskId)}
                    onChange={() => toggle(dep.dependsOnTaskId)}
                  />
                  <span className="flex-1 truncate text-gray-900">{dep.dependsOnTaskTitle ?? `Task ${dep.dependsOnTaskId}`}</span>
                  <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-600">
                    {dep.status ?? "Todo"}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy && <Loader2 size={12} className="animate-spin" aria-hidden />}
              {selected.size > 0 ? `Complete task + ${selected.size} selected` : "Complete task only"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
