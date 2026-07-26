import React, { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Loader2, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { useProjects } from "../../projects/hooks/useProjects";
import { useTasksByProject, useCreateTask, useUpdateTaskStatus } from "../hooks/useTasks";
import { KanbanBoard } from "../components/KanbanBoard";
import { CreateTaskModal, CreateTaskFormValues } from "../components/CreateTaskModal";
import { TaskDetailModal } from "../components/TaskDetailModal";
import { TaskDependencyGraph } from "../components/TaskDependencyGraph";
import { TaskDetailDto, TaskStatus } from "../types";
import { ApiError } from "../../../core/api/client";

export default function TaskBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();

  const { data: projects } = useProjects();
  const { data: tasks, isLoading, isError } = useTasksByProject(id);
  const createTask = useCreateTask(id);
  const updateTaskStatus = useUpdateTaskStatus(id);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("Todo");
  const [selectedTask, setSelectedTask] = useState<TaskDetailDto | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  const currentProject = projects?.find((p) => p.projectId === id);

  const handleAddTask = (status: TaskStatus) => {
    setDefaultStatus(status);
    setShowCreateModal(true);
  };

  const handleCreate = async (values: CreateTaskFormValues) => {
    try {
      await createTask.mutateAsync({ ...values, difficulty: Number(values.difficulty) });
      toast.success(`Task "${values.title}" created.`);
      setShowCreateModal(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Tạo task thất bại.");
    }
  };

  const handleStatusChange = async (taskId: number, status: TaskStatus) => {
    try {
      await updateTaskStatus.mutateAsync({ taskId, status });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật trạng thái thất bại.");
    }
  };

  if (!projectId || Number.isNaN(id)) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No project selected.</div>;
  }

  return (
    <div className="flex-1 overflow-hidden p-4 flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{currentProject?.name ?? "Task Board"}</h2>
          <p className="text-[10px] text-gray-500">{tasks?.length ?? 0} tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGraph(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            <GitBranch size={13} /> Dependency Graph
          </button>
          <select
            value={id}
            onChange={(e) => navigate(`/app/tasks/${e.target.value}`)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none"
          >
            {(projects ?? []).map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 className="animate-spin" size={16} /> Loading tasks...
        </div>
      )}
      {isError && <div className="flex-1 flex items-center justify-center text-sm text-red-500">Không tải được danh sách task.</div>}

      {!isLoading && !isError && (
        <KanbanBoard
          tasks={tasks ?? []}
          onTaskClick={setSelectedTask}
          onTaskStatusChange={handleStatusChange}
          onAddTask={handleAddTask}
        />
      )}

      <CreateTaskModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreate} defaultStatus={defaultStatus} submitting={createTask.isPending} />
      <TaskDetailModal task={selectedTask} projectId={id} otherTasks={tasks ?? []} onClose={() => setSelectedTask(null)} />
      <TaskDependencyGraph open={showGraph} tasks={tasks ?? []} onClose={() => setShowGraph(false)} />
    </div>
  );
}
