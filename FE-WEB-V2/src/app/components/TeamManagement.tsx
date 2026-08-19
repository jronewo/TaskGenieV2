import React, { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, Plus, UserPlus, Trash2, Loader2, ShieldCheck, X } from "lucide-react";
import { invitationApi } from "../services/notificationApi";
import { teamApi, TeamDto } from "../services/teamApi";
import { ApiError } from "../services/apiClient";
import { useConfirm } from "./ConfirmDialog";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to manage this team.";
    if (err.status === 404) return "Not found.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

export const TeamManagement = () => {
  const confirm = useConfirm();

  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "MEMBER" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await teamApi.myTeams();
      setTeams(list);
      setSelectedId((current) => current ?? list[0]?.teamId ?? null);
    } catch (err) {
      setError(errorMessage(err));
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = teams.find((t) => t.teamId === selectedId) ?? null;

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

  const handleCreate = () =>
    run(
      "create",
      async () => {
        const team = await teamApi.create(createForm.name.trim(), createForm.description.trim() || null);
        setCreateForm({ name: "", description: "" });
        setShowCreate(false);
        await load();
        setSelectedId(team.teamId);
      },
      "Team created."
    );

  /**
   * Sends an invitation rather than adding the person outright. Joining a team is their decision:
   * the API creates a Pending invitation, pushes a notification, and only writes the membership
   * once they accept it in their own notification centre.
   */
  const handleInvite = () =>
    selectedId != null &&
    run(
      "invite",
      async () => {
        await invitationApi.create(selectedId, inviteForm.email.trim());
        setInviteForm({ email: "", role: "MEMBER" });
        await load();
      },
      "Invitation sent. They'll see it in their notifications."
    );

  const handleRemoveMember = async (memberId: number, label: string) => {
    if (!(await confirm({
      title: `Gỡ ${label} khỏi nhóm?`,
      description: "Các task đang giao cho họ sẽ trở thành chưa có người nhận.",
      confirmLabel: "Gỡ thành viên",
      tone: "danger",
    }))) return;
    void run(
      `remove-${memberId}`,
      async () => {
        await teamApi.removeMember(memberId);
        await load();
      },
      "Member removed."
    );
  };

  const handleDeleteTeam = async () => {
    if (selectedId == null || !selected) return;
    if (!(await confirm({
      title: `Xóa nhóm "${selected.name}"?`,
      description: "Không thể hoàn tác. Toàn bộ thành viên sẽ bị gỡ khỏi nhóm này.",
      confirmLabel: "Xóa nhóm",
      tone: "danger",
    }))) return;
    void run(
      "delete",
      async () => {
        await teamApi.remove(selectedId);
        setSelectedId(null);
        await load();
      },
      "Team deleted."
    );
  };

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Users size={16} className="text-[#1A237E]" aria-hidden /> Teams
          </h1>
          <p className="text-[10px] text-gray-500 mt-0.5">Teams you created or belong to.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-3 py-1.5 text-xs text-white hover:bg-[#0D1757]"
        >
          <Plus size={13} aria-hidden /> New team
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}
      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</div>
      )}

      {showCreate && (
        <motion.section initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Team name"
              aria-label="Team name"
              className="rounded-md border border-gray-200 px-3 py-2 text-xs"
            />
            <input
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
              aria-label="Team description"
              className="rounded-md border border-gray-200 px-3 py-2 text-xs"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!createForm.name.trim() || busy === "create"}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-3 py-1.5 text-xs text-white disabled:opacity-40"
            >
              {busy === "create" && <Loader2 size={12} className="animate-spin" aria-hidden />} Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800">
              Cancel
            </button>
          </div>
        </motion.section>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-xs text-gray-500">
          <Loader2 size={14} className="animate-spin" aria-hidden /> Loading teams…
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-xs text-gray-500">
          You don't belong to any team yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Your teams" className="space-y-1">
            {teams.map((t) => (
              <button
                key={t.teamId}
                type="button"
                onClick={() => setSelectedId(t.teamId)}
                aria-current={t.teamId === selectedId}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs ${
                  t.teamId === selectedId ? "bg-[#1A237E]/10 text-[#1A237E]" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="truncate">{t.name ?? `Team ${t.teamId}`}</span>
                <span className="ml-2 shrink-0 text-[10px] text-gray-400">{t.members.length}</span>
              </button>
            ))}
          </nav>

          {selected && (
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xs font-semibold text-gray-900">{selected.name}</h2>
                  {selected.description && <p className="text-[10px] text-gray-500">{selected.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={handleDeleteTeam}
                  disabled={busy === "delete"}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[10px] text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  {busy === "delete" ? <Loader2 size={11} className="animate-spin" aria-hidden /> : <X size={11} aria-hidden />}
                  Delete team
                </button>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="member@example.com"
                  aria-label="Member email"
                  className="min-w-[180px] flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={!inviteForm.email.trim() || busy === "invite"}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-3 py-1.5 text-xs text-white disabled:opacity-40"
                >
                  {busy === "invite" ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <UserPlus size={12} aria-hidden />}
                  Invite
                </button>
              </div>
              <p className="-mt-2 mb-3 text-[10px] text-gray-500">
                They join once they accept the invitation in their notifications.
              </p>

              <ul className="divide-y divide-gray-100">
                {selected.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-gray-900">
                        {m.userName ?? `User ${m.userId}`}
                        {m.role === "LEADER" && <ShieldCheck size={11} className="ml-1 inline text-[#1A237E]" aria-label="Leader" />}
                      </p>
                      {m.email && <p className="truncate text-[10px] text-gray-400">{m.email}</p>}
                    </div>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{m.role ?? "MEMBER"}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id, m.userName ?? m.email ?? `User ${m.userId}`)}
                      disabled={busy === `remove-${m.id}`}
                      aria-label={`Remove ${m.userName ?? m.email}`}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={12} aria-hidden />
                    </button>
                  </li>
                ))}
                {selected.members.length === 0 && (
                  <li className="py-6 text-center text-[10px] text-gray-400">No members yet.</li>
                )}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
