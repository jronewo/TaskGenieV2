import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Loader2, GitBranch, Grid3X3, List as ListIcon, Filter } from "lucide-react";
import { toast } from "sonner";
import { useProjects } from "../../projects/hooks/useProjects";
import { useTasksByProject, useCreateTask, useUpdateTaskStatus } from "../hooks/useTasks";
import { KanbanBoard } from "../components/KanbanBoard";
import { TaskListView } from "../components/TaskListView";
import { CreateTaskModal, CreateTaskFormValues } from "../components/CreateTaskModal";
import { TaskDetailModal } from "../components/TaskDetailModal";
import { TaskDependencyGraph } from "../components/TaskDependencyGraph";
import { TaskDetailDto, TaskStatus } from "../types";
import { ApiError } from "../../../core/api/client";

type StatusFilter = "ALL" | TaskStatus;

export default function TaskBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: projects } = useProjects();
  const { data: tasks, isLoading, isError } = useTasksByProject(id);
  const createTask = useCreateTask(id);
  const updateTaskStatus = useUpdateTaskStatus(id);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("Todo");
  const [selectedTask, setSelectedTask] = useState<TaskDetailDto | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const currentProject = projects?.find((p) => p.projectId === id);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setDefaultStatus("Todo");
      setShowCreateModal(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("create");
        return next;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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

  const filteredTasks = useMemo(() => {
    if (statusFilter === "ALL") return tasks ?? [];
    return (tasks ?? []).filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  if (!projectId || Number.isNaN(id)) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No project selected.</div>;
  }

  return (
    <div className="flex-1 overflow-hidden p-4 flex flex-col">
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{currentProject?.name ?? "Task Board"}</h2>
          <p className="text-[10px] text-gray-500">{filteredTasks.length} / {tasks?.length ?? 0} tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="appearance-none text-xs border border-gray-200 rounded-lg pl-7 pr-2.5 py-1.5 outline-none text-gray-600 bg-white"
            >
              <option value="ALL">All statuses</option>
              <option value="Todo">Todo</option>
              <option value="InProgress">In Progress</option>
              <option value="Done">Done</option>
            </select>
            <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`w-7 h-7 rounded flex items-center justify-center ${view === "kanban" ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}
              title="Kanban view"
            >
              <Grid3X3 size={13} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`w-7 h-7 rounded flex items-center justify-center ${view === "list" ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}
              title="List view"
            >
              <ListIcon size={13} />
            </button>
          </div>

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

      {!isLoading && !isError && view === "kanban" && (
        <KanbanBoard
          tasks={filteredTasks}
          onTaskClick={setSelectedTask}
          onTaskStatusChange={handleStatusChange}
          onAddTask={handleAddTask}
        />
      )}
      {!isLoading && !isError && view === "list" && (
        <TaskListView tasks={filteredTasks} onTaskClick={setSelectedTask} />
      )}

      <CreateTaskModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreate} defaultStatus={defaultStatus} submitting={createTask.isPending} />
      <TaskDetailModal task={selectedTask} projectId={id} otherTasks={tasks ?? []} onClose={() => setSelectedTask(null)} />
      <TaskDependencyGraph open={showGraph} tasks={tasks ?? []} onClose={() => setShowGraph(false)} />
    </div>
  );
}
