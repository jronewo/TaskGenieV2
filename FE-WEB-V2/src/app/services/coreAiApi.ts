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

export interface AssistantContext {
  projectCount: number;
  taskCount: number;
  projectName: string | null;
}

export interface AgentStep {
  tool: string;
  arguments: string;
  result: string;
}

export interface AgentReply {
  answer: string;
  /** What the agent actually did, so the user can audit it rather than trust a bare answer. */
  steps: AgentStep[];
}

export interface AssistantAnswer {
  answer: string;
  context: AssistantContext;
}

export const coreAiApi = {
  /** Assistant chat. The server decides what rows the caller may see; nothing is sent from here. */
  ask: (question: string, projectId: number | null) =>
    apiRequest<AssistantAnswer>("/ai-analysis/assistant", {
      method: "POST",
      body: JSON.stringify({ question, projectId }),
    }),

  /**
   * The project agent. It runs as the caller on the server, so it can only reach projects the
   * signed-in user could open themselves.
   */
  runAgent: (message: string, projectId: number | null) =>
    apiRequest<AgentReply>("/ai-analysis/agent", {
      method: "POST",
      body: JSON.stringify({ message, projectId }),
    }),

  analyzeRisk: (taskId: number) =>
    apiRequest<RiskAssessment>(`/ai-analysis/${taskId}/risk`, { method: "POST" }),

  getRiskHistory: (taskId: number) =>
    apiRequest<RiskAssessment[]>(`/ai-analysis/${taskId}/risk-history`),

  /** Generates (or regenerates) the AI summary; returns the updated task. */
  generateSummary: (taskId: number) =>
    apiRequest<{ taskId: number; aiSummary?: string | null }>(`/ai-analysis/${taskId}/summary`, { method: "POST" }),

  /** Classifies the task (priority/difficulty hints); returns the updated task. */
  classify: (taskId: number) =>
    apiRequest<{ taskId: number; priority?: string | null; difficulty?: number | null }>(
      `/ai-analysis/${taskId}/classify`,
      { method: "POST" }
    ),

  recommend: (taskId: number, projectId: number) =>
    apiRequest<AssignmentResponse>("/task-assignment/recommend", {
      method: "POST",
      body: JSON.stringify({ taskId, projectId }),
    }),

  acceptRecommendation: (taskId: number, candidateId: number) =>
    apiRequest<{ message: string }>("/task-assignment/accept", {
      method: "POST",
      body: JSON.stringify({ taskId, userId: candidateId, outcome: "Accepted from task detail" }),
    }),

  rejectRecommendation: (taskId: number, candidateId: number) =>
    apiRequest<{ message: string }>("/task-assignment/reject", {
      method: "POST",
      body: JSON.stringify({ taskId, userId: candidateId, reason: "Dismissed from task detail" }),
    }),

  getEvidence: (taskId: number) =>
    apiRequest<EvidenceItem[]>(`/tasks/${taskId}/evidence`),

  addUrlEvidence: (taskId: number, externalUrl: string, description: string) =>
    apiRequest<EvidenceItem>(`/tasks/${taskId}/evidence`, {
      method: "POST",
      body: JSON.stringify({ evidenceType: "URL", externalUrl, description }),
    }),
};
