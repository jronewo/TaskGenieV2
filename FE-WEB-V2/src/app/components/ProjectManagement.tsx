import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Archive,
} from "lucide-react";
import { projectApi, ProjectDto, TaskSummaryDto } from "../services/projectApi";
import { billingApi, EntitlementDto } from "../services/billingApi";
import { ApiError } from "../services/apiClient";
import { usePreferences } from "../settings/PreferencesContext";
import { QuotaExceededModal } from "./QuotaExceededModal";
import { TrashModal } from "./TrashModal";
import { todayIso, isPastDate } from "../lib/dateGuards";

interface ProjectFormState {
  name: string;
  description: string;
  deadline: string;
}

interface ProjectManagementProps {
  selectedProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
  /** Lets the shell refresh workspace-wide views (sidebar, dashboard) after the project list changes. */
  onProjectsChanged?: () => void;
  /** Lets the quota-exceeded modal hand off to the Subscription page. */
  onNavigateToSubscription?: () => void;
}

const EMPTY_FORM: ProjectFormState = { name: "", description: "", deadline: "" };

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to perform this action.";
    if (err.status === 429) return "Quota exceeded. Please try again later.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

export const ProjectManagement = ({ selectedProjectId: selectedProjectIdProp, onProjectSelect, onProjectsChanged, onNavigateToSubscription }: ProjectManagementProps) => {
  const { t } = usePreferences();
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [tasks, setTasks] = useState<TaskSummaryDto[]>([]);
  const [tasksUnavailable, setTasksUnavailable] = useState(false);
  const [taskCounts, setTaskCounts] = useState<Record<number, number>>({});
  const [taskCountErrors, setTaskCountErrors] = useState<Record<number, boolean>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  /** Personal project quota, read from the plan — never hardcoded in the UI. */
  const [entitlement, setEntitlement] = useState<EntitlementDto | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const loadEntitlement = useCallback(async () => {
    try {
      setEntitlement(await billingApi.entitlement());
    } catch {
      // The quota line is informational; failing to read it must not break the page.
      setEntitlement(null);
    }
  }, []);

  const selectProject = useCallback(
    (projectId: number | null) => {
      setSelectedProjectId(projectId);
      onProjectSelect?.(projectId === null ? "" : String(projectId));
    },
    [onProjectSelect]
  );

  const loadProjects = useCallback(
    async (preferredId?: number | null) => {
      setIsLoadingProjects(true);
      setLoadError(null);
      try {
        const data = await projectApi.list();
        setProjects(data);

        const counts = await Promise.all(
          data.map(async (project) => {
            try {
              const projectTasks = await projectApi.getTasksByProject(project.projectId);
              return [project.projectId, projectTasks.length, false] as const;
            } catch {
              return [project.projectId, 0, true] as const;
            }
          })
        );
        setTaskCounts(Object.fromEntries(counts.map(([id, count]) => [id, count])));
        setTaskCountErrors(Object.fromEntries(counts.map(([id, , failed]) => [id, failed])));

        const wantedId = preferredId === undefined ? selectedProjectId : preferredId;
        const stillExists = wantedId !== null && data.some((project) => project.projectId === wantedId);
        if (!stillExists) {
          selectProject(data[0]?.projectId ?? null);
        } else if (preferredId !== undefined) {
          selectProject(wantedId);
        }
      } catch (err) {
        setLoadError(errorMessage(err));
      } finally {
        setIsLoadingProjects(false);
      }
    },
    [selectedProjectId, selectProject]
  );

  useEffect(() => {
    loadProjects();
    void loadEntitlement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProjectIdProp) {
      const parsed = Number(selectedProjectIdProp);
      if (!Number.isNaN(parsed)) setSelectedProjectId(parsed);
    }
  }, [selectedProjectIdProp]);

  const quotaExhausted =
    entitlement != null &&
    entitlement.projectLimit !== null &&
    entitlement.projectUsage >= entitlement.projectLimit;

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

  useEffect(() => {
    if (!selectedProject) {
      setTasks([]);
      setTasksUnavailable(false);
      return;
    }
    let cancelled = false;
    setIsLoadingTasks(true);
    setTasksUnavailable(false);
    projectApi
      .getTasksByProject(selectedProject.projectId)
      .then((data) => {
        if (!cancelled) setTasks(data);
      })
      .catch(() => {
        if (!cancelled) {
          setTasks([]);
          setTasksUnavailable(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTasks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quotaExhausted) {
      setShowCreateForm(false);
      setShowQuotaModal(true);
      return;
    }
    const name = form.name.trim();
    if (!name) {
      setFeedback({ type: "error", message: "Project name is required." });
      return;
    }
    if (isPastDate(form.deadline)) {
      setFeedback({ type: "error", message: "Project deadline cannot be in the past." });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await projectApi.create({
        name,
        description: form.description.trim() || undefined,
        deadline: form.deadline || undefined,
      });
      await loadProjects(created.projectId);
      setForm(EMPTY_FORM);
      setShowCreateForm(false);
      setFeedback({ type: "success", message: "Project created successfully." });
      onProjectsChanged?.();
    } catch (err) {
      setFeedback({ type: "error", message: errorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    const name = form.name.trim();
    if (!name) {
      setFeedback({ type: "error", message: "Project name is required." });
      return;
    }
    if (isPastDate(form.deadline)) {
      setFeedback({ type: "error", message: "Project deadline cannot be in the past." });
      return;
    }

    setIsSubmitting(true);
    try {
      await projectApi.update(selectedProject.projectId, {
        name,
        description: form.description.trim() || undefined,
        deadline: form.deadline || undefined,
      });
      await loadProjects();
      setShowEditForm(false);
      setFeedback({ type: "success", message: "Project updated successfully." });
    } catch (err) {
      setFeedback({ type: "error", message: errorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    setIsDeleting(true);
    try {
      await projectApi.remove(selectedProject.projectId);
      setShowDeleteConfirm(false);
      await loadProjects(null);
      await loadEntitlement();
      setFeedback({ type: "success", message: "Project moved to Trash — it can be restored for 30 days." });
    } catch (err) {
      setFeedback({ type: "error", message: errorMessage(err) });
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Ends the project. Unlike Remove this keeps every task and score — the project simply stops
   * being active work and moves to the finished list on the profile.
   */
  const handleCloseProject = async () => {
    if (!selectedProject) return;
    setIsClosing(true);
    try {
      const summary = await projectApi.close(selectedProject.projectId);
      setShowCloseConfirm(false);
      await loadProjects(null);
      await loadEntitlement();
      setFeedback({
        type: "success",
        message: t("project.close.doneLong", {
          name: summary.projectName ?? selectedProject.name,
          count: `${summary.doneTasks}/${summary.totalTasks}`,
        }),
      });
    } catch (err) {
      setFeedback({ type: "error", message: errorMessage(err) });
    } finally {
      setIsClosing(false);
    }
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTrash(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Trash2 size={15} /> Trash
          </button>
          <button
            onClick={() => {
              if (quotaExhausted) {
                setShowQuotaModal(true);
                return;
              }
              setForm(EMPTY_FORM);
              setShowCreateForm((prev) => !prev);
            }}
            disabled={isLoadingProjects}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={15} /> Create Project
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {loadError}{" "}
          <button onClick={() => loadProjects()} className="font-semibold underline">
            Retry
          </button>
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
              <input type="date" value={form.deadline} min={todayIso()} onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting && <Loader2 size={14} className="animate-spin" />} Create Project
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
              {/* The quota comes from the plan, not from a constant here — a closed project still
                  occupies a slot, so the count is deliberately usage, not "active projects". */}
              {entitlement && (
                <p className={`mt-0.5 text-[11px] ${quotaExhausted ? "font-medium text-rose-600" : "text-slate-400"}`}>
                  {entitlement.projectLimit === null
                    ? t("project.quota.unlimited", { plan: entitlement.planName })
                    : t("project.quota.used", {
                        limit: entitlement.projectLimit,
                        used: entitlement.projectUsage,
                      }) +
                      (quotaExhausted
                        ? t("project.quota.exhausted")
                        : t("project.quota.remaining", {
                            left: entitlement.projectLimit - entitlement.projectUsage,
                          }))}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
              <Search size={13} className="text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-20 bg-transparent text-xs outline-none" />
            </div>
          </div>

          {isLoadingProjects ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Loading projects…
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              {projects.length === 0 ? "No projects yet. Create your first project." : "No projects match your search."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <button
                  key={project.projectId}
                  onClick={() => selectProject(project.projectId)}
                  className={`w-full rounded-xl border p-3 text-left transition ${selectedProject?.projectId === project.projectId ? "border-slate-500 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{project.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{project.status ?? "Active"}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{project.description || "No description provided."}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <CalendarDays size={12} /> {project.deadline ?? "No deadline"}
                  </div>
                </button>
              ))}
            </div>
          )}
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
                  <p className="mt-1 text-sm text-slate-500">{selectedProject.description || "No description provided."}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setForm({
                        name: selectedProject.name,
                        description: selectedProject.description ?? "",
                        deadline: selectedProject.deadline ?? "",
                      });
                      setShowEditForm(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  {/* Ending keeps the data; Remove destroys it. Leader-only, mirroring what the
                      endpoint enforces — the UI guard is tidiness, not authorization. */}
                  {selectedProject.canManageTasks !== false && (
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setShowCloseConfirm(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      <Archive size={14} /> End project
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowCloseConfirm(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>

              {showCloseConfirm && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm text-amber-900">
                    {t("project.close.title")} <strong>{selectedProject.name}</strong>?
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    {t("project.close.detail")}
                  </p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={() => setShowCloseConfirm(false)} disabled={isClosing} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-60">
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseProject}
                      disabled={isClosing}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isClosing && <Loader2 size={14} className="animate-spin" />} {t("project.close.title")}
                    </button>
                  </div>
                </motion.div>
              )}

              {showDeleteConfirm && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-sm text-rose-700">
                    Delete <strong>{selectedProject.name}</strong>? This action cannot be undone.
                  </p>
                  <p className="mt-1 text-xs text-rose-700">
                    {t("project.delete.detail")}
                  </p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-60">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteProject}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeleting && <Loader2 size={14} className="animate-spin" />} Delete Project
                    </button>
                  </div>
                </motion.div>
              )}

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
                      <input type="date" value={form.deadline} min={todayIso()} onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" />
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setShowEditForm(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Cancel</button>
                      <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                        {isSubmitting && <Loader2 size={14} className="animate-spin" />} Save Changes
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
                      <span className="font-semibold text-slate-900">{selectedProject.status ?? "Active"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Team</span>
                      <span className="font-semibold text-slate-900">{selectedProject.teamName ?? "Unassigned"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Created</span>
                      <span className="font-semibold text-slate-900">
                        {selectedProject.createdAt ? new Date(selectedProject.createdAt).toLocaleDateString() : "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Deadline</span>
                      <span className="font-semibold text-slate-900">{selectedProject.deadline ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tasks</span>
                      <span className="font-semibold text-slate-900">
                        {taskCountErrors[selectedProject.projectId]
                          ? "Unavailable"
                          : taskCounts[selectedProject.projectId] ?? tasks.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Progress</span>
                      <span className="font-semibold text-slate-900">{selectedProject.progress}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Risk</span>
                      <span className="font-semibold text-slate-900">{selectedProject.riskLevel}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <h4 className="text-sm font-semibold text-slate-900">Related Tasks</h4>
                  </div>
                  {isLoadingTasks ? (
                    <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                      <Loader2 size={14} className="animate-spin" /> Loading tasks…
                    </div>
                  ) : tasksUnavailable ? (
                    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-4 text-center text-sm text-amber-700">Tasks unavailable — could not load related tasks.</div>
                  ) : tasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">No tasks for this project yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.slice(0, 4).map((task) => (
                        <div key={task.taskId} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                          <div className="font-medium text-slate-800">{task.title ?? "Untitled task"}</div>
                          <div className="mt-1 text-xs text-slate-500">{task.status ?? "Unknown"} · {task.priority ?? "—"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              {isLoadingProjects ? "Loading…" : "No project selected."}
            </div>
          )}
        </div>
      </div>

      {showQuotaModal && entitlement && (
        <QuotaExceededModal
          entitlement={entitlement}
          onClose={() => setShowQuotaModal(false)}
          onUpgrade={() => {
            setShowQuotaModal(false);
            onNavigateToSubscription?.();
          }}
        />
      )}

      {showTrash && (
        <TrashModal
          onClose={() => setShowTrash(false)}
          onRestored={() => {
            void loadProjects(null);
            void loadEntitlement();
            onProjectsChanged?.();
          }}
        />
      )}
    </div>
  );
};
