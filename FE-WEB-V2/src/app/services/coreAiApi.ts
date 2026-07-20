const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5258/api").replace(/\/$/, "");

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

async function request<T>(path: string, userId: number, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": String(userId),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? payload?.error ?? `API request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

export const coreAiApi = {
  analyzeRisk: (taskId: number, userId: number) =>
    request<RiskAssessment>(`/ai-analysis/${taskId}/risk`, userId, { method: "POST" }),

  getRiskHistory: (taskId: number, userId: number) =>
    request<RiskAssessment[]>(`/ai-analysis/${taskId}/risk-history`, userId),

  recommend: (taskId: number, projectId: number, userId: number) =>
    request<AssignmentResponse>("/task-assignment/recommend", userId, {
      method: "POST",
      body: JSON.stringify({ taskId, projectId }),
    }),

  acceptRecommendation: (taskId: number, candidateId: number, userId: number) =>
    request<{ message: string }>("/task-assignment/accept", userId, {
      method: "POST",
      body: JSON.stringify({ taskId, userId: candidateId, outcome: "Accepted from AI Core demo" }),
    }),

  rejectRecommendation: (taskId: number, candidateId: number, userId: number) =>
    request<{ message: string }>("/task-assignment/reject", userId, {
      method: "POST",
      body: JSON.stringify({ taskId, userId: candidateId, reason: "Rejected from AI Core demo" }),
    }),

  getEvidence: (taskId: number, userId: number) =>
    request<EvidenceItem[]>(`/tasks/${taskId}/evidence`, userId),

  addUrlEvidence: (taskId: number, externalUrl: string, description: string, userId: number) =>
    request<EvidenceItem>(`/tasks/${taskId}/evidence`, userId, {
      method: "POST",
      body: JSON.stringify({ evidenceType: "URL", externalUrl, description }),
    }),
};
