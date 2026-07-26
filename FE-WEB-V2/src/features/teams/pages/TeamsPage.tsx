import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Users, Plus, Search, Mail, UserPlus, ShieldCheck, Trash2, Sparkles, X, Loader2, Send, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../core/auth/AuthContext";
import { ApiError } from "../../../core/api/client";
import { usersApi } from "../../users/api/usersApi";
import { useMyTeams, useCreateTeam, useAddTeamMember, useRemoveTeamMember, useDeleteTeam } from "../hooks/useTeams";
import { useTeamInvitations, useCreateInvitation, useDeleteInvitation } from "../../invitations/hooks/useInvitations";

export default function TeamsPage() {
  const { user } = useAuth();
  const { data: teams, isLoading, isError } = useMyTeams();
  const createTeam = useCreateTeam();
  const removeMember = useRemoveTeamMember();
  const deleteTeam = useDeleteTeam();

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);

  const filteredTeams = useMemo(() => {
    const query = search.toLowerCase();
    return (teams ?? []).filter((t) => t.name.toLowerCase().includes(query) || (t.description ?? "").toLowerCase().includes(query));
  }, [teams, search]);

  const selectedTeam = teams?.find((t) => t.teamId === selectedTeamId) ?? filteredTeams[0];
  const addMember = useAddTeamMember(selectedTeam?.teamId ?? 0);
  const { data: pendingInvitations } = useTeamInvitations(selectedTeam?.teamId ?? null);
  const createInvitation = useCreateInvitation(selectedTeam?.teamId ?? 0);
  const deleteInvitation = useDeleteInvitation(selectedTeam?.teamId ?? 0);
  const [inviteByLinkEmail, setInviteByLinkEmail] = useState("");

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("Team name is required.");
      return;
    }
    try {
      const created = await createTeam.mutateAsync({ name: form.name.trim(), description: form.description.trim() || undefined, createdBy: user.userId });
      setSelectedTeamId(created.teamId);
      setForm({ name: "", description: "" });
      setShowCreateForm(false);
      toast.success("Team created successfully.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Tạo team thất bại.");
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    const email = inviteEmail.trim();
    if (!email) {
      toast.error("Email is required.");
      return;
    }
    setInviting(true);
    try {
      const found = await usersApi.searchByEmail(email);
      await addMember.mutateAsync({ userId: found.userId, role: inviteRole });
      setInviteEmail("");
      setShowInviteForm(false);
      toast.success("Member added successfully.");
    } catch (err) {
      toast.error(err instanceof ApiError ? (err.status === 404 ? "User does not exist." : err.message) : "Thêm thành viên thất bại.");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    try {
      await removeMember.mutateAsync(memberId);
      toast.success("Member removed from team.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xoá thành viên thất bại.");
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    const email = inviteByLinkEmail.trim();
    if (!email) {
      toast.error("Email is required.");
      return;
    }
    try {
      await createInvitation.mutateAsync({ teamId: selectedTeam.teamId, email });
      setInviteByLinkEmail("");
      toast.success("Invitation sent — pending acceptance.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gửi lời mời thất bại.");
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      await deleteInvitation.mutateAsync(invitationId);
      toast.success("Invitation cancelled.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Huỷ lời mời thất bại.");
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    try {
      await deleteTeam.mutateAsync(teamId);
      if (selectedTeamId === teamId) setSelectedTeamId(null);
      toast.success("Team removed successfully.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xoá team thất bại.");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
            <ShieldCheck size={12} /> Team Management
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Create, organize, and manage project teams</h2>
        </div>
        <button onClick={() => setShowCreateForm((v) => !v)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
          <Plus size={15} /> Create Team
        </button>
      </div>

      {showCreateForm && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">New Team</h3>
            <button onClick={() => setShowCreateForm(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
              <X size={14} />
            </button>
          </div>
          <form onSubmit={handleCreateTeam} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Team Name</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="e.g. Platform Core" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Cancel</button>
              <button type="submit" disabled={createTeam.isPending} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {createTeam.isPending ? "Creating..." : "Create Team"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} /> Loading teams...
        </div>
      )}
      {isError && <div className="py-10 text-center text-sm text-red-500">Không tải được danh sách team.</div>}

      {!isLoading && !isError && (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Teams</h3>
                <p className="text-xs text-slate-500">{teams?.length ?? 0} teams</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                <Search size={13} className="text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-20 bg-transparent text-xs outline-none" />
              </div>
            </div>
            <div className="space-y-2">
              {filteredTeams.map((team) => (
                <button key={team.teamId} onClick={() => setSelectedTeamId(team.teamId)} className={`w-full rounded-xl border p-3 text-left transition ${selectedTeam?.teamId === team.teamId ? "border-slate-500 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{team.name}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{team.description}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <Users size={12} /> {team.members.length} members
                  </div>
                </button>
              ))}
              {filteredTeams.length === 0 && <div className="text-center text-sm text-slate-400 py-6">No teams yet.</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {selectedTeam ? (
              <>
                <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                      <Sparkles size={11} /> Team Detail
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{selectedTeam.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{selectedTeam.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowInviteForm((v) => !v)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                      <UserPlus size={14} /> Invite Member
                    </button>
                    <button onClick={() => handleDeleteTeam(selectedTeam.teamId)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
                      <Trash2 size={14} /> Remove Team
                    </button>
                  </div>
                </div>

                {showInviteForm && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <form onSubmit={handleInviteMember} className="flex flex-col gap-2 md:flex-row md:items-end">
                      <div className="flex-1">
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Member Email</label>
                        <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <Mail size={14} className="mr-2 text-slate-400" />
                          <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" className="w-full bg-transparent text-sm outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Role</label>
                        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                          <option value="MEMBER">Member</option>
                          <option value="LEADER">Leader</option>
                        </select>
                      </div>
                      <button type="submit" disabled={inviting} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        {inviting ? "Adding..." : "Add Member"}
                      </button>
                    </form>
                  </motion.div>
                )}

                <div>
                  <h4 className="mb-2 text-sm font-semibold text-slate-900">Members ({selectedTeam.members.length})</h4>
                  <div className="space-y-2">
                    {selectedTeam.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{member.userName}</div>
                          <div className="text-xs text-slate-500">{member.userEmail}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{member.role}</span>
                          <button onClick={() => handleRemoveMember(member.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {selectedTeam.members.length === 0 && <p className="text-sm text-slate-500">No members yet.</p>}
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <Clock size={14} className="text-amber-500" /> Pending Invitations ({(pendingInvitations ?? []).filter((i) => i.status === "Pending").length})
                  </h4>
                  <p className="mb-2 text-[11px] text-slate-400">
                    Luồng mời qua Invitation (pending → accept/reject) — khác với "Add Member" ở trên vốn thêm thành viên ngay lập tức.
                  </p>
                  <form onSubmit={handleSendInvitation} className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <Mail size={13} className="text-slate-400" />
                    <input
                      value={inviteByLinkEmail}
                      onChange={(e) => setInviteByLinkEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="flex-1 bg-transparent text-xs outline-none"
                    />
                    <button type="submit" disabled={createInvitation.isPending} className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                      <Send size={12} /> {createInvitation.isPending ? "Sending..." : "Send Invite"}
                    </button>
                  </form>
                  <div className="space-y-1.5">
                    {(pendingInvitations ?? []).map((inv) => (
                      <div key={inv.invitationId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                        <span className="text-slate-700">{inv.email}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              inv.status === "Accepted"
                                ? "bg-emerald-50 text-emerald-700"
                                : inv.status === "Rejected"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {inv.status}
                          </span>
                          <button onClick={() => handleCancelInvitation(inv.invitationId)} className="text-slate-400 hover:text-rose-600">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(pendingInvitations ?? []).length === 0 && <p className="text-xs text-slate-400">No invitations sent yet.</p>}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No team selected.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
