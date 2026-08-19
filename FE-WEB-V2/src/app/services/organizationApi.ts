import { apiRequest } from "./apiClient";

export type OrganizationRole = "OWNER" | "ORG_ADMIN" | "MEMBER";

export interface OrganizationDto {
  organizationId: number;
  name: string;
  description: string | null;
  logo: string | null;
  ownerId: number | null;
  ownerName: string | null;
  createdAt: string | null;
}

export interface MyOrganizationSummaryDto {
  organizationId: number;
  name: string;
  description: string | null;
  logo: string | null;
  role: OrganizationRole;
  isOwner: boolean;
}

export interface OrganizationMemberDto {
  organizationMemberId: number;
  organizationId: number;
  userId: number;
  userName: string | null;
  email: string | null;
  avatar: string | null;
  role: OrganizationRole;
  status: string;
  joinedAt: string;
}

export interface OrganizationProjectDto {
  projectId: number;
  name: string;
  description: string | null;
  status: string | null;
  deadline: string | null;
  progress: number;
  riskLevel: string;
  teamId: number | null;
  teamMemberCount: number;
  isEvaluated: boolean;
}

export const organizationApi = {
  /** Organizations the caller is an active member of — drives the switcher. */
  mine: () => apiRequest<MyOrganizationSummaryDto[]>("/organizations/mine"),

  getById: (orgId: number) => apiRequest<OrganizationDto>(`/organizations/${orgId}`),

  create: (name: string, description: string | null) =>
    apiRequest<OrganizationDto>("/organizations", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),

  update: (orgId: number, payload: { name?: string | null; description?: string | null; logo?: string | null }) =>
    apiRequest<OrganizationDto>(`/organizations/${orgId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  members: (orgId: number) => apiRequest<OrganizationMemberDto[]>(`/organizations/${orgId}/members`),

  addMember: (orgId: number, email: string, role: OrganizationRole) =>
    apiRequest<OrganizationMemberDto>(`/organizations/${orgId}/members`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  updateMemberRole: (orgId: number, memberId: number, role: OrganizationRole) =>
    apiRequest<OrganizationMemberDto>(`/organizations/${orgId}/members/${memberId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),

  removeMember: (orgId: number, memberId: number) =>
    apiRequest<void>(`/organizations/${orgId}/members/${memberId}`, { method: "DELETE" }),

  projects: (orgId: number) => apiRequest<OrganizationProjectDto[]>(`/organizations/${orgId}/projects`),

  assignMemberToProject: (orgId: number, projectId: number, userId: number, asLeader: boolean) =>
    apiRequest<{ message: string }>(`/organizations/${orgId}/projects/${projectId}/assign-member`, {
      method: "POST",
      body: JSON.stringify({ userId, asLeader }),
    }),
};
