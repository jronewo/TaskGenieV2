import { apiRequest } from "./apiClient";
import { PlanAudience } from "./billingApi";

export interface PlatformStatsDto {
  users: number;
  organizations: number;
  projects: number;
  tasks: number;
  tasksDone: number;
}

export interface AdminUserDto {
  userId: number;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  status: number;
  createdAt: string | null;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminPlanDto {
  planId: number;
  code: string;
  name: string;
  audience: PlanAudience;
  billingInterval: string;
  priceMinor: number;
  currency: string;
  projectLimit: number | null;
  memberLimit: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminSubscriptionDto {
  subscriptionId: number;
  planCode: string | null;
  ownerType: PlanAudience;
  userId: number | null;
  organizationId: number | null;
  status: string;
  startedAt: string | null;
  currentPeriodEnd: string | null;
}

export interface AdminPaymentDto {
  paymentTransactionId: number;
  subscriptionId: number;
  planCode: string | null;
  userId: number | null;
  organizationId: number | null;
  amountMinor: number;
  currency: string;
  status: string;
  provider: string;
  isTest: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface SubscriptionAnalyticsPoint {
  period: string;
  planCode: string;
  audience: PlanAudience;
  count: number;
  revenueMinor: number;
}

export interface SubscriptionAnalyticsDto {
  activeSubscriptions: number;
  totalRevenueMinor: number;
  /** Revenue produced by the simulated gateway — reported separately, never mixed with real money. */
  testRevenueMinor: number;
  byMonth: SubscriptionAnalyticsPoint[];
}

export interface AdminOrganizationDto {
  organizationId: number;
  name: string;
  description: string | null;
  ownerId: number | null;
  ownerName: string | null;
  createdAt: string | null;
}

export interface AdminSkillDto {
  skillId: number;
  skillName: string;
  isActive: boolean;
}

export const adminApi = {
  platformStats: () => apiRequest<PlatformStatsDto>("/admin/platform-stats"),
  subscriptionAnalytics: () => apiRequest<SubscriptionAnalyticsDto>("/admin/subscription-analytics"),

  users: (search: string, page: number, pageSize: number) =>
    apiRequest<PagedResult<AdminUserDto>>(
      `/admin/users?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`
    ),

  /** Suspends an account. Omit days for a permanent ban. */
  banUser: (userId: number, days: number | null, reason: string | null) =>
    apiRequest<AdminUserDto>(`/admin/users/${userId}/ban`, {
      method: "POST",
      body: JSON.stringify({ days, reason }),
    }),

  setUserStatus: (userId: number, status: number) =>
    apiRequest<AdminUserDto>(`/admin/users/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  setUserRole: (userId: number, role: string) =>
    apiRequest<AdminUserDto>(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),

  organizations: () => apiRequest<AdminOrganizationDto[]>("/admin/organizations"),

  subscriptions: (status?: string) =>
    apiRequest<AdminSubscriptionDto[]>(`/admin/subscriptions${status ? `?status=${status}` : ""}`),

  payments: (status?: string) =>
    apiRequest<AdminPaymentDto[]>(`/admin/payments${status ? `?status=${status}` : ""}`),

  plans: () => apiRequest<AdminPlanDto[]>("/admin/plans"),

  updatePlan: (
    planId: number,
    payload: { name?: string | null; priceMinor?: number | null; projectLimit?: number | null; memberLimit?: number | null; sortOrder?: number | null }
  ) =>
    apiRequest<AdminPlanDto>(`/admin/plans/${planId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  setPlanActive: (planId: number, isActive: boolean) =>
    apiRequest<AdminPlanDto>(`/admin/plans/${planId}/active`, {
      method: "PUT",
      body: JSON.stringify({ isActive }),
    }),
};

export const skillApi = {
  /** Active catalog visible to every user. */
  catalog: () => apiRequest<{ skillId: number; skillName: string }[]>("/skills"),

  /** Full catalog including archived entries — administrators only. */
  adminCatalog: (search?: string, isActive?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (isActive !== undefined) params.set("isActive", String(isActive));
    const qs = params.toString();
    return apiRequest<AdminSkillDto[]>(`/skills/admin${qs ? `?${qs}` : ""}`);
  },

  create: (skillName: string) =>
    apiRequest<{ skillId: number; skillName: string }>("/skills", {
      method: "POST",
      body: JSON.stringify({ skillName }),
    }),

  rename: (skillId: number, skillName: string) =>
    apiRequest<AdminSkillDto>(`/skills/${skillId}`, {
      method: "PUT",
      body: JSON.stringify({ skillName }),
    }),

  setActive: (skillId: number, isActive: boolean) =>
    apiRequest<AdminSkillDto>(`/skills/${skillId}/active`, {
      method: "PUT",
      body: JSON.stringify({ isActive }),
    }),

  mine: () =>
    apiRequest<{ id: number; userId: number; skillId: number; skillName: string | null; level: number | null }[]>(
      "/skills/me"
    ),

  addMine: (skillId: number, level: number) =>
    apiRequest<{ message: string }>("/skills/user", {
      method: "POST",
      body: JSON.stringify({ skillId, level }),
    }),

  updateMine: (userSkillId: number, level: number) =>
    apiRequest<void>(`/skills/user/${userSkillId}`, {
      method: "PUT",
      body: JSON.stringify(level),
    }),

  removeMine: (userSkillId: number) =>
    apiRequest<void>(`/skills/user/${userSkillId}`, { method: "DELETE" }),
};
