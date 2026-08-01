import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../api/projectsApi";
import { teamsApi } from "../../teams/api/teamsApi";
import { AddProjectMemberRequest, CreateProjectRequest, UpdateProjectRequest } from "../types";

const projectsKey = ["projects"] as const;
const projectKey = (id: number) => ["projects", id] as const;
const projectMembersKey = (id: number) => ["projects", id, "members"] as const;

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

export function useProjectMembers(id: number | null) {
  return useQuery({
    queryKey: id ? projectMembersKey(id) : ["projects", "none", "members"],
    queryFn: () => projectsApi.members(id as number),
    enabled: id !== null,
  });
}

export function useAddProjectMember(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddProjectMemberRequest) => projectsApi.addMember(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKey(id) });
      queryClient.invalidateQueries({ queryKey: projectMembersKey(id) });
    },
  });
}

export function useRemoveProjectMember(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    // Project members are really team members under the project's 1:1 team, so removal
    // goes through the same endpoint teams use.
    mutationFn: (memberId: number) => teamsApi.removeMember(memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectMembersKey(id) }),
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
