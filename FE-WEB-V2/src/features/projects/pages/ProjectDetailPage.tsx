import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, UserPlus, Kanban, Loader2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../app/components/ui/alert-dialog";
import { Button } from "../../../app/components/ui/button";
import { Input } from "../../../app/components/ui/input";
import { Label } from "../../../app/components/ui/label";
import { ApiError } from "../../../core/api/client";
import { ProjectForm, ProjectFormValues } from "../components/ProjectForm";
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  useAddProjectMember,
  usePreviewProjectSummary,
  useCloseProject,
} from "../hooks/useProjects";
import { MeetingsPanel } from "../../meetings/components/MeetingsPanel";
import { ExportButtons } from "../components/ExportButtons";
import { ActivityFeed } from "../../activitylogs/components/ActivityFeed";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();

  const { data: project, isLoading, isError } = useProject(id);
  const updateProject = useUpdateProject(id);
  const deleteProject = useDeleteProject();
  const addMember = useAddProjectMember(id);
  const previewSummary = usePreviewProjectSummary(id);
  const closeProject = useCloseProject(id);

  const [showEditForm, setShowEditForm] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm gap-2">
        <Loader2 className="animate-spin" size={16} /> Loading project...
      </div>
    );
  }

  if (isError || !project) {
    return <div className="flex-1 flex items-center justify-center text-red-500 text-sm">Không tải được dự án.</div>;
  }

  const handleUpdate = async (values: ProjectFormValues) => {
    try {
      await updateProject.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        deadline: values.deadline || undefined,
      });
      toast.success("Project updated successfully.");
      setShowEditForm(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật dự án thất bại.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(id);
      toast.success("Project removed successfully.");
      navigate("/app/projects", { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xoá dự án thất bại.");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) {
      toast.error("Email is required.");
      return;
    }
    try {
      await addMember.mutateAsync({ email: memberEmail.trim(), role: memberRole });
      toast.success("Member added successfully.");
      setMemberEmail("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thêm thành viên thất bại.");
    }
  };

  const handleConfirmClose = async () => {
    try {
      await closeProject.mutateAsync();
      toast.success("Project closed and scores applied.");
      setShowCloseConfirm(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Đóng dự án thất bại.");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <Link to="/app/projects" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={13} /> Back to Projects
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{project.description || "No description."}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="rounded bg-slate-100 px-2 py-0.5">Status: {project.status ?? "—"}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5">Risk: {project.riskLevel}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5">Team: {project.teamName ?? "None"}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5">Deadline: {project.deadline ?? "—"}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/app/tasks/${project.projectId}`)}>
              <Kanban size={14} /> Task Board
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEditForm((v) => !v)}>
              <Pencil size={14} /> Edit
            </Button>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleDelete}>
              <Trash2 size={14} /> Remove
            </Button>
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
            <ProjectForm
              defaultValues={{ name: project.name, description: project.description ?? "", deadline: project.deadline ?? "" }}
              submitLabel="Save Changes"
              submitting={updateProject.isPending}
              onSubmit={handleUpdate}
              onCancel={() => setShowEditForm(false)}
            />
          </motion.div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Progress</h4>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Overall completion</span>
              <span className="font-semibold text-slate-800">{project.progress}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-slate-700 rounded-full" style={{ width: `${project.progress}%` }} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={previewSummary.isPending} onClick={() => previewSummary.mutate()}>
                {previewSummary.isPending ? "Loading..." : "Preview Close Summary"}
              </Button>
              <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
                <Button size="sm" variant="destructive" onClick={() => setShowCloseConfirm(true)} disabled={project.status === "CLOSED"}>
                  Close Project
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close this project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will finalize the project and apply reward/penalty scores to every member based on their task
                      completion. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmClose}>Confirm Close</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {previewSummary.data && (
              <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Completion status</span>
                  <span className="font-semibold text-slate-800">{previewSummary.data.projectCompletionStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tasks (done/in-progress/todo)</span>
                  <span className="font-semibold text-slate-800">
                    {previewSummary.data.doneTasks}/{previewSummary.data.inProgressTasks}/{previewSummary.data.todoTasks}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">On-time task rate</span>
                  <span className="font-semibold text-slate-800">{previewSummary.data.onTimeTaskRate}%</span>
                </div>
                <div className="pt-1 space-y-1">
                  {previewSummary.data.memberScores.map((m) => (
                    <div key={m.userId} className="flex justify-between rounded bg-slate-50 px-2 py-1">
                      <span>{m.userName}</span>
                      <span className={m.closureScore >= 0 ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                        {m.closureScore >= 0 ? "+" : ""}
                        {m.closureScore}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <UserPlus size={15} className="text-emerald-600" />
              <h4 className="text-sm font-semibold text-slate-900">Add Member</h4>
            </div>
            <p className="mb-3 text-[11px] text-slate-400">
              Backend hiện chưa có API liệt kê thành viên dự án — chỉ hỗ trợ thêm mới bằng email.
            </p>
            <form onSubmit={handleAddMember} className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="member-email">Email</Label>
                <Input id="member-email" placeholder="name@company.com" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="member-role">Role</Label>
                <select
                  id="member-role"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500 bg-input-background"
                >
                  <option value="MEMBER">Member</option>
                  <option value="LEADER">Leader</option>
                </select>
              </div>
              <Button type="submit" size="sm" disabled={addMember.isPending}>
                {addMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <MeetingsPanel projectId={project.projectId} compact />
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <ExportButtons projectId={project.projectId} projectName={project.name} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <ActivityFeed projectId={project.projectId} compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
