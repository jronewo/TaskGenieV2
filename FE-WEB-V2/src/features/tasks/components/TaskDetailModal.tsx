import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Clock, Sparkles, Link2, Trash2, Loader2, MessageSquare, Paperclip, GraduationCap, History, Send } from "lucide-react";
import { toast } from "sonner";
import { TaskDetailDto, TaskStatus } from "../types";
import { formatDate } from "../../../core/utils/date";
import { ApiError } from "../../../core/api/client";
import { useAuth } from "../../../core/auth/AuthContext";
import { useUpdateTask, useUpdateTaskProgress, useEstimateTask, useAddDependency, useRemoveDependency } from "../hooks/useTasks";
import { useTaskComments, useCreateTaskComment, useDeleteTaskComment } from "../hooks/useTaskComments";
import { useTaskEvidence, useAddUrlEvidence } from "../../ai/hooks/useAi";
import { useTaskRequiredSkills, useSetTaskRequiredSkills } from "../hooks/useTaskRequiredSkills";
import { useSkillCatalog } from "../../skills/hooks/useSkills";
import { useTaskProgressLogs, useAppendProgressLog } from "../hooks/useTaskProgressLogs";

const statusOptions: { id: TaskStatus; label: string }[] = [
  { id: "Todo", label: "To Do" },
  { id: "InProgress", label: "In Progress" },
  { id: "Done", label: "Done" },
];

type DetailTab = "details" | "comments" | "evidence" | "skills" | "history";

interface TaskDetailModalProps {
  task: TaskDetailDto | null;
  projectId: number;
  otherTasks: TaskDetailDto[];
  onClose: () => void;
}

function CommentsTab({ taskId }: { taskId: number }) {
  const { user } = useAuth();
  const { data: comments, isLoading } = useTaskComments(taskId);
  const createComment = useCreateTaskComment(taskId, user?.name ?? user?.email ?? null);
  const deleteComment = useDeleteTaskComment(taskId);
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    try {
      await createComment.mutateAsync({ taskId, userId: user.userId, content: content.trim() });
      setContent("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gửi bình luận thất bại.");
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#1A237E]"
        />
        <button type="submit" disabled={createComment.isPending || !content.trim()} className="rounded-lg bg-[#1A237E] px-3 py-2 text-white disabled:opacity-50">
          <Send size={13} />
        </button>
      </form>
      {isLoading && (
        <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
          <Loader2 className="animate-spin" size={13} /> Loading comments...
        </div>
      )}
      <div className="space-y-2">
        {(comments ?? []).map((c) => (
          <div key={c.commentId} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-800">{c.userName ?? `User #${c.userId}`}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}</span>
                {c.userId === user?.userId && (
                  <button onClick={() => deleteComment.mutate(c.commentId)} className="text-gray-400 hover:text-red-600">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-700">{c.content}</p>
          </div>
        ))}
        {!isLoading && (comments ?? []).length === 0 && <p className="text-xs text-gray-400">No comments yet.</p>}
      </div>
    </div>
  );
}

function EvidenceTab({ taskId }: { taskId: number }) {
  const { data: evidence, isLoading } = useTaskEvidence(taskId);
  const addEvidence = useAddUrlEvidence(taskId);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    try {
      await addEvidence.mutateAsync({ externalUrl: url.trim(), description: description.trim() });
      setUrl("");
      setDescription("");
      toast.success("Evidence added.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thêm evidence thất bại.");
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-2.5">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#1A237E]" />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#1A237E]"
        />
        <button type="submit" disabled={addEvidence.isPending || !url.trim()} className="rounded-md bg-[#1A237E] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {addEvidence.isPending ? "Adding..." : "Add URL Evidence"}
        </button>
      </form>
      {isLoading && (
        <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
          <Loader2 className="animate-spin" size={13} /> Loading evidence...
        </div>
      )}
      <div className="space-y-2">
        {(evidence ?? []).map((e) => (
          <div key={e.evidenceId} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 text-xs">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-gray-800">{e.evidenceType}</span>
              <span className="text-[10px] text-gray-400">{new Date(e.createdAt).toLocaleString()}</span>
            </div>
            {e.externalUrl && (
              <a href={e.externalUrl} target="_blank" rel="noreferrer" className="break-all text-blue-600 hover:underline">
                {e.externalUrl}
              </a>
            )}
            {e.description && <p className="mt-1 text-gray-600">{e.description}</p>}
          </div>
        ))}
        {!isLoading && (evidence ?? []).length === 0 && <p className="text-xs text-gray-400">No evidence attached yet.</p>}
      </div>
    </div>
  );
}

function SkillsTab({ taskId }: { taskId: number }) {
  const { data: catalog } = useSkillCatalog();
  const { data: required } = useTaskRequiredSkills(taskId);
  const setRequired = useSetTaskRequiredSkills(taskId);
  const [selected, setSelected] = useState<number[] | null>(null);

  const currentIds = selected ?? (required ?? []).map((r) => r.skillId);

  const toggle = (skillId: number) => {
    const base = selected ?? (required ?? []).map((r) => r.skillId);
    setSelected(base.includes(skillId) ? base.filter((id) => id !== skillId) : [...base, skillId]);
  };

  const handleSave = async () => {
    try {
      await setRequired.mutateAsync({ skillIds: currentIds, catalog: catalog ?? [] });
      toast.success("Required skills updated.");
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật kỹ năng yêu cầu thất bại.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(catalog ?? []).map((s) => {
          const active = currentIds.includes(s.skillId);
          return (
            <button
              key={s.skillId}
              onClick={() => toggle(s.skillId)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                active ? "border-[#1A237E] bg-[#1A237E] text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {s.skillName}
            </button>
          );
        })}
        {(catalog ?? []).length === 0 && <p className="text-xs text-gray-400">No skills in catalog yet.</p>}
      </div>
      <button onClick={handleSave} disabled={setRequired.isPending} className="rounded-lg bg-[#1A237E] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
        {setRequired.isPending ? "Saving..." : "Save Required Skills"}
      </button>
    </div>
  );
}

function HistoryTab({ taskId }: { taskId: number }) {
  const { data: logs, isLoading } = useTaskProgressLogs(taskId);
  const appendLog = useAppendProgressLog(taskId);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("");
  const [risk, setRisk] = useState("LOW");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await appendLog.mutateAsync({ progress, note: note.trim() || null, risk });
      setNote("");
      toast.success("Progress log recorded.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ghi log thất bại.");
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-2.5">
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-16 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none" />
          <span className="text-xs text-gray-500">% progress</span>
          <select value={risk} onChange={(e) => setRisk(e.target.value)} className="ml-auto rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none" />
        <button type="submit" disabled={appendLog.isPending} className="rounded-md bg-[#1A237E] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {appendLog.isPending ? "Logging..." : "Log Progress"}
        </button>
      </form>
      {isLoading && (
        <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
          <Loader2 className="animate-spin" size={13} /> Loading history...
        </div>
      )}
      <div className="space-y-2">
        {(logs ?? []).map((l) => (
          <div key={l.logId} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-xs">
            <div>
              <span className="font-semibold text-gray-800">{l.progress}%</span>
              {l.note && <span className="ml-2 text-gray-500">{l.note}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-gray-500">{l.risk}</span>
              <span className="text-[10px] text-gray-400">{l.createdAt ? new Date(l.createdAt).toLocaleString() : ""}</span>
            </div>
          </div>
        ))}
        {!isLoading && (logs ?? []).length === 0 && <p className="text-xs text-gray-400">No progress logs recorded yet.</p>}
      </div>
    </div>
  );
}

export const TaskDetailModal = ({ task, projectId, otherTasks, onClose }: TaskDetailModalProps) => {
  const [dependsOnId, setDependsOnId] = useState<string>("");
  const [tab, setTab] = useState<DetailTab>("details");
  const updateTask = useUpdateTask(projectId, task?.taskId ?? 0);
  const updateProgress = useUpdateTaskProgress(projectId, task?.taskId ?? 0);
  const estimateTask = useEstimateTask(projectId, task?.taskId ?? 0);
  const addDependency = useAddDependency(projectId, task?.taskId ?? 0);
  const removeDependency = useRemoveDependency(projectId, task?.taskId ?? 0);

  if (!task) return null;

  const candidateDependencies = otherTasks.filter(
    (t) => t.taskId !== task.taskId && !task.dependencies.some((d) => d.dependsOnTaskId === t.taskId)
  );

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ status });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật trạng thái thất bại.");
    }
  };

  const handleProgressCommit = async (progress: number) => {
    try {
      await updateProgress.mutateAsync({ progress });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật tiến độ thất bại.");
    }
  };

  const handlePriorityChange = async (priority: string) => {
    try {
      await updateTask.mutateAsync({ priority });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật độ ưu tiên thất bại.");
    }
  };

  const handleEstimate = async () => {
    try {
      await estimateTask.mutateAsync();
      toast.success("AI đã đề xuất thời gian ước tính mới.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ước tính AI thất bại.");
    }
  };

  const handleAddDependency = async () => {
    if (!dependsOnId) return;
    try {
      await addDependency.mutateAsync(Number(dependsOnId));
      setDependsOnId("");
      toast.success("Dependency added.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thêm dependency thất bại.");
    }
  };

  const handleRemoveDependency = async (dependencyId: number) => {
    try {
      await removeDependency.mutateAsync(dependencyId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xoá dependency thất bại.");
    }
  };

  const tabs: { id: DetailTab; label: string; icon: typeof MessageSquare }[] = [
    { id: "details", label: "Details", icon: Link2 },
    { id: "comments", label: "Comments", icon: MessageSquare },
    { id: "evidence", label: "Evidence", icon: Paperclip },
    { id: "skills", label: "Skills", icon: GraduationCap },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <AnimatePresence>
      {task && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

          <motion.div
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="px-6 pt-6 pb-4 relative" style={{ background: "linear-gradient(135deg, #1A237E 0%, #283593 100%)" }}>
              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-blue-300 uppercase tracking-wider">
                    #{task.taskId}
                    {task.isLate && <span className="text-red-300">· Late</span>}
                  </div>
                  <h2 className="text-xl font-bold text-white leading-tight">{task.title}</h2>
                </div>
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white ml-4">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-1 border-b border-gray-100 pb-2">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                        tab === t.id ? "bg-[#1A237E] text-white" : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <t.icon size={12} /> {t.label}
                    </button>
                  ))}
                </div>

                {tab === "details" && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{task.description || "No description provided."}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</h4>
                        <span className="text-sm font-bold text-gray-800">{task.progress ?? 0}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        defaultValue={task.progress ?? 0}
                        onMouseUp={(e) => handleProgressCommit(Number((e.target as HTMLInputElement).value))}
                        onTouchEnd={(e) => handleProgressCommit(Number((e.target as HTMLInputElement).value))}
                        className="w-full accent-[#7C4DFF] cursor-pointer"
                      />
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden -mt-1">
                        <div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #7C4DFF, #1E88E5)", width: `${task.progress ?? 0}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Link2 size={12} /> Dependencies
                        </h4>
                      </div>
                      <div className="space-y-1.5 mb-2">
                        {task.dependencies.length === 0 && <p className="text-xs text-gray-400">No dependencies.</p>}
                        {task.dependencies.map((dep) => (
                          <div key={dep.dependencyId} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-xs">
                            <span className="text-gray-700">{dep.dependsOnTaskTitle ?? `Task #${dep.dependsOnTaskId}`}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">{dep.status}</span>
                              <button onClick={() => handleRemoveDependency(dep.dependencyId)} className="text-gray-400 hover:text-red-600">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {candidateDependencies.length > 0 && (
                        <div className="flex gap-2">
                          <select value={dependsOnId} onChange={(e) => setDependsOnId(e.target.value)} className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none">
                            <option value="">Select a task this depends on...</option>
                            {candidateDependencies.map((t) => (
                              <option key={t.taskId} value={t.taskId}>
                                {t.title}
                              </option>
                            ))}
                          </select>
                          <button onClick={handleAddDependency} disabled={!dependsOnId || addDependency.isPending} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#1A237E] text-white disabled:opacity-50">
                            Add
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles size={12} /> AI Estimate
                      </h4>
                      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
                        <span>
                          Estimated: <strong>{task.estimatedTime ?? "—"}h</strong> · AI suggested: <strong>{task.aiEstimatedTime ?? "—"}h</strong>
                        </span>
                        <button
                          onClick={handleEstimate}
                          disabled={estimateTask.isPending}
                          className="ml-auto flex items-center gap-1.5 text-[#1A237E] font-semibold hover:text-[#0D1757] disabled:opacity-50"
                        >
                          {estimateTask.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          Estimate with AI
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {tab === "comments" && <CommentsTab taskId={task.taskId} />}
                {tab === "evidence" && <EvidenceTab taskId={task.taskId} />}
                {tab === "skills" && <SkillsTab taskId={task.taskId} />}
                {tab === "history" && <HistoryTab taskId={task.taskId} />}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Assignees</div>
                  {task.assignees.length === 0 ? (
                    <p className="text-xs text-gray-400">Unassigned — chưa có API gán trực tiếp trong MVP này.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {task.assignees.map((a) => (
                        <span key={a.userId} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">
                          {a.userName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Deadline</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock size={14} className="text-gray-400" />
                    {formatDate(task.deadline)}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Priority</div>
                  <select
                    defaultValue={task.priority ?? "medium"}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className="w-full text-xs font-semibold text-gray-800 border border-gray-200 rounded-lg px-2.5 py-2 outline-none focus:border-[#1A237E] bg-white capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</div>
                  <select
                    defaultValue={task.status ?? "Todo"}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    className="w-full text-xs font-semibold text-gray-800 border border-gray-200 rounded-lg px-2.5 py-2 outline-none focus:border-[#1A237E] bg-white"
                  >
                    {statusOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Risk Level</div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">{task.riskLevel ?? "—"}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
