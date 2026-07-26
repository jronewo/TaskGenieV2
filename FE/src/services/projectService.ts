import { api } from "../lib/apiClient";
import { mapProject, computeProjectRiskScore, mapTask } from "../mappers";
import type { Project, Task } from "../app/data/tmaiData";
import type { ProjectDto, TaskDetailDto } from "../types/api";
import type { ProjectType } from "../app/data/tmaiData";

export async function fetchProjects(): Promise<ProjectDto[]> {
  return api<ProjectDto[]>("/projects");
}

export async function fetchProjectsWithTasks(): Promise<{ projects: Project[]; tasks: Task[] }> {
  const dtos = await fetchProjects();
  if (dtos.length === 0) return { projects: [], tasks: [] };

  const taskGroups = await Promise.all(
    dtos.map((p) => api<TaskDetailDto[]>(`/tasks?projectId=${p.projectId}`).catch(() => [] as TaskDetailDto[]))
  );

  const projects = dtos.map((p, i) =>
    mapProject(p, taskGroups[i].length, computeProjectRiskScore(taskGroups[i]))
  );
  const tasks = taskGroups.flat().map(mapTask);
  return { projects, tasks };
}

export async function createProject(
  name: string,
  description: string,
  projectType: ProjectType = "Team"
): Promise<ProjectDto> {
  return api<ProjectDto>("/projects", {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      organizationId: null,
      deadline: null,
      projectType,
    }),
  });
}

export async function inviteProjectMember(projectId: number, email: string) {
  return api(`/projects/${projectId}/invite`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function addProjectMember(projectId: number, email: string, role = "MEMBER") {
  return api(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}
