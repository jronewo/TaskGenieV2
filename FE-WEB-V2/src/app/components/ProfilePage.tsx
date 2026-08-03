import React, { useCallback, useEffect, useState } from "react";
import { User, Sparkles, FolderKanban, Loader2, Plus, Trash2, Save, Mail, Shield, Camera, Building2, Archive } from "lucide-react";
import { ClosedProjectModal } from "./ClosedProjectModal";
import { exportProjectReport } from "../lib/projectReport";
import { skillApi } from "../services/adminApi";
import { projectApi, ProjectDto } from "../services/projectApi";
import { userApi } from "../services/userApi";
import { ApiError } from "../services/apiClient";
import { useConfirm } from "./ConfirmDialog";
import { useAuth } from "../auth/AuthContext";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to perform this action.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

interface MySkill {
  id: number;
  skillId: number;
  skillName: string | null;
  level: number | null;
}

/** Ownership is the split that matters: organization projects carry inherited entitlements and a
 *  different permission model from the ones a person owns outright. */
const PROJECT_GROUPS = [
  {
    key: "personal",
    label: "Dự án cá nhân",
    Icon: User,
    match: (p: ProjectDto) => p.organizationId == null,
  },
  {
    key: "organization",
    label: "Dự án tổ chức",
    Icon: Building2,
    match: (p: ProjectDto) => p.organizationId != null,
  },
] as const;

export const ProfilePage = () => {
  const { user, refreshUser } = useAuth();

  const confirm = useConfirm();

  const [catalog, setCatalog] = useState<{ skillId: number; skillName: string }[]>([]);
  const [mySkills, setMySkills] = useState<MySkill[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  /** Ended projects: gone from the workspace, kept here as the record of finished work. */
  const [closedProjects, setClosedProjects] = useState<ProjectDto[]>([]);
  const [openedProject, setOpenedProject] = useState<ProjectDto | null>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [addForm, setAddForm] = useState({ skillId: "", level: "3" });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cat, mine, projectList, closedList] = await Promise.all([
        skillApi.catalog(),
        skillApi.mine(),
        projectApi.list().catch(() => [] as ProjectDto[]),
        projectApi.listClosed().catch(() => [] as ProjectDto[]),
      ]);
      setCatalog(cat);
      setMySkills(mine);
      setProjects(projectList);
      setClosedProjects(closedList);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

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

  const saveName = () =>
    run(
      "name",
      async () => {
        await userApi.updateProfile({ name: name.trim() });
        await refreshUser();
      },
      "Profile updated."
    );

  /**
   * Two steps on purpose: Cloudinary hosts the file and returns a URL, then the profile is saved
   * with it. A failed save leaves an orphaned upload rather than a broken avatar on the account.
   */
  const uploadAvatar = (file: File) =>
    run(
      "avatar",
      async () => {
        const { avatarUrl } = await userApi.uploadAvatar(file);
        await userApi.updateProfile({ avatar: avatarUrl });
        await refreshUser();
      },
      "Đã cập nhật ảnh đại diện."
    );

  const addSkill = () =>
    run(
      "add-skill",
      async () => {
        await skillApi.addMine(Number(addForm.skillId), Number(addForm.level));
        setAddForm({ skillId: "", level: "3" });
        setMySkills(await skillApi.mine());
      },
      "Skill added to your profile."
    );

  const changeLevel = (userSkillId: number, level: number) =>
    run(`level-${userSkillId}`, async () => {
      await skillApi.updateMine(userSkillId, level);
      setMySkills(await skillApi.mine());
    });

  const removeSkill = async (skill: MySkill) => {
    if (!(await confirm({
      title: `Gỡ kỹ năng ${skill.skillName}?`,
      description: "Kỹ năng này sẽ không còn được dùng để gợi ý giao việc cho bạn.",
      confirmLabel: "Gỡ",
      tone: "danger",
    }))) return;
    void run(`del-${skill.id}`, async () => {
      await skillApi.removeMine(skill.id);
      setMySkills(await skillApi.mine());
    });
  };

  // Skills already on the profile shouldn't be offered again.
  const available = catalog.filter((c) => !mySkills.some((s) => s.skillId === c.skillId));

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <header className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-[#1A237E] text-2xl font-semibold text-white">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              (user?.name ?? "?").trim().charAt(0).toUpperCase()
            )}
          </div>
          <label
            htmlFor="avatar-upload"
            title="Đổi ảnh đại diện"
            className="absolute -bottom-1 -right-1 cursor-pointer rounded-full border border-gray-200 bg-white p-2 text-gray-700 shadow-md hover:bg-gray-50"
          >
            {busy === "avatar" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Camera size={15} aria-hidden />}
            <span className="sr-only">Đổi ảnh đại diện</span>
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadAvatar(file);
              e.target.value = "";
            }}
          />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{user?.name ?? "Profile"}</h1>
          <p className="flex items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Mail size={11} aria-hidden /> {user?.email}
            </span>
            <span className="inline-flex items-center gap-1">
              <Shield size={11} aria-hidden />
              {user?.role === "PLATFORM_ADMIN" ? "Administrator" : "Member"}
            </span>
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
      {/* Account details, as a table */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
          <User size={13} className="text-[#1A237E]" aria-hidden /> Account details
        </h2>

        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <th scope="row" className="w-32 py-2 text-left text-[11px] font-medium text-gray-500">Display name</th>
              <td className="py-2">
                <div className="flex flex-wrap gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="Display name"
                    placeholder="Your name"
                    className="min-w-[140px] flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={saveName}
                    disabled={!name.trim() || name.trim() === user?.name || busy === "name"}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0D1757] disabled:opacity-50"
                  >
                    {busy === "name" ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Save size={12} aria-hidden />}
                    Save
                  </button>
                </div>
              </td>
            </tr>
            <tr>
              <th scope="row" className="py-2 text-left text-[11px] font-medium text-gray-500">Email</th>
              <td className="py-2 text-gray-900">{user?.email ?? "—"}</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 text-left text-[11px] font-medium text-gray-500">Role</th>
              <td className="py-2">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700">
                  {user?.role ?? "NORMAL_USER"}
                </span>
              </td>
            </tr>
            <tr>
              <th scope="row" className="py-2 text-left text-[11px] font-medium text-gray-500">Skills</th>
              <td className="py-2 tabular-nums text-gray-900">{mySkills.length}</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 text-left text-[11px] font-medium text-gray-500">Projects</th>
              <td className="py-2 tabular-nums text-gray-900">{projects.length}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Skills */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
          <Sparkles size={13} className="text-[#1A237E]" aria-hidden /> My skills ({mySkills.length})
        </h2>
        <p className="mb-3 text-[11px] text-gray-500">
          These drive the AI's assignment suggestions — the skill match factor is weighted 40%.
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          <select
            value={addForm.skillId}
            onChange={(e) => setAddForm((f) => ({ ...f, skillId: e.target.value }))}
            aria-label="Skill to add"
            className="min-w-[180px] flex-1 rounded-md border border-gray-200 px-2 py-2 text-sm"
          >
            <option value="">Select a skill…</option>
            {available.map((s) => (
              <option key={s.skillId} value={s.skillId}>
                {s.skillName}
              </option>
            ))}
          </select>
          <select
            value={addForm.level}
            onChange={(e) => setAddForm((f) => ({ ...f, level: e.target.value }))}
            aria-label="Skill level"
            className="rounded-md border border-gray-200 px-2 py-2 text-sm"
          >
            {[1, 2, 3, 4, 5].map((l) => (
              <option key={l} value={l}>
                Level {l}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addSkill}
            disabled={!addForm.skillId || busy === "add-skill"}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-3 py-2 text-sm font-medium text-white hover:bg-[#0D1757] disabled:opacity-50"
          >
            {busy === "add-skill" ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Plus size={13} aria-hidden />}
            Add
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-xs text-gray-500">Loading…</p>
        ) : mySkills.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-500">
            No skills yet. Add a few so the AI can match you to the right tasks.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {mySkills.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <span className="flex-1 truncate text-sm text-gray-800">{s.skillName}</span>
                <select
                  value={s.level ?? 3}
                  onChange={(e) => changeLevel(s.id, Number(e.target.value))}
                  disabled={busy === `level-${s.id}`}
                  aria-label={`Level for ${s.skillName}`}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:opacity-50"
                >
                  {[1, 2, 3, 4, 5].map((l) => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  disabled={busy === `del-${s.id}`}
                  aria-label={`Remove ${s.skillName}`}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 size={13} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      </div>

      {/* Project history, split by ownership: a personal project and one belonging to an
          organization are governed by different rules, so a single flat list hid what mattered. */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
          <FolderKanban size={13} className="text-[#1A237E]" aria-hidden /> Project history ({projects.length})
        </h2>
        {loading ? (
          <p className="py-6 text-center text-xs text-gray-500">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-500">You haven't worked on any project yet.</p>
        ) : (
          <div className="space-y-4">
            {PROJECT_GROUPS.map((group) => {
              const rows = projects.filter(group.match);
              if (rows.length === 0) return null;
              return (
                <div key={group.key}>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    <group.Icon size={11} aria-hidden /> {group.label} ({rows.length})
                  </h3>
                  <ul className="divide-y divide-gray-100">
                    {rows.map((p) => (
                      <li key={p.projectId} className="flex flex-wrap items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-gray-900">{p.name}</p>
                          <p className="text-[11px] text-gray-500">
                            {p.organizationName ? `${p.organizationName} · ` : ""}
                            {p.status ?? "Planning"}
                            {p.deadline ? ` · due ${p.deadline}` : ""}
                            {p.createdAt ? ` · started ${String(p.createdAt).slice(0, 10)}` : ""}
                          </p>
                        </div>
                        <span className="w-10 text-right text-[11px] tabular-nums text-gray-600">
                          {p.progress ?? 0}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Finished work. These no longer appear anywhere in the workspace, so this list is the only
          way back to them — clicking one opens the board it ended with, read-only. */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
          <Archive size={13} className="text-[#1A237E]" aria-hidden /> Dự án đã xong ({closedProjects.length})
        </h2>
        {loading ? (
          <p className="py-6 text-center text-xs text-gray-500">Loading…</p>
        ) : closedProjects.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-500">Chưa có dự án nào được đóng.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {closedProjects.map((p) => (
              <li key={p.projectId}>
                <button
                  type="button"
                  onClick={() => setOpenedProject(p)}
                  className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A237E]"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="line-clamp-2 flex-1 text-sm font-medium text-gray-900">{p.name}</p>
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">
                      ĐÃ KẾT THÚC
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {p.organizationName ? `${p.organizationName} · ` : "Cá nhân · "}
                    {p.updatedAt ? `đóng ${String(p.updatedAt).slice(0, 10)}` : "—"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {openedProject && (
        <ClosedProjectModal
          project={openedProject}
          onClose={() => setOpenedProject(null)}
          onExport={(project, tasks, teamMembers) => {
            const opened = exportProjectReport(project, tasks, teamMembers);
            if (!opened) {
              setError("Trình duyệt đã chặn cửa sổ in. Cho phép pop-up cho trang này rồi thử lại.");
            }
          }}
        />
      )}
    </div>
  );
};
