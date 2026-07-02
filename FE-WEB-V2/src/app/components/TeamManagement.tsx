import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Plus,
  Search,
  Mail,
  UserPlus,
  ShieldCheck,
  Trash2,
  Sparkles,
  Briefcase,
  CheckCircle2,
  X,
} from "lucide-react";
import { initialTeams, teamMembers, projects } from "../data/tmaiData";

interface TeamManagementProps {
  onClose?: () => void;
}

interface TeamFormState {
  name: string;
  description: string;
}

interface InviteFormState {
  email: string;
}

export const TeamManagement = ({ onClose }: TeamManagementProps) => {
  const [teams, setTeams] = useState(initialTeams);
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeams[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [form, setForm] = useState<TeamFormState>({ name: "", description: "" });
  const [inviteForm, setInviteForm] = useState<InviteFormState>({ email: "" });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? teams[0],
    [teams, selectedTeamId]
  );

  const filteredTeams = useMemo(() => {
    const query = search.toLowerCase();
    return teams.filter((team) => team.name.toLowerCase().includes(query) || team.description.toLowerCase().includes(query));
  }, [teams, search]);

  const teamMembersById = useMemo(
    () => Object.fromEntries(teamMembers.map((member) => [member.id, member])),
    []
  );

  const selectedMembers = useMemo(() => {
    if (!selectedTeam) return [];
    return selectedTeam.memberIds.map((id) => teamMembersById[id]).filter(Boolean);
  }, [selectedTeam, teamMembersById]);

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedName) {
      setFeedback({ type: "error", message: "Team name is required." });
      return;
    }

    const exists = teams.some((team) => team.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      setFeedback({ type: "error", message: "Team name already exists." });
      return;
    }

    const newTeam: typeof initialTeams[number] = {
      id: `team-${Date.now()}`,
      name: trimmedName,
      description: trimmedDescription || "New team created from the management console.",
      leaderId: "t1",
      memberIds: ["t1"],
      projectIds: [],
      status: "active",
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setTeams((prev) => [newTeam, ...prev]);
    setSelectedTeamId(newTeam.id);
    setForm({ name: "", description: "" });
    setShowCreateForm(false);
    setFeedback({ type: "success", message: "Team created successfully." });
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteForm.email.trim().toLowerCase();
    if (!email) {
      setFeedback({ type: "error", message: "Email is required." });
      return;
    }

    const member = teamMembers.find((item) => item.email.toLowerCase() === email);
    if (!member) {
      setFeedback({ type: "error", message: "User does not exist." });
      return;
    }

    if (!selectedTeam) {
      setFeedback({ type: "error", message: "Please select a team first." });
      return;
    }

    if (selectedTeam.memberIds.includes(member.id)) {
      setFeedback({ type: "error", message: "User is already a member of this team." });
      return;
    }

    setTeams((prev) =>
      prev.map((team) =>
        team.id === selectedTeam.id ? { ...team, memberIds: [...team.memberIds, member.id] } : team
      )
    );

    setInviteForm({ email: "" });
    setShowInviteForm(false);
    setFeedback({ type: "success", message: "Invitation sent successfully." });
  };

  const handleRemoveMember = (memberId: string) => {
    if (!selectedTeam) return;
    if (selectedTeam.leaderId === memberId) {
      setFeedback({ type: "error", message: "Cannot remove the Team Leader." });
      return;
    }

    setTeams((prev) =>
      prev.map((team) =>
        team.id === selectedTeam.id
          ? { ...team, memberIds: team.memberIds.filter((id) => id !== memberId) }
          : team
      )
    );
    setFeedback({ type: "success", message: "Member removed from team." });
  };

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
        <button
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
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
              <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Create Team</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Teams</h3>
              <p className="text-xs text-slate-500">{teams.length} active teams</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
              <Search size={13} className="text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-20 bg-transparent text-xs outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            {filteredTeams.map((team) => (
              <button key={team.id} onClick={() => setSelectedTeamId(team.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedTeam?.id === team.id ? "border-slate-500 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{team.name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{team.status}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{team.description}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                  <Users size={12} /> {team.memberIds.length} members
                  <span className="mx-1">•</span>
                  <Briefcase size={12} /> {team.projectIds.length} projects
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
                  <p className="mt-1 text-sm text-slate-500">{selectedTeam.description}</p>
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
                        <input value={inviteForm.email} onChange={(e) => setInviteForm({ email: e.target.value })} placeholder="name@company.com" className="w-full bg-transparent text-sm outline-none" />
                      </div>
                    </div>
                    <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Send Invite</button>
                  </form>
                </motion.div>
              )}

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Members</h4>
                    <span className="text-xs text-slate-500">{selectedMembers.length} active</span>
                  </div>
                  <div className="space-y-2">
                    {selectedMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <img src={member.avatar} alt={member.name} className="h-10 w-10 rounded-full object-cover" />
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{member.name}</div>
                            <div className="text-xs text-slate-500">{member.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedTeam.leaderId === member.id && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Leader</span>
                          )}
                          {selectedTeam.leaderId !== member.id && (
                            <button onClick={() => handleRemoveMember(member.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
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
                        <span>Leader</span>
                        <span className="font-semibold text-slate-900">{teamMembersById[selectedTeam.leaderId]?.name ?? "Unknown"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Projects</span>
                        <span className="font-semibold text-slate-900">{selectedTeam.projectIds.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status</span>
                        <span className="font-semibold text-slate-900 capitalize">{selectedTeam.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <h4 className="mb-2 text-sm font-semibold text-slate-900">Associated Projects</h4>
                    <div className="space-y-2">
                      {selectedTeam.projectIds.length > 0 ? (
                        selectedTeam.projectIds.map((projectId) => {
                          const project = projects.find((item) => item.id === projectId);
                          return project ? (
                            <div key={project.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                              <span className="font-medium text-slate-700">{project.name}</span>
                              <span className="text-xs text-slate-500">{project.taskCount} tasks</span>
                            </div>
                          ) : null;
                        })
                      ) : (
                        <p className="text-sm text-slate-500">No projects linked yet.</p>
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
