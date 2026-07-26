import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, Briefcase, Sparkles, Star, Loader2, Trash2, Info } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { teamsApi } from "../services/teamsApi";
import { evaluationsApi, EvaluationDto } from "../services/evaluationsApi";
import { ApiError } from "../services/apiClient";

type EvalTab = "team" | "project";

interface EvaluableMember {
  userId: number;
  userName: string;
  userEmail: string | null;
}

const PALETTE = ["#6366f1", "#0891b2", "#d97706", "#dc2626", "#059669", "#7c3aed"];
const avatarColor = (userId: number) => PALETTE[userId % PALETTE.length];
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const avg = (nums: number[]) => (nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
const evalAvg = (ev: EvaluationDto) => avg([ev.skillScore, ev.teamworkScore, ev.communicationScore, ev.deadlineScore].filter((n): n is number => n != null));

const scoreColor = (score: number) => (score >= 8 ? "text-emerald-600" : score >= 6 ? "text-amber-600" : "text-red-600");
const scoreBg = (score: number) => (score >= 8 ? "bg-emerald-50 border-emerald-200" : score >= 6 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200");

const ScoreSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className="text-xs font-bold text-slate-800">{value}/10</span>
    </div>
    <input
      type="range"
      min={0}
      max={10}
      step={1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-[#1A237E] cursor-pointer"
    />
  </div>
);

// Module-scoped so the active tab/selection survive a remount of EvaluationCenter within the same SPA session.
let lastSelectedMemberId: number | null = null;
let lastTab: EvalTab = "team";

export const EvaluationCenter = () => {
  const { user } = useAuth();
  const [tab, setTabState] = useState<EvalTab>(lastTab);
  const setTab = (t: EvalTab) => { lastTab = t; setTabState(t); };

  const [members, setMembers] = useState<EvaluableMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberAverages, setMemberAverages] = useState<Record<number, number | null>>({});
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(lastSelectedMemberId);

  const [history, setHistory] = useState<EvaluationDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [form, setForm] = useState({ skill: 5, teamwork: 5, communication: 5, deadline: 5 });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectMember = (id: number) => {
    lastSelectedMemberId = id;
    setSelectedMemberId(id);
  };

  // Load all unique members across the current user's teams as the evaluable pool.
  useEffect(() => {
    teamsApi.listMine()
      .then((teams) => {
        const map = new Map<number, EvaluableMember>();
        teams.forEach((team) =>
          team.members.forEach((m) => {
            if (!map.has(m.userId)) map.set(m.userId, { userId: m.userId, userName: m.userName ?? `User #${m.userId}`, userEmail: m.userEmail });
          })
        );
        const list = Array.from(map.values());
        setMembers(list);
        if (list.length) setSelectedMemberId((prev) => prev ?? lastSelectedMemberId ?? list[0].userId);
      })
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, []);

  useEffect(() => {
    if (members.length === 0) return;
    Promise.all(members.map((m) => evaluationsApi.listForUser(m.userId).then((evals) => [m.userId, evals] as const)))
      .then((results) => {
        const next: Record<number, number | null> = {};
        results.forEach(([id, evals]) => { next[id] = evals.length ? avg(evals.map(evalAvg)) : null; });
        setMemberAverages(next);
      })
      .catch(() => {});
  }, [members]);

  useEffect(() => {
    if (selectedMemberId === null) return;
    setHistoryLoading(true);
    evaluationsApi.listForUser(selectedMemberId)
      .then((list) => setHistory(list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [selectedMemberId]);

  const selectedMember = members.find((m) => m.userId === selectedMemberId) ?? null;
  const historyAvg = avg(history.map(evalAvg));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedMemberId === null) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await evaluationsApi.create({
        userId: selectedMemberId,
        leaderId: user.userId,
        skillScore: form.skill,
        teamworkScore: form.teamwork,
        communicationScore: form.communication,
        deadlineScore: form.deadline,
      });
      const refreshed = await evaluationsApi.listForUser(selectedMemberId);
      const sorted = refreshed.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setHistory(sorted);
      setMemberAverages((prev) => ({ ...prev, [selectedMemberId]: avg(sorted.map(evalAvg)) }));
      setForm({ skill: 5, teamwork: 5, communication: 5, deadline: 5 });
      setFeedback({ type: "success", message: "Evaluation submitted." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof ApiError ? error.message : "Failed to submit evaluation." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (evaluationId: number) => {
    try {
      await evaluationsApi.remove(evaluationId);
      setHistory((prev) => {
        const next = prev.filter((e) => e.evaluationId !== evaluationId);
        if (selectedMemberId !== null) {
          setMemberAverages((avgs) => ({ ...avgs, [selectedMemberId]: next.length ? avg(next.map(evalAvg)) : null }));
        }
        return next;
      });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof ApiError ? error.message : "Failed to delete evaluation." });
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
            <Star size={12} /> Evaluation Management
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Evaluate team members and projects</h2>
          <p className="mt-1 text-sm text-slate-500">Score against key criteria and track history over time.</p>
        </div>
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shrink-0">
          {[
            { id: "team" as EvalTab, label: "Team Evaluations", icon: Users },
            { id: "project" as EvalTab, label: "Project Evaluations", icon: Briefcase },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${tab === id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </div>
      )}

      {tab === "team" && (
        membersLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
        ) : members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No team members to evaluate yet — join or create a team first.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Team Members</h3>
              <div className="space-y-2">
                {members.map((member) => {
                  const memberAvg = memberAverages[member.userId];
                  return (
                    <button
                      key={member.userId}
                      onClick={() => selectMember(member.userId)}
                      className={`w-full rounded-xl border p-3 text-left transition ${selectedMemberId === member.userId ? "border-slate-500 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: avatarColor(member.userId) }}>
                          {initials(member.userName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 truncate">{member.userName}</div>
                          <div className="text-xs text-slate-500 truncate">{member.userEmail}</div>
                        </div>
                        {memberAvg != null && (
                          <span className={`text-xs font-bold shrink-0 ${scoreColor(memberAvg)}`}>{memberAvg.toFixed(1)}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedMember && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={13} className="text-purple-500" />
                    <h3 className="text-sm font-semibold text-slate-900">New Evaluation — {selectedMember.userName}</h3>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ScoreSlider label="Skill" value={form.skill} onChange={(v) => setForm((p) => ({ ...p, skill: v }))} />
                      <ScoreSlider label="Teamwork" value={form.teamwork} onChange={(v) => setForm((p) => ({ ...p, teamwork: v }))} />
                      <ScoreSlider label="Communication" value={form.communication} onChange={(v) => setForm((p) => ({ ...p, communication: v }))} />
                      <ScoreSlider label="Deadline Adherence" value={form.deadline} onChange={(v) => setForm((p) => ({ ...p, deadline: v }))} />
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={submitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
                        {submitting ? "Submitting…" : "Submit Evaluation"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Evaluation History</h3>
                    {history.length > 0 && (
                      <div className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreBg(historyAvg)} ${scoreColor(historyAvg)}`}>
                        Average: {historyAvg.toFixed(1)}/10
                      </div>
                    )}
                  </div>
                  {historyLoading ? (
                    <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
                  ) : history.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No evaluations yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {history.map((ev) => {
                        const roundAvg = evalAvg(ev);
                        return (
                          <motion.div key={ev.evaluationId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-xs font-semibold text-slate-700">
                                {new Date(ev.createdAt).toLocaleDateString()} · by {ev.leaderName ?? `User #${ev.leaderId}`}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${scoreColor(roundAvg)}`}>{roundAvg.toFixed(1)}/10</span>
                                <button onClick={() => handleDelete(ev.evaluationId)} className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                              <span>Skill {ev.skillScore ?? "—"}</span>
                              <span>Teamwork {ev.teamworkScore ?? "—"}</span>
                              <span>Communication {ev.communicationScore ?? "—"}</span>
                              <span>Deadline {ev.deadlineScore ?? "—"}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {tab === "project" && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Info size={22} className="mx-auto mb-3 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800 mb-1.5">Project Evaluations aren't available yet</h3>
          <p className="mx-auto max-w-md text-sm text-slate-500">
            The backend only supports evaluating projects that belong to an Organization
            (<code className="text-xs">POST /api/Organizations/&#123;orgId&#125;/projects/&#123;projectId&#125;/evaluate</code>),
            and there's currently no way to create an Organization or link a project to one through the API.
            This tab will be wired up once that capability exists.
          </p>
        </div>
      )}
    </div>
  );
};
