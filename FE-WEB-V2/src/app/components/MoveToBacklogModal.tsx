import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, AlertTriangle, Bug } from "lucide-react";
import { taskApi, TaskDetailDto } from "../services/taskApi";
import { ApiError } from "../services/apiClient";
import { AiAssignmentPanel } from "./AiAssignmentPanel";
import { ManualAssignPanel } from "./ManualAssignPanel";
import { initials, progressFor } from "../lib/jira";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to change this task.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

interface MoveToBacklogModalProps {
  task: TaskDetailDto;
  onClose: () => void;
  /** Fires once the status+reason change has landed server-side. */
  onMoved: (updated: TaskDetailDto) => void;
}

/**
 * Backlog only exists because of a bug, so moving a task there is never a plain drag: the mover
 * must say what went wrong, and the task must land on someone. Whoever already had it keeps it —
 * this modal just asks why. Nobody had it yet, so it reuses the same AI-suggest and manual-assign
 * panels the task detail view already uses, letting either one set the assignee before Confirm.
 */
export const MoveToBacklogModal = ({ task, onClose, onMoved }: MoveToBacklogModalProps) => {
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [hasAssignee, setHasAssignee] = useState((task.assignees?.length ?? 0) > 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const currentAssignee = task.assignees?.[0] ?? null;
  const reasonEmpty = reason.trim().length === 0;

  const submit = async () => {
    if (busy) return; // double-submit guard
    if (reasonEmpty) {
      setReasonTouched(true);
      reasonRef.current?.focus();
      return;
    }
    if (!hasAssignee) {
      setError("Pick someone to take this task before confirming.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const updated = await taskApi.updateProgress(task.taskId, {
        status: "Backlog",
        progress: progressFor("Backlog", task.progress),
        reason: reason.trim(),
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
        aria-label="Move to Backlog"
      >
        <motion.div
          className="w-full max-w-lg rounded-xl bg-white p-5"
          initial={{ scale: 0.96, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 8 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Bug size={15} className="text-red-600" aria-hidden />
              Move to Backlog
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
              <X size={16} aria-hidden />
            </button>
          </div>

          {error && (
            <div role="alert" className="mb-3 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle size={13} className="mt-px shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <label className="block" htmlFor="backlog-reason">
              <span className="mb-1 block text-xs font-semibold text-gray-700">What's the bug?</span>
              <textarea
                id="backlog-reason"
                ref={reasonRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => setReasonTouched(true)}
                rows={3}
                placeholder="Describe the bug that's sending this back…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1A237E]"
              />
              {reasonTouched && reasonEmpty && (
                <span className="mt-1 block text-[11px] text-red-600">A reason is required.</span>
              )}
            </label>

            {currentAssignee ? (
              <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-[11px] text-gray-600">
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[8px] font-semibold text-gray-700"
                  aria-hidden
                >
                  {initials(currentAssignee.userName ?? `U${currentAssignee.userId}`)}
                </span>
                Stays with {currentAssignee.userName ?? `User ${currentAssignee.userId}`}
              </div>
            ) : (
              task.projectId != null && (
                <div className="space-y-2">
                  <AiAssignmentPanel
                    taskId={task.taskId}
                    projectId={task.projectId}
                    autoSuggest
                    onAssigned={() => setHasAssignee(true)}
                  />
                  <ManualAssignPanel
                    taskId={task.taskId}
                    projectId={task.projectId}
                    assignees={task.assignees ?? []}
                    onAssigned={() => setHasAssignee(true)}
                  />
                </div>
              )
            )}
          </div>

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
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy && <Loader2 size={12} className="animate-spin" aria-hidden />}
              Move to Backlog
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
