import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { Briefcase, Plus, Search, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../app/components/ui/button";
import { useAuth } from "../../../core/auth/AuthContext";
import { ApiError } from "../../../core/api/client";
import { useProjects, useCreateProject } from "../hooks/useProjects";
import { ProjectForm, ProjectFormValues } from "../components/ProjectForm";

const riskBadge = (riskLevel: string) => {
  if (riskLevel === "CRITICAL") return { label: "Critical", cls: "bg-red-100 text-red-700 border-red-200" };
  if (riskLevel === "HIGH") return { label: "High Risk", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  if (riskLevel === "MEDIUM") return { label: "At Risk", cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return { label: "On Track", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: projects, isLoading, isError } = useProjects();
  const createProject = useCreateProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(searchParams.get("create") === "1");

  React.useEffect(() => {
    if (searchParams.get("create") === "1") {
      setShowCreateForm(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("create");
        return next;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return (projects ?? []).filter(
      (p) => p.name.toLowerCase().includes(query) || (p.description ?? "").toLowerCase().includes(query)
    );
  }, [projects, search]);

  const handleCreate = async (values: ProjectFormValues) => {
    if (!user) return;
    try {
      const created = await createProject.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        deadline: values.deadline || undefined,
        createdBy: user.userId,
      });
      toast.success("Project created successfully.");
      setShowCreateForm(false);
      navigate(`/app/projects/${created.projectId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Tạo dự án thất bại.");
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
        <Button onClick={() => setShowCreateForm((v) => !v)} className="gap-2">
          <Plus size={15} /> Create Project
        </Button>
      </div>

      {showCreateForm && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">New Project</h3>
            <button onClick={() => setShowCreateForm(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
              <X size={14} />
            </button>
          </div>
          <ProjectForm submitLabel="Create Project" submitting={createProject.isPending} onSubmit={handleCreate} onCancel={() => setShowCreateForm(false)} />
        </motion.div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Projects</h3>
            <p className="text-xs text-slate-500">{projects?.length ?? 0} projects</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
            <Search size={13} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-32 bg-transparent text-xs outline-none" />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <Loader2 className="animate-spin" size={16} /> Loading projects...
          </div>
        )}
        {isError && <div className="py-10 text-center text-sm text-red-500">Không tải được danh sách dự án.</div>}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            No projects yet — create your first one.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const badge = riskBadge(project.riskLevel);
            return (
              <button
                key={project.projectId}
                onClick={() => navigate(`/app/projects/${project.projectId}`)}
                className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 truncate">{project.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${badge.cls}`}>{badge.label}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{project.description || "No description."}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{project.teamName ?? "No team"}</span>
                  <span className="font-semibold text-slate-700">{project.progress}%</span>
                </div>
                <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-700 rounded-full" style={{ width: `${project.progress}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
