// Risk analysis + assignment recommendation are wired to the real /api/ai-analysis and
// /api/task-assignment routes. Summarize/classify/task-analyses/workload/evidence are still
// MOCK — see MOCK_API_TODO.md.
import { apiClient } from "../../../core/api/client";
import { loadMockState, mockDelay, nextMockId, saveMockState } from "../../../core/api/mock";

export interface RiskFactor {
  code: string;
  rawValue: string;
  score: number;
  weight: number;
  contribution: number;
  evidence?: string;
}

export interface RiskAssessment {
  runId: string;
  taskId: number;
  projectId?: number;
  totalScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ruleVersion: string;
  calculationMode: string;
  explanation: string;
  mitigationActions: string[];
  factors: RiskFactor[];
  createdAt: string;
}

export interface AssignmentSuggestion {
  rank: number;
  userId: number;
  userName: string;
  score: number;
  reason: string;
  skillMatchScore: number;
  semanticSimilarityScore: number;
  workloadScore: number;
  performanceScore: number;
  status: string;
}

export interface TaskSkillRequirementDto {
  skillId: number;
  skillName: string;
  requiredLevel: number;
}

export interface AssignmentResponse {
  runId: string;
  taskId: number;
  taskTitle?: string;
  requiredSkills: TaskSkillRequirementDto[];
  suggestions: AssignmentSuggestion[];
  generatedAt: string;
  modelVersion: string;
  providerStatus: string;
}

export interface AssignmentRecommendationHistoryDto {
  id: number;
  runId: string;
  taskId: number;
  userId: number;
  userName: string;
  rank: number;
  score: number;
  skillMatchScore: number;
  semanticSimilarityScore: number;
  workloadScore: number;
  performanceScore: number;
  reason: string;
  status: string;
  decidedBy: number | null;
  decidedAt: string | null;
  outcome: string | null;
  modelVersion: string;
  createdAt: string;
}

export interface EvidenceItem {
  evidenceId: number;
  evidenceType: string;
  description?: string;
  externalUrl?: string;
  createdAt: string;
}

export interface ProjectRiskSummaryDto {
  totalActive: number;
  criticalRisk: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  averageScore: number;
  status: "DANGEROUS" | "WARNING" | "SAFE" | string;
  warnings: string[];
}

export interface WorkloadSuggestionItemDto {
  userId: number;
  userName: string;
  suggestedTasks: string[];
  reason: string;
}

export interface WorkloadSuggestionDto {
  projectId: number;
  suggestions: WorkloadSuggestionItemDto[];
  generatedAt: string;
}

export interface AiAnalysisDto {
  id: number;
  taskId: number | null;
  analysisType: string | null;
  content: string | null;
  createdAt: string | null;
}

export interface AiExecutionLogDto {
  runId: string;
  taskId: number | null;
  feature: string;
  provider: string;
  modelVersion: string;
  status: string;
  latencyMs: number;
  errorMessage: string | null;
  createdAt: string;
}

let evidenceByTask = loadMockState<Record<number, EvidenceItem[]>>("ai.evidence", {});
let analysesByTask = loadMockState<Record<number, AiAnalysisDto[]>>("ai.analyses", {});

function persist() {
  saveMockState("ai.evidence", evidenceByTask);
  saveMockState("ai.analyses", analysesByTask);
}

export const aiApi = {
  analyzeRisk: (taskId: number) => apiClient.post<RiskAssessment>(`/ai-analysis/${taskId}/risk`),

  getRiskHistory: (taskId: number) => apiClient.get<RiskAssessment[]>(`/ai-analysis/${taskId}/risk-history`),

  analyzeAllProject: (projectId: number) =>
    apiClient.post<ProjectRiskSummaryDto>(`/ai-analysis/project/${projectId}/analyze-all`),

  summarizeTask: (taskId: number) => {
    analysesByTask[taskId] = [
      { id: nextMockId(analysesByTask[taskId] ?? [], "id"), taskId, analysisType: "SUMMARY", content: "AI summary generated for this task (mock).", createdAt: new Date().toISOString() },
      ...(analysesByTask[taskId] ?? []),
    ];
    persist();
    return mockDelay({ message: "Summary generated." });
  }, // TODO: POST /ai-analysis/{taskId}/summary

  classifyTask: (taskId: number) => {
    analysesByTask[taskId] = [
      { id: nextMockId(analysesByTask[taskId] ?? [], "id"), taskId, analysisType: "CLASSIFICATION", content: "Classified as: Backend / Bug-fix (mock).", createdAt: new Date().toISOString() },
      ...(analysesByTask[taskId] ?? []),
    ];
    persist();
    return mockDelay({ message: "Classification complete." });
  }, // TODO: POST /ai-analysis/{taskId}/classify

  getTaskAnalyses: (taskId: number) => mockDelay(analysesByTask[taskId] ?? []), // TODO: GET /ai-analysis/{taskId}

  getProjectWorkload: (projectId: number) => {
    const suggestion: WorkloadSuggestionDto = {
      projectId,
      suggestions: [
        { userId: 2, userName: "Bao Le", suggestedTasks: ["Refactor risk scoring rules"], reason: "Đang rảnh 40% capacity, kỹ năng phù hợp." },
        { userId: 3, userName: "Chi Pham", suggestedTasks: ["Write API tests for evaluations"], reason: "Workload thấp hơn trung bình team." },
      ],
      generatedAt: new Date().toISOString(),
    };
    return mockDelay(suggestion, 700);
  }, // TODO: GET /ai-analysis/project/{projectId}/workload

  getTaskExecutions: (taskId: number) => apiClient.get<AiExecutionLogDto[]>(`/ai-analysis/${taskId}/executions`),

  recommend: (taskId: number, projectId: number) =>
    apiClient.post<AssignmentResponse>("/task-assignment/recommend", { taskId, projectId }),

  acceptRecommendation: (taskId: number, candidateId: number) =>
    apiClient.post<{ message: string }>("/task-assignment/accept", { taskId, userId: candidateId }),

  rejectRecommendation: (taskId: number, candidateId: number) =>
    apiClient.post<{ message: string }>("/task-assignment/reject", { taskId, userId: candidateId }),

  getAssignmentHistory: (taskId: number) =>
    apiClient.get<AssignmentRecommendationHistoryDto[]>(`/task-assignment/task/${taskId}/history`),

  getEvidence: (taskId: number) => mockDelay(evidenceByTask[taskId] ?? []), // TODO: GET /tasks/{taskId}/evidence

  addUrlEvidence: (taskId: number, externalUrl: string, description: string) => {
    const entry: EvidenceItem = {
      evidenceId: nextMockId(evidenceByTask[taskId] ?? [], "evidenceId"),
      evidenceType: "URL",
      externalUrl,
      description,
      createdAt: new Date().toISOString(),
    };
    evidenceByTask[taskId] = [entry, ...(evidenceByTask[taskId] ?? [])];
    persist();
    return mockDelay(entry);
  }, // TODO: POST /tasks/{taskId}/evidence
};
