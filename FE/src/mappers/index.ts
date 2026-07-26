import type { Project, Task, TeamMember, TaskStatus, RiskLevel, Priority, ProjectType } from "../app/data/tmaiData";
import type { ProjectDto, TaskDetailDto, TeamMemberDto, NotificationDto } from "../types/api";

const PROJECT_COLORS = ["#1E88E5", "#43A047", "#8E24AA", "#E53935", "#00ACC1", "#F4511E"];
const PROJECT_ICONS = ["🚀", "📱", "📊", "🔐", "⚙️", "🤖"];

function toFeStatus(be?: string | null): TaskStatus {
  const map: Record<string, TaskStatus> = {
    Todo: "todo",
    InProgress: "in_progress",
    Done: "done",
  };
  return map[be ?? ""] ?? "todo";
}

export function toBeStatus(fe: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    backlog: "Todo",
    todo: "Todo",
    in_progress: "InProgress",
    review: "InProgress",
    done: "Done",
  };
  return map[fe];
}

function toFeRisk(be?: string | null): RiskLevel {
  const upper = (be ?? "LOW").toUpperCase();
  if (upper === "HIGH") return "high";
  if (upper === "MEDIUM") return "medium";
  return "safe";
}

function riskToScore(risk?: string | null): number {
  const upper = (risk ?? "LOW").toUpperCase();
  if (upper === "HIGH") return 75;
  if (upper === "MEDIUM") return 45;
  return 20;
}

function clampPercent(value?: number | null): number | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function toFePriority(be?: string | null): Priority {
  const p = (be ?? "Medium").toLowerCase();
  if (p === "high") return "high";
  if (p === "low") return "low";
  return "medium";
}

export function mapTeamMember(dto: TeamMemberDto, avatar = ""): TeamMember {
  return {
    id: String(dto.userId),
    name: dto.userName ?? dto.userEmail ?? "Unknown",
    role: dto.role === "LEADER" ? "Project Leader" : "Team Member",
    avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(dto.userName ?? "U")}&background=1A237E&color=fff`,
    skills: [],
  };
}

export function mapTask(dto: TaskDetailDto): Task {
  const assigneeDto = dto.assignees[0];
  const assignee: TeamMember = assigneeDto
    ? {
        id: String(assigneeDto.userId),
        name: assigneeDto.userName ?? "Unassigned",
        role: "Member",
        avatar: assigneeDto.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(assigneeDto.userName ?? "U")}&background=1A237E&color=fff`,
        skills: [],
      }
    : {
        id: "0",
        name: "Unassigned",
        role: "Member",
        avatar: "https://ui-avatars.com/api/?name=U&background=cccccc&color=fff",
        skills: [],
      };

  return {
    id: String(dto.taskId),
    projectId: dto.projectId != null ? String(dto.projectId) : undefined,
    title: dto.title ?? "Untitled",
    description: dto.description ?? "",
    status: toFeStatus(dto.status),
    priority: toFePriority(dto.priority),
    risk: toFeRisk(dto.riskLevel),
    riskScore: riskToScore(dto.riskLevel),
    assignee,
    deadline: dto.deadline ?? "",
    tags: [],
    progress: dto.progress ?? 0,
    aiInsight: dto.aiSummary ?? "",
    comments: 0,
    attachments: 0,
    storyPoints: dto.estimatedTime ?? 0,
  };
}

export function mapProject(dto: ProjectDto, taskCount = 0, taskRiskScore?: number): Project {
  const idx = dto.projectId % PROJECT_COLORS.length;
  return {
    id: String(dto.projectId),
    name: dto.name,
    color: PROJECT_COLORS[idx],
    icon: PROJECT_ICONS[idx],
    taskCount,
    riskScore: taskRiskScore ?? riskToScore(dto.riskLevel),
    progress: clampPercent(dto.progress),
    teamId: dto.teamId ?? undefined,
    projectType: (dto.projectType === "Personal" ? "Personal" : "Team") as ProjectType,
    createdBy: dto.createdBy ?? undefined,
  };
}

export function computeProjectRiskScore(tasks: TaskDetailDto[]): number {
  if (tasks.length === 0) return riskToScore("LOW");
  const scores = tasks.map((t) => riskToScore(t.riskLevel));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  time: string;
  urgent: boolean;
  isRead: boolean;
}

export function mapNotification(dto: NotificationDto): NotificationItem {
  const type = (dto.type ?? "").toUpperCase();
  const urgent = type.includes("RISK") || type.includes("CRITICAL") || type.includes("DEADLINE");
  return {
    id: dto.notificationId,
    title: dto.title ?? "Notification",
    body: dto.message ?? "",
    time: dto.createdAt ? formatRelativeTime(dto.createdAt) : "",
    urgent,
    isRead: dto.isRead,
  };
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
