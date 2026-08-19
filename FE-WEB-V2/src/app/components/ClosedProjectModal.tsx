import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, Download, Loader2, CalendarDays, Layers } from "lucide-react";
import { taskApi, TaskDetailDto } from "../services/taskApi";
import { ProjectDto } from "../services/projectApi";
import { teamApi, TeamMemberDto } from "../services/teamApi";
import { ApiError } from "../services/apiClient";

/**
 * A finished project, read-only.
 *
 * Same four columns as the live board, because someone looking back at a closed project is asking
 * the same question they asked while it ran — what ended up where. Nothing here mutates: the
 * cards are not links and there is no drag target, so a closed project cannot be edited by
 * accident from the profile.
 */

const COLUMNS = [
  { id: "Todo", label: "CẦN LÀM", accent: "#64748B" },
  { id: "InProgress", label: "ĐANG LÀM", accent: "#1E88E5" },
  { id: "InReview", label: "CHỜ DUYỆT", accent: "#F59E0B" },
  { id: "Done", label: "HOÀN THÀNH", accent: "#10B981" },
] as const;

const RISK_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-red-50 text-red-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  LOW: "bg-emerald-50 text-emerald-700",
};

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "Bạn không có quyền xem công việc của dự án này.";
    if (err.message) return err.message;
    return `Request failed (${err.status}).`;
  }
  return "Không tải được công việc của dự án.";
}

export const ClosedProjectModal = ({
  project,
  onClose,
  onExport,
}: {
  project: ProjectDto;
  onClose: () => void;
  /** Builds the closure report from the rows this modal already loaded. */
  onExport: (project: ProjectDto, tasks: TaskDetailDto[], teamMembers: TeamMemberDto[]) => void;
}) => {
  const [tasks, setTasks] = useState<TaskDetailDto[]>([]);
  const [members, setMembers] = useState<TeamMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        // The team supplies the report's project manager and per-member role. It is optional —
        // a project whose team is gone still has a full task breakdown worth exporting.
        const [list, team] = await Promise.all([
          taskApi.byProject(project.projectId),
          project.teamId != null
            ? teamApi.getById(project.teamId).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setTasks(list);
          setMembers(team?.members ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err));
          setTasks([]);
          setMembers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.projectId, project.teamId]);

  // Esc closes it, the same as every other dialog in the console.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const done = tasks.filter((t) => t.status === "Done").length;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Dự án đã xong: ${project.name}`}
      onClick={onClose}
    >
      <motion.div
        className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-line bg-surface-raised shadow-xl"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-strong">{project.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-subtle">
              <span className="inline-flex items-center gap-1">
                <Layers size={11} aria-hidden /> {done}/{tasks.length} hoàn thành
              </span>
              {project.deadline && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={11} aria-hidden /> hạn {project.deadline}
                </span>
              )}
              {project.organizationName && <span>{project.organizationName}</span>}
              <span className="rounded bg-surface-inset px-1.5 py-0.5 font-medium">Đã kết thúc</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onExport(project, tasks, members)}
              disabled={loading || tasks.length === 0}
              title={tasks.length === 0 ? "Dự án không có công việc để báo cáo." : undefined}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-default hover:bg-surface-inset disabled:opacity-50"
            >
              <Download size={13} aria-hidden /> Export báo cáo PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="text-subtle hover:text-strong"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-xs text-subtle">
              <Loader2 size={14} className="animate-spin" aria-hidden /> Đang tải công việc…
            </p>
          ) : error ? (
            <p role="alert" className="py-16 text-center text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : tasks.length === 0 ? (
            <p className="py-16 text-center text-xs text-subtle">Dự án này không có công việc nào.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {COLUMNS.map((column) => {
                const rows = tasks.filter((t) => (t.status ?? "Todo") === column.id);
                return (
                  <section key={column.id} className="min-w-0 rounded-lg bg-surface-inset p-2.5">
                    <h4
                      className="mb-2.5 flex items-center gap-1.5 border-b-2 pb-2 text-[10px] font-bold tracking-wide text-strong"
                      style={{ borderColor: column.accent }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: column.accent }}
                        aria-hidden
                      />
                      {column.label}
                      <span className="ml-auto tabular-nums text-subtle">{rows.length}</span>
                    </h4>

                    {rows.length === 0 ? (
                      <p className="py-6 text-center text-[10px] text-subtle">Trống.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {rows.map((task) => {
                          const risk = (task.riskLevel ?? "").toUpperCase();
                          return (
                            <li
                              key={task.taskId}
                              className="rounded-lg border border-line bg-surface p-2.5"
                            >
                              <div className="mb-1 flex items-start justify-between gap-2">
                                <p className="line-clamp-2 flex-1 text-[12px] font-medium leading-snug text-strong">
                                  {task.title ?? `Task #${task.taskId}`}
                                </p>
                                {RISK_STYLES[risk] && (
                                  <span
                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${RISK_STYLES[risk]}`}
                                  >
                                    {risk}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-subtle">
                                {task.deadline && (
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarDays size={10} aria-hidden /> {task.deadline}
                                  </span>
                                )}
                                <span className="ml-auto tabular-nums">{task.progress ?? 0}%</span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
