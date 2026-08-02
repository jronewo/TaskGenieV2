import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Trash2,
  MessageSquare,
  UserPlus,
  ShieldAlert,
  ClipboardCheck,
  X,
  ArrowLeft,
  ExternalLink,
  Eye,
  FolderKanban,
} from "lucide-react";
import { notificationApi, NotificationDto, invitationApi, InvitationDto } from "../services/notificationApi";
import { ApiError } from "../services/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "./ConfirmDialog";
import { usePreferences } from "../settings/PreferencesContext";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "That invitation is no longer available.";
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to perform this action.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/** The detail pane has room for the real timestamp, which the list rows do not. */
function absoluteTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "full", timeStyle: "short" });
}

/** Types the backend raises for genuinely time-critical events. */
const URGENT_TYPES = new Set(["RISK", "TASK_RISK", "DEADLINE", "BLOCKER"]);

const TYPE_ICON: Record<string, { Icon: typeof Bell; cls: string }> = {
  COMMENT: { Icon: MessageSquare, cls: "text-blue-500" },
  TASK_ASSIGNED: { Icon: ClipboardCheck, cls: "text-[#1A237E]" },
  TASK_RISK: { Icon: ShieldAlert, cls: "text-red-500" },
  RISK: { Icon: ShieldAlert, cls: "text-red-500" },
  TASK_REVIEW: { Icon: Eye, cls: "text-amber-500" },
  INVITATION: { Icon: UserPlus, cls: "text-emerald-600" },
};

const TYPE_LABEL: Record<string, string> = {
  COMMENT: "Bình luận",
  TASK_ASSIGNED: "Giao việc",
  TASK_REVIEW: "Chờ review",
  TASK_RISK: "Cảnh báo rủi ro",
  RISK: "Cảnh báo rủi ro",
  INVITATION: "Lời mời",
};

/**
 * A row in the left pane. Pending invitations get a synthetic row so an invitation that arrived
 * before the account existed — and therefore has no notification record — is still answerable.
 */
type Row =
  | { kind: "notification"; id: string; notification: NotificationDto }
  | { kind: "invitation"; id: string; invitation: InvitationDto };

interface Props {
  /** Lets the shell refresh its unread badge after the list mutates. */
  onUnreadChange?: (count: number) => void;
  /** Opens a task the notification refers to. */
  onOpenTask?: (taskId: number) => void;
  /** Navigates to the board of the project the notification concerns. */
  onOpenProject?: (projectId: number) => void;
  /** Bumped by the shell when a realtime push arrives, so this list refetches. */
  refreshToken?: number;
}

/**
 * Notification centre, laid out as a reading pane: the feed on the left, the selected item in full
 * on the right. The single-column version truncated long messages and buried the accept/decline
 * buttons of an invitation inside a list row, where they competed with mark-read and delete.
 */
export const NotificationsCenter = ({ onUnreadChange, onOpenTask, onOpenProject, refreshToken }: Props) => {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { t } = usePreferences();
  const userId = user?.userId ?? null;
  const email = user?.email ?? null;

  const [items, setItems] = useState<NotificationDto[]>([]);
  const [invitations, setInvitations] = useState<InvitationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Held in a ref so an inline parent callback can't change this effect's identity every
  // render — that turned the initial fetch into an infinite reload loop.
  const onUnreadChangeRef = useRef(onUnreadChange);
  useEffect(() => {
    onUnreadChangeRef.current = onUnreadChange;
  }, [onUnreadChange]);

  const load = useCallback(async () => {
    if (userId == null) return;
    setLoading(true);
    setError(null);
    try {
      const list = await notificationApi.list(userId);
      setItems(list);
      onUnreadChangeRef.current?.(list.filter((n) => !n.isRead).length);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }

    // Pending invitations are read separately: a notification row only exists when the invited
    // address already had an account, but the invitation itself is the thing being decided.
    if (email) {
      try {
        const mine = await invitationApi.mine(email);
        setInvitations(mine.filter((i) => (i.status ?? "Pending") === "Pending"));
      } catch {
        setInvitations([]);
      }
    }
  }, [userId, email]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const run = async (key: string, action: () => Promise<void>, successMessage?: string) => {
    if (busy) return; // double-submit guard
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (successMessage) setNotice(successMessage);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const respond = (invitation: InvitationDto, status: "Accepted" | "Rejected") =>
    run(
      `inv-${invitation.invitationId}`,
      () => invitationApi.respond(invitation.invitationId, status).then(() => undefined),
      status === "Accepted"
        ? `You joined ${invitation.teamName ?? "the team"}.`
        : "Invitation declined."
    );

  const rows = useMemo<Row[]>(() => {
    const notified = new Set(
      items
        .filter((n) => (n.referenceType ?? "").toUpperCase() === "INVITATION" && n.referenceId != null)
        .map((n) => n.referenceId!)
    );
    const orphans: Row[] = invitations
      .filter((inv) => !notified.has(inv.invitationId))
      .map((inv) => ({ kind: "invitation", id: `inv-${inv.invitationId}`, invitation: inv }));

    return [
      ...orphans,
      ...items.map<Row>((n) => ({ kind: "notification", id: `n-${n.notificationId}`, notification: n })),
    ];
  }, [items, invitations]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  /** Opening an item is what marks it read — the same gesture email clients use. */
  const select = (row: Row) => {
    setSelectedId(row.id);
    setNotice(null);
    if (row.kind === "notification" && !row.notification.isRead) {
      void run(`read-${row.notification.notificationId}`, () =>
        notificationApi.markRead(row.notification.notificationId)
      );
    }
  };

  const unread = items.filter((n) => !n.isRead).length;

  if (userId == null) return null;

  const rowTitle = (row: Row) =>
    row.kind === "notification"
      ? row.notification.title ?? "Notification"
      : `Lời mời tham gia ${row.invitation.teamName ?? `team #${row.invitation.teamId}`}`;

  return (
    <div className="tg-notify flex h-full min-h-0 flex-col lg:flex-row">
      {/* ── Feed ─────────────────────────────────────────────────────────────────────── */}
      <aside
        aria-label="Notification list"
        className={`flex min-h-0 w-full flex-col border-gray-200 lg:w-[360px] lg:shrink-0 lg:border-r ${
          selected ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t("notif.title")}</h2>
            <p className="mt-0.5 text-[10px] text-gray-500">
              {loading ? t("common.loading") : unread > 0 ? `${unread} ${t("notif.unread")}` : t("notif.allRead")}
            </p>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => run("all", () => notificationApi.markAllRead(userId))}
              disabled={busy === "all"}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === "all" ? (
                <Loader2 size={12} className="animate-spin" aria-hidden />
              ) : (
                <CheckCheck size={12} aria-hidden />
              )}
              {t("notif.markAllRead")}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-4 py-10 text-xs text-gray-500">
            <Loader2 size={14} className="animate-spin" aria-hidden /> {t("common.loading")}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Bell size={24} className="mx-auto mb-2 text-gray-300" aria-hidden />
            <p className="text-xs text-gray-500">{t("notif.empty")}</p>
            <p className="mt-0.5 text-[10px] text-gray-400">
              You'll be told here when a task is assigned to you, someone comments, or the AI flags a risk.
            </p>
          </div>
        ) : (
          <ul className="min-h-0 flex-1 overflow-y-auto p-2">
            {rows.map((row) => {
              const active = row.id === selectedId;
              const isUnread = row.kind === "invitation" || !row.notification.isRead;
              const type =
                row.kind === "invitation" ? "INVITATION" : (row.notification.type ?? "").toUpperCase();
              const urgent = isUnread && URGENT_TYPES.has(type);
              const { Icon, cls } = TYPE_ICON[type] ?? { Icon: Bell, cls: "text-gray-400" };

              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => select(row)}
                    aria-current={active ? "true" : undefined}
                    className={`mb-1 flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "border-[#1A237E] bg-gray-50"
                        : urgent
                          ? "border-red-100 bg-red-50 hover:bg-red-50"
                          : isUnread
                            ? "border-blue-100 bg-blue-50 hover:bg-gray-50"
                            : "border-transparent bg-white hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={14} className={`mt-0.5 shrink-0 ${cls}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-xs text-gray-900 ${isUnread ? "font-semibold" : "font-medium"}`}
                      >
                        {rowTitle(row)}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-gray-600">
                        {row.kind === "notification"
                          ? row.notification.message ?? ""
                          : "Chờ bạn phản hồi."}
                      </span>
                      <span className="mt-1 block text-[10px] text-gray-500">
                        {row.kind === "notification" ? relativeTime(row.notification.createdAt) : "Đang chờ"}
                      </span>
                    </span>
                    {isUnread && (
                      <span
                        aria-label="Unread"
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1A237E]"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ── Reading pane ─────────────────────────────────────────────────────────────── */}
      <section
        aria-label="Notification detail"
        className={`min-h-0 min-w-0 flex-1 flex-col ${selected ? "flex" : "hidden lg:flex"}`}
      >
        {error && (
          <div
            role="alert"
            className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="mx-4 mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
          >
            {notice}
          </div>
        )}

        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <Bell size={28} className="mb-2 text-gray-300" aria-hidden />
            <p className="text-xs text-gray-500">{t("notif.select")}</p>
          </div>
        ) : (
          <DetailPane
            row={selected}
            invitation={
              selected.kind === "invitation"
                ? selected.invitation
                : invitations.find((i) => i.invitationId === selected.notification.referenceId) ?? null
            }
            busy={busy}
            onBack={() => setSelectedId(null)}
            onRespond={respond}
            onOpenTask={onOpenTask}
            onOpenProject={onOpenProject}
            onDelete={async (id) => {
              const ok = await confirm({
                title: "Xóa thông báo này?",
                description: "Thông báo sẽ bị gỡ khỏi danh sách của bạn.",
                confirmLabel: "Xóa",
                tone: "danger",
              });
              if (!ok) return;
              setSelectedId(null);
              void run(`del-${id}`, () => notificationApi.remove(id));
            }}
            onMarkRead={(id) => run(`read-${id}`, () => notificationApi.markRead(id))}
          />
        )}
      </section>
    </div>
  );
};

interface DetailProps {
  row: Row;
  /** The still-pending invitation this row refers to, if it has not been answered yet. */
  invitation: InvitationDto | null;
  busy: string | null;
  onBack: () => void;
  onRespond: (invitation: InvitationDto, status: "Accepted" | "Rejected") => void;
  onOpenTask?: (taskId: number) => void;
  onOpenProject?: (projectId: number) => void;
  onDelete: (notificationId: number) => void | Promise<void>;
  onMarkRead: (notificationId: number) => void;
}

const DetailPane = ({
  row,
  invitation,
  busy,
  onBack,
  onRespond,
  onOpenTask,
  onOpenProject,
  onDelete,
  onMarkRead,
}: DetailProps) => {
  const notification = row.kind === "notification" ? row.notification : null;
  const type = notification ? (notification.type ?? "").toUpperCase() : "INVITATION";
  const { Icon, cls } = TYPE_ICON[type] ?? { Icon: Bell, cls: "text-gray-400" };
  const opensTask = notification?.referenceType === "TASK" && notification.referenceId != null && onOpenTask;
  const invBusy = invitation ? busy === `inv-${invitation.invitationId}` : false;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start gap-3 border-b border-gray-200 px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to list"
          className="rounded p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <ArrowLeft size={16} aria-hidden />
        </button>
        <Icon size={18} className={`mt-0.5 shrink-0 ${cls}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900">
            {notification
              ? notification.title ?? "Notification"
              : `Lời mời tham gia ${row.kind === "invitation" ? row.invitation.teamName ?? `team #${row.invitation.teamId}` : ""}`}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              {TYPE_LABEL[type] ?? "Thông báo"}
            </span>
            <span className="text-[10px] text-gray-500">
              {notification ? absoluteTime(notification.createdAt) : "Đang chờ phản hồi"}
            </span>
            {notification?.projectName && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                <FolderKanban size={10} aria-hidden /> {notification.projectName}
              </span>
            )}
          </div>
        </div>
        {notification && (
          <button
            type="button"
            onClick={() => void onDelete(notification.notificationId)}
            disabled={busy === `del-${notification.notificationId}`}
            aria-label={`Delete "${notification.title ?? "notification"}"`}
            className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
          >
            <Trash2 size={14} aria-hidden />
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="text-xs leading-relaxed whitespace-pre-line text-gray-700">
          {notification?.message ?? "Bạn được mời tham gia nhóm này. Chấp nhận để bắt đầu nhận công việc."}
        </p>

        {/* A comment that was mostly a screenshot read as an empty notification without this. */}
        {notification?.imageUrl && (
          <a href={notification.imageUrl} target="_blank" rel="noreferrer" className="mt-3 block">
            <img
              src={notification.imageUrl}
              alt="Ảnh đính kèm trong bình luận"
              className="max-h-64 rounded-md border border-gray-200 object-cover"
            />
          </a>
        )}

        {/* Deciding on the invitation is the whole point of the row, so it gets the primary action. */}
        {invitation && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs text-gray-800">
              Tham gia <span className="font-semibold">{invitation.teamName ?? `team #${invitation.teamId}`}</span>?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onRespond(invitation, "Accepted")}
                disabled={invBusy}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-3.5 py-2 text-[11px] font-medium text-white hover:bg-[#0D1757] disabled:opacity-50"
              >
                {invBusy ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Check size={12} aria-hidden />}
                Accept
              </button>
              <button
                type="button"
                onClick={() => onRespond(invitation, "Rejected")}
                disabled={invBusy}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3.5 py-2 text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <X size={12} aria-hidden /> Decline
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {opensTask && (
            <button
              type="button"
              onClick={() => onOpenTask!(notification!.referenceId!)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#1A237E] hover:bg-gray-50"
            >
              <ExternalLink size={12} aria-hidden /> Open task
            </button>
          )}
          {notification?.projectId != null && onOpenProject && (
            <button
              type="button"
              onClick={() => onOpenProject(notification.projectId!)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-[#1A237E] hover:bg-gray-50"
            >
              <FolderKanban size={12} aria-hidden /> Mở dự án
            </button>
          )}
          {notification && !notification.isRead && (
            <button
              type="button"
              onClick={() => onMarkRead(notification.notificationId)}
              disabled={busy === `read-${notification.notificationId}`}
              aria-label={`Mark "${notification.title ?? "notification"}" as read`}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Check size={12} aria-hidden /> Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
