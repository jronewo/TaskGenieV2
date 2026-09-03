import React, { useCallback, useEffect, useState } from "react";
import { Flag, Clock, Link2, Loader2, Plus, Trash2, Sparkles, Ban, Calendar } from "lucide-react";
import { taskApi, TaskDetailDto } from "../services/taskApi";
import { projectApi } from "../services/projectApi";
import { ApiError } from "../services/apiClient";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to change this task.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-800",
  High: "bg-red-50 text-red-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-gray-100 text-gray-600",
};

interface Props {
  task: TaskDetailDto;
  onChanged?: () => void;
}

/**
 * Priority, estimate and blockers in one place. A blocker is a dependency: this task cannot reach
 * Done until the referenced task is Done — the API enforces that, so the list here is both the
 * reference and the explanation for a refused status move.
 */
export const TaskPlanningPanel = ({ task, onChanged }: Props) => {
  const [siblings, setSiblings] = useState<TaskDetailDto[]>([]);
  const [blockerId, setBlockerId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Local, editable copies of the schedule — synced from the server whenever a different task is
  // opened, but not on every re-render, so mid-edit keystrokes survive an unrelated refresh.
  const [startDateInput, setStartDateInput] = useState(task.startDate?.slice(0, 10) ?? "");
  const [deadlineInput, setDeadlineInput] = useState(task.deadline?.slice(0, 10) ?? "");
  useEffect(() => {
    setStartDateInput(task.startDate?.slice(0, 10) ?? "");
    setDeadlineInput(task.deadline?.slice(0, 10) ?? "");
  }, [task.taskId]);

  // Candidate blockers are the project's other tasks.
  const loadSiblings = useCallback(async () => {
    if (task.projectId == null) return;
    try {
      const list = await taskApi.byProject(task.projectId);
      setSiblings(list.filter((t) => t.taskId !== task.taskId));
    } catch {
      setSiblings([]);
    }
  }, [task.projectId, task.taskId]);

  useEffect(() => {
    void loadSiblings();
  }, [loadSiblings]);

  // Caps the deadline picker so a task can't be rescheduled past the project's own deadline.
  const [projectDeadline, setProjectDeadline] = useState<string | null>(null);
  useEffect(() => {
    if (task.projectId == null) {
      setProjectDeadline(null);
      return;
    }
    let cancelled = false;
    projectApi
      .getById(task.projectId)
      .then((p) => {
        if (!cancelled) setProjectDeadline(p.deadline ? p.deadline.slice(0, 10) : null);
      })
      .catch(() => {
        if (!cancelled) setProjectDeadline(null);
      });
    return () => {
      cancelled = true;
    };
  }, [task.projectId]);

  const run = async (key: string, action: () => Promise<void>, successMessage?: string) => {
    if (busy) return; // double-submit guard
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (successMessage) setNotice(successMessage);
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const changePriority = (priority: string) =>
    run("priority", () => taskApi.update(task.taskId, { priority }).then(() => undefined));

  const scheduleInvalid = Boolean(startDateInput && deadlineInput && startDateInput > deadlineInput);
  const deadlineExceedsProject = Boolean(projectDeadline && deadlineInput && deadlineInput > projectDeadline);
  const startExceedsProject = Boolean(projectDeadline && startDateInput && startDateInput > projectDeadline);

  const saveSchedule = () => {
    if (scheduleInvalid) {
      setError("Start date must be on or before the deadline.");
      return;
    }
    if (deadlineExceedsProject) {
      setError("Task deadline cannot be later than the project's deadline.");
      return;
    }
    if (startExceedsProject) {
      setError("Task start date cannot be later than the project's deadline.");
      return;
    }
    return run(
      "schedule",
      () =>
        taskApi
          .update(task.taskId, { startDate: startDateInput || null, deadline: deadlineInput || null })
          .then(() => undefined),
      "Schedule saved."
    );
  };

  const suggestEstimate = () =>
    run(
      "estimate",
      async () => {
        const result = await taskApi.estimate(task.taskId);
        const hours = result?.aiEstimatedTime ?? result?.estimatedTime;
        setNotice(
          hours != null
            ? `AI ước tính khoảng ${hours} giờ · độ khó ${result?.difficulty ?? "—"}/5.`
            : "Estimate generated."
        );
      }
    );

  const addBlocker = () =>
    run(
      "add-blocker",
      async () => {
        await taskApi.addDependency(task.taskId, Number(blockerId));
        setBlockerId("");
      },
      "Blocker added."
    );

  const removeBlocker = (dependsOnTaskId: number) =>
    run(`del-${dependsOnTaskId}`, () => taskApi.removeDependency(task.taskId, dependsOnTaskId), "Blocker removed.");

  const blockers = task.dependencies ?? [];
  const openBlockers = blockers.filter((d) => (d.status ?? "") !== "Done");
  // Tasks already referenced shouldn't be offered again.
  const available = siblings.filter((t) => !blockers.some((d) => d.dependsOnTaskId === t.taskId));

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-700">
          {notice}
        </div>
      )}

      {/* Priority */}
      <div>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          <Flag size={11} aria-hidden /> Priority
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITIES.map((p) => {
            const active = (task.priority ?? "Medium") === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => !active && changePriority(p)}
                disabled={busy === "priority"}
                aria-pressed={active}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium disabled:opacity-50 ${
                  active ? PRIORITY_STYLES[p] ?? PRIORITY_STYLES.Medium : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            );
          })}
          {busy === "priority" && <Loader2 size={12} className="mt-1.5 animate-spin text-gray-400" aria-hidden />}
        </div>
      </div>

      {/* Schedule */}
      <div>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          <Calendar size={11} aria-hidden /> Schedule
        </h4>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] text-gray-500">Start date</span>
            <input
              type="date"
              value={startDateInput}
              max={deadlineInput || projectDeadline || undefined}
              onChange={(e) => setStartDateInput(e.target.value)}
              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] text-gray-500">Deadline</span>
            <input
              type="date"
              value={deadlineInput}
              min={startDateInput || undefined}
              max={projectDeadline || undefined}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-700"
            />
          </label>
          <button
            type="button"
            onClick={saveSchedule}
            disabled={busy === "schedule" || scheduleInvalid || deadlineExceedsProject || startExceedsProject}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === "schedule" ? <Loader2 size={11} className="animate-spin" aria-hidden /> : null}
            Save
          </button>
        </div>
        {scheduleInvalid && (
          <p className="mt-1 text-[10px] text-red-600">Start date must be on or before the deadline.</p>
        )}
        {!scheduleInvalid && deadlineExceedsProject && (
          <p className="mt-1 text-[10px] text-red-600">Task deadline cannot be later than the project's deadline ({projectDeadline}).</p>
        )}
        {!scheduleInvalid && !deadlineExceedsProject && startExceedsProject && (
          <p className="mt-1 text-[10px] text-red-600">Task start date cannot be later than the project's deadline ({projectDeadline}).</p>
        )}
        {!scheduleInvalid && !deadlineExceedsProject && !startExceedsProject && projectDeadline && (
          <p className="mt-1 text-[10px] text-gray-500">Project deadline: {projectDeadline}</p>
        )}
      </div>

      {/* Estimate */}
      <div>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          <Clock size={11} aria-hidden /> Estimate
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-gray-700">
            {task.estimatedTime ? `${task.estimatedTime}h estimated` : "No estimate yet"}
            {task.aiEstimatedTime ? ` · AI suggested ${task.aiEstimatedTime}h` : ""}
            {task.actualTime ? ` · ${task.actualTime}h actual` : ""}
          </span>
          <button
            type="button"
            onClick={suggestEstimate}
            disabled={busy != null}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === "estimate" ? <Loader2 size={11} className="animate-spin" aria-hidden /> : <Sparkles size={11} aria-hidden />}
            AI estimate
          </button>
        </div>
      </div>

      {/* Blockers / task references */}
      <div>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          <Link2 size={11} aria-hidden /> Blocked by ({blockers.length})
        </h4>

        {openBlockers.length > 0 && (
          <p className="mb-1.5 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
            <Ban size={12} className="mt-px shrink-0" aria-hidden />
            <span>
              This task can't move to Done until {openBlockers.length} referenced task
              {openBlockers.length > 1 ? "s are" : " is"} finished.
            </span>
          </p>
        )}

        {blockers.length === 0 ? (
          <p className="mb-1.5 text-[11px] text-gray-500">Nothing is blocking this task.</p>
        ) : (
          <ul className="mb-2 space-y-1">
            {blockers.map((d) => {
              const done = (d.status ?? "") === "Done";
              return (
                <li key={d.dependsOnTaskId} className="flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${done ? "bg-emerald-500" : "bg-amber-500"}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-gray-800">
                    #{d.dependsOnTaskId} · {d.dependsOnTaskTitle ?? "Untitled task"}
                  </span>
                  <span className={`shrink-0 text-[10px] ${done ? "text-emerald-700" : "text-amber-700"}`}>
                    {d.status ?? "Todo"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeBlocker(d.dependsOnTaskId)}
                    disabled={busy === `del-${d.dependsOnTaskId}`}
                    aria-label={`Remove blocker ${d.dependsOnTaskTitle ?? d.dependsOnTaskId}`}
                    className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 size={12} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <select
            value={blockerId}
            onChange={(e) => setBlockerId(e.target.value)}
            aria-label="Task that blocks this one"
            className="min-w-[180px] flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-[11px] text-gray-700"
          >
            <option value="">Reference a blocking task…</option>
            {available.map((t) => (
              <option key={t.taskId} value={t.taskId}>
                #{t.taskId} · {t.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addBlocker}
            disabled={!blockerId || busy === "add-blocker"}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[#0D1757] disabled:opacity-50"
          >
            {busy === "add-blocker" ? <Loader2 size={11} className="animate-spin" aria-hidden /> : <Plus size={11} aria-hidden />}
            Add blocker
          </button>
        </div>
      </div>
    </section>
  );
};
