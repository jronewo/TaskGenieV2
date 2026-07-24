import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Sparkles, Clock, MessageSquare, Send, Target, Brain, Shield,
  Check, Loader2, RefreshCw, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { TaskDto, tasksApi } from "../services/tasksApi";
import { taskCommentsApi, TaskCommentDto } from "../services/taskCommentsApi";
import { coreAiApi, RiskAssessment, AssignmentResponse } from "../services/coreAiApi";
import { ApiError } from "../services/apiClient";
import { STATUS_COLUMNS } from "./KanbanBoard";

interface TaskDetailModalProps {
  task: TaskDto | null;
  onClose: () => void;
  onTaskChanged: (task: TaskDto) => void;
}

const RiskGauge = ({ score }: { score: number }) => {
  const angle = (score / 100) * 180;
  const getColor = () => {
    if (score < 30) return "#10B981";
    if (score < 60) return "#F59E0B";
    if (score < 80) return "#EF4444";
    return "#DC2626";
  };
  const getLabel = () => {
    if (score < 30) return "Low Risk";
    if (score < 60) return "Moderate";
    if (score < 80) return "High Risk";
    return "Critical";
  };

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-44 h-24">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#F1F5F9" strokeWidth="16" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 68 34" fill="none" stroke="#10B981" strokeWidth="14" strokeLinecap="round" opacity="0.8" />
          <path d="M 68 34 A 80 80 0 0 1 132 34" fill="none" stroke="#F59E0B" strokeWidth="14" opacity="0.8" />
          <path d="M 132 34 A 80 80 0 0 1 180 100" fill="none" stroke="#EF4444" strokeWidth="14" strokeLinecap="round" opacity="0.8" />
          <motion.g initial={{ rotate: -90 }} animate={{ rotate: -90 + angle }} style={{ transformOrigin: "100px 100px" }}>
            <line x1="100" y1="100" x2="100" y2="28" stroke={getColor()} strokeWidth="3" strokeLinecap="round" />
          </motion.g>
          <circle cx="100" cy="100" r="6" fill={getColor()} />
          <circle cx="100" cy="100" r="3" fill="white" />
        </svg>
      </div>
      <motion.div className="text-3xl font-bold mt-0" style={{ color: getColor() }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }}>
        {score}
      </motion.div>
      <div className="text-xs font-semibold mt-1 px-3 py-1 rounded-full" style={{ color: getColor(), background: `${getColor()}20` }}>
        {getLabel()}
      </div>
    </div>
  );
};

export const TaskDetailModal = ({ task, onClose, onTaskChanged }: TaskDetailModalProps) => {
  const [activeTab, setActiveTab] = useState<"overview" | "ai" | "comments">("overview");
  const [localProgress, setLocalProgress] = useState(task?.progress ?? 0);
  const [savingProgress, setSavingProgress] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AssignmentResponse | null>(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState<number | null>(null);

  const [comments, setComments] = useState<TaskCommentDto[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    setLocalProgress(task?.progress ?? 0);
    setRisk(null);
    setRecommendations(null);
    setComments([]);
    setActiveTab("overview");
  }, [task?.taskId]);

  useEffect(() => {
    if (!task || activeTab !== "comments") return;
    setCommentsLoading(true);
    taskCommentsApi.listByTask(task.taskId)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [task?.taskId, activeTab]);

  if (!task) return null;

  const refreshTask = async () => {
    try {
      const fresh = await tasksApi.getById(task.taskId);
      onTaskChanged(fresh);
    } catch {
      // best effort — UI already reflects the optimistic change
    }
  };

  const handleProgressCommit = async (progress: number) => {
    setLocalProgress(progress);
    setSavingProgress(true);
    try {
      await tasksApi.updateProgress(task.taskId, { progress });
      await refreshTask();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update progress.");
    } finally {
      setSavingProgress(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setSavingStatus(true);
    try {
      await tasksApi.updateProgress(task.taskId, { status });
      await refreshTask();
      toast.success(`Status changed to ${status}.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update status.");
    } finally {
      setSavingStatus(false);
    }
  };

  const runRiskAnalysis = async () => {
    setRiskLoading(true);
    try {
      const assessment = await coreAiApi.analyzeRisk(task.taskId);
      setRisk(assessment);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Risk analysis failed.");
    } finally {
      setRiskLoading(false);
    }
  };

  const runRecommend = async () => {
    setRecommendLoading(true);
    try {
      const response = await coreAiApi.recommend(task.taskId, task.projectId);
      setRecommendations(response);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not generate recommendations.");
    } finally {
      setRecommendLoading(false);
    }
  };

  const decide = async (candidateId: number, candidateName: string, accepted: boolean) => {
    setDecisionBusy(candidateId);
    try {
      if (accepted) {
        await coreAiApi.acceptRecommendation(task.taskId, candidateId);
        toast.success(`Assigned to ${candidateName}.`);
      } else {
        await coreAiApi.rejectRecommendation(task.taskId, candidateId);
        toast.success("Rejection feedback recorded.");
      }
      await refreshTask();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Request failed.");
    } finally {
      setDecisionBusy(null);
    }
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      const created = await taskCommentsApi.create(task.taskId, newComment.trim());
      setComments((prev) => [...prev, created]);
      setNewComment("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to post comment.");
    } finally {
      setSendingComment(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "ai", label: "AI Analysis", icon: Brain },
    { id: "comments", label: "Comments", icon: MessageSquare },
  ];

  return (
    <AnimatePresence>
      {task && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

          <motion.div
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 relative" style={{ background: "linear-gradient(135deg, #1A237E 0%, #283593 100%)" }}>
              <div className="absolute top-0 right-16 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #7C4DFF, transparent)" }} />
              <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #1E88E5, transparent)" }} />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">#{task.taskId}</span>
                    <span className="text-blue-400">·</span>
                    <span className="text-xs text-blue-300">{task.status}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1 leading-tight">{task.title}</h2>
                </div>
                <motion.button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white ml-4" whileTap={{ scale: 0.9 }}>
                  <X size={18} />
                </motion.button>
              </div>

              <div className="flex gap-1 mt-4 relative z-10">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <motion.button
                    key={id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-medium transition-all ${activeTab === id ? "bg-white text-gray-800" : "text-blue-200 hover:text-white hover:bg-white/10"}`}
                    onClick={() => setActiveTab(id as typeof activeTab)}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Icon size={14} />
                    {label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div key="overview" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-2 space-y-5">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{task.description || "No description provided."}</p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</h4>
                          <span className="text-sm font-bold text-gray-800">{localProgress}%{savingProgress && <Loader2 size={12} className="inline animate-spin ml-1" />}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={localProgress}
                          onChange={(e) => setLocalProgress(Number(e.target.value))}
                          onMouseUp={(e) => handleProgressCommit(Number((e.target as HTMLInputElement).value))}
                          onTouchEnd={(e) => handleProgressCommit(Number((e.target as HTMLInputElement).value))}
                          className="w-full accent-[#7C4DFF] cursor-pointer"
                        />
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden -mt-1">
                          <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #7C4DFF, #1E88E5)" }} initial={{ width: 0 }} animate={{ width: `${localProgress}%` }} transition={{ duration: 0.4 }} />
                        </div>
                      </div>

                      {task.isLate && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                          This task is running late{task.daysLateOrEarly ? ` by ${Math.abs(task.daysLateOrEarly)} day(s)` : ""}.
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Assignees</div>
                        {task.assignees.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Unassigned — see AI Analysis tab to assign someone.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {task.assignees.map((a) => (
                              <div key={a.userId} className="text-xs font-semibold text-gray-800">{a.userName}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Deadline</div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Clock size={14} className="text-gray-400" />
                          {task.deadline ? new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No deadline"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Priority</div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          task.priority === "High" ? "bg-orange-100 text-orange-600" :
                          task.priority === "Medium" ? "bg-blue-100 text-blue-600" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {task.priority}
                        </span>
                      </div>

                      <div>
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</div>
                        <select
                          value={task.status}
                          disabled={savingStatus}
                          onChange={(e) => handleStatusChange(e.target.value)}
                          className="w-full text-xs font-semibold text-gray-800 border border-gray-200 rounded-lg px-2.5 py-2 outline-none focus:border-[#1A237E] bg-white disabled:opacity-60"
                        >
                          {STATUS_COLUMNS.map((col) => (
                            <option key={col.id} value={col.id}>{col.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "ai" && (
                  <motion.div key="ai" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Risk */}
                      <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-5 border border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Shield size={15} className="text-purple-600" />
                            <h4 className="text-sm font-bold text-gray-800">Risk Prediction</h4>
                          </div>
                          <button onClick={runRiskAnalysis} disabled={riskLoading} className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 disabled:opacity-50">
                            {riskLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} {risk ? "Re-analyze" : "Analyze"}
                          </button>
                        </div>
                        {!risk ? (
                          <p className="mt-6 text-center text-xs text-gray-400">Click "Analyze" to run the real risk engine for this task.</p>
                        ) : (
                          <>
                            <RiskGauge score={risk.totalScore} />
                            <p className="text-xs text-gray-600 leading-relaxed mb-2">{risk.explanation}</p>
                            {risk.mitigationActions.length > 0 && (
                              <ul className="space-y-1 text-[11px] text-gray-600">
                                {risk.mitigationActions.map((a) => <li key={a}>• {a}</li>)}
                              </ul>
                            )}
                          </>
                        )}
                      </div>

                      {/* Recommendations */}
                      <div className="rounded-2xl p-5 border" style={{ background: "linear-gradient(135deg, rgba(124,77,255,0.06) 0%, rgba(30,136,229,0.06) 100%)", borderColor: "rgba(124,77,255,0.2)" }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Sparkles size={15} className="text-purple-600" />
                            <h4 className="text-sm font-bold text-gray-800">AI Recommendations</h4>
                          </div>
                          <button onClick={runRecommend} disabled={recommendLoading} className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 disabled:opacity-50">
                            {recommendLoading ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />} {recommendations ? "Refresh" : "Get suggestions"}
                          </button>
                        </div>
                        {!recommendations ? (
                          <p className="text-xs text-gray-400">Click "Get suggestions" to rank candidates for this task.</p>
                        ) : recommendations.suggestions.length === 0 ? (
                          <p className="text-xs text-gray-400">No candidates found for this project's team.</p>
                        ) : (
                          <div className="space-y-2">
                            {recommendations.suggestions.map((s) => (
                              <div key={s.userId} className="rounded-lg border border-white/60 bg-white/70 p-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-gray-800">#{s.rank} {s.userName}</span>
                                  <span className="text-xs font-black text-indigo-700">{s.score}</span>
                                </div>
                                <div className="mt-1.5 flex gap-1.5">
                                  <button
                                    onClick={() => decide(s.userId, s.userName, true)}
                                    disabled={decisionBusy !== null}
                                    className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"
                                  >
                                    {decisionBusy === s.userId ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Assign
                                  </button>
                                  <button
                                    onClick={() => decide(s.userId, s.userName, false)}
                                    disabled={decisionBusy !== null}
                                    className="flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-[10px] font-bold text-red-600 disabled:opacity-50"
                                  >
                                    <X size={10} /> Skip
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "comments" && (
                  <motion.div key="comments" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="p-6">
                    {commentsLoading ? (
                      <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-gray-400" /></div>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No comments yet — be the first to say something.</p>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((c) => (
                          <div key={c.commentId} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #7C4DFF, #1E88E5)" }}>
                              {(c.userName ?? "?").slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">{c.userName ?? "Unknown"}</span> {c.content}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{new Date(c.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 flex gap-3">
                      <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                        <input
                          className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") sendComment(); }}
                        />
                        <motion.button
                          onClick={sendComment}
                          disabled={!newComment.trim() || sendingComment}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ background: newComment.trim() ? "linear-gradient(135deg, #7C4DFF, #1E88E5)" : "#E5E7EB" }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {sendingComment ? <Loader2 size={13} className="animate-spin text-white" /> : <Send size={13} className={newComment.trim() ? "text-white" : "text-gray-400"} />}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
