import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import { projectApi, ProjectDto } from "../services/projectApi";
import { ApiError } from "../services/apiClient";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to restore this project.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

const GRACE_DAYS = 30;

/** Whole days left before a deleted project is purged for real, floored at 0 so a project already
 *  past its window (about to be swept) never shows a negative countdown. */
function daysRemaining(deletedAt: string | null | undefined): number {
  if (!deletedAt) return GRACE_DAYS;
  const elapsedMs = Date.now() - new Date(deletedAt).getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  return Math.max(0, GRACE_DAYS - elapsedDays);
}

interface TrashModalProps {
  onClose: () => void;
  /** Fires after a successful restore so the caller can refresh its own project list/quota. */
  onRestored: () => void;
}

/**
 * Deleted projects aren't gone — they sit here for 30 days before the purge worker removes them
 * for real, and can be brought back with one click at any point before that.
 */
export const TrashModal = ({ onClose, onRestored }: TrashModalProps) => {
  const [projects, setProjects] = useState<ProjectDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await projectApi.listDeleted());
    } catch (err) {
      setError(errorMessage(err));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const restore = async (project: ProjectDto) => {
    if (busyId != null) return; // one restore at a time
    setBusyId(project.projectId);
    setError(null);
    setNotice(null);
    try {
      await projectApi.restore(project.projectId);
      setNotice(`"${project.name}" was restored.`);
      setProjects((current) => (current ?? []).filter((p) => p.projectId !== project.projectId));
      onRestored();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
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
        aria-label="Trash"
      >
        <motion.div
          className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-white p-5"
          initial={{ scale: 0.96, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 8 }}
        >
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Trash2 size={15} className="text-gray-500" aria-hidden />
              Trash
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
              <X size={16} aria-hidden />
            </button>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">
            Deleted projects stay here for {GRACE_DAYS} days before they're gone for good.
          </p>

          {error && (
            <div role="alert" className="mb-3 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
              <AlertTriangle size={12} className="mt-px shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div role="status" className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-700">
              {notice}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 py-8 text-xs text-gray-500">
                <Loader2 size={14} className="animate-spin" aria-hidden /> Loading…
              </div>
            ) : projects && projects.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500">Trash is empty.</p>
            ) : (
              <ul className="space-y-1.5">
                {(projects ?? []).map((project) => {
                  const remaining = daysRemaining(project.updatedAt);
                  return (
                    <li
                      key={project.projectId}
                      className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-900">{project.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {remaining > 0
                            ? `Permanently deleted in ${remaining} day${remaining === 1 ? "" : "s"}`
                            : "Being permanently deleted soon"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => restore(project)}
                        disabled={busyId != null}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {busyId === project.projectId ? (
                          <Loader2 size={11} className="animate-spin" aria-hidden />
                        ) : (
                          <RotateCcw size={11} aria-hidden />
                        )}
                        Restore
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
