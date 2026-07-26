import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../api/tasksApi";
import { CreateTaskRequest, TaskStatus, UpdateProgressRequest, UpdateTaskRequest } from "../types";

const byProjectKey = (projectId: number) => ["tasks", "project", projectId] as const;
const taskKey = (id: number) => ["tasks", id] as const;

export function useMyTasks() {
  return useQuery({ queryKey: ["tasks", "my"], queryFn: tasksApi.myTasks });
}

export function useTasksByProject(projectId: number | null) {
  return useQuery({
    queryKey: projectId ? byProjectKey(projectId) : ["tasks", "project", "none"],
    queryFn: () => tasksApi.byProject(projectId as number),
    enabled: projectId !== null,
  });
}

export function useTask(id: number | null) {
  return useQuery({
    queryKey: id ? taskKey(id) : ["tasks", "none"],
    queryFn: () => tasksApi.get(id as number),
    enabled: id !== null,
  });
}

export function useCreateTask(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<CreateTaskRequest, "projectId">) => tasksApi.create({ ...body, projectId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: byProjectKey(projectId) }),
  });
}

export function useUpdateTask(projectId: number, taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTaskRequest) => tasksApi.update(taskId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: byProjectKey(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKey(taskId) });
    },
  });
}

export function useUpdateTaskStatus(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) => tasksApi.update(taskId, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: byProjectKey(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKey(variables.taskId) });
    },
  });
}

export function useDeleteTask(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) => tasksApi.remove(taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: byProjectKey(projectId) }),
  });
}

export function useUpdateTaskProgress(projectId: number, taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProgressRequest) => tasksApi.updateProgress(taskId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: byProjectKey(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKey(taskId) });
    },
  });
}

export function useEstimateTask(projectId: number, taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tasksApi.estimate(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: byProjectKey(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKey(taskId) });
    },
  });
}

export function useAddDependency(projectId: number, taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dependsOnTaskId: number) => tasksApi.addDependency(taskId, dependsOnTaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: byProjectKey(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKey(taskId) });
    },
  });
}

export function useRemoveDependency(projectId: number, taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dependencyId: number) => tasksApi.removeDependency(taskId, dependencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: byProjectKey(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKey(taskId) });
    },
  });
}
