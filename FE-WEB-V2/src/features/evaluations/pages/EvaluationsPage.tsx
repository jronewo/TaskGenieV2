import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Loader2, Star, Trash2 } from "lucide-react";
import { useAuth } from "../../../core/auth/AuthContext";
import { ApiError } from "../../../core/api/client";
import { useMyTeams } from "../../teams/hooks/useTeams";
import { useEvaluationsReceived, useEvaluationsGiven, useCreateEvaluation, useDeleteEvaluation } from "../hooks/useEvaluations";

type Tab = "received" | "given";

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-700" style={{ width: `${((value ?? 0) / 10) * 100}%` }} />
        </div>
        <span className="w-6 text-right font-semibold text-slate-800">{value ?? "—"}</span>
      </div>
    </div>
  );
}

export default function EvaluationsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("received");
  const { data: received, isLoading: loadingReceived } = useEvaluationsReceived(user?.userId ?? null);
  const { data: given, isLoading: loadingGiven } = useEvaluationsGiven(user?.userId ?? null);
  const { data: teams } = useMyTeams();
  const createEvaluation = useCreateEvaluation(user?.userId ?? 0);
  const deleteEvaluation = useDeleteEvaluation(user?.userId ?? 0);

  const [teamId, setTeamId] = useState<number | "">("");
  const [memberId, setMemberId] = useState<number | "">("");
  const [scores, setScores] = useState({ skillScore: 7, teamworkScore: 7, deadlineScore: 7, communicationScore: 7 });

  const members = useMemo(() => teams?.find((t) => t.teamId === teamId)?.members ?? [], [teams, teamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !memberId) {
      toast.error("Chọn team và thành viên cần đánh giá.");
      return;
    }
    try {
      await createEvaluation.mutateAsync({ userId: Number(memberId), leaderId: user.userId, ...scores });
      toast.success("Đã gửi đánh giá.");
      setMemberId("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gửi đánh giá thất bại.");
    }
  };

  const scoreSlider = (label: string, key: keyof typeof scores) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-600">{label}</span>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={scores[key]}
        onChange={(e) => setScores((p) => ({ ...p, [key]: Number(e.target.value) }))}
        className="flex-1 accent-slate-700"
      />
      <span className="w-8 text-right text-xs font-semibold text-slate-800">{scores[key]}</span>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
          <ClipboardCheck size={12} /> Evaluations
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Peer performance evaluations</h2>
        <p className="mt-1 text-sm text-slate-500">Score teammates on skill, teamwork, deadline adherence, and communication.</p>
      </div>

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {(["received", "given"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${tab === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {t === "received" ? "Received" : "Given by me"}
          </button>
        ))}
      </div>

      {tab === "received" && (
        <div className="space-y-2.5">
          {loadingReceived && (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
              <Loader2 className="animate-spin" size={15} /> Loading...
            </div>
          )}
          {(received ?? []).map((ev) => (
            <div key={ev.evaluationId} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>
                  From <strong className="text-slate-800">{ev.leaderName ?? `Leader #${ev.leaderId}`}</strong>
                </span>
                <span>{ev.createdAt ? new Date(ev.createdAt).toLocaleDateString() : "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <ScoreBar label="Skill" value={ev.skillScore} />
                <ScoreBar label="Teamwork" value={ev.teamworkScore} />
                <ScoreBar label="Deadline" value={ev.deadlineScore} />
                <ScoreBar label="Communication" value={ev.communicationScore} />
              </div>
            </div>
          ))}
          {!loadingReceived && (received ?? []).length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No evaluations received yet.</div>
          )}
        </div>
      )}

      {tab === "given" && (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Star size={14} /> New Evaluation
            </h3>
            <select
              value={teamId}
              onChange={(e) => {
                setTeamId(Number(e.target.value));
                setMemberId("");
              }}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none bg-input-background"
            >
              <option value="">Select team...</option>
              {(teams ?? []).map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={memberId}
              onChange={(e) => setMemberId(Number(e.target.value))}
              disabled={!teamId}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none bg-input-background disabled:opacity-50"
            >
              <option value="">Select member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.userId}>
                  {m.userName ?? m.userEmail}
                </option>
              ))}
            </select>
            {scoreSlider("Skill", "skillScore")}
            {scoreSlider("Teamwork", "teamworkScore")}
            {scoreSlider("Deadline adherence", "deadlineScore")}
            {scoreSlider("Communication", "communicationScore")}
            <button type="submit" disabled={createEvaluation.isPending} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {createEvaluation.isPending ? "Submitting..." : "Submit Evaluation"}
            </button>
          </form>

          <div className="space-y-2.5">
            {loadingGiven && (
              <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
                <Loader2 className="animate-spin" size={15} /> Loading...
              </div>
            )}
            {(given ?? []).map((ev) => (
              <div key={ev.evaluationId} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    To <strong className="text-slate-800">{ev.userName ?? `User #${ev.userId}`}</strong>
                  </span>
                  <button onClick={() => deleteEvaluation.mutate(ev.evaluationId)} className="text-slate-400 hover:text-rose-600">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <ScoreBar label="Skill" value={ev.skillScore} />
                  <ScoreBar label="Teamwork" value={ev.teamworkScore} />
                  <ScoreBar label="Deadline" value={ev.deadlineScore} />
                  <ScoreBar label="Communication" value={ev.communicationScore} />
                </div>
              </div>
            ))}
            {!loadingGiven && (given ?? []).length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">You haven't evaluated anyone yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
