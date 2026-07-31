import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { projectsApi, type Project } from '../api';
import { useApiQuery } from '../hooks/useApi';
import { useAuth } from './AuthContext';

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  activeProjectId: number | null;
  setActiveProjectId: (id: number) => void;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

/**
 * Most screens are scoped to one project, but the API has no "current project"
 * concept — it returns every project the user belongs to. Hold the selection
 * here so the board, analytics and team screens agree on it.
 */
export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  const { data, error, isLoading, refetch } = useApiQuery(
    signal => projectsApi.getMine(signal),
    [isAuthenticated],
    { enabled: isAuthenticated },
  );

  const projects = useMemo(() => data ?? [], [data]);

  // Default to the first project, and recover if the selected one disappears.
  useEffect(() => {
    if (projects.length === 0) {
      setActiveProjectId(null);
      return;
    }
    setActiveProjectId(current =>
      current !== null && projects.some(p => p.projectId === current)
        ? current
        : projects[0].projectId,
    );
  }, [projects]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      activeProject: projects.find(p => p.projectId === activeProjectId) ?? null,
      activeProjectId,
      setActiveProjectId,
      isLoading,
      error,
      refetch,
    }),
    [projects, activeProjectId, isLoading, error, refetch],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects must be used inside a <ProjectProvider>');
  return ctx;
}
