import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Building2,
  Plus,
  Users,
  Shield,
  Trash2,
  UserPlus,
  Crown,
  Loader2,
  Save,
  FolderKanban,
  X,
} from "lucide-react";
import {
  organizationApi,
  MyOrganizationSummaryDto,
  OrganizationDto,
  OrganizationMemberDto,
  OrganizationProjectDto,
  OrganizationRole,
} from "../services/organizationApi";
import { projectApi } from "../services/projectApi";
import { ApiError } from "../services/apiClient";
import { useConfirm } from "./ConfirmDialog";
import { OrganizationProjectPanel } from "./OrganizationProjectPanel";
import { ProjectInfoModal } from "./ProjectInfoModal";
import { useAuth } from "../auth/AuthContext";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to perform this action.";
    if (err.status === 404) return "Not found.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

const ROLE_LABELS: Record<OrganizationRole, string> = {
  OWNER: "Owner",
  ORG_ADMIN: "Admin",
  MEMBER: "Member",
};

/** Only owners and admins may manage members, settings and billing. */
const canManage = (role: OrganizationRole | undefined) => role === "OWNER" || role === "ORG_ADMIN";

export const OrganizationCenter = () => {
  const { refreshUser } = useAuth();

  const confirm = useConfirm();

  const [organizations, setOrganizations] = useState<MyOrganizationSummaryDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OrganizationDto | null>(null);
  const [members, setMembers] = useState<OrganizationMemberDto[]>([]);
  const [projects, setProjects] = useState<OrganizationProjectDto[]>([]);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({ name: "", description: "" });
  const [inviteForm, setInviteForm] = useState<{ email: string; role: OrganizationRole }>({
    email: "",
    role: "MEMBER",
  });
  const [showNewProject, setShowNewProject] = useState(false);
  // Settings is a dialog, not a permanent panel — it is configured once and then in the way.
  const [showSettings, setShowSettings] = useState(false);
  const [infoProject, setInfoProject] = useState<OrganizationProjectDto | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [newProject, setNewProject] = useState({ name: "", deadline: "" });
  const [assignTarget, setAssignTarget] = useState<{ projectId: number; userId: number; asLeader: boolean } | null>(null);

  const selected = useMemo(
    () => organizations.find((o) => o.organizationId === selectedId) ?? null,
    [organizations, selectedId]
  );
  const selectedProject = projects.find((p) => p.projectId === selectedProjectId) ?? null;

  const manageable = canManage(selected?.role);

  const loadOrganizations = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const list = await organizationApi.mine();
      setOrganizations(list);
      setSelectedId((current) => current ?? list[0]?.organizationId ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetail = useCallback(async (orgId: number) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const [org, memberList, projectList] = await Promise.all([
        organizationApi.getById(orgId),
        organizationApi.members(orgId),
        organizationApi.projects(orgId),
      ]);
      setDetail(org);
      setSettingsForm({ name: org.name, description: org.description ?? "" });
      setMembers(memberList);
      setProjects(projectList);
    } catch (err) {
      setError(errorMessage(err));
      setDetail(null);
      setMembers([]);
      setProjects([]);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (selectedId != null) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const run = async (key: string, action: () => Promise<void>, successMessage?: string) => {
    if (busy) return; // guards against double submits
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

  const handleSaveSettings = () =>
    selectedId != null &&
    run(
      "settings",
      async () => {
        await organizationApi.update(selectedId, {
          name: settingsForm.name.trim(),
          description: settingsForm.description.trim(),
        });
        await Promise.all([loadDetail(selectedId), loadOrganizations()]);
      },
      "Organization updated."
    );

  const handleInvite = () =>
    selectedId != null &&
    run(
      "invite",
      async () => {
        await organizationApi.addMember(selectedId, inviteForm.email.trim(), inviteForm.role);
        setInviteForm({ email: "", role: "MEMBER" });
        await loadDetail(selectedId);
      },
      "Member added."
    );

  const handleRoleChange = (memberId: number, role: OrganizationRole) =>
    selectedId != null &&
    run(
      `role-${memberId}`,
      async () => {
        await organizationApi.updateMemberRole(selectedId, memberId, role);
        await loadDetail(selectedId);
      },
      "Role updated."
    );

  const handleRemove = async (member: OrganizationMemberDto) => {
    if (selectedId == null) return;
    if (!(await confirm({
      title: `Gỡ ${member.userName ?? member.email} khỏi tổ chức?`,
      description: "Họ sẽ mất quyền truy cập các dự án của tổ chức, kể cả quyền Premium kế thừa.",
      confirmLabel: "Gỡ thành viên",
      tone: "danger",
    }))) return;
    void run(
      `remove-${member.organizationMemberId}`,
      async () => {
        await organizationApi.removeMember(selectedId, member.organizationMemberId);
        await loadDetail(selectedId);
      },
      "Member removed."
    );
  };

  const handleCreateProject = () =>
    selectedId != null &&
    run(
      "new-project",
      async () => {
        await projectApi.create({
          name: newProject.name.trim(),
          deadline: newProject.deadline || undefined,
          organizationId: selectedId,
        });
        setNewProject({ name: "", deadline: "" });
        setShowNewProject(false);
        await loadDetail(selectedId);
      },
      "Project created in this organization."
    );

  const handleAssign = () =>
    selectedId != null &&
    assignTarget &&
    run(
      "assign",
      async () => {
        await organizationApi.assignMemberToProject(
          selectedId,
          assignTarget.projectId,
          assignTarget.userId,
          assignTarget.asLeader
        );
        setAssignTarget(null);
        await loadDetail(selectedId);
      },
      "Member assigned to project."
    );

  if (loadingList) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        <span className="ml-2">Loading organizations…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Building2 className="h-6 w-6 text-[#1A237E]" aria-hidden />
            Organizations
          </h1>
          <p className="text-sm text-gray-500">Manage your organizations, members and project staffing.</p>
        </div>
        {detail && manageable && (
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            aria-label="Organization settings"
            title="Organization settings"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          >
            <Shield className="h-4 w-4" aria-hidden />
          </button>
        )}
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {organizations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center text-gray-500">
          <Building2 className="mx-auto mb-3 h-10 w-10 opacity-40" aria-hidden />
          <p>No organization workspace yet.</p>
          <p className="text-sm">Buy an organization plan from Subscription to open this workspace.</p>
        </div>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,360px)] lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Switcher */}
          <nav aria-label="Your organizations" className="space-y-1">
            {organizations.map((org) => (
              <button
                key={org.organizationId}
                type="button"
                onClick={() => setSelectedId(org.organizationId)}
                aria-current={org.organizationId === selectedId}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                  org.organizationId === selectedId
                    ? "bg-[#1A237E]/10 text-[#1A237E] ring-1 ring-[#1A237E]/30"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="truncate">{org.name}</span>
                <span className="ml-2 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                  {ROLE_LABELS[org.role]}
                </span>
              </button>
            ))}
          </nav>

          <div className="space-y-6">
            {loadingDetail ? (
              <div className="flex items-center gap-2 py-12 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading…
              </div>
            ) : detail ? (
              <>
                {/* Members */}
                <section className="rounded-lg border border-gray-200 bg-white p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Users className="h-4 w-4 text-[#1A237E]" aria-hidden /> Members ({members.length})
                  </h2>

                  {manageable && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      <input
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="member@example.com"
                        aria-label="Member email"
                        className="min-w-[220px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                      />
                      <select
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as OrganizationRole }))}
                        aria-label="Member role"
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ORG_ADMIN">Admin</option>
                        <option value="OWNER">Owner</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleInvite}
                        disabled={!inviteForm.email.trim() || busy === "invite"}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#1A237E] px-4 py-2 text-sm text-white disabled:opacity-50"
                      >
                        {busy === "invite" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
                        Add
                      </button>
                    </div>
                  )}

                  <ul className="divide-y divide-gray-100">
                    {members.map((m) => (
                      <li key={m.organizationMemberId} className="flex flex-wrap items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-gray-900">
                            {m.userName ?? "Unknown"}
                            {m.role === "OWNER" && <Crown className="ml-1 inline h-3.5 w-3.5 text-amber-400" aria-label="Owner" />}
                          </p>
                          <p className="truncate text-xs text-gray-400">{m.email}</p>
                        </div>
                        {manageable ? (
                          <>
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.organizationMemberId, e.target.value as OrganizationRole)}
                              disabled={busy === `role-${m.organizationMemberId}`}
                              aria-label={`Role for ${m.userName ?? m.email}`}
                              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 disabled:opacity-50"
                            >
                              <option value="MEMBER">Member</option>
                              <option value="ORG_ADMIN">Admin</option>
                              <option value="OWNER">Owner</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRemove(m)}
                              disabled={busy === `remove-${m.organizationMemberId}`}
                              aria-label={`Remove ${m.userName ?? m.email}`}
                              className="rounded-lg p-2 text-gray-500 hover:bg-rose-500/10 hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </>
                        ) : (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{ROLE_LABELS[m.role]}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Project dashboard — the reason this workspace exists. */}
                <section className="rounded-lg border border-gray-200 bg-white p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <FolderKanban className="h-4 w-4 text-[#1A237E]" aria-hidden /> Projects ({projects.length})
                    </h2>
                    {manageable && (
                      <button
                        type="button"
                        onClick={() => setShowNewProject((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A237E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0D1757]"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden /> New project
                      </button>
                    )}
                  </div>

                  {/* At-a-glance numbers for the whole organization. */}
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Projects", value: projects.length },
                      { label: "In progress", value: projects.filter((p) => (p.status ?? "") === "InProgress").length },
                      { label: "At risk", value: projects.filter((p) => (p.riskLevel ?? "LOW").toUpperCase() === "HIGH").length },
                      {
                        label: "Avg progress",
                        value: projects.length
                          ? `${Math.round(projects.reduce((sum, p) => sum + (p.progress ?? 0), 0) / projects.length)}%`
                          : "—",
                      },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">{stat.label}</p>
                        <p className="mt-0.5 text-lg font-semibold text-gray-900">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {showNewProject && manageable && (
                    <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <input
                        value={newProject.name}
                        onChange={(e) => setNewProject((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Project name"
                        aria-label="New project name"
                        className="min-w-[200px] flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="date"
                        value={newProject.deadline}
                        onChange={(e) => setNewProject((f) => ({ ...f, deadline: e.target.value }))}
                        aria-label="Project deadline"
                        className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleCreateProject}
                        disabled={!newProject.name.trim() || busy === "new-project"}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-3 py-2 text-sm font-medium text-white hover:bg-[#0D1757] disabled:opacity-50"
                      >
                        {busy === "new-project" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                        Create
                      </button>
                    </div>
                  )}

                  {projects.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">
                      No projects yet. Create the first one to start assigning work.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {projects.map((p) => (
                        <li key={p.projectId}>
                          <div
                            role="button"
                            tabIndex={0}
                            aria-pressed={selectedProjectId === p.projectId}
                            onClick={() => setSelectedProjectId(p.projectId)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedProjectId(p.projectId);
                              }
                            }}
                            className={`flex w-full cursor-pointer flex-wrap items-center gap-3 rounded-lg px-2 py-3 text-left ${
                              selectedProjectId === p.projectId ? "bg-gray-100" : "hover:bg-gray-50"
                            }`}
                          >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  (p.riskLevel ?? "LOW").toUpperCase() === "HIGH"
                                    ? "bg-red-50 text-red-700"
                                    : (p.riskLevel ?? "LOW").toUpperCase() === "MEDIUM"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {(p.riskLevel ?? "LOW").toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">
                              {p.status ?? "Planning"} · {p.teamMemberCount} member(s)
                              {p.deadline ? ` · due ${p.deadline}` : ""}
                            </p>
                          </div>
                          <span className="w-10 text-right text-[11px] tabular-nums text-gray-500">{p.progress ?? 0}%</span>
                          {manageable && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); // the row itself opens the overview
                                setAssignTarget({ projectId: p.projectId, userId: members[0]?.userId ?? 0, asLeader: false });
                              }}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-900 hover:bg-gray-100"
                            >
                              Assign member
                            </button>
                          )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            ) : null}
          </div>

          {/* Third column: the project the user clicked. */}
          <div className="hidden xl:block">
            {detail && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                {selectedProject ? (
                  <OrganizationProjectPanel
                    project={selectedProject}
                    members={members}
                    manageable={manageable}
                    onAssign={(projectId, asLeader) =>
                      setAssignTarget({ projectId, userId: members[0]?.userId ?? 0, asLeader })
                    }
                    onViewInfo={setInfoProject}
                  />
                ) : (
                  <p className="py-10 text-center text-[11px] text-gray-500">
                    Select a project to see its tasks, risk and staffing.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Organization settings dialog */}
      {showSettings && detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Organization settings"
        >
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Shield className="h-4 w-4 text-[#1A237E]" aria-hidden /> Organization settings
              </h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Close"
                className="text-gray-500 hover:text-gray-900"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
                <div>
                  <div className="grid gap-3 sm:grid-cols-1">
                    <label className="block text-sm">
                      <span className="mb-1 block text-gray-500">Name</span>
                      <input
                        value={settingsForm.name}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, name: e.target.value }))}
                        disabled={!manageable}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 disabled:opacity-60"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-gray-500">Description</span>
                      <input
                        value={settingsForm.description}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, description: e.target.value }))}
                        disabled={!manageable}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 disabled:opacity-60"
                      />
                    </label>
                  </div>
                  {manageable && (
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={busy === "settings"}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-800 hover:bg-gray-200 disabled:opacity-50"
                    >
                      {busy === "settings" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                      Save
                    </button>
                  )}
                </div>

          </div>
        </div>
      )}

      <ProjectInfoModal project={infoProject} onClose={() => setInfoProject(null)} />

      {/* Assign dialog */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4" role="dialog" aria-modal="true" aria-label="Assign member to project">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {assignTarget.asLeader ? "Set the project leader" : "Assign member to project"}
              </h3>
              <button type="button" onClick={() => setAssignTarget(null)} aria-label="Close" className="text-gray-500 hover:text-gray-900">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-gray-500">Member</span>
              <select
                value={assignTarget.userId}
                onChange={(e) => setAssignTarget((t) => (t ? { ...t, userId: Number(e.target.value) } : t))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              >
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userName ?? m.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={assignTarget.asLeader}
                onChange={(e) => setAssignTarget((t) => (t ? { ...t, asLeader: e.target.checked } : t))}
              />
              Assign as Project Leader
              <span className="text-[10px] text-gray-400">(đổi vai trò nếu người này đã ở trong nhóm)</span>
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAssignTarget(null)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={busy === "assign" || !assignTarget.userId}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1A237E] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy === "assign" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
