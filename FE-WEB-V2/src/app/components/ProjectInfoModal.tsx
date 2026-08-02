import React, { useCallback, useEffect, useState } from "react";
import { X, Loader2, CalendarDays, Users, Layers, Crown } from "lucide-react";
import { taskApi, TaskDetailDto } from "../services/taskApi";
import { teamApi, TeamDto } from "../services/teamApi";
import { OrganizationProjectDto } from "../services/organizationApi";
import { ApiError } from "../services/apiClient";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "You don't have access to this project.";
    if (err.message) return err.message;
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

const STATUS_STYLE: Record<string, string> = {
  Todo: "bg-gray-200 text-gray-700",
  InProgress: "bg-blue-100 text-blue-800",
  Done: "bg-emerald-100 text-emerald-800",
};

const RISK_STYLE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-red-50 text-red-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  LOW: "bg-emerald-50 text-emerald-700",
};

interface Props {
  project: OrganizationProjectDto | null;
  onClose: () => void;
}

/**
 * Read-only view of one project and its tasks, for people looking at the organization page who do
 * not want to navigate away from it. Tasks come from the normal task API, so a project the caller
 * cannot read reports an error rather than an empty board that looks like "no work here".
 */
export const ProjectInfoModal = ({ project, onClose }: Props) => {
  const [tasks, setTasks] = useState<TaskDetailDto[]>([]);
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (project == null) return;
    setLoading(true);
    setError(null);
    try {
      setTasks(await taskApi.byProject(project.projectId));
    } catch (err) {
      setError(errorMessage(err));
      setTasks([]);
    } finally {
      setLoading(false);
    }

    // The team read is secondary; failing it must not hide the tasks.
    if (project.teamId != null) {
      try {
        setTeam(await teamApi.getById(project.teamId));
      } catch {
        setTeam(null);
      }
    }
  }, [project]);

  useEffect(() => {
    void load();
  }, [load]);

  if (project == null) return null;

  const done = tasks.filter((t) => t.status === "Done").length;
  const inProgress = tasks.filter((t) => t.status === "InProgress").length;
  const leader = team?.members?.find((m) => m.role === "LEADER");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Project information: ${project.name}`}
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-gray-200 bg-white">
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-gray-900">{project.name}</h2>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${RISK_STYLE[(project.riskLevel ?? "LOW").toUpperCase()] ?? RISK_STYLE.LOW}`}>
                {(project.riskLevel ?? "LOW").toUpperCase()}
              </span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                {project.status ?? "Planning"}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Layers size={11} aria-hidden /> {done}/{tasks.length} done · {inProgress} đang làm
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={11} aria-hidden /> {project.teamMemberCount} member(s)
              </span>
              {leader && (
                <span className="inline-flex items-center gap-1">
                  <Crown size={11} className="text-amber-500" aria-hidden /> {leader.userName}
                </span>
              )}
              {project.deadline && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={11} aria-hidden /> due {project.deadline}
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 text-gray-400 hover:text-gray-700">
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-xs text-gray-500">
              <Loader2 size={14} className="animate-spin" aria-hidden /> Loading tasks…
            </div>
          ) : tasks.length === 0 && !error ? (
            <p className="py-10 text-center text-xs text-gray-500">Dự án này chưa có công việc nào.</p>
          ) : (
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wide text-gray-400">
                  <th className="pb-1.5 font-medium">Công việc</th>
                  <th className="pb-1.5 font-medium">Trạng thái</th>
                  <th className="pb-1.5 font-medium">Ưu tiên</th>
                  <th className="pb-1.5 font-medium">Rủi ro</th>
                  <th className="pb-1.5 font-medium">Người làm</th>
                  <th className="pb-1.5 font-medium">Hạn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((task) => (
                  <tr key={task.taskId}>
                    <td className="py-2 pr-3">
                      <span className="text-gray-400">#{task.taskId}</span> {task.title}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${STATUS_STYLE[task.status ?? "Todo"] ?? STATUS_STYLE.Todo}`}>
                        {task.status ?? "Todo"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{task.priority ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${RISK_STYLE[(task.riskLevel ?? "LOW").toUpperCase()] ?? RISK_STYLE.LOW}`}>
                        {task.riskLevel ?? "—"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-600">
                      {task.assignees.length > 0
                        ? task.assignees.map((a) => a.userName ?? `User ${a.userId}`).join(", ")
                        : "chưa giao"}
                    </td>
                    <td className="py-2 text-gray-600">{task.deadline?.slice(0, 10) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
