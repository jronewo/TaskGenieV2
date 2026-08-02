import { useCallback, useEffect, useState } from "react";
import { projectApi, ProjectDto, TaskSummaryDto } from "../services/projectApi";

export interface WorkspaceSnapshot {
  projects: ProjectDto[];
  tasks: TaskSummaryDto[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Real workspace data for the shell (sidebar project list, header stats).
 *
 * Tasks are fetched per project because the API is project-scoped — that scoping is deliberate
 * (it is what stops one tenant reading another's tasks), so the client fans out rather than
 * asking for a global task list that would have to bypass it.
 */
export function useWorkspace(): WorkspaceSnapshot {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [tasks, setTasks] = useState<TaskSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const projectList = await projectApi.list();
        if (cancelled) return;
        setProjects(projectList);

        const perProject = await Promise.all(
          projectList.map((p) =>
            projectApi.getTasksByProject(p.projectId).catch(() => [] as TaskSummaryDto[])
          )
        );
        if (!cancelled) setTasks(perProject.flat());
      } catch {
        if (!cancelled) {
          setError("Could not load your workspace.");
          setProjects([]);
          setTasks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return { projects, tasks, loading, error, reload };
}

/** Aggregates used by the stats bar. Derived from real rows, never hardcoded. */
export function summariseWorkspace(projects: ProjectDto[], tasks: TaskSummaryDto[]) {
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "Done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "InProgress").length;
  const todoTasks = tasks.filter((t) => t.status === "Todo").length;
  const highRiskProjects = projects.filter((p) => p.riskLevel === "HIGH").length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  const averageProgress =
    projects.length === 0 ? 0 : Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length);

  return {
    totalProjects: projects.length,
    totalTasks,
    doneTasks,
    inProgressTasks,
    todoTasks,
    highRiskProjects,
    completionRate,
    averageProgress,
  };
}
