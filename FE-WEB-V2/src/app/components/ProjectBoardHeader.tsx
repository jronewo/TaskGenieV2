import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Clock, ShieldAlert, Loader2, X, CalendarDays, Users, Layers, AlertTriangle, FileSpreadsheet, Network,
  Archive,
} from "lucide-react";
import { coreAiApi, RiskAssessment } from "../services/coreAiApi";
import { projectApi, ProjectDto } from "../services/projectApi";
import { TaskDependencyGraph } from "./TaskDependencyGraph";
import { TaskDetailDto } from "../services/taskApi";
import { ApiError } from "../services/apiClient";
import { useConfirm } from "./ConfirmDialog";
import { toast } from "sonner";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "You don't have permission to run AI on this project.";
    if (err.status === 429) return "AI usage limit reached for your plan.";
    if (err.status >= 500) return "The AI provider is unavailable right now. You can retry.";
    if (err.message) return err.message;
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

const RISK_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-red-50 text-red-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  LOW: "bg-emerald-50 text-emerald-700",
};

interface Props {
  projectId: number | null;
  tasks: TaskDetailDto[];
  /** Reported up so the board can build issue keys without fetching the project again. */
  onProjectLoaded?: (name: string | null, canManageTasks: boolean) => void;
  /** Shown only to someone who may add tasks here. */
  onImportTasks?: () => void;
  /** Lets the dependency diagram open a task, so it is a way in rather than a dead end. */
  onOpenTask?: (taskId: number) => void;
  /** Fired once the project has been ended, so the shell can drop it from the workspace. */
  onProjectClosed?: (projectId: number) => void;
}

/** Project context plus an on-demand risk sweep across the board's tasks. */
/** Matches the backend's platform default; a project that never configures one uses this. */
const DEFAULT_WORKING_HOURS = 8;

const isValidHours = (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 24;
};

export const ProjectBoardHeader = ({
  projectId, tasks, onProjectLoaded, onImportTasks, onOpenTask, onProjectClosed,
}: Props) => {
  const confirm = useConfirm();
  const [closing, setClosing] = useState(false);
  // Loaded here rather than in the shell: the shell renders before sign-in, and an authenticated
  // fetch from there would fire without a token and trip the 401 handler.
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [hours, setHours] = useState("8");
  const [savingHours, setSavingHours] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);

  // Kept in a ref so a parent passing an inline arrow doesn't re-trigger the fetch every render.
  const onLoadedRef = useRef(onProjectLoaded);
  onLoadedRef.current = onProjectLoaded;

  const currentHours = project?.workingHoursPerDay ?? DEFAULT_WORKING_HOURS;

  const saveHours = async () => {
    if (projectId == null || !isValidHours(hours) || savingHours) return;
    setSavingHours(true);
    setError(null);
    try {
      await projectApi.setWorkingHours(projectId, Number(hours));
      await loadProjectRef.current?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingHours(false);
    }
  };

  /**
   * Ending a project cannot be undone from the UI and it awards the closure scores, so the
   * confirmation spells out both — and names the unfinished tasks, which is the thing someone
   * closing a project by mistake would have missed.
   */
  const closeProject = async () => {
    if (projectId == null || closing) return;

    const unfinished = tasks.filter((t) => (t.status ?? "Todo") !== "Done").length;
    const ok = await confirm({
      title: `Đóng dự án "${project?.name ?? ""}"?`,
      description:
        (unfinished > 0
          ? `Dự án còn ${unfinished} công việc chưa hoàn thành. `
          : "Tất cả công việc đã hoàn thành. ") +
        "Dự án sẽ chuyển sang trạng thái đã kết thúc, biến mất khỏi danh sách dự án đang hoạt động " +
        "và điểm tổng kết sẽ được ghi cho các thành viên. Bạn vẫn xem lại được ở mục " +
        "“Dự án đã xong” trong trang cá nhân. Thao tác này không thể hoàn tác.",
      confirmLabel: "Đóng dự án",
      cancelLabel: "Huỷ",
      tone: "danger",
    });
    if (!ok) return;

    setClosing(true);
    setError(null);
    try {
      const summary = await projectApi.close(projectId);
      toast.success(
        `Đã đóng dự án "${summary.projectName ?? project?.name ?? ""}" — ` +
          `${summary.doneTasks}/${summary.totalTasks} công việc hoàn thành.`
      );
      onProjectClosed?.(projectId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setClosing(false);
    }
  };

  const loadProject = useCallback(async () => {
    if (projectId == null) {
      setProject(null);
      onLoadedRef.current?.(null, false);
      return;
    }
    try {
      const loaded = await projectApi.getById(projectId);
      setProject(loaded);
      setHours(String(loaded.workingHoursPerDay ?? DEFAULT_WORKING_HOURS));
      onLoadedRef.current?.(loaded.name, loaded.canManageTasks ?? false);
    } catch {
      setProject(null);
      onLoadedRef.current?.(null, false);
    }
  }, [projectId]);

  // saveHours runs before loadProject is declared, so it reaches it through a ref.
  const loadProjectRef = useRef<(() => Promise<void>) | null>(null);
  loadProjectRef.current = loadProject;

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<{ task: TaskDetailDto; risk: RiskAssessment }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  if (!project) return null;

  const open = tasks.filter((t) => (t.status ?? "Todo") !== "Done");
  const done = tasks.length - open.length;

  const runRiskScan = async () => {
    setScanning(true);
    setError(null);
    setResults(null);
    setProgress({ done: 0, total: open.length });

    try {
      const found: { task: TaskDetailDto; risk: RiskAssessment }[] = [];
      // Sequential on purpose: the provider is rate-limited and a burst would trip the quota.
      for (const task of open) {
        try {
          const risk = await coreAiApi.analyzeRisk(task.taskId);
          if (risk && ["HIGH", "CRITICAL", "MEDIUM"].includes(risk.riskLevel)) {
            found.push({ task, risk });
          }
        } catch {
          // One task failing shouldn't abort the whole sweep.
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      found.sort((a, b) => b.risk.totalScore - a.risk.totalScore);
      setResults(found);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Risk, status and the progress bar were dropped from this header at the owner's
                request — the Risk estimate button is the live read, and progress is on the cards. */}
            <h2 className="truncate text-sm font-semibold text-gray-900">{project.name}</h2>
          </div>
          {project.description && (
            <p className="mt-0.5 max-w-2xl truncate text-[11px] text-gray-500">{project.description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Layers size={11} aria-hidden /> {done}/{tasks.length} done
            </span>
            <span className="inline-flex items-center gap-1">
              <Users size={11} aria-hidden /> {project.teamMemberCount ?? 0} member(s)
            </span>
            {project.deadline && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={11} aria-hidden /> due {project.deadline}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
        {/* A school project is not a company shift, so the leader sets what a working day means
            here. Members see the value but cannot change it — the API enforces the same rule. */}
        {project.canManageTasks && (
          <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5">
            <Clock size={12} className="text-gray-400" aria-hidden />
            <label htmlFor="working-hours" className="text-[10px] text-gray-500">
              Giờ công/ngày
            </label>
            <input
              id="working-hours"
              type="number"
              min={1}
              max={24}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-11 rounded border border-gray-200 px-1 py-0.5 text-center text-xs"
            />
            <button
              type="button"
              onClick={saveHours}
              disabled={savingHours || !isValidHours(hours) || Number(hours) === currentHours}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#1A237E] hover:bg-gray-50 disabled:opacity-40"
            >
              {savingHours ? "…" : "Lưu"}
            </button>
          </div>
        )}
        {/* Visible to everyone: knowing what is waiting on what is not an administrative act. */}
        <button
          type="button"
          onClick={() => setGraphOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <Network size={13} aria-hidden /> Sơ đồ phụ thuộc
        </button>
        {onImportTasks && project.canManageTasks && (
          <button
            type="button"
            onClick={onImportTasks}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileSpreadsheet size={13} aria-hidden /> Import tasks
          </button>
        )}
        <button
          type="button"
          onClick={runRiskScan}
          disabled={scanning || open.length === 0}
          title={open.length === 0 ? "No open tasks to scan" : undefined}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          {scanning ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <ShieldAlert size={13} aria-hidden />}
          {scanning ? `Scanning ${progress.done}/${progress.total}…` : "Risk estimate"}
        </button>
        {/* Ending a project is a leader's call, so it sits behind the same permission as the
            other management controls. Last in the row because it is the terminal action. */}
        {project.canManageTasks && (
          <button
            type="button"
            onClick={closeProject}
            disabled={closing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {closing ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Archive size={13} aria-hidden />}
            {closing ? "Đang đóng…" : "Đóng dự án"}
          </button>
        )}
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-4 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Result modal */}
      {results && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4" role="dialog" aria-modal="true" aria-label="Risk estimate results">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <ShieldAlert size={14} className="text-amber-600" aria-hidden />
                Risk estimate — {project.name}
              </h3>
              <button type="button" onClick={() => setResults(null)} aria-label="Close" className="text-gray-400 hover:text-gray-700">
                <X size={15} aria-hidden />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-4">
              {results.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-700">No tasks are currently at risk.</p>
                  <p className="mt-1 text-xs text-gray-500">Scanned {progress.total} open task(s).</p>
                </div>
              ) : (
                <>
                  <p className="mb-3 flex items-center gap-1.5 text-xs text-gray-600">
                    <AlertTriangle size={12} className="text-amber-600" aria-hidden />
                    {results.length} of {progress.total} open task(s) need attention, highest risk first.
                  </p>
                  <ul className="space-y-2.5">
                    {results.map(({ task, risk }) => (
                      <li key={task.taskId} className="rounded-md border border-gray-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${RISK_STYLES[risk.riskLevel] ?? RISK_STYLES.LOW}`}>
                            {risk.riskLevel} · {Math.round(risk.totalScore)}
                          </span>
                        </div>
                        {risk.explanation && (
                          <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{risk.explanation}</p>
                        )}
                        {risk.mitigationActions?.length > 0 && (
                          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[11px] text-gray-500">
                            {risk.mitigationActions.slice(0, 3).map((action, i) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <TaskDependencyGraph
        open={graphOpen}
        projectId={projectId}
        projectName={project?.name}
        onClose={() => setGraphOpen(false)}
        onOpenTask={(taskId) => {
          setGraphOpen(false);
          onOpenTask?.(taskId);
        }}
      />
    </>
  );
};
