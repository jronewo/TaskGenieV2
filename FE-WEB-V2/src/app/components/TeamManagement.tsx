import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Users, Plus, Search, Mail, UserPlus, ShieldCheck, Trash2,
  Sparkles, Briefcase, CheckCircle2, X, Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { teamsApi, TeamDto, TeamMemberDto } from "../services/teamsApi";
import { usersApi } from "../services/usersApi";
import { projectsApi, ProjectDto } from "../services/projectsApi";
import { ApiError } from "../services/apiClient";

interface TeamManagementProps {
  onClose?: () => void;
}

const PALETTE = ["#6366f1", "#0891b2", "#d97706", "#dc2626", "#059669", "#7c3aed"];
const avatarColor = (userId: number) => PALETTE[userId % PALETTE.length];
const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export const TeamManagement = ({ onClose }: TeamManagementProps) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [associatedProjects, setAssociatedProjects] = useState<ProjectDto[]>([]);
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const list = await teamsApi.listMine();
      setTeams(list);
      if (list.length) setSelectedTeamId((prev) => prev ?? list[0].teamId);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof ApiError ? error.message : "Failed to load teams." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTeam = useMemo(() => teams.find((t) => t.teamId === selectedTeamId) ?? null, [teams, selectedTeamId]);

  useEffect(() => {
    if (selectedTeamId === null) { setAssociatedProjects([]); return; }
    projectsApi.list()
      .then((list) => setAssociatedProjects(list.filter((p) => p.teamId === selectedTeamId)))
      .catch(() => setAssociatedProjects([]));
  }, [selectedTeamId]);

  const filteredTeams = useMemo(() => {
    const query = search.toLowerCase();
    return teams.filter((t) => t.name.toLowerCase().includes(query) || (t.description ?? "").toLowerCase().includes(query));
  }, [teams, search]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setFeedback({ type: "error", message: "Team name is required." }); return; }
    if (!user) return;

    setSaving(true);
    try {
      const created = await teamsApi.create({ name, description: form.description.trim() || undefined, createdBy: user.userId });
      setTeams((prev) => [created, ...prev]);
      setSelectedTeamId(created.teamId);
      setForm({ name: "", description: "" });
      setShowCreateForm(false);
      setFeedback({ type: "success", message: "Team created successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof ApiError ? error.message : "Failed to create team." });
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) { setFeedback({ type: "error", message: "Email is required." }); return; }
    if (!selectedTeam) { setFeedback({ type: "error", message: "Please select a team first." }); return; }

    setInviting(true);
    try {
      const found = await usersApi.searchByEmail(email);
      if (!found) {
        setFeedback({ type: "error", message: `No TaskGenie account found for ${email} — they need to register first.` });
        return;
      }
      if (selectedTeam.members.some((m) => m.userId === found.userId)) {
        setFeedback({ type: "error", message: "User is already a member of this team." });
        return;
      }
      await teamsApi.addMember(selectedTeam.teamId, { userId: found.userId, role: "MEMBER" });
      const refreshed = await teamsApi.getById(selectedTeam.teamId);
      setTeams((prev) => prev.map((t) => (t.teamId === refreshed.teamId ? refreshed : t)));
      setInviteEmail("");
      setShowInviteForm(false);
      setFeedback({ type: "success", message: `${found.name} added to the team.` });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof ApiError ? error.message : "Failed to add member." });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (member: TeamMemberDto) => {
    if (member.role === "LEADER") {
      setFeedback({ type: "error", message: "Cannot remove the team leader." });
      return;
    }
    try {
      await teamsApi.removeMember(member.id);
      setTeams((prev) =>
        prev.map((t) => (t.teamId === selectedTeam?.teamId ? { ...t, members: t.members.filter((m) => m.id !== member.id) } : t))
      );
      setFeedback({ type: "success", message: "Member removed from team." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof ApiError ? error.message : "Failed to remove member." });
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <Loader2 size={22} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
            <ShieldCheck size={12} /> Team Management
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Create, organize, and manage project teams</h2>
          <p className="mt-1 text-sm text-slate-500">Keep team structure aligned with projects and invite new members in one place.</p>
        </div>
        <button onClick={() => setShowCreateForm((prev) => !prev)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
          <Plus size={15} /> Create Team
        </button>
      </div>

      {feedback && (
        <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </div>
      )}

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
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="e.g. Platform Core" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="Describe the team purpose and scope" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Creating…" : "Create Team"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Teams</h3>
              <p className="text-xs text-slate-500">{teams.length} teams</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
              <Search size={13} className="text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-20 bg-transparent text-xs outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            {filteredTeams.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                No teams yet — create your first one.
              </div>
            )}
            {filteredTeams.map((team) => (
              <button key={team.teamId} onClick={() => setSelectedTeamId(team.teamId)} className={`w-full rounded-xl border p-3 text-left transition ${selectedTeam?.teamId === team.teamId ? "border-slate-500 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{team.name}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{team.description || "No description."}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                  <Users size={12} /> {team.members.length} members
                </div>
              </button>
            ))}
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
                  <p className="mt-1 text-sm text-slate-500">{selectedTeam.description || "No description."}</p>
                </div>
                <button onClick={() => setShowInviteForm((prev) => !prev)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                  <UserPlus size={14} /> Invite Member
                </button>
              </div>

              {showInviteForm && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Invite a teammate</h4>
                    <button onClick={() => setShowInviteForm(false)} className="rounded-full p-1 text-slate-400 hover:bg-white">
                      <X size={13} />
                    </button>
                  </div>
                  <form onSubmit={handleInviteMember} className="flex flex-col gap-2 md:flex-row">
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Member Email</label>
                      <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <Mail size={14} className="mr-2 text-slate-400" />
                        <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" className="w-full bg-transparent text-sm outline-none" />
                      </div>
                    </div>
                    <button type="submit" disabled={inviting} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                      {inviting ? "Adding…" : "Send Invite"}
                    </button>
                  </form>
                  <p className="mt-2 text-[10px] text-slate-400">Adds the user immediately if they already have a TaskGenie account.</p>
                </motion.div>
              )}

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Members</h4>
                    <span className="text-xs text-slate-500">{selectedTeam.members.length} active</span>
                  </div>
                  <div className="space-y-2">
                    {selectedTeam.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: avatarColor(member.userId) }}
                          >
                            {initials(member.userName ?? "?")}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{member.userName ?? "Unknown"}</div>
                            <div className="text-xs text-slate-500">{member.userEmail}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.role === "LEADER" ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Leader</span>
                          ) : (
                            <button onClick={() => handleRemoveMember(member)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      <h4 className="text-sm font-semibold text-slate-900">Team Summary</h4>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Created by</span>
                        <span className="font-semibold text-slate-900">{selectedTeam.creatorName ?? "Unknown"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Members</span>
                        <span className="font-semibold text-slate-900">{selectedTeam.members.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Projects</span>
                        <span className="font-semibold text-slate-900">{associatedProjects.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Briefcase size={14} className="text-slate-500" />
                      <h4 className="text-sm font-semibold text-slate-900">Associated Projects</h4>
                    </div>
                    <div className="space-y-2">
                      {associatedProjects.length > 0 ? (
                        associatedProjects.map((project) => (
                          <div key={project.projectId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                            <span className="font-medium text-slate-700">{project.name}</span>
                            <span className="text-xs text-slate-500">{project.status}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No projects linked to this team yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No team selected.</div>
          )}
        </div>
      </div>
    </div>
  );
};
