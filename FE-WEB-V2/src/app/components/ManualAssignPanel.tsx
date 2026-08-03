import React, { useCallback, useEffect, useState } from "react";
import { UserPlus, Check, Loader2, AlertTriangle, UserMinus } from "lucide-react";
import { taskApi, TaskAssigneeDto } from "../services/taskApi";
import { projectApi } from "../services/projectApi";
import { teamApi, TeamMemberDto } from "../services/teamApi";
import { ApiError } from "../services/apiClient";
import { initials } from "../lib/jira";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "You don't have permission to assign work on this task.";
    if (err.status === 404) return "This task or its project no longer exists.";
    if (err.message) return err.message;
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

interface Props {
  taskId: number;
  projectId: number;
  /** Current holders of the task — drives the "already assigned" hint and the clear button. */
  assignees: TaskAssigneeDto[];
  /** Lets the parent refetch the task once the assignment lands. */
  onAssigned?: () => void;
}

/**
 * Direct assignment.
 *
 * The AI panel above it can only hand a task to someone it just suggested, which meant a leader who
 * already knew the right person had to run a recommendation purely to earn the right to name them.
 * This picks straight from the project's team instead. The permission rule is unchanged — the API
 * still requires the same manage-task rights the AI path does.
 */
export const ManualAssignPanel = ({ taskId, projectId, assignees, onAssigned }: Props) => {
  const [members, setMembers] = useState<TeamMemberDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const currentId = assignees[0]?.userId ?? null;

  // A project owns exactly one team, so the roster is the project's team members.
  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const project = await projectApi.getById(projectId);
      if (project.teamId == null) {
        setMembers([]);
        return;
      }
      const team = await teamApi.getById(project.teamId);
      setMembers(team.members ?? []);
    } catch (err) {
      setError(errorMessage(err));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  // Reflect an assignment made elsewhere (AI panel, another tab) instead of showing a stale pick.
  useEffect(() => {
    setSelected(currentId != null ? String(currentId) : "");
  }, [currentId]);

  const submit = async (userId: number | null) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await taskApi.assign(taskId, userId);
      const name = members?.find((m) => m.userId === userId)?.userName;
      setNotice(userId == null ? "Assignee cleared." : `${name ?? "User"} was assigned to this task.`);
      onAssigned?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const selectedId = selected ? Number(selected) : null;
  const unchanged = selectedId === currentId;

  return (
    <section className="rounded-lg border border-line bg-surface-raised p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-strong">
          <UserPlus size={13} className="text-brand" aria-hidden />
          Assign directly
        </h4>
        {currentId != null && (
          <button
            type="button"
            onClick={() => void submit(null)}
            disabled={busy}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] font-medium text-muted transition-colors hover:text-strong hover:bg-surface-sunken disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
          >
            <UserMinus size={11} aria-hidden /> Clear
          </button>
        )}
      </div>

      <p className="mt-1 text-[10px] text-muted">
        Pick anyone on the project team — no AI recommendation needed.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-2 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertTriangle size={12} className="mt-px shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          {notice}
        </div>
      )}

      {loading && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
          <Loader2 size={11} className="animate-spin" aria-hidden /> Loading team members…
        </p>
      )}

      {!loading && members?.length === 0 && (
        <p className="mt-3 text-[11px] text-muted">
          This project has no team members yet. Add someone to the team first.
        </p>
      )}

      {!loading && members && members.length > 0 && (
        <div className="mt-3 flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor={`assignee-${taskId}`} className="mb-1 block text-[10px] font-medium text-muted">
              Assignee
            </label>
            <select
              id={`assignee-${taskId}`}
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={busy}
              className="w-full cursor-pointer rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-xs text-strong transition-colors hover:border-strong disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
            >
              <option value="">— Unassigned —</option>
              {members.map((m) => (
                <option key={m.id} value={m.userId ?? ""}>
                  {m.userName ?? m.email ?? `User ${m.userId}`}
                  {m.role ? ` · ${m.role}` : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => void submit(selectedId)}
            disabled={busy || unchanged || selectedId == null}
            title={unchanged ? "Already assigned to this person" : undefined}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[11px] font-semibold transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)] focus-visible:ring-offset-1"
          >
            {busy ? <Loader2 size={11} className="animate-spin" aria-hidden /> : <Check size={11} aria-hidden />}
            Assign
          </button>
        </div>
      )}

      {currentId != null && (
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-surface-inset text-[8px] font-semibold text-default"
            aria-hidden
          >
            {initials(assignees[0]?.userName ?? `U${currentId}`)}
          </span>
          Currently assigned to {assignees[0]?.userName ?? `User ${currentId}`}
        </p>
      )}
    </section>
  );
};
