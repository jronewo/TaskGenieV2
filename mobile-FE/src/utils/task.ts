import { colors } from '../theme';
import type { TaskDetail } from '../api';

/** The three statuses the backend persists — see Task.UpdateProgress. */
export const TASK_STATUSES = ['Todo', 'InProgress', 'Done'] as const;
export type KnownStatus = (typeof TASK_STATUSES)[number];

export const STATUS_LABELS: Record<KnownStatus, string> = {
  Todo: 'To Do',
  InProgress: 'In Progress',
  Done: 'Done',
};

export function statusLabel(status: string | null | undefined): string {
  return STATUS_LABELS[(status ?? 'Todo') as KnownStatus] ?? status ?? 'To Do';
}

interface PriorityStyle {
  stripe: string;
  badgeBg: string;
  badgeColor: string;
}

const PRIORITY_STYLES: Record<string, PriorityStyle> = {
  High: { stripe: colors.red, badgeBg: 'rgba(239,68,68,0.12)', badgeColor: colors.red },
  Medium: { stripe: colors.yellow, badgeBg: 'rgba(245,158,11,0.12)', badgeColor: colors.yellow },
  Low: { stripe: colors.green, badgeBg: 'rgba(16,185,129,0.12)', badgeColor: colors.green },
};

export function priorityStyle(priority: string | null | undefined): PriorityStyle {
  return PRIORITY_STYLES[priority ?? ''] ?? PRIORITY_STYLES.Medium;
}

/**
 * The backend stores a coarse LOW/MEDIUM/HIGH band, but the UI shows a
 * percentage. Map the band to the midpoint of its range.
 */
export function riskPercent(riskLevel: string | null | undefined): number {
  switch ((riskLevel ?? '').toUpperCase()) {
    case 'HIGH':
      return 85;
    case 'MEDIUM':
      return 55;
    case 'LOW':
      return 20;
    default:
      return 0;
  }
}

export function isAtRisk(task: TaskDetail): boolean {
  return (task.riskLevel ?? '').toUpperCase() === 'HIGH';
}

/** "2026-05-27" → "May 27". Deadlines arrive as DateOnly, without a timezone. */
export function formatDeadline(deadline: string | null | undefined): string {
  if (!deadline) return 'No due date';
  const [y, m, d] = deadline.split('-').map(Number);
  if (!y || !m || !d) return deadline;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** ISO timestamp → "5 min ago" / "2 hr ago" / "Yesterday" / "May 27". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} hr ago`;
  if (minutes < 60 * 48) return 'Yesterday';
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Days until the deadline; negative when overdue. Null when there is none. */
export function daysUntilDeadline(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const [y, m, d] = deadline.split('-').map(Number);
  if (!y || !m || !d) return null;

  const today = new Date();
  const startOfToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - startOfToday) / 86400000);
}

export function primaryAssignee(task: TaskDetail) {
  return task.assignees[0] ?? null;
}
