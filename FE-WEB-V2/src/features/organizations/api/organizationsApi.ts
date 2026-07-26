// MOCK — backend routes exist (see MOCK_API_TODO.md) but are not wired yet.
// Swap the bodies below for `apiClient` calls once BE/FE merge is done; keep the function
// names/signatures as-is since they already match the real routes.
import { loadMockState, mockDelay, nextMockId, saveMockState } from "../../../core/api/mock";
import { EvaluateProjectRequest, MyOrganizationResponse, OrganizationDto, OrganizationProjectDto, ProjectEvaluationDto } from "../types";

const seedOrganizations: OrganizationDto[] = [
  {
    organizationId: 1,
    name: "TaskGenie Labs",
    description: "Core product organization running all delivery teams.",
    logo: null,
    ownerId: 1,
    ownerName: "Alex Nguyen",
    createdAt: "2025-01-10T00:00:00Z",
  },
  {
    organizationId: 2,
    name: "Northwind Consulting",
    description: "External partner organization for client engagements.",
    logo: null,
    ownerId: 4,
    ownerName: "Minh Tran",
    createdAt: "2025-03-22T00:00:00Z",
  },
];

const seedProjectsByOrg: Record<number, OrganizationProjectDto[]> = {
  1: [
    {
      projectId: 1,
      name: "TaskGenie Web Revamp",
      description: "Rebuild the web client on the new Clean Architecture backend.",
      status: "InProgress",
      deadline: "2026-09-30",
      progress: 62,
      predictedEndDate: "2026-10-08",
      riskLevel: "MEDIUM",
      pmId: 1,
      pmName: "Alex Nguyen",
      isEvaluated: false,
      teamId: 1,
      teamMemberCount: 6,
    },
    {
      projectId: 2,
      name: "AI Risk Engine",
      description: "Rule-based + ML risk scoring for tasks and projects.",
      status: "InProgress",
      deadline: "2026-08-15",
      progress: 40,
      predictedEndDate: "2026-08-28",
      riskLevel: "HIGH",
      pmId: 2,
      pmName: "Bao Le",
      isEvaluated: false,
      teamId: 2,
      teamMemberCount: 4,
    },
  ],
  2: [
    {
      projectId: 3,
      name: "Client Portal MVP",
      description: "First delivery milestone for Northwind's client portal.",
      status: "Closed",
      deadline: "2026-05-01",
      progress: 100,
      predictedEndDate: "2026-04-28",
      riskLevel: "LOW",
      pmId: 4,
      pmName: "Minh Tran",
      isEvaluated: true,
      teamId: 3,
      teamMemberCount: 5,
    },
  ],
};

const evaluations = loadMockState<ProjectEvaluationDto[]>("organizations.evaluations", [
  {
    evaluationId: 1,
    projectId: 3,
    evaluatorId: 4,
    evaluatorName: "Minh Tran",
    overallScore: 4.5,
    qualityScore: 4,
    timelinessScore: 5,
    communicationScore: 4.5,
    comment: "Delivered on time with strong client feedback.",
    createdAt: "2026-05-02T09:00:00Z",
  },
]);

function persistEvaluations() {
  saveMockState("organizations.evaluations", evaluations);
}

export const organizationsApi = {
  adminAll: () => mockDelay(seedOrganizations), // TODO: GET /organizations/admin/all

  my: () =>
    mockDelay<MyOrganizationResponse>({
      org: seedOrganizations[0],
      projects: seedProjectsByOrg[seedOrganizations[0].organizationId] ?? [],
    }), // TODO: GET /organizations/my

  get: (orgId: number) => mockDelay(seedOrganizations.find((o) => o.organizationId === orgId) ?? null), // TODO: GET /organizations/{orgId}

  projects: (orgId: number) => mockDelay(seedProjectsByOrg[orgId] ?? []), // TODO: GET /organizations/{orgId}/projects

  project: (orgId: number, projectId: number) =>
    mockDelay((seedProjectsByOrg[orgId] ?? []).find((p) => p.projectId === projectId) ?? null), // TODO: GET /organizations/{orgId}/projects/{projectId}

  evaluateProject: (orgId: number, projectId: number, body: EvaluateProjectRequest) => {
    const evaluator = seedOrganizations.find((o) => o.organizationId === orgId);
    const entry: ProjectEvaluationDto = {
      evaluationId: nextMockId(evaluations, "evaluationId"),
      projectId,
      evaluatorId: body.evaluatorId,
      evaluatorName: evaluator?.ownerName ?? "You",
      overallScore: body.overallScore ?? null,
      qualityScore: body.qualityScore ?? null,
      timelinessScore: body.timelinessScore ?? null,
      communicationScore: body.communicationScore ?? null,
      comment: body.comment ?? null,
      createdAt: new Date().toISOString(),
    };
    evaluations.unshift(entry);
    persistEvaluations();
    const list = seedProjectsByOrg[orgId];
    const project = list?.find((p) => p.projectId === projectId);
    if (project) project.isEvaluated = true;
    return mockDelay({ message: "Project evaluation submitted." });
  }, // TODO: POST /organizations/{orgId}/projects/{projectId}/evaluate

  getEvaluation: (_orgId: number, projectId: number) =>
    mockDelay(evaluations.find((e) => e.projectId === projectId) ?? null), // TODO: GET /organizations/{orgId}/projects/{projectId}/evaluation
};
