export interface OrganizationDto {
  organizationId: number;
  name: string;
  description: string | null;
  logo: string | null;
  ownerId: number | null;
  ownerName: string | null;
  createdAt: string | null;
}

export interface OrganizationProjectDto {
  projectId: number;
  name: string;
  description: string | null;
  status: string | null;
  deadline: string | null;
  progress: number;
  predictedEndDate: string | null;
  riskLevel: string;
  pmId: number | null;
  pmName: string | null;
  isEvaluated: boolean;
  teamId: number | null;
  teamMemberCount: number;
}

export interface MyOrganizationResponse {
  org: OrganizationDto | null;
  projects: OrganizationProjectDto[];
}

export interface ProjectEvaluationDto {
  evaluationId: number;
  projectId: number;
  evaluatorId: number;
  evaluatorName: string;
  overallScore: number | null;
  qualityScore: number | null;
  timelinessScore: number | null;
  communicationScore: number | null;
  comment: string | null;
  createdAt: string | null;
}

export interface EvaluateProjectRequest {
  evaluatorId: number;
  overallScore?: number;
  qualityScore?: number;
  timelinessScore?: number;
  communicationScore?: number;
  comment?: string;
}
