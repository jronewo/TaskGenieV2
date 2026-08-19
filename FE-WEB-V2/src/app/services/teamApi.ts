import { apiRequest } from "./apiClient";

export interface TeamMemberDto {
  id: number;
  teamId?: number | null;
  userId?: number | null;
  userName?: string | null;
  email?: string | null;
  avatar?: string | null;
  role?: string | null;
}

export interface TeamDto {
  teamId: number;
  name?: string | null;
  description?: string | null;
  createdBy?: number | null;
  members: TeamMemberDto[];
}

export interface EvaluationDto {
  evaluationId: number;
  userId: number;
  userName?: string | null;
  leaderId?: number | null;
  leaderName?: string | null;
  skillScore?: number | null;
  teamworkScore?: number | null;
  deadlineScore?: number | null;
  communicationScore?: number | null;
  createdAt?: string | null;
}

export const teamApi = {
  myTeams: () => apiRequest<TeamDto[]>("/teams/my"),

  getById: (teamId: number) => apiRequest<TeamDto>(`/teams/${teamId}`),

  create: (name: string, description: string | null) =>
    apiRequest<TeamDto>("/teams", { method: "POST", body: JSON.stringify({ name, description }) }),

  addMember: (teamId: number, userId: number, role: string) =>
    apiRequest<{ message: string }>(`/teams/${teamId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId, role }),
    }),

  removeMember: (memberId: number) => apiRequest<void>(`/teams/members/${memberId}`, { method: "DELETE" }),

  remove: (teamId: number) => apiRequest<void>(`/teams/${teamId}`, { method: "DELETE" }),
};

export const userApi = {
  /** Used to resolve an email to a user before adding them to a team. */
  searchByEmail: (email: string) =>
    apiRequest<{ userId: number; name: string; email: string; avatar?: string | null }>(
      `/users/search?email=${encodeURIComponent(email)}`
    ),
};

// The evaluating leader is always the authenticated actor — the API takes no leaderId.
export const evaluationApi = {
  forUser: (userId: number) => apiRequest<EvaluationDto[]>(`/evaluations/user/${userId}`),

  byLeader: (leaderId: number) => apiRequest<EvaluationDto[]>(`/evaluations/leader/${leaderId}`),

  create: (payload: {
    userId: number;
    skillScore?: number | null;
    teamworkScore?: number | null;
    deadlineScore?: number | null;
    communicationScore?: number | null;
  }) => apiRequest<EvaluationDto>("/evaluations", { method: "POST", body: JSON.stringify(payload) }),

  remove: (evaluationId: number) => apiRequest<void>(`/evaluations/${evaluationId}`, { method: "DELETE" }),
};
