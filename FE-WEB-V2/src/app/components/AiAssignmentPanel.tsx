import React, { useEffect, useState } from "react";
import { Sparkles, Check, X, Loader2, AlertTriangle } from "lucide-react";
import { coreAiApi, AssignmentSuggestion } from "../services/coreAiApi";
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

/** Weights mirror the backend scoring engine so the UI explains the same maths it ran. */
const FACTORS: { key: keyof AssignmentSuggestion; label: string; weight: string }[] = [
  { key: "skillMatchScore", label: "Skill match", weight: "40%" },
  { key: "semanticSimilarityScore", label: "Similarity", weight: "25%" },
  { key: "workloadScore", label: "Workload", weight: "20%" },
  { key: "performanceScore", label: "Performance", weight: "15%" },
];

/**
 * The scoring engine already returns percentages (55.4, 71.6 …), not 0–1 fractions — multiplying
 * again produced "5541%". Clamped so a bad value can never blow the bar past its track.
 */
const clamp = (v: number) => Math.min(100, Math.max(0, v ?? 0));
const pct = (v: number) => `${Math.round(clamp(v))}%`;

interface Props {
  taskId: number;
  projectId: number;
  /** Lets the parent refresh assignees after a suggestion is accepted. */
  onAssigned?: () => void;
  /** Fires the suggestion request as soon as the panel mounts instead of waiting for a click —
   *  used where a candidate needs to appear as fast as possible (e.g. the Backlog move modal). */
  autoSuggest?: boolean;
}

export const AiAssignmentPanel = ({ taskId, projectId, onAssigned, autoSuggest = false }: Props) => {
  const [suggestions, setSuggestions] = useState<AssignmentSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const suggest = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await coreAiApi.recommend(taskId, projectId);
      setSuggestions(result?.suggestions ?? []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoSuggest) void suggest();
    // Only ever auto-fires once, on mount — re-running on every taskId/projectId identity change
    // would refetch mid-edit for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decide = async (suggestion: AssignmentSuggestion, accept: boolean) => {
    if (busy != null) return; // one decision at a time
    setBusy(suggestion.userId);
    setError(null);
    try {
      if (accept) {
        await coreAiApi.acceptRecommendation(taskId, suggestion.userId);
        setNotice(`${suggestion.userName} was assigned to this task.`);
        onAssigned?.();
      } else {
        await coreAiApi.rejectRecommendation(taskId, suggestion.userId);
        setNotice("Suggestion dismissed.");
      }
      // Drop the decided row; the rest stay actionable.
      setSuggestions((current) => (current ?? []).filter((s) => s.userId !== suggestion.userId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
          <Sparkles size={13} className="text-[#1A237E]" aria-hidden />
          AI suggested assignees
        </h4>
        <button
          type="button"
          onClick={suggest}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[#0D1757] disabled:opacity-50"
        >
          {loading ? <Loader2 size={11} className="animate-spin" aria-hidden /> : <Sparkles size={11} aria-hidden />}
          {suggestions ? "Re-run" : "Suggest"}
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-2 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
          <AlertTriangle size={12} className="mt-px shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-700">
          {notice}
        </div>
      )}

      {loading && (
        <p className="mt-3 text-[11px] text-gray-500">Scoring candidates against skills, workload and history…</p>
      )}

      {!loading && suggestions?.length === 0 && (
        <p className="mt-3 text-[11px] text-gray-500">
          No suitable candidate found. Add team members to the project, or give them the skills this task requires.
        </p>
      )}

      {!loading && suggestions && suggestions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {suggestions.map((s) => (
            <li key={s.userId} className="rounded-md border border-gray-200 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-900">
                    <span className="mr-1.5 text-[10px] text-gray-400">#{s.rank}</span>
                    {s.userName}
                  </p>
                  <p className="text-[10px] text-gray-500">Overall match {pct(s.score)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => decide(s, true)}
                    disabled={busy != null}
                    aria-label={`Assign ${s.userName} to this task`}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy === s.userId ? <Loader2 size={10} className="animate-spin" aria-hidden /> : <Check size={10} aria-hidden />}
                    Assign
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(s, false)}
                    disabled={busy != null}
                    aria-label={`Dismiss ${s.userName}`}
                    className="rounded-md border border-gray-200 px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <X size={10} aria-hidden />
                  </button>
                </div>
              </div>

              {/* Why the AI picked them — the same four factors the backend weighted.
                  One row per factor: two columns made the labels collide at this width. */}
              <div className="mt-2 space-y-1">
                {FACTORS.map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[10px] text-gray-500">
                      {f.label} <span className="text-gray-400">{f.weight}</span>
                    </span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#1A237E]"
                        style={{ width: pct(s[f.key] as number) }}
                      />
                    </div>
                    <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-gray-600">
                      {pct(s[f.key] as number)}
                    </span>
                  </div>
                ))}
              </div>

              {s.reason && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] text-[#1A237E] hover:underline">
                    Why this candidate?
                  </summary>
                  <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-gray-500">
                    {s.reason}
                  </p>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
