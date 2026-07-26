import React, { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, Gauge, Loader2, Scale, Sparkles, X, Zap } from "lucide-react";
import { ApiError } from "../../../core/api/client";
import { useProjects } from "../../projects/hooks/useProjects";
import { useTasksByProject } from "../../tasks/hooks/useTasks";
import {
  useAnalyzeRisk,
  useRiskHistory,
  useAnalyzeAllProject,
  useProjectWorkload,
  useRecommend,
  useAssignmentHistory,
  useAcceptRecommendation,
  useRejectRecommendation,
  useTaskExecutions,
} from "../hooks/useAi";

type Tab = "risk" | "assignment" | "workload";

const riskColor: Record<string, string> = {
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  CRITICAL: "bg-red-50 text-red-700 border-red-200",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{label}</span>
        <span className="font-semibold text-slate-700">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-700" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function AiInsightsPage() {
  const { data: projects } = useProjects();
  const [tab, setTab] = useState<Tab>("risk");
  const [projectId, setProjectId] = useState<number | "">("");
  const { data: tasks } = useTasksByProject(projectId === "" ? null : Number(projectId));
  const [taskId, setTaskId] = useState<number | "">("");

  const analyzeRisk = useAnalyzeRisk(taskId === "" ? 0 : Number(taskId));
  const { data: riskHistory } = useRiskHistory(taskId === "" ? null : Number(taskId));
  const analyzeAll = useAnalyzeAllProject();
  const { data: workload, isLoading: loadingWorkload } = useProjectWorkload(tab === "workload" && projectId !== "" ? Number(projectId) : null);
  const recommend = useRecommend(taskId === "" ? 0 : Number(taskId));
  const { data: assignmentHistory } = useAssignmentHistory(taskId === "" ? null : Number(taskId));
  const acceptRec = useAcceptRecommendation(taskId === "" ? 0 : Number(taskId));
  const rejectRec = useRejectRecommendation(taskId === "" ? 0 : Number(taskId));
  const { data: executions } = useTaskExecutions(taskId === "" ? null : Number(taskId));

  const latestRisk = riskHistory?.[0];
  const latestSuggestions = recommend.data?.suggestions ?? [];

  const handleAnalyze = async () => {
    if (taskId === "") return toast.error("Chọn một task.");
    try {
      await analyzeRisk.mutateAsync();
      toast.success("Risk analysis complete.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Phân tích rủi ro thất bại.");
    }
  };

  const handleAnalyzeAll = async () => {
    if (projectId === "") return toast.error("Chọn một dự án.");
    try {
      await analyzeAll.mutateAsync(Number(projectId));
      toast.success("Project-wide risk scan complete.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Quét rủi ro thất bại.");
    }
  };

  const handleRecommend = async () => {
    if (taskId === "" || projectId === "") return toast.error("Chọn dự án và task.");
    try {
      await recommend.mutateAsync(Number(projectId));
      toast.success("Assignment recommendations ready.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gợi ý phân công thất bại.");
    }
  };

  const respond = async (userId: number, action: "accept" | "reject") => {
    try {
      if (action === "accept") await acceptRec.mutateAsync(userId);
      else await rejectRec.mutateAsync(userId);
      toast.success(action === "accept" ? "Candidate accepted." : "Candidate rejected.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật thất bại.");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
          <Sparkles size={12} /> AI Insights
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Risk analysis, assignment recommender &amp; workload balance</h2>
        <p className="mt-1 text-sm text-slate-500">Dữ liệu demo (mock) — sẽ nối API thật /api/ai-analysis &amp; /api/task-assignment sau khi merge source.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value === "" ? "" : Number(e.target.value));
            setTaskId("");
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none bg-input-background"
        >
          <option value="">Select project...</option>
          {(projects ?? []).map((p) => (
            <option key={p.projectId} value={p.projectId}>
              {p.name}
            </option>
          ))}
        </select>
        {tab !== "workload" && (
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={projectId === ""}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none bg-input-background disabled:opacity-50"
          >
            <option value="">Select task...</option>
            {(tasks ?? []).map((t) => (
              <option key={t.taskId} value={t.taskId}>
                {t.title}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {([
            { id: "risk", label: "Risk Analysis", icon: AlertTriangle },
            { id: "assignment", label: "Assignment Recommender", icon: Gauge },
            { id: "workload", label: "Workload Balance", icon: Scale },
          ] as { id: Tab; label: string; icon: typeof AlertTriangle }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${tab === t.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "risk" && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Task Risk Assessment</h3>
                <div className="flex gap-2">
                  <button onClick={handleAnalyzeAll} disabled={analyzeAll.isPending || projectId === ""} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <Zap size={12} /> {analyzeAll.isPending ? "Scanning..." : "Analyze All Tasks"}
                  </button>
                  <button onClick={handleAnalyze} disabled={analyzeRisk.isPending || taskId === ""} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                    <Sparkles size={12} /> {analyzeRisk.isPending ? "Analyzing..." : "Analyze Risk"}
                  </button>
                </div>
              </div>

              {analyzeAll.data && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <div className="mb-1 font-semibold">Project scan: {analyzeAll.data.status}</div>
                  <div className="flex flex-wrap gap-2">
                    <span>Critical: {analyzeAll.data.criticalRisk}</span>
                    <span>High: {analyzeAll.data.highRisk}</span>
                    <span>Medium: {analyzeAll.data.mediumRisk}</span>
                    <span>Low: {analyzeAll.data.lowRisk}</span>
                    <span>Avg score: {analyzeAll.data.averageScore}</span>
                  </div>
                  {analyzeAll.data.warnings.map((w, i) => (
                    <div key={i} className="mt-1">• {w}</div>
                  ))}
                </div>
              )}

              {latestRisk ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${riskColor[latestRisk.riskLevel]}`}>{latestRisk.riskLevel}</span>
                    <span className="text-lg font-bold text-slate-900">{latestRisk.totalScore}</span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                  <p className="text-xs text-slate-600">{latestRisk.explanation}</p>
                  <div className="space-y-2">
                    {latestRisk.factors.map((f) => (
                      <div key={f.code} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                          <span>{f.code}</span>
                          <span>{f.contribution} pts</span>
                        </div>
                        <div className="text-[10px] text-slate-500">{f.rawValue}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Mitigation</div>
                    <ul className="list-inside list-disc text-xs text-slate-600">
                      {latestRisk.mitigationActions.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Chọn task và nhấn "Analyze Risk".</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Risk History</h3>
              <div className="space-y-2">
                {(riskHistory ?? []).map((r) => (
                  <div key={r.runId} className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-1.5 text-xs">
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${riskColor[r.riskLevel]}`}>{r.riskLevel}</span>
                    <span className="text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                ))}
                {(riskHistory ?? []).length === 0 && <p className="text-xs text-slate-400">No history yet.</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">AI Execution Log</h3>
              <div className="space-y-2">
                {(executions ?? []).map((e) => (
                  <div key={e.runId} className="rounded-lg border border-slate-100 px-2.5 py-1.5 text-[11px]">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>{e.feature}</span>
                      <span className={e.status === "SUCCESS" ? "text-emerald-600" : "text-rose-600"}>{e.status}</span>
                    </div>
                    <div className="text-slate-400">{e.provider} · {e.latencyMs}ms · {new Date(e.createdAt).toLocaleTimeString()}</div>
                  </div>
                ))}
                {(executions ?? []).length === 0 && <p className="text-xs text-slate-400">No AI calls logged yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "assignment" && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Suggested Assignees</h3>
              <button onClick={handleRecommend} disabled={recommend.isPending || taskId === ""} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                <Sparkles size={12} /> {recommend.isPending ? "Scoring..." : "Get Recommendations"}
              </button>
            </div>

            {latestSuggestions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Chọn task và nhấn "Get Recommendations".</div>
            ) : (
              <div className="space-y-2.5">
                {latestSuggestions.map((s) => (
                  <div key={s.userId} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">#{s.rank}</span>
                        <span className="text-sm font-semibold text-slate-900">{s.userName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{s.score}</span>
                        <button onClick={() => respond(s.userId, "accept")} className="rounded-md bg-emerald-600 p-1 text-white hover:bg-emerald-700">
                          <Check size={12} />
                        </button>
                        <button onClick={() => respond(s.userId, "reject")} className="rounded-md bg-rose-100 p-1 text-rose-700 hover:bg-rose-200">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="mb-2 text-xs text-slate-500">{s.reason}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <ScoreBar label="Skill match (40%)" value={s.skillMatchScore} />
                      <ScoreBar label="Semantic similarity (25%)" value={s.semanticSimilarityScore} />
                      <ScoreBar label="Workload (20%)" value={s.workloadScore} />
                      <ScoreBar label="Performance (15%)" value={s.performanceScore} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Recommendation History</h3>
            <div className="space-y-2">
              {(assignmentHistory ?? []).map((h) => (
                <div key={h.id} className="rounded-lg border border-slate-100 px-2.5 py-1.5 text-xs">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>{h.userName}</span>
                    <span
                      className={
                        h.status === "ACCEPTED" ? "text-emerald-600" : h.status === "REJECTED" ? "text-rose-600" : "text-slate-400"
                      }
                    >
                      {h.status}
                    </span>
                  </div>
                  <div className="text-slate-400">Score {h.score} · {new Date(h.createdAt).toLocaleString()}</div>
                </div>
              ))}
              {(assignmentHistory ?? []).length === 0 && <p className="text-xs text-slate-400">No history yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "workload" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Workload Balance Suggestions</h3>
          {loadingWorkload && (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
              <Loader2 className="animate-spin" size={15} /> Loading...
            </div>
          )}
          {projectId === "" && <p className="text-sm text-slate-500">Chọn một dự án để xem gợi ý cân bằng khối lượng công việc.</p>}
          <div className="space-y-2.5">
            {(workload?.suggestions ?? []).map((s) => (
              <div key={s.userId} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-1 text-sm font-semibold text-slate-900">{s.userName}</div>
                <p className="mb-2 text-xs text-slate-500">{s.reason}</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.suggestedTasks.map((t) => (
                    <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
