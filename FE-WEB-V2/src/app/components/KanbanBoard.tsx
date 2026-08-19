import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Inbox, Loader2, SlidersHorizontal } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { taskApi, TaskDetailDto, TaskStatusValue } from "../services/taskApi";
import { ApiError } from "../services/apiClient";
import { usePreferences } from "../settings/PreferencesContext";
import { progressFor } from "../lib/jira";

/** Column ids are the backend's status values verbatim. */
const COLUMNS: { id: TaskStatusValue; labelKey: string; accent: string }[] = [
  { id: "Todo", labelKey: "board.todo", accent: "#64748B" },
  { id: "InProgress", labelKey: "board.inProgress", accent: "#1E88E5" },
  { id: "InReview", labelKey: "board.inReview", accent: "#F59E0B" },
  { id: "Done", labelKey: "board.done", accent: "#10B981" },
];

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to change this task.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

interface KanbanBoardProps {
  projectId: number | null;
  /** Used to render each card's issue key (e.g. "WR-42"). */
  projectName?: string | null;
  /** Only a project leader (or owner/admin) may add tasks; the API enforces the same rule. */
  canManageTasks?: boolean;
  onTaskClick?: (task: TaskDetailDto) => void;
  onCreateTask?: (status: TaskStatusValue) => void;
  /** Bumped by the parent after a create/edit so the board refetches. */
  refreshToken?: number;
  /** Lets the parent (project header) reuse the same loaded tasks. */
  onTasksLoaded?: (tasks: TaskDetailDto[]) => void;
}

export const KanbanBoard = ({ projectId, projectName, canManageTasks = false, onTaskClick, onCreateTask, refreshToken, onTasksLoaded }: KanbanBoardProps) => {
  const { t } = usePreferences();
  const [tasks, setTasks] = useState<TaskDetailDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<TaskDetailDto | null>(null);
  const [filters, setFilters] = useState({
    risk: "ALL",
    difficulty: "ALL",
    assigned: "ALL",
    dependency: "ALL",
    search: "",
    sort: "created-desc",
  });
  const [movingId, setMovingId] = useState<number | null>(null);

  // Ref-held so an inline parent callback can't re-create this effect on every render.
  const onTasksLoadedRef = useRef(onTasksLoaded);
  useEffect(() => {
    onTasksLoadedRef.current = onTasksLoaded;
  }, [onTasksLoaded]);

  const load = useCallback(async () => {
    if (projectId == null) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await taskApi.byProject(projectId);
      setTasks(list);
      onTasksLoadedRef.current?.(list);
    } catch (err) {
      setError(errorMessage(err));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  /** Filtering/sorting is view-only — the server stays the source of truth for the data itself. */
  const visibleTasks = useMemo(() => {
    let list = [...tasks];

    if (filters.risk !== "ALL") list = list.filter((t) => (t.riskLevel ?? "LOW").toUpperCase() === filters.risk);
    if (filters.difficulty !== "ALL") list = list.filter((t) => String(t.difficulty ?? "") === filters.difficulty);
    if (filters.assigned === "YES") list = list.filter((t) => (t.assignees?.length ?? 0) > 0);
    if (filters.assigned === "NO") list = list.filter((t) => (t.assignees?.length ?? 0) === 0);

    const blocking = (t: TaskDetailDto) => t.blockingCount ?? 0;
    /** Only unfinished prerequisites actually hold a task back; a finished one is just history. */
    const waitingOn = (t: TaskDetailDto) =>
      (t.dependencies ?? []).filter((d) => (d.status ?? "").toUpperCase() !== "DONE").length;

    if (filters.dependency === "BLOCKING") list = list.filter((t) => blocking(t) > 0);
    if (filters.dependency === "BLOCKED") list = list.filter((t) => waitingOn(t) > 0);
    // "Ready" is the queue a person can actually pick from: nothing unfinished stands in the way.
    if (filters.dependency === "READY") list = list.filter((t) => waitingOn(t) === 0);

    const query = filters.search.trim().toLowerCase();
    if (query) {
      // Searching prerequisite titles too, so "login" finds both the task and whatever waits on it.
      list = list.filter(
        (t) =>
          (t.title ?? "").toLowerCase().includes(query) ||
          String(t.taskId).includes(query) ||
          (t.dependencies ?? []).some((d) => (d.dependsOnTaskTitle ?? "").toLowerCase().includes(query))
      );
    }

    const RISK_ORDER: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const time = (v?: string | null) => (v ? new Date(v).getTime() : 0);

    switch (filters.sort) {
      case "dependency":
        // Whatever is holding up the most work comes first; among equals, the task that is itself
        // free to start outranks one still waiting, so the top of the column is always actionable.
        return list.sort(
          (a, b) => blocking(b) - blocking(a) || waitingOn(a) - waitingOn(b) || time(a.deadline) - time(b.deadline)
        );
      case "created-asc":
        return list.sort((a, b) => time(a.createdAt) - time(b.createdAt));
      case "deadline":
        return list.sort((a, b) => time(a.deadline) - time(b.deadline));
      case "risk":
        return list.sort(
          (a, b) =>
            (RISK_ORDER[(b.riskLevel ?? "LOW").toUpperCase()] ?? 1) -
            (RISK_ORDER[(a.riskLevel ?? "LOW").toUpperCase()] ?? 1)
        );
      case "difficulty":
        return list.sort((a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0));
      default:
        return list.sort((a, b) => time(b.createdAt) - time(a.createdAt));
    }
  }, [tasks, filters]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  /** Optimistic move with rollback — the server is the authority on whether it's allowed. */
  const moveTask = async (task: TaskDetailDto, status: TaskStatusValue) => {
    if (task.status === status || movingId != null) return;

    const previous = tasks;
    setMovingId(task.taskId);
    setTasks((current) => current.map((t) => (t.taskId === task.taskId ? { ...t, status } : t)));
    setError(null);

    try {
      const updated = await taskApi.updateProgress(task.taskId, {
        status,
        progress: progressFor(status, task.progress),
      });

      // Never dereference the response blindly: an endpoint that answers 204 yields `undefined`,
      // and throwing inside a state updater unmounts the whole tree instead of being caught below.
      if (updated?.taskId != null) {
        setTasks((current) => current.map((t) => (t.taskId === updated.taskId ? updated : t)));
      } else {
        await load(); // no body came back — re-read rather than trust the optimistic value
      }
    } catch (err) {
      setTasks(previous); // e.g. a dependency isn't Done yet — the API refuses and we revert
      setError(errorMessage(err));
    } finally {
      setMovingId(null);
    }
  };

  if (projectId == null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
        <Inbox size={28} aria-hidden />
        <p className="text-xs">Select a project to see its board.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {error && (
        <div role="alert" className="mx-4 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Filter / sort bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
          <SlidersHorizontal size={12} aria-hidden /> Filter
        </span>

        <select
          value={filters.risk}
          onChange={(e) => setFilters((f) => ({ ...f, risk: e.target.value }))}
          aria-label="Filter by risk"
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700"
        >
          <option value="ALL">Any risk</option>
          <option value="HIGH">High risk</option>
          <option value="MEDIUM">Medium risk</option>
          <option value="LOW">Low risk</option>
        </select>

        <select
          value={filters.difficulty}
          onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))}
          aria-label="Filter by difficulty"
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700"
        >
          <option value="ALL">Any difficulty</option>
          {[1, 2, 3, 4, 5].map((d) => (
            <option key={d} value={String(d)}>
              Difficulty {d}
            </option>
          ))}
        </select>

        <select
          value={filters.assigned}
          onChange={(e) => setFilters((f) => ({ ...f, assigned: e.target.value }))}
          aria-label="Filter by assignment"
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700"
        >
          <option value="ALL">Assigned or not</option>
          <option value="YES">Assigned</option>
          <option value="NO">Unassigned</option>
        </select>

        <select
          value={filters.dependency}
          onChange={(e) => setFilters((f) => ({ ...f, dependency: e.target.value }))}
          aria-label="Filter by dependency"
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700"
        >
          <option value="ALL">Any dependency</option>
          <option value="BLOCKING">Blocking others</option>
          <option value="BLOCKED">Waiting on others</option>
          <option value="READY">Ready to start</option>
        </select>

        <input
          type="search"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          aria-label="Search tasks"
          placeholder="Search title or #id…"
          className="w-44 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 placeholder:text-gray-400"
        />

        <span className="ml-auto inline-flex items-center gap-1.5">
          <label htmlFor="board-sort" className="text-[11px] text-gray-500">
            Sort
          </label>
          <select
            id="board-sort"
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700"
          >
            <option value="dependency">Blocking most</option>
            <option value="created-desc">Newest first</option>
            <option value="created-asc">Oldest first</option>
            <option value="deadline">Deadline</option>
            <option value="risk">Risk</option>
            <option value="difficulty">Difficulty</option>
          </select>
        </span>

        {(filters.risk !== "ALL" ||
          filters.difficulty !== "ALL" ||
          filters.assigned !== "ALL" ||
          filters.dependency !== "ALL" ||
          filters.search !== "") && (
          <button
            type="button"
            onClick={() =>
              setFilters({
                risk: "ALL",
                difficulty: "ALL",
                assigned: "ALL",
                dependency: "ALL",
                search: "",
                sort: filters.sort,
              })
            }
            className="rounded-md px-2 py-1 text-[11px] text-[#1A237E] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-xs text-gray-500">
          <Loader2 size={14} className="animate-spin" aria-hidden /> Loading board…
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const columnTasks = visibleTasks.filter((t) => (t.status ?? "Todo") === column.id);
            return (
              <section
                key={column.id}
                aria-label={t(column.labelKey)}
                data-testid={`column-${column.id}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragging && moveTask(dragging, column.id)}
                // The accent is set inline so each column keeps its identity in both themes; the
                // utility palette only has one board surface, which made four columns look like one.
                style={{ borderTopColor: column.accent }}
                className={`tg-column flex flex-col rounded border border-gray-200 border-t-[3px] bg-[#F4F5F7] p-2 transition-colors ${
                  dragging && dragging.status !== column.id ? "ring-2 ring-inset ring-[#1A237E]/30" : ""
                }`}
              >
                <header className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: column.accent }} aria-hidden />
                    <h3
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: column.accent }}
                    >
                      {t(column.labelKey)}
                    </h3>
                    <span className="text-[11px] text-gray-500">{columnTasks.length}</span>
                  </div>
                  {onCreateTask && canManageTasks && (
                    <button
                      type="button"
                      onClick={() => onCreateTask(column.id)}
                      aria-label={`Add task to ${t(column.labelKey)}`}
                      className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                    >
                      <Plus size={13} aria-hidden />
                    </button>
                  )}
                </header>

                <div className="flex-1 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.taskId}
                        task={task}
                        projectName={projectName}
                        onClick={onTaskClick}
                        onDragStart={setDragging}
                        isMoving={movingId === task.taskId}
                      />
                    ))}
                  </AnimatePresence>
                  {columnTasks.length === 0 && (
                    <p className="py-6 text-center text-[10px] text-gray-400">
                      {tasks.length > 0 && visibleTasks.length === 0 ? t("board.noMatch") : t("board.noTasks")}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
