/**
 * Jira-style conventions for the task UI: issue keys, workflow statuses and priority ranks.
 *
 * The issue key is derived on the client from the project name plus the task's own id. There is no
 * key column in the database — inventing one would mean a migration and a sequence per project,
 * and every key here still resolves to exactly one task id, which is what the UI needs.
 */

export type WorkflowStatus = "Todo" | "InProgress" | "Done" | "Backlog";

export const WORKFLOW: { id: WorkflowStatus; label: string; category: "todo" | "progress" | "done" }[] = [
  { id: "Backlog", label: "BACKLOG", category: "todo" },
  { id: "Todo", label: "TO DO", category: "todo" },
  { id: "InProgress", label: "IN PROGRESS", category: "progress" },
  { id: "InReview", label: "IN REVIEW", category: "progress" },
  { id: "Done", label: "DONE", category: "done" },
];

/** Lozenge colours follow Jira's status categories: grey → blue → green. Backlog is red — it only
 *  exists because of a bug, and that needs to read differently from a routine "not started yet". */
export const STATUS_LOZENGE: Record<string, string> = {
  Backlog: "bg-red-100 text-red-800",
  Todo: "bg-gray-200 text-gray-700",
  InProgress: "bg-blue-100 text-blue-800",
  InReview: "bg-amber-100 text-amber-800",
  Done: "bg-emerald-100 text-emerald-800",
};

/**
 * Progress implied by a column drop. Todo and Done are absolute; the middle columns — and Backlog —
 * keep whatever the task already reported, because a bug found at 80% doesn't erase that work.
 */
export function progressFor(status: WorkflowStatus, current?: number | null): number {
  if (status === "Done") return 100;
  if (status === "Todo") return 0;
  return current ?? 0;
}

export function statusLabel(status?: string | null): string {
  return WORKFLOW.find((s) => s.id === status)?.label ?? "TO DO";
}

/** Highest → Lowest, matching Jira's five ranks; the API stores the middle three. */
export const PRIORITY_RANK: Record<string, { label: string; color: string; direction: "up" | "down" | "flat" }> = {
  Critical: { label: "Highest", color: "text-red-600", direction: "up" },
  High: { label: "High", color: "text-red-500", direction: "up" },
  Medium: { label: "Medium", color: "text-amber-500", direction: "flat" },
  Low: { label: "Low", color: "text-blue-500", direction: "down" },
  Lowest: { label: "Lowest", color: "text-blue-400", direction: "down" },
};

export function priorityRank(priority?: string | null) {
  return PRIORITY_RANK[priority ?? "Medium"] ?? PRIORITY_RANK.Medium;
}

/**
 * "Website Revamp" → "WR", "Mobile" → "MOB", "TaskGenie API v2" → "TAV".
 * Falls back to "TASK" so a key is always renderable.
 */
export function projectKey(projectName?: string | null): string {
  if (!projectName) return "TASK";
  const words = projectName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "TASK";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 4)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function issueKey(projectName: string | null | undefined, taskId: number): string {
  return `${projectKey(projectName)}-${taskId}`;
}

/**
 * Issue type is inferred, not stored: the API has no type column, but a board where everything
 * looks identical reads nothing like Jira. Title keywords are the only honest signal available,
 * and the default stays "Task".
 */
export type IssueType = "Bug" | "Story" | "Task";

export function issueType(task: { title?: string | null; riskLevel?: string | null }): IssueType {
  const title = (task.title ?? "").toLowerCase();
  if (/\b(bug|fix|defect|error|crash|broken)\b/.test(title)) return "Bug";
  if (/\b(story|feature|as a user|epic)\b/.test(title)) return "Story";
  return "Task";
}

export const ISSUE_TYPE_STYLE: Record<IssueType, { cls: string; title: string }> = {
  Bug: { cls: "bg-red-500", title: "Bug" },
  Story: { cls: "bg-emerald-500", title: "Story" },
  Task: { cls: "bg-blue-500", title: "Task" },
};

/** Initials for an avatar chip, e.g. "Team Lead" → "TL". */
export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
