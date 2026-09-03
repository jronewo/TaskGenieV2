import React, { useState } from "react";
import { Loader2, Wand2, ShieldAlert, AlertTriangle, Timer } from "lucide-react";
import { coreAiApi, RiskAssessment } from "../services/coreAiApi";
import { taskApi, TaskDetailDto } from "../services/taskApi";
import { ApiError } from "../services/apiClient";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "You don't have permission to run AI on this task.";
    if (err.status === 429) return "AI usage limit reached for your plan. Try again later.";
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

/** Friendly names for the risk engine's factor codes — the API only sends the machine code. */
const RISK_FACTOR_LABELS: Record<string, string> = {
  DEADLINE: "Deadline proximity",
  PROGRESS: "Progress vs. schedule",
  DEPENDENCY: "Open dependencies",
  WORKLOAD: "Assignee workload",
  HISTORICAL: "Track record",
};

/** Scores already arrive 0–100; clamped so a bad value can never blow the bar past its track. */
const clampScore = (v: number) => Math.min(100, Math.max(0, v ?? 0));
const pct = (v: number) => `${Math.round(clampScore(v))}%`;
const weightPct = (v: number) => `${Math.round((v ?? 0) * 100)}%`;

interface Props {
  /** The whole task, so an estimate produced at creation time shows without pressing anything. */
  task: TaskDetailDto;
  /** Lets the parent refresh after AI writes to the task. */
  onChanged?: () => void;
}

/**
 * AI tools that act on a single task: an estimate read from the description, and a risk read.
 *
 * Summary and classification were removed — a summary of a description the reader is already
 * looking at earned no decisions, and classification duplicated what the estimate now returns.
 */
export const AiTaskInsights = ({ task, onChanged }: Props) => {
  const taskId = task.taskId;
  // Tasks are estimated the moment they are created, so the panel opens with a result already.
  const [estimate, setEstimate] = useState<TaskDetailDto | null>(
    task.aiEstimatedTime != null || task.difficulty != null ? task : null
  );
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<void>) => {
    if (busy) return; // one AI call at a time — the provider is rate-limited
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const autoEstimate = () =>
    run("estimate", async () => {
      const updated = await taskApi.estimate(taskId);
      setEstimate(updated ?? null);
      setNotice(
        updated
          ? `Ước tính ${updated.aiEstimatedTime ?? updated.estimatedTime ?? "—"} giờ · độ khó ${updated.difficulty ?? "—"}/5.`
          : "Đã tạo ước tính."
      );
      onChanged?.();
    });

  const analyseRisk = () =>
    run("risk", async () => {
      setRisk(await coreAiApi.analyzeRisk(taskId));
      // The endpoint writes the task's riskLevel server-side, so callers relying on the cached
      // task list (Kanban board, dashboard) need telling — same as autoEstimate above.
      onChanged?.();
    });

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-3">
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
        <Wand2 size={13} className="text-[#1A237E]" aria-hidden /> AI insights
      </h4>

      <div className="mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={autoEstimate}
          disabled={busy != null}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[#0D1757] disabled:opacity-50"
        >
          {busy === "estimate" ? <Loader2 size={11} className="animate-spin" aria-hidden /> : <Timer size={11} aria-hidden />}
          Auto estimate
        </button>
        <button
          type="button"
          onClick={analyseRisk}
          disabled={busy != null}
          className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          {busy === "risk" ? <Loader2 size={11} className="animate-spin" aria-hidden /> : <ShieldAlert size={11} aria-hidden />}
          Analyse risk
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-2 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
          <AlertTriangle size={12} className="mt-px shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-700">
          {notice}
        </div>
      )}

      {estimate ? (
        <div className="rounded-md bg-gray-50 p-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Ước tính</p>
          <p className="text-[11px] leading-relaxed text-gray-700">
            <span className="font-semibold">{estimate.aiEstimatedTime ?? estimate.estimatedTime ?? "—"} giờ</span>
            {" · độ khó "}
            <span className="font-semibold">{estimate.difficulty ?? "—"}/5</span>
          </p>
          <p className="mt-1 text-[10px] text-gray-500">
            Đọc từ mô tả của task. Độ khó do người dùng đặt sẽ không bị ghi đè.
          </p>
        </div>
      ) : (
        !busy && (
          <p className="text-[11px] text-gray-500">
            Chưa có ước tính — chạy Auto estimate để lấy số giờ và độ khó từ mô tả.
          </p>
        )
      )}

      {risk && (
        <div className="mt-2 rounded-md border border-gray-200 p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Risk</p>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${RISK_STYLES[risk.riskLevel] ?? RISK_STYLES.LOW}`}>
              {risk.riskLevel} · {Math.round(risk.totalScore)}
            </span>
          </div>
          {risk.explanation && <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{risk.explanation}</p>}

          {/* The aggregate sentence above only names the top few contributors by code; this is the
              full weighted breakdown so it's clear exactly why the score landed where it did. */}
          {risk.factors?.length > 0 && (
            <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
              {[...risk.factors]
                .sort((a, b) => b.contribution - a.contribution)
                .map((factor) => (
                  <div key={factor.code}>
                    <div className="flex items-center gap-2">
                      <span className="w-32 shrink-0 truncate text-[10px] text-gray-500">
                        {RISK_FACTOR_LABELS[factor.code] ?? factor.code}{" "}
                        <span className="text-gray-400">{weightPct(factor.weight)}</span>
                      </span>
                      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: pct(factor.score) }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-gray-600">
                        {pct(factor.score)}
                      </span>
                    </div>
                    {factor.evidence && (
                      <p className="mt-0.5 pl-[8.5rem] text-[10px] leading-relaxed text-gray-400">
                        {factor.evidence}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}

          {risk.mitigationActions?.length > 0 && (
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[11px] text-gray-500">
              {risk.mitigationActions.slice(0, 3).map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
