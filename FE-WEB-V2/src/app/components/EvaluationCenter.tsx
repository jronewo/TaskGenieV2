import React, { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Loader2, Star, Trash2, Send, FolderKanban, History, Users } from "lucide-react";
import { evaluationApi, teamApi, EvaluationDto, TeamMemberDto } from "../services/teamApi";
import { projectApi, ProjectDto } from "../services/projectApi";
import { ApiError } from "../services/apiClient";
import { useConfirm } from "./ConfirmDialog";
import { useAuth } from "../auth/AuthContext";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You may only review people you lead.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

const SCORES = [1, 2, 3, 4, 5];
const FACTORS = [
  { key: "skillScore", label: "Skill" },
  { key: "teamworkScore", label: "Teamwork" },
  { key: "deadlineScore", label: "Deadline" },
  { key: "communicationScore", label: "Communication" },
] as const;

type FormState = Record<(typeof FACTORS)[number]["key"], string>;
const EMPTY_FORM: FormState = { skillScore: "3", teamworkScore: "3", deadlineScore: "3", communicationScore: "3" };

const average = (e: EvaluationDto) => {
  const values = FACTORS.map((f) => e[f.key] as number | null | undefined).filter((v): v is number => v != null);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
};

/**
 * Evaluations are reviewed per project: pick a project, see who is on it, and read each member's
 * history — including reviews earned on other projects, which is what makes a fair comparison
 * possible. The API only returns that history to someone who leads the person (see
 * EnsureCanViewUserPerformanceAsync).
 */
export const EvaluationCenter = () => {
  const { user } = useAuth();

  const confirm = useConfirm();

  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMemberDto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [history, setHistory] = useState<EvaluationDto[]>([]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const list = await projectApi.list();
        setProjects(list);
        setProjectId((current) => current ?? list[0]?.projectId ?? null);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoadingProjects(false);
      }
    })();
  }, []);

  // Members come from the project's team.
  const loadMembers = useCallback(async () => {
    if (projectId == null) return;
    setLoadingMembers(true);
    setError(null);
    setSelectedUserId(null);
    setHistory([]);
    try {
      const project = await projectApi.getById(projectId);
      if (project.teamId == null) {
        setMembers([]);
        return;
      }
      const team = await teamApi.getById(project.teamId);
      setMembers(team.members ?? []);
    } catch (err) {
      setError(errorMessage(err));
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const loadHistory = useCallback(async (userId: number) => {
    setLoadingHistory(true);
    setError(null);
    try {
      setHistory(await evaluationApi.forUser(userId));
    } catch (err) {
      setError(errorMessage(err));
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const selectMember = (userId: number) => {
    setSelectedUserId(userId);
    setForm(EMPTY_FORM);
    setNotice(null);
    void loadHistory(userId);
  };

  const run = async (key: string, action: () => Promise<void>, successMessage?: string) => {
    if (busy) return; // double-submit guard
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (successMessage) setNotice(successMessage);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const submit = () =>
    selectedUserId != null &&
    run(
      "submit",
      async () => {
        await evaluationApi.create({
          userId: selectedUserId,
          skillScore: Number(form.skillScore),
          teamworkScore: Number(form.teamworkScore),
          deadlineScore: Number(form.deadlineScore),
          communicationScore: Number(form.communicationScore),
        });
        setForm(EMPTY_FORM);
        await loadHistory(selectedUserId);
      },
      "Evaluation saved."
    );

  const removeEvaluation = async (evaluation: EvaluationDto) => {
    if (!(await confirm({
      title: "Xóa đánh giá này?",
      description: "Điểm đã ghi sẽ bị gỡ khỏi lịch sử của thành viên.",
      confirmLabel: "Xóa",
      tone: "danger",
    }))) return;
    void run(`del-${evaluation.evaluationId}`, async () => {
      await evaluationApi.remove(evaluation.evaluationId);
      if (selectedUserId != null) await loadHistory(selectedUserId);
    });
  };

  const selectedMember = members.find((m) => m.userId === selectedUserId) ?? null;
  const isSelf = selectedUserId === user?.userId;

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ClipboardCheck size={18} className="text-[#1A237E]" aria-hidden />
          Evaluations
        </h1>
        <p className="text-xs text-gray-500">Review the people on a project, informed by their history elsewhere.</p>
      </header>

      {/* Project picker */}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="eval-project" className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <FolderKanban size={13} aria-hidden /> Project
        </label>
        <select
          id="eval-project"
          value={projectId ?? ""}
          onChange={(e) => setProjectId(Number(e.target.value))}
          disabled={loadingProjects || projects.length === 0}
          className="min-w-[220px] rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-800 disabled:opacity-50"
        >
          {projects.length === 0 && <option value="">No projects yet</option>}
          {projects.map((p) => (
            <option key={p.projectId} value={p.projectId}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </div>
      )}

      {loadingProjects ? (
        <p className="py-10 text-center text-xs text-gray-500">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-xs text-gray-500">
          Create a project first — evaluations are always tied to one.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Members of the selected project */}
          <section className="rounded-lg border border-gray-200 bg-white p-3">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
              <Users size={13} className="text-[#1A237E]" aria-hidden /> Members ({members.length})
            </h2>
            {loadingMembers ? (
              <p className="py-6 text-center text-[11px] text-gray-500">Loading members…</p>
            ) : members.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-gray-500">
                No members on this project yet. Assign someone first.
              </p>
            ) : (
              <ul className="space-y-1">
                {members.map((m) => (
                  <li key={m.userId}>
                    <button
                      type="button"
                      onClick={() => m.userId != null && selectMember(m.userId)}
                      aria-current={selectedUserId === m.userId}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs ${
                        selectedUserId === m.userId
                          ? "bg-[#1A237E]/10 text-[#1A237E] ring-1 ring-[#1A237E]/30"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-semibold text-gray-600">
                        {(m.userName ?? "?").trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{m.userName ?? `User ${m.userId}`}</span>
                      {m.role && <span className="shrink-0 text-[10px] text-gray-400">{m.role}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Review + history */}
          <div className="space-y-4">
            {!selectedMember ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-xs text-gray-500">
                Pick a member to review them and see their history.
              </div>
            ) : (
              <>
                <section className="rounded-lg border border-gray-200 bg-white p-4">
                  <h2 className="mb-3 text-xs font-semibold text-gray-900">
                    Review {selectedMember.userName ?? `User ${selectedMember.userId}`}
                  </h2>

                  {isSelf ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                      You can't evaluate yourself — the API refuses it too.
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {FACTORS.map((f) => (
                          <div key={f.key} className="text-[11px]">
                            <span className="mb-1 block text-gray-500">{f.label}</span>
                            <div className="flex gap-1">
                              {SCORES.map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => setForm((prev) => ({ ...prev, [f.key]: String(n) }))}
                                  aria-label={`${f.label} score ${n}`}
                                  aria-pressed={form[f.key] === String(n)}
                                  className={`flex h-7 w-7 items-center justify-center rounded-md text-[11px] ${
                                    Number(form[f.key]) >= n
                                      ? "bg-[#1A237E] text-white"
                                      : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={submit}
                        disabled={busy === "submit"}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-3 py-2 text-xs font-medium text-white hover:bg-[#0D1757] disabled:opacity-50"
                      >
                        {busy === "submit" ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Send size={13} aria-hidden />}
                        Submit evaluation
                      </button>
                    </>
                  )}
                </section>

                <section className="rounded-lg border border-gray-200 bg-white p-4">
                  <h2 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                    <History size={13} className="text-[#1A237E]" aria-hidden /> Evaluation history ({history.length})
                  </h2>
                  <p className="mb-3 text-[11px] text-gray-500">
                    Includes reviews earned on other projects, so this one can be judged in context.
                  </p>

                  {loadingHistory ? (
                    <p className="py-6 text-center text-[11px] text-gray-500">Loading history…</p>
                  ) : history.length === 0 ? (
                    <p className="py-6 text-center text-[11px] text-gray-500">No evaluations recorded yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {history.map((e) => {
                        const avg = average(e);
                        const mine = e.leaderId === user?.userId;
                        return (
                          <li key={e.evaluationId} className="flex flex-wrap items-center gap-3 py-2.5">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-900">
                              <Star size={12} className="text-amber-500" aria-hidden />
                              {avg != null ? avg.toFixed(1) : "—"}
                            </span>
                            <span className="flex flex-1 flex-wrap gap-2 text-[11px] text-gray-500">
                              {FACTORS.map((f) => (
                                <span key={f.key}>
                                  {f.label} {(e[f.key] as number | null) ?? "—"}
                                </span>
                              ))}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {e.leaderName ? `by ${e.leaderName}` : ""}
                              {e.createdAt ? ` · ${String(e.createdAt).slice(0, 10)}` : ""}
                            </span>
                            {mine && (
                              <button
                                type="button"
                                onClick={() => removeEvaluation(e)}
                                disabled={busy === `del-${e.evaluationId}`}
                                aria-label="Delete this evaluation"
                                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              >
                                <Trash2 size={12} aria-hidden />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
