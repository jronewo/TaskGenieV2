import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  MessageSquare,
  Send,
  Trash2,
  Loader2,
  AlertTriangle,
  Save,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Equal,
  Bug,
  Bookmark,
  SquareCheck,
  ImagePlus,
} from "lucide-react";
import { taskApi, commentApi, TaskDetailDto, TaskCommentDto, TaskStatusValue } from "../services/taskApi";
import { ApiError } from "../services/apiClient";
import { useConfirm } from "./ConfirmDialog";
import { AiAssignmentPanel } from "./AiAssignmentPanel";
import { ManualAssignPanel } from "./ManualAssignPanel";
import { MoveToBacklogModal } from "./MoveToBacklogModal";
import { ForceCompleteModal } from "./ForceCompleteModal";
import { AiTaskInsights } from "./AiTaskInsights";
import { TaskPlanningPanel } from "./TaskPlanningPanel";
import { useAuth } from "../auth/AuthContext";
import { userApi } from "../services/userApi";
import {
  ISSUE_TYPE_STYLE,
  STATUS_LOZENGE,
  WORKFLOW,
  initials,
  issueKey,
  issueType,
  priorityRank,
  progressFor,
  statusLabel,
} from "../lib/jira";

const TYPE_ICON = { Bug, Story: Bookmark, Task: SquareCheck } as const;

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to change this task.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

/** One labelled row in the right-hand Details panel. */
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[84px_1fr] items-center gap-2 py-1.5">
    <span className="text-[10px] font-medium text-gray-500">{label}</span>
    <div className="min-w-0 text-[11px] text-gray-900">{children}</div>
  </div>
);

interface TaskDetailModalProps {
  taskId: number | null;
  /** Used for the breadcrumb and the issue key. */
  projectName?: string | null;
  /** Only a Lead (creator/org owner/team leader) may sign a task off as Done. */
  canManageTasks?: boolean;
  onClose: () => void;
  /** Called after any successful mutation so the board can refetch. */
  onChanged?: () => void;
}

/**
 * Jira-style issue view: breadcrumb and key at the top, the work itself on the left, and a Details
 * panel on the right holding the workflow transition and every field.
 */
export const TaskDetailModal = ({ taskId, projectName, canManageTasks = false, onClose, onChanged }: TaskDetailModalProps) => {
  const { user } = useAuth();

  const confirm = useConfirm();

  const [task, setTask] = useState<TaskDetailDto | null>(null);
  const [comments, setComments] = useState<TaskCommentDto[]>([]);
  const [draft, setDraft] = useState("");
  // Held until the comment is posted, so an image and its text arrive as one comment.
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{ logId: number; note?: string | null; createdAt?: string | null }[]>([]);

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [showBacklogModal, setShowBacklogModal] = useState(false);
  const [showForceCompleteModal, setShowForceCompleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (taskId == null) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, commentList, logList] = await Promise.all([
        taskApi.getById(taskId),
        commentApi.byTask(taskId).catch(() => [] as TaskCommentDto[]),
        taskApi.progressLogs(taskId).catch(() => []),
      ]);
      setTask(detail);
      setProgress(detail.progress ?? 0);
      setComments(commentList);
      setLogs(logList);
    } catch (err) {
      setError(errorMessage(err));
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId != null) void load();
    else {
      setTask(null);
      setComments([]);
      setError(null);
    }
  }, [taskId, load]);

  const run = async (key: string, action: () => Promise<void>) => {
    if (busy) return; // double-submit guard
    setBusy(key);
    setError(null);
    try {
      await action();
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = (status: TaskStatusValue) =>
    task &&
    run("status", async () => {
      const updated = await taskApi.updateProgress(task.taskId, {
        status,
        progress: progressFor(status, task.progress),
      });
      setTask(updated);
      setProgress(updated.progress ?? 0);
    });

  const saveProgress = () =>
    task &&
    run("progress", async () => {
      const updated = await taskApi.updateProgress(task.taskId, { progress });
      setTask(updated);
    });

  const addComment = () =>
    task &&
    run("comment", async () => {
      await commentApi.create(task.taskId, draft.trim(), draftImage);
      setDraft("");
      setDraftImage(null);
      setComments(await commentApi.byTask(task.taskId));
    });

  /** Uploads immediately so the author sees the picture before committing to the comment. */
  const attachImage = (file: File) =>
    task &&
    run("upload", async () => {
      const { imageUrl } = await userApi.uploadImage(file);
      setDraftImage(imageUrl);
    });

  const deleteComment = async (commentId: number) => {
    if (!(await confirm({
      title: "Xóa bình luận này?",
      description: "Bình luận sẽ bị gỡ khỏi task và không khôi phục được.",
      confirmLabel: "Xóa",
      tone: "danger",
    }))) return;
    void run(`del-${commentId}`, async () => {
      await commentApi.remove(commentId);
      if (task) setComments(await commentApi.byTask(task.taskId));
    });
  };

  const type = task ? issueType(task) : "Task";
  const TypeIcon = TYPE_ICON[type];
  const rank = priorityRank(task?.priority);
  const PriorityIcon = rank.direction === "up" ? ArrowUp : rank.direction === "down" ? ArrowDown : Equal;
  const key = task ? issueKey(projectName, task.taskId) : "";

  return (
    <>
    <AnimatePresence>
      {taskId != null && (
        <motion.div
          // z-60, not z-50: this opens on top of the dependency diagram, which stays behind it so
          // the reader keeps their place in the graph. Relying on DOM order alone would break the
          // moment either modal moved in the tree.
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Task detail"
        >
          <motion.div
            className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-lg bg-white"
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
          >
            <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-2.5">
              <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[11px] text-gray-500">
                <span className="truncate">{projectName ?? "Project"}</span>
                <ChevronRight size={11} aria-hidden className="shrink-0" />
                {task && (
                  <span
                    className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm ${
                      task.taskTypeColor ? "" : ISSUE_TYPE_STYLE[type].cls
                    }`}
                    style={task.taskTypeColor ? { background: task.taskTypeColor } : undefined}
                    aria-label={`Issue type: ${task.taskTypeName ?? type}`}
                  >
                    <TypeIcon size={9} className="text-white" aria-hidden />
                  </span>
                )}
                <span className="font-medium text-gray-700">{key}</span>
              </nav>
              <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 text-gray-400 hover:text-gray-700">
                <X size={16} aria-hidden />
              </button>
            </header>

            {error && (
              <div role="alert" className="mx-5 mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center gap-2 p-10 text-xs text-gray-500">
                <Loader2 size={14} className="animate-spin" aria-hidden /> Loading task…
              </div>
            ) : task ? (
              <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                {/* Left: the work itself */}
                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  <h2 className="text-base font-semibold leading-snug text-gray-900">{task.title ?? "Task"}</h2>

                  <section>
                    <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Description</h3>
                    {task.description ? (
                      <p className="whitespace-pre-line text-xs leading-relaxed text-gray-700">{task.description}</p>
                    ) : (
                      <p className="text-xs text-gray-400">No description.</p>
                    )}
                  </section>

                  <TaskPlanningPanel
                    task={task}
                    onChanged={() => {
                      void load();
                      onChanged?.();
                    }}
                  />

                  <AiTaskInsights
                    task={task}
                    onChanged={() => {
                      void load();
                      onChanged?.();
                    }}
                  />

                  {/* AI assignment — the product's core feature, offered where the work is. */}
                  {task.projectId != null && (
                    <AiAssignmentPanel
                      taskId={task.taskId}
                      projectId={task.projectId}
                      onAssigned={() => {
                        void load();
                        onChanged?.();
                      }}
                    />
                  )}

                  {/* …and the plain way, for when the leader already knows who is taking it. */}
                  {task.projectId != null && (
                    <ManualAssignPanel
                      taskId={task.taskId}
                      projectId={task.projectId}
                      assignees={task.assignees}
                      onAssigned={() => {
                        void load();
                        onChanged?.();
                      }}
                    />
                  )}

                  <section>
                    <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      <MessageSquare size={11} aria-hidden /> Comments ({comments.length})
                    </h3>

                    {draftImage && (
                      <div className="mb-2 flex items-center gap-2 rounded-md border border-gray-200 p-2">
                        <img src={draftImage} alt="Ảnh đính kèm" className="h-14 w-14 rounded object-cover" />
                        <span className="flex-1 text-[10px] text-gray-500">Ảnh sẽ gửi kèm bình luận này.</span>
                        <button
                          type="button"
                          onClick={() => setDraftImage(null)}
                          aria-label="Bỏ ảnh đính kèm"
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <X size={12} aria-hidden />
                        </button>
                      </div>
                    )}

                    <div className="mb-3 flex gap-2">
                      <label
                        htmlFor="comment-image"
                        title="Đính kèm ảnh"
                        className="flex cursor-pointer items-center rounded-md border border-gray-200 px-2 text-gray-500 hover:bg-gray-50"
                      >
                        {busy === "upload" ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <ImagePlus size={13} aria-hidden />}
                        <span className="sr-only">Đính kèm ảnh</span>
                      </label>
                      <input
                        id="comment-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void attachImage(file);
                          e.target.value = "";
                        }}
                      />
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && draft.trim() && addComment()}
                        placeholder="Write a comment…"
                        aria-label="New comment"
                        className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#1A237E]"
                      />
                      <button
                        type="button"
                        onClick={addComment}
                        disabled={(!draft.trim() && !draftImage) || busy === "comment"}
                        aria-label="Post comment"
                        className="rounded-md bg-[#1A237E] px-3 text-white disabled:opacity-40"
                      >
                        {busy === "comment" ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Send size={13} aria-hidden />}
                      </button>
                    </div>

                    {comments.length === 0 ? (
                      <p className="py-4 text-center text-[10px] text-gray-400">No comments yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {comments.map((c) => {
                          const mine = c.userId === user?.userId;
                          return (
                          <li
                            key={c.commentId}
                            className={`flex gap-2.5 rounded-lg border p-2.5 ${
                              mine ? "border-blue-100 bg-blue-50" : "border-gray-200 bg-white"
                            }`}
                          >
                            {/* The author is the first thing read, so the avatar carries the real
                                picture when there is one rather than initials for everybody. */}
                            {c.userAvatar ? (
                              <img
                                src={c.userAvatar}
                                alt=""
                                className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A237E] text-[9px] font-semibold text-white">
                                {initials(c.userName ?? `U${c.userId}`)}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-gray-900">
                                  {c.userName ?? `User ${c.userId}`}
                                  {mine && (
                                    <span className="rounded-full bg-[#1A237E] px-1.5 py-0.5 text-[8px] font-medium text-white">
                                      Bạn
                                    </span>
                                  )}
                                  {c.createdAt && (
                                    <span className="font-normal text-[9px] text-gray-500">
                                      {c.createdAt.slice(0, 16).replace("T", " ")}
                                    </span>
                                  )}
                                </p>
                                {mine && (
                                  <button
                                    type="button"
                                    onClick={() => void deleteComment(c.commentId)}
                                    disabled={busy === `del-${c.commentId}`}
                                    aria-label="Delete comment"
                                    className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                  >
                                    <Trash2 size={12} aria-hidden />
                                  </button>
                                )}
                              </div>
                              {c.content && (
                                <p className="mt-0.5 text-xs leading-relaxed whitespace-pre-line text-gray-700">
                                  {c.content}
                                </p>
                              )}
                              {c.imageUrl && (
                                <a href={c.imageUrl} target="_blank" rel="noreferrer" className="mt-1.5 block">
                                  <img
                                    src={c.imageUrl}
                                    alt="Ảnh đính kèm"
                                    className="max-h-52 rounded-md border border-gray-200 object-cover"
                                  />
                                </a>
                              )}
                            </div>
                          </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </div>

                {/* Right: workflow transition + Details panel */}
                <aside className="shrink-0 space-y-3 overflow-y-auto border-t border-gray-200 p-5 lg:w-80 lg:border-l lg:border-t-0">
                  <div className="flex items-center gap-2">
                    <label htmlFor="task-status" className="sr-only">
                      Status
                    </label>
                    <select
                      id="task-status"
                      value={task.status ?? "Todo"}
                      onChange={(e) => {
                        const next = e.target.value as TaskStatusValue;
                        if (next === "Backlog") {
                          setShowBacklogModal(true);
                        } else if (next === "Done") {
                          const openDependencies = task.dependencies.filter(
                            (d) => (d.status ?? "").toUpperCase() !== "DONE"
                          );
                          if (openDependencies.length > 0) setShowForceCompleteModal(true);
                          else changeStatus(next);
                        } else {
                          changeStatus(next);
                        }
                      }}
                      disabled={busy === "status"}
                      className={`rounded px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide disabled:opacity-50 ${
                        STATUS_LOZENGE[task.status ?? "Todo"] ?? STATUS_LOZENGE.Todo
                      }`}
                    >
                      {WORKFLOW.filter(
                        (s) => s.id !== "Done" || task.status === "Done" || canManageTasks
                      ).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    {busy === "status" && <Loader2 size={13} className="animate-spin text-gray-400" aria-hidden />}
                  </div>
                  <p className="text-[10px] text-gray-400">
                    A task can't move to Done while a blocker is still open — the API enforces that.
                  </p>

                  <div className="rounded-md border border-gray-200">
                    <h3 className="border-b border-gray-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Details
                    </h3>
                    <div className="divide-y divide-gray-100 px-3 py-1">
                      <Field label="Type">
                        {/* The stored type wins; the title heuristic is only for tasks created
                            before types existed, or left unclassified on purpose. */}
                        {task.taskTypeName ? (
                          <span
                            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                            style={{ background: task.taskTypeColor ?? "#64748B" }}
                          >
                            {task.taskTypeName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm ${ISSUE_TYPE_STYLE[type].cls}`}
                              aria-hidden
                            >
                              <TypeIcon size={9} className="text-white" />
                            </span>
                            {type}
                          </span>
                        )}
                      </Field>
                      <Field label="Status">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            STATUS_LOZENGE[task.status ?? "Todo"] ?? STATUS_LOZENGE.Todo
                          }`}
                        >
                          {statusLabel(task.status)}
                        </span>
                      </Field>
                      <Field label="Priority">
                        <span className="inline-flex items-center gap-1">
                          <PriorityIcon size={12} className={rank.color} aria-hidden />
                          {rank.label}
                        </span>
                      </Field>
                      <Field label="Assignee">
                        {task.assignees.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5">
                            {task.assignees[0].avatar ? (
                              <img
                                src={task.assignees[0].avatar}
                                alt={task.assignees[0].userName ?? `User ${task.assignees[0].userId}`}
                                className="h-5 w-5 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1A237E] text-[8px] font-semibold text-white">
                                {initials(task.assignees[0].userName ?? `U${task.assignees[0].userId}`)}
                              </span>
                            )}
                            <span className="truncate">
                              {task.assignees[0].userName ?? `User ${task.assignees[0].userId}`}
                              {task.assignees.length > 1 && ` +${task.assignees.length - 1}`}
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </Field>
                      <Field label="Risk">{task.riskLevel ?? "—"}</Field>
                      <Field label="Due">{task.deadline ? task.deadline.slice(0, 10) : "—"}</Field>
                      <Field label="Estimate">
                        {task.estimatedTime
                          ? `${task.estimatedTime}h`
                          : task.aiEstimatedTime
                            ? `${task.aiEstimatedTime}h (AI)`
                            : "—"}
                      </Field>
                      <Field label="Difficulty">{task.difficulty ? `${task.difficulty}/5` : "—"}</Field>
                      <Field label="Logged">{task.actualTime ? `${task.actualTime}h` : "—"}</Field>
                    </div>
                  </div>

                  {logs.some((l) => (l.note ?? "").trim().length > 0) && (
                    <div className="rounded-md border border-gray-200">
                      <h3 className="border-b border-gray-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        Activity notes
                      </h3>
                      <ul className="divide-y divide-gray-100 px-3 py-1">
                        {logs
                          .filter((l) => (l.note ?? "").trim().length > 0)
                          .map((l) => (
                            <li key={l.logId} className="py-2 text-[11px] text-gray-700">
                              <p className="whitespace-pre-line">{l.note}</p>
                              {l.createdAt && (
                                <p className="mt-0.5 text-[10px] text-gray-400">
                                  {new Date(l.createdAt).toLocaleString()}
                                </p>
                              )}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-md border border-gray-200 p-3">
                    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Progress</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={progress}
                        onChange={(e) => setProgress(Number(e.target.value))}
                        aria-label="Progress percentage"
                        className="flex-1"
                      />
                      <span className="w-9 text-right text-[11px] text-gray-600">{progress}%</span>
                    </div>
                    <button
                      type="button"
                      onClick={saveProgress}
                      disabled={busy === "progress" || progress === (task.progress ?? 0)}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] disabled:opacity-40"
                    >
                      {busy === "progress" ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Save size={12} aria-hidden />}
                      Save progress
                    </button>
                  </div>
                </aside>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    {showBacklogModal && task && (
      <MoveToBacklogModal
        task={task}
        onClose={() => setShowBacklogModal(false)}
        onMoved={(updated) => {
          setTask(updated);
          setProgress(updated.progress ?? 0);
          setShowBacklogModal(false);
          void taskApi.progressLogs(updated.taskId).then(setLogs).catch(() => {});
          onChanged?.();
        }}
      />
    )}
    {showForceCompleteModal && task && (
      <ForceCompleteModal
        task={task}
        openDependencies={task.dependencies.filter((d) => (d.status ?? "").toUpperCase() !== "DONE")}
        onClose={() => setShowForceCompleteModal(false)}
        onMoved={(updated) => {
          setTask(updated);
          setProgress(updated.progress ?? 0);
          setShowForceCompleteModal(false);
          onChanged?.();
        }}
      />
    )}
    </>
  );
};
