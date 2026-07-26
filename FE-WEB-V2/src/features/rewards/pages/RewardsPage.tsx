import React, { useState } from "react";
import { toast } from "sonner";
import { Award, Loader2, Medal, Sliders, Trophy } from "lucide-react";
import { useAuth } from "../../../core/auth/AuthContext";
import { ApiError } from "../../../core/api/client";
import { useProjects } from "../../projects/hooks/useProjects";
import { useScoreHistory, useScoreSummary, useLeaderboard, useManualScoreAdjust } from "../hooks/useRewards";
import { ScoreType } from "../types";

const levelColor: Record<string, string> = {
  Bronze: "bg-amber-100 text-amber-800 border-amber-200",
  Silver: "bg-slate-100 text-slate-700 border-slate-300",
  Gold: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Platinum: "bg-indigo-100 text-indigo-700 border-indigo-300",
};

export default function RewardsPage() {
  const { user } = useAuth();
  const { data: summary, isLoading: loadingSummary } = useScoreSummary(user?.userId ?? null, user?.name);
  const { data: history, isLoading: loadingHistory } = useScoreHistory(user?.userId ?? null);
  const { data: projects } = useProjects();
  const [leaderboardProjectId, setLeaderboardProjectId] = useState<number | "">("");
  const { data: leaderboard } = useLeaderboard(leaderboardProjectId === "" ? null : Number(leaderboardProjectId));

  const manualAdjust = useManualScoreAdjust();
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ userId: "", type: "REWARD" as ScoreType, amount: 10, reason: "" });

  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.userId || !adjustForm.reason.trim()) {
      toast.error("Nhập user ID và lý do.");
      return;
    }
    try {
      await manualAdjust.mutateAsync({
        userId: Number(adjustForm.userId),
        type: adjustForm.type,
        amount: adjustForm.amount,
        reason: adjustForm.reason.trim(),
      });
      toast.success("Đã áp dụng điểm thủ công.");
      setAdjustForm({ userId: "", type: "REWARD", amount: 10, reason: "" });
      setShowAdjustForm(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Chỉnh điểm thất bại.");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
          <Award size={12} /> Rewards &amp; Leaderboard
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Reward / penalty points and project leaderboard</h2>
        <p className="mt-1 text-sm text-slate-500">Dữ liệu demo (mock) — sẽ nối API thật /api/user-scores sau khi merge source.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Medal size={14} /> My Score
            </h3>
            {loadingSummary && (
              <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
                <Loader2 className="animate-spin" size={15} /> Loading...
              </div>
            )}
            {summary && (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${levelColor[summary.level] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>{summary.level}</span>
                  <span className="text-xl font-bold text-slate-900">{summary.totalScore}</span>
                  <span className="text-xs text-slate-400">points</span>
                </div>
                <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                  <span>Progress to next level</span>
                  <span>{summary.progressToNextLevel}%</span>
                </div>
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-700" style={{ width: `${summary.progressToNextLevel}%` }} />
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">+{summary.totalRewardPoints} reward</span>
                  <span className="rounded-lg bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">-{summary.totalPenaltyPoints} penalty</span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">History</h3>
            {loadingHistory && (
              <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
                <Loader2 className="animate-spin" size={15} /> Loading...
              </div>
            )}
            <div className="space-y-2">
              {(history ?? []).map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                  <div>
                    <div className="font-medium text-slate-800">{h.reason}</div>
                    <div className="text-[10px] text-slate-400">{h.taskTitle ?? h.projectName ?? "—"} · {new Date(h.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`font-bold ${h.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {h.amount >= 0 ? "+" : ""}
                    {h.amount}
                  </span>
                </div>
              ))}
              {!loadingHistory && (history ?? []).length === 0 && <p className="text-xs text-slate-400">No score history yet.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Trophy size={14} /> Project Leaderboard
              </h3>
              <select
                value={leaderboardProjectId}
                onChange={(e) => setLeaderboardProjectId(e.target.value === "" ? "" : Number(e.target.value))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none bg-input-background"
              >
                <option value="">Select project...</option>
                {(projects ?? []).map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {(leaderboard?.members ?? []).map((m, idx) => (
                <div key={m.userId} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{idx + 1}</span>
                    <span className="font-medium text-slate-800">{m.userName}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${levelColor[m.level] ?? ""}`}>{m.level}</span>
                  </div>
                  <span className="font-bold text-slate-900">{m.totalScore}</span>
                </div>
              ))}
              {leaderboardProjectId !== "" && (leaderboard?.members ?? []).length === 0 && <p className="text-xs text-slate-400">No score data for this project.</p>}
              {leaderboardProjectId === "" && <p className="text-xs text-slate-400">Chọn một dự án để xem bảng xếp hạng.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <button onClick={() => setShowAdjustForm((v) => !v)} className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Sliders size={14} /> Manual Score Adjustment (leader/admin)
            </button>
            {showAdjustForm && (
              <form onSubmit={handleManualAdjust} className="mt-3 space-y-2">
                <input
                  value={adjustForm.userId}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, userId: e.target.value }))}
                  placeholder="User ID"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-500"
                />
                <div className="flex gap-2">
                  <select
                    value={adjustForm.type}
                    onChange={(e) => setAdjustForm((p) => ({ ...p, type: e.target.value as ScoreType }))}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none bg-input-background"
                  >
                    <option value="REWARD">Reward</option>
                    <option value="PENALTY">Penalty</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={adjustForm.amount}
                    onChange={(e) => setAdjustForm((p) => ({ ...p, amount: Number(e.target.value) }))}
                    className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-500"
                  />
                </div>
                <input
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Reason"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-500"
                />
                <button type="submit" disabled={manualAdjust.isPending} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {manualAdjust.isPending ? "Applying..." : "Apply Adjustment"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
