import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../api/projectsApi";
import { AddProjectMemberRequest, CreateProjectRequest, UpdateProjectRequest } from "../types";

const projectsKey = ["projects"] as const;
const projectKey = (id: number) => ["projects", id] as const;

export function useProjects() {
  return useQuery({ queryKey: projectsKey, queryFn: projectsApi.list });
}

export function useProject(id: number | null) {
  return useQuery({
    queryKey: id ? projectKey(id) : ["projects", "none"],
    queryFn: () => projectsApi.get(id as number),
    enabled: id !== null,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectRequest) => projectsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsKey }),
  });
}

export function useUpdateProject(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProjectRequest) => projectsApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKey });
      queryClient.invalidateQueries({ queryKey: projectKey(id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => projectsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsKey }),
  });
}

export function useAddProjectMember(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddProjectMemberRequest) => projectsApi.addMember(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKey(id) }),
  });
}

export function usePreviewProjectSummary(id: number) {
  return useMutation({ mutationFn: () => projectsApi.summary(id) });
}

export function useCloseProject(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => projectsApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKey });
      queryClient.invalidateQueries({ queryKey: projectKey(id) });
    },
  });
}
