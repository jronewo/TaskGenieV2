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
} from "lucide-react";
import { projects as initialProjects, tasks as initialTasks } from "../data/tmaiData";

interface ProjectFormState {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface ProjectManagementProps {
  selectedProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  taskCount: number;
  riskScore: number;
  color: string;
  icon: string;
}

export const ProjectManagement = ({ selectedProjectId: selectedProjectIdProp, onProjectSelect }: ProjectManagementProps) => {
  const [projects, setProjects] = useState<ProjectItem[]>(() =>
    initialProjects.map((project) => ({
      id: project.id,
      name: project.name,
      description: `${project.name} delivery initiative for the current roadmap.`,
      startDate: "2026-04-01",
      endDate: "2026-08-31",
      taskCount: project.taskCount,
      riskScore: project.riskScore,
      color: project.color,
      icon: project.icon,
    }))
  );
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0]?.id ?? "");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ProjectFormState>({ name: "", description: "", startDate: "", endDate: "" });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (selectedProjectIdProp) {
      setSelectedProjectId(selectedProjectIdProp);
    }
  }, [selectedProjectIdProp]);

  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? projects[0], [projects, selectedProjectId]);
  const filteredProjects = useMemo(() => {
    const query = search.toLowerCase();
    return projects.filter((project) => project.name.toLowerCase().includes(query) || project.description.toLowerCase().includes(query));
  }, [projects, search]);

  const selectedTasks = useMemo(() => initialTasks.filter((task) => task.assignee.name.includes("An") || task.tags.some((tag) => selectedProject?.name.toLowerCase().includes(tag.toLowerCase()))), [selectedProject]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFeedback({ type: "error", message: "Project name is required." });
      return;
    }

    const exists = projects.some((project) => project.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setFeedback({ type: "error", message: "Project name already exists." });
      return;
    }

    if (!form.startDate || !form.endDate || new Date(form.endDate) <= new Date(form.startDate)) {
      setFeedback({ type: "error", message: "End date must be after start date." });
      return;
    }

    const newProject: ProjectItem = {
      id: `project-${Date.now()}`,
      name,
      description: form.description.trim() || "New project created from the management console.",
      startDate: form.startDate,
      endDate: form.endDate,
      taskCount: 0,
      riskScore: 20,
      color: "#6366f1",
      icon: "📦",
    };

    setProjects((prev) => [newProject, ...prev]);
    setSelectedProjectId(newProject.id);
    setForm({ name: "", description: "", startDate: "", endDate: "" });
    setShowCreateForm(false);
    setFeedback({ type: "success", message: "Project created successfully." });
  };

  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    if (!form.name.trim()) {
      setFeedback({ type: "error", message: "Project name is required." });
      return;
    }
    if (!form.startDate || !form.endDate || new Date(form.endDate) <= new Date(form.startDate)) {
      setFeedback({ type: "error", message: "End date must be after start date." });
      return;
    }

    setProjects((prev) => prev.map((project) => project.id === selectedProject.id ? { ...project, name: form.name.trim(), description: form.description.trim(), startDate: form.startDate, endDate: form.endDate } : project));
    setShowEditForm(false);
    setFeedback({ type: "success", message: "Project updated successfully." });
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    if (selectedProjectId === projectId) {
      const fallback = projects.find((project) => project.id !== projectId);
      setSelectedProjectId(fallback?.id ?? "");
    }
    setFeedback({ type: "success", message: "Project removed successfully." });
  };

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
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Cancel</button>
              <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Create Project</button>
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
            {filteredProjects.map((project) => (
              <button key={project.id} onClick={() => { setSelectedProjectId(project.id); onProjectSelect?.(project.id); }} className={`w-full rounded-xl border p-3 text-left transition ${selectedProject?.id === project.id ? "border-slate-500 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{project.name}</span>
                  <span className="text-lg">{project.icon}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{project.description}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                  <CalendarDays size={12} /> {project.startDate} → {project.endDate}
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
                  <p className="mt-1 text-sm text-slate-500">{selectedProject.description}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setForm({ name: selectedProject.name, description: selectedProject.description, startDate: selectedProject.startDate, endDate: selectedProject.endDate }); setShowEditForm(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Pencil size={14} /> Edit
                  </button>
                  <button onClick={() => handleDeleteProject(selectedProject.id)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
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
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Start Date</label>
                      <input type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">End Date</label>
                      <input type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" />
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setShowEditForm(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Cancel</button>
                      <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Save Changes</button>
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
                      <span>Timeline</span>
                      <span className="font-semibold text-slate-900">{selectedProject.startDate} → {selectedProject.endDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tasks</span>
                      <span className="font-semibold text-slate-900">{selectedProject.taskCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Risk</span>
                      <span className="font-semibold text-slate-900">{selectedProject.riskScore}%</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <h4 className="text-sm font-semibold text-slate-900">Related Tasks</h4>
                  </div>
                  <div className="space-y-2">
                    {selectedTasks.slice(0, 4).map((task) => (
                      <div key={task.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                        <div className="font-medium text-slate-800">{task.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{task.status} · {task.priority}</div>
                      </div>
                    ))}
                  </div>
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
