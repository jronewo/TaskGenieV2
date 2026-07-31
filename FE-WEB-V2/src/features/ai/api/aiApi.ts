// Fully wired to the real /api/ai-analysis, /api/task-assignment and
// /api/tasks/{taskId}/evidence routes — see MOCK_API_TODO.md.
import { apiClient } from "../../../core/api/client";

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

export interface AttachmentDto {
  attachmentId: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
  createdAt: string;
}

export interface EvidenceItem {
  evidenceId: number;
  taskId: number;
  taskLogId: number | null;
  evidenceType: string;
  description?: string | null;
  externalUrl?: string | null;
  attachment: AttachmentDto | null;
  submittedBy: number;
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

export const aiApi = {
  analyzeRisk: (taskId: number) => apiClient.post<RiskAssessment>(`/ai-analysis/${taskId}/risk`),

  getRiskHistory: (taskId: number) => apiClient.get<RiskAssessment[]>(`/ai-analysis/${taskId}/risk-history`),

  analyzeAllProject: (projectId: number) =>
    apiClient.post<ProjectRiskSummaryDto>(`/ai-analysis/project/${projectId}/analyze-all`),

  summarizeTask: (taskId: number) => apiClient.post<{ message: string }>(`/ai-analysis/${taskId}/summary`),

  classifyTask: (taskId: number) => apiClient.post<{ message: string }>(`/ai-analysis/${taskId}/classify`),

  getTaskAnalyses: (taskId: number) => apiClient.get<AiAnalysisDto[]>(`/ai-analysis/${taskId}`),

  getProjectWorkload: (projectId: number) =>
    apiClient.get<WorkloadSuggestionDto>(`/ai-analysis/project/${projectId}/workload`),

  getTaskExecutions: (taskId: number) => apiClient.get<AiExecutionLogDto[]>(`/ai-analysis/${taskId}/executions`),

  recommend: (taskId: number, projectId: number) =>
    apiClient.post<AssignmentResponse>("/task-assignment/recommend", { taskId, projectId }),

  acceptRecommendation: (taskId: number, candidateId: number) =>
    apiClient.post<{ message: string }>("/task-assignment/accept", { taskId, userId: candidateId }),

  rejectRecommendation: (taskId: number, candidateId: number) =>
    apiClient.post<{ message: string }>("/task-assignment/reject", { taskId, userId: candidateId }),

  getAssignmentHistory: (taskId: number) =>
    apiClient.get<AssignmentRecommendationHistoryDto[]>(`/task-assignment/task/${taskId}/history`),

  getEvidence: (taskId: number) => apiClient.get<EvidenceItem[]>(`/tasks/${taskId}/evidence`),

  addUrlEvidence: (taskId: number, externalUrl: string, description: string) =>
    apiClient.post<EvidenceItem>(`/tasks/${taskId}/evidence`, { evidenceType: "URL", externalUrl, description }),
};
