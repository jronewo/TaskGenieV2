import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Briefcase,
  Plus,
  Search,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { projectsApi, ProjectDto } from "../services/projectsApi";
import { tasksApi, TaskDto } from "../services/tasksApi";
import { ApiError } from "../services/apiClient";

interface ProjectFormState {
  name: string;
  description: string;
  deadline: string;
}

interface ProjectManagementProps {
  selectedProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
}

const PALETTE = ["#6366f1", "#0891b2", "#d97706", "#dc2626", "#059669", "#7c3aed"];
const ICONS = ["📦", "🚀", "📊", "🛡️", "📱", "⚙️"];
const colorFor = (id: number) => PALETTE[id % PALETTE.length];
const iconFor = (id: number) => ICONS[id % ICONS.length];

const RISK_BADGE: Record<string, string> = {
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-rose-50 text-rose-700 border-rose-200",
  CRITICAL: "bg-rose-100 text-rose-800 border-rose-300",
};

export const ProjectManagement = ({ selectedProjectId: selectedProjectIdProp, onProjectSelect }: ProjectManagementProps) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<TaskDto[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ProjectFormState>({ name: "", description: "", deadline: "" });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await projectsApi.list();
      setProjects(list);
      if (list.length && selectedProjectId === null) {
        setSelectedProjectId(list[0].projectId);
      }
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof ApiError ? error.message : "Failed to load projects." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProjectIdProp) {
      const asNumber = Number(selectedProjectIdProp);
      if (!Number.isNaN(asNumber)) setSelectedProjectId(asNumber);
    }
  }, [selectedProjectIdProp]);

  useEffect(() => {
    if (selectedProjectId === null) return;
    setTasksLoading(true);
    tasksApi.listByProject(selectedProjectId)
      .then(setSelectedTasks)
      .catch(() => setSelectedTasks([]))
      .finally(() => setTasksLoading(false));
  }, [selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.projectId === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const filteredProjects = useMemo(() => {
    const query = search.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        (project.description ?? "").toLowerCase().includes(query)
    );
  }, [projects, search]);

  const selectProject = (id: number) => {
    setSelectedProjectId(id);
    onProjectSelect?.(String(id));
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFeedback({ type: "error", message: "Project name is required." });
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      const created = await projectsApi.create({
        name,
        description: form.description.trim() || undefined,
        createdBy: user.userId,
        deadline: form.deadline || undefined,
      });
      setProjects((prev) => [created, ...prev]);
      selectProject(created.projectId);
      setForm({ name: "", description: "", deadline: "" });
      setShowCreateForm(false);
      setFeedback({ type: "success", message: "Project created successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof ApiError ? error.message : "Failed to create project." });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    if (!form.name.trim()) {
      setFeedback({ type: "error", message: "Project name is required." });
      return;
    }

    setSaving(true);
    try {
      await projectsApi.update(selectedProject.projectId, {
        name: form.name.trim(),
        description: form.description.trim(),
        deadline: form.deadline || undefined,
      });
      setProjects((prev) =>
        prev.map((project) =>
          project.projectId === selectedProject.projectId
            ? { ...project, name: form.name.trim(), description: form.description.trim(), deadline: form.deadline || project.deadline }
            : project
        )
      );
      setShowEditForm(false);
      setFeedback({ type: "success", message: "Project updated successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof ApiError ? error.message : "Failed to update project." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    try {
      await projectsApi.remove(projectId);
      setProjects((prev) => {
        const remaining = prev.filter((project) => project.projectId !== projectId);
        if (selectedProjectId === projectId) {
          setSelectedProjectId(remaining[0]?.projectId ?? null);
        }
        return remaining;
      });
      setFeedback({ type: "success", message: "Project removed successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof ApiError ? error.message : "Failed to delete project." });
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
            <Briefcase size={12} /> Project Management
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Create and manage delivery projects</h2>
          <p className="mt-1 text-sm text-slate-500">Track project timelines, risk level, and related tasks in one place.</p>
        </div>
        <button onClick={() => setShowCreateForm((prev) => !prev)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
          <Plus size={15} /> Create Project
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
            <h3 className="text-sm font-semibold text-slate-900">New Project</h3>
            <button onClick={() => setShowCreateForm(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
              <X size={14} />
            </button>
          </div>
          <form onSubmit={handleCreateProject} className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Project Name</label>
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="e.g. AI Operations" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder="Summarize the goal of the project" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Deadline</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Creating…" : "Create Project"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Projects</h3>
              <p className="text-xs text-slate-500">{projects.length} active projects</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
              <Search size={13} className="text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-20 bg-transparent text-xs outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            {filteredProjects.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                No projects yet — create your first one.
              </div>
            )}
            {filteredProjects.map((project) => (
              <button key={project.projectId} onClick={() => selectProject(project.projectId)} className={`w-full rounded-xl border p-3 text-left transition ${selectedProject?.projectId === project.projectId ? "border-slate-500 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{project.name}</span>
                  <span className="text-lg">{iconFor(project.projectId)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{project.description || "No description."}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                  <CalendarDays size={12} /> {project.deadline ? `Due ${project.deadline}` : "No deadline"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {selectedProject ? (
            <>
              <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                    <Sparkles size={11} /> Project Detail
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{selectedProject.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{selectedProject.description || "No description."}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setForm({ name: selectedProject.name, description: selectedProject.description ?? "", deadline: selectedProject.deadline ?? "" }); setShowEditForm(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Pencil size={14} /> Edit
                  </button>
                  <button onClick={() => handleDeleteProject(selectedProject.projectId)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>

              {showEditForm && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Edit Project</h4>
                    <button onClick={() => setShowEditForm(false)} className="rounded-full p-1 text-slate-400 hover:bg-white">
                      <X size={13} />
                    </button>
                  </div>
                  <form onSubmit={handleUpdateProject} className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Project Name</label>
                      <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
                      <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Deadline</label>
                      <input type="date" value={form.deadline} onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" />
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setShowEditForm(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Cancel</button>
                      <button type="submit" disabled={saving} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        {saving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Project Summary</h4>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Live</span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <span className="font-semibold text-slate-900">{selectedProject.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Deadline</span>
                      <span className="font-semibold text-slate-900">{selectedProject.deadline ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Progress</span>
                      <span className="font-semibold text-slate-900">{selectedProject.progress}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Risk</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${RISK_BADGE[selectedProject.riskLevel] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {selectedProject.riskLevel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Team</span>
                      <span className="font-semibold text-slate-900">{selectedProject.teamName ?? "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <h4 className="text-sm font-semibold text-slate-900">Related Tasks</h4>
                  </div>
                  {tasksLoading ? (
                    <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
                  ) : selectedTasks.length === 0 ? (
                    <p className="text-xs text-slate-400">No tasks in this project yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTasks.slice(0, 6).map((task) => (
                        <div key={task.taskId} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                          <div className="font-medium text-slate-800">{task.title}</div>
                          <div className="mt-1 text-xs text-slate-500">{task.status} · {task.priority}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No project selected.</div>
          )}
        </div>
      </div>
    </div>
  );
};
