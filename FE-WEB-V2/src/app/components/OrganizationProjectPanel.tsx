import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Crown,
  Layers,
  Loader2,
  ShieldAlert,
  UserPlus,
  Users,
  Eye,
} from "lucide-react";
import { taskApi, TaskDetailDto } from "../services/taskApi";
import { coreAiApi, RiskAssessment } from "../services/coreAiApi";
import { OrganizationMemberDto, OrganizationProjectDto } from "../services/organizationApi";
import { ApiError } from "../services/apiClient";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "You don't have access to this project.";
    if (err.status === 429) return "AI usage limit reached for your plan.";
    if (err.message) return err.message;
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

const RISK_STYLE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-red-50 text-red-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  LOW: "bg-emerald-50 text-emerald-700",
};

interface Props {
  project: OrganizationProjectDto;
  members: OrganizationMemberDto[];
  /** Owners and org admins may staff the project. */
  manageable: boolean;
  /** asLeader pre-selects the Project Leader option, so the button does what it says. */
  onAssign: (projectId: number, asLeader: boolean) => void;
  /** Opens the read-only task list for this project without leaving the page. */
  onViewInfo: (project: OrganizationProjectDto) => void;
}

/**
 * Overview of one organization project: its own task counts, an on-demand AI risk sweep, and the
 * staffing actions. Task rows are read through the normal task API, so a project the caller may not
 * read simply comes back empty rather than leaking counts.
 */
export const OrganizationProjectPanel = ({ project, members, manageable, onAssign, onViewInfo }: Props) => {
  const [tasks, setTasks] = useState<TaskDetailDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [atRisk, setAtRisk] = useState<{ task: TaskDetailDto; risk: RiskAssessment }[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAtRisk(null);
    try {
      setTasks(await taskApi.byProject(project.projectId));
    } catch (err) {
      setError(errorMessage(err));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [project.projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const done = tasks.filter((t) => t.status === "Done").length;
  const inProgress = tasks.filter((t) => t.status === "InProgress").length;
  const todo = tasks.length - done - inProgress;
  const open = tasks.filter((t) => (t.status ?? "Todo") !== "Done");
  const risk = (project.riskLevel ?? "LOW").toUpperCase();

  const runRiskScan = async () => {
    setScanning(true);
    setError(null);
    setAtRisk(null);
    setProgress({ done: 0, total: open.length });
    try {
      const found: { task: TaskDetailDto; risk: RiskAssessment }[] = [];
      // Sequential: the provider is rate-limited and a burst would trip the quota.
      for (const task of open) {
        try {
          const assessment = await coreAiApi.analyzeRisk(task.taskId);
          if (assessment && ["MEDIUM", "HIGH", "CRITICAL"].includes(assessment.riskLevel)) {
            found.push({ task, risk: assessment });
          }
        } catch {
          // One task failing shouldn't abort the sweep.
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      found.sort((a, b) => b.risk.totalScore - a.risk.totalScore);
      setAtRisk(found);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setScanning(false);
    }
  };

  return (
    <section aria-label={`Overview of ${project.name}`} className="space-y-3">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">{project.name}</h2>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${RISK_STYLE[risk] ?? RISK_STYLE.LOW}`}>
            {risk} RISK
          </span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{project.status ?? "Planning"}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Users size={11} aria-hidden /> {project.teamMemberCount} member(s)
          </span>
          {project.deadline && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={11} aria-hidden /> due {project.deadline}
            </span>
          )}
          <span>{project.progress ?? 0}% done</span>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
          {error}
        </div>
      )}

      {/* Task counts */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Tasks", value: loading ? "…" : tasks.length, icon: Layers },
          { label: "To do", value: loading ? "…" : todo },
          { label: "In progress", value: loading ? "…" : inProgress },
          { label: "Done", value: loading ? "…" : done },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
            <p className="text-[9px] uppercase tracking-wide text-gray-400">{stat.label}</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onViewInfo(project)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
        >
          <Eye size={12} aria-hidden /> View project information
        </button>

        <button
          type="button"
          onClick={runRiskScan}
          disabled={scanning || loading || open.length === 0}
          title={open.length === 0 ? "No open tasks to scan" : undefined}
          className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          {scanning ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <ShieldAlert size={12} aria-hidden />}
          {scanning ? `Scanning ${progress.done}/${progress.total}…` : "Risk estimate"}
        </button>

        {manageable && (
          <button
            type="button"
            onClick={() => onAssign(project.projectId, false)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[#0D1757]"
          >
            <UserPlus size={12} aria-hidden /> Add member
          </button>
        )}
        {manageable && (
          <button
            type="button"
            onClick={() => onAssign(project.projectId, true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50"
          >
            <Crown size={12} className="text-amber-500" aria-hidden /> Set Project Leader
          </button>
        )}
      </div>

      {/* Risk sweep result */}
      {atRisk && (
        <div className="rounded-lg border border-gray-200 p-3">
          {atRisk.length === 0 ? (
            <p className="text-[11px] text-gray-600">
              No tasks are currently at risk. Scanned {progress.total} open task(s).
            </p>
          ) : (
            <>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] text-gray-600">
                <AlertTriangle size={12} className="text-amber-600" aria-hidden />
                {atRisk.length} of {progress.total} open task(s) need attention.
              </p>
              <ul className="space-y-1.5">
                {atRisk.map(({ task, risk: assessment }) => (
                  <li key={task.taskId} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-2.5 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-[11px] text-gray-800">{task.title}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${RISK_STYLE[assessment.riskLevel] ?? RISK_STYLE.LOW}`}>
                      {assessment.riskLevel} · {Math.round(assessment.totalScore)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Who is on it */}
      <div>
        <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Organization members ({members.length})
        </h3>
        {members.length === 0 ? (
          <p className="text-[11px] text-gray-500">No members in this organization yet.</p>
        ) : (
          <ul className="space-y-1">
            {members.slice(0, 6).map((m) => (
              <li key={m.organizationMemberId} className="flex items-center gap-2 text-[11px] text-gray-700">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1A237E] text-[8px] font-semibold text-white">
                  {(m.userName ?? m.email ?? "?").trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{m.userName ?? m.email}</span>
                {m.role === "OWNER" && <Crown size={11} className="shrink-0 text-amber-500" aria-label="Owner" />}
              </li>
            ))}
            {members.length > 6 && <li className="text-[10px] text-gray-400">+{members.length - 6} more</li>}
          </ul>
        )}
      </div>
    </section>
  );
};
