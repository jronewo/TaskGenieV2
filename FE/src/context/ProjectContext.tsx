import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Project, Task, TeamMember, ProjectType, Priority } from "../app/data/tmaiData";
import { useAuth } from "./AuthContext";
import { mapTeamMember, type NotificationItem } from "../mappers";
import {
  fetchProjectsWithTasks,
  createProject as apiCreateProject,
  inviteProjectMember,
} from "../services/projectService";
import {
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  updateTaskProgress,
  assignTask as apiAssignTask,
} from "../services/taskService";
import { fetchMyTeams } from "../services/teamService";
import { fetchUserNotifications, fetchUnreadCount } from "../services/notificationService";
import {
  fetchUserInvitations,
  acceptInvitation as apiAcceptInvitation,
} from "../services/invitationService";
import type { InvitationDto, ProjectTeamRole, TeamDto } from "../types/api";

interface ProjectContextValue {
  isLoading: boolean;
  error: string | null;
  projects: Project[];
  personalProjects: Project[];
  teamProjects: Project[];
  tasks: Task[];
  teamMembers: TeamMember[];
  teams: TeamDto[];
  notifications: NotificationItem[];
  pendingInvitations: InvitationDto[];
  unreadCount: number;
  refresh: () => Promise<void>;
  getProjectRole: (projectId: string) => ProjectTeamRole | null;
  canInviteToProject: (projectId: string) => boolean;
  createProject: (name: string, projectType: ProjectType, description?: string) => Promise<string>;
  inviteToProject: (projectId: string, email: string) => Promise<void>;
  acceptInvitation: (invitationId: number) => Promise<void>;
  createTask: (
    projectId: string,
    data: { title: string; description?: string; deadline?: string; priority?: Priority }
  ) => Promise<void>;
  editTask: (
    taskId: string,
    data: {
      title: string;
      description?: string;
      deadline?: string;
      priority?: Priority;
      status?: Task["status"];
    }
  ) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, status: Task["status"], progress: number) => Promise<void>;
  updateTaskDetails: (
    taskId: string,
    data: { deadline?: string; priority?: Priority }
  ) => Promise<void>;
  assignTask: (taskId: string, userId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

function teamsToMembers(teams: TeamDto[]): TeamMember[] {
  const byUser = new Map<number, TeamMember>();
  for (const team of teams) {
    for (const m of team.members) {
      if (!byUser.has(m.userId)) {
        byUser.set(m.userId, mapTeamMember(m));
      }
    }
  }
  return Array.from(byUser.values());
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<InvitationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const personalProjects = useMemo(
    () => projects.filter((p) => p.projectType === "Personal"),
    [projects]
  );
  const teamProjects = useMemo(
    () => projects.filter((p) => p.projectType !== "Personal"),
    [projects]
  );
  const teamMembers = useMemo(() => teamsToMembers(teams), [teams]);

  const getProjectRole = useCallback(
    (projectId: string): ProjectTeamRole | null => {
      if (!user) return null;
      const project = projects.find((p) => p.id === projectId);
      if (!project?.teamId) return null;
      const team = teams.find((t) => t.teamId === project.teamId);
      const membership = team?.members.find((m) => m.userId === user.userId);
      return (membership?.role as ProjectTeamRole) ?? null;
    },
    [user, teams, projects]
  );

  const canInviteToProject = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project || project.projectType === "Personal") return false;
      return getProjectRole(projectId) === "LEADER";
    },
    [projects, getProjectRole]
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const [teamsData, { projects: proj, tasks: tsk }, notifs, unread, invites] =
        await Promise.all([
          fetchMyTeams(),
          fetchProjectsWithTasks(),
          fetchUserNotifications(user.userId).catch(() => []),
          fetchUnreadCount(user.userId).catch(() => 0),
          user.email
            ? fetchUserInvitations(user.email).catch(() => [])
            : Promise.resolve([]),
        ]);

      setTeams(teamsData);
      setProjects(proj);
      setTasks(tsk);
      setNotifications(notifs);
      setUnreadCount(unread);
      setPendingInvitations(
        invites.filter((i) => (i.status ?? "").toLowerCase() === "pending")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      refresh();
    } else {
      setTeams([]);
      setProjects([]);
      setTasks([]);
      setNotifications([]);
      setPendingInvitations([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, user?.userId, refresh]);

  const createProject = useCallback(
    async (name: string, projectType: ProjectType, description = "") => {
      const dto = await apiCreateProject(name, description, projectType);
      await refresh();
      return String(dto.projectId);
    },
    [refresh]
  );

  const inviteToProject = useCallback(
    async (projectId: string, email: string) => {
      await inviteProjectMember(Number(projectId), email);
      await refresh();
    },
    [refresh]
  );

  const acceptInvitation = useCallback(
    async (invitationId: number) => {
      await apiAcceptInvitation(invitationId);
      await refresh();
    },
    [refresh]
  );

  const createTask = useCallback(
    async (
      projectId: string,
      data: { title: string; description?: string; deadline?: string; priority?: Priority }
    ) => {
      await apiCreateTask({
        projectId: Number(projectId),
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        priority: data.priority,
      });
      await refresh();
    },
    [refresh]
  );

  const editTask = useCallback(
    async (
      taskId: string,
      data: {
        title: string;
        description?: string;
        deadline?: string;
        priority?: Priority;
        status?: Task["status"];
      }
    ) => {
      const existing = tasks.find((t) => t.id === taskId);
      const progress =
        data.status === "done"
          ? 100
          : data.status === "in_progress" || data.status === "review"
            ? Math.max(existing?.progress ?? 50, 50)
            : existing?.progress ?? 0;

      await apiUpdateTask(Number(taskId), {
        title: data.title,
        description: data.description,
        deadline: data.deadline || null,
        priority: data.priority,
        status: data.status,
        progress,
      });
      await refresh();
    },
    [refresh, tasks]
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      await apiDeleteTask(Number(taskId));
      await refresh();
    },
    [refresh]
  );

  const updateTask = useCallback(
    async (taskId: string, status: Task["status"], progress: number) => {
      await updateTaskProgress(Number(taskId), status, progress);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status, progress } : t))
      );
    },
    []
  );

  const updateTaskDetails = useCallback(
    async (taskId: string, data: { deadline?: string; priority?: Priority }) => {
      await apiUpdateTask(Number(taskId), data);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...data } : t))
      );
    },
    []
  );

  const assignTask = useCallback(
    async (taskId: string, userId: string) => {
      await apiAssignTask(Number(taskId), Number(userId));
      await refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      isLoading,
      error,
      projects,
      personalProjects,
      teamProjects,
      tasks,
      teamMembers,
      teams,
      notifications,
      pendingInvitations,
      unreadCount,
      refresh,
      getProjectRole,
      canInviteToProject,
      createProject,
      inviteToProject,
      acceptInvitation,
      createTask,
      editTask,
      removeTask,
      updateTask,
      updateTaskDetails,
      assignTask,
    }),
    [
      isLoading,
      error,
      projects,
      personalProjects,
      teamProjects,
      tasks,
      teamMembers,
      teams,
      notifications,
      pendingInvitations,
      unreadCount,
      refresh,
      getProjectRole,
      canInviteToProject,
      createProject,
      inviteToProject,
      acceptInvitation,
      createTask,
      editTask,
      removeTask,
      updateTask,
      updateTaskDetails,
      assignTask,
    ]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return ctx;
}
