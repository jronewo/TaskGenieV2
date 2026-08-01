import { apiRequest } from "./apiClient";

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

export interface AssignmentResponse {
  runId: string;
  taskId: number;
  taskTitle?: string;
  suggestions: AssignmentSuggestion[];
  generatedAt: string;
  modelVersion: string;
  providerStatus: string;
}

export interface EvidenceItem {
  evidenceId: number;
  evidenceType: string;
  description?: string;
  externalUrl?: string;
  createdAt: string;
}

// Actor identity (who is performing the analysis/decision) is derived server-side from the
// Bearer token — callers only ever select a task/project by ID, never an actor or leader ID.
export const coreAiApi = {
  analyzeRisk: (taskId: number) =>
    apiRequest<RiskAssessment>(`/ai-analysis/${taskId}/risk`, { method: "POST" }),

  getRiskHistory: (taskId: number) =>
    apiRequest<RiskAssessment[]>(`/ai-analysis/${taskId}/risk-history`),

  recommend: (taskId: number, projectId: number) =>
    apiRequest<AssignmentResponse>("/task-assignment/recommend", {
      method: "POST",
      body: JSON.stringify({ taskId, projectId }),
    }),

  acceptRecommendation: (taskId: number, candidateId: number) =>
    apiRequest<{ message: string }>("/task-assignment/accept", {
      method: "POST",
      body: JSON.stringify({ taskId, userId: candidateId, outcome: "Accepted from AI Core demo" }),
    }),

  rejectRecommendation: (taskId: number, candidateId: number) =>
    apiRequest<{ message: string }>("/task-assignment/reject", {
      method: "POST",
      body: JSON.stringify({ taskId, userId: candidateId, reason: "Rejected from AI Core demo" }),
    }),

  getEvidence: (taskId: number) =>
    apiRequest<EvidenceItem[]>(`/tasks/${taskId}/evidence`),

  addUrlEvidence: (taskId: number, externalUrl: string, description: string) =>
    apiRequest<EvidenceItem>(`/tasks/${taskId}/evidence`, {
      method: "POST",
      body: JSON.stringify({ evidenceType: "URL", externalUrl, description }),
    }),
};
