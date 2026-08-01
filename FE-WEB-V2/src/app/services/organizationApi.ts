import { apiRequest } from "./apiClient";

export interface OrganizationDto {
  organizationId: number;
  name: string;
  description?: string | null;
  logo?: string | null;
  ownerId?: number | null;
  ownerName?: string | null;
  createdAt?: string | null;
}

export interface MyOrganizationDto {
  organization: OrganizationDto;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

// Minimal slice used by the subscription/plans page to know which organizations the current
// user belongs to, and whether they may manage that organization's plan (OWNER/ADMIN only —
// enforced server-side regardless of what this returns).
export const organizationApi = {
  listMine: () => apiRequest<MyOrganizationDto[]>("/organizations/mine"),
};
