// MOCK — see MOCK_API_TODO.md. Function names/signatures match the real /api/ai-analysis,
// /api/task-assignment and /api/tasks/{taskId}/evidence routes. Nothing here is wired to any
// page yet in the pre-mock version either, so it's safe to swap wholesale for real
// `apiClient` calls once BE/FE merge is done — keep signatures as-is.
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

export interface AssignmentResponse {
  runId: string;
  taskId: number;
  taskTitle?: string;
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

let riskHistory = loadMockState<Record<number, RiskAssessment[]>>("ai.riskHistory", {});
let evidenceByTask = loadMockState<Record<number, EvidenceItem[]>>("ai.evidence", {});
let assignmentHistoryByTask = loadMockState<Record<number, AssignmentRecommendationHistoryDto[]>>("ai.assignmentHistory", {});
let executionsByTask = loadMockState<Record<number, AiExecutionLogDto[]>>("ai.executions", {});
let analysesByTask = loadMockState<Record<number, AiAnalysisDto[]>>("ai.analyses", {});

function persist() {
  saveMockState("ai.riskHistory", riskHistory);
  saveMockState("ai.evidence", evidenceByTask);
  saveMockState("ai.assignmentHistory", assignmentHistoryByTask);
  saveMockState("ai.executions", executionsByTask);
  saveMockState("ai.analyses", analysesByTask);
}

function randomId() {
  return `mock-${Math.random().toString(36).slice(2, 10)}`;
}

function pickRiskLevel(score: number): RiskAssessment["riskLevel"] {
  if (score >= 80) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function logExecution(taskId: number, feature: string, status = "SUCCESS", latencyMs = 400 + Math.round(Math.random() * 800)) {
  const entry: AiExecutionLogDto = {
    runId: randomId(),
    taskId,
    feature,
    provider: "HuggingFace",
    modelVersion: feature === "ASSIGNMENT" ? "assignment-scorer-v1" : "risk-rules-v2",
    status,
    latencyMs,
    errorMessage: null,
    createdAt: new Date().toISOString(),
  };
  executionsByTask[taskId] = [entry, ...(executionsByTask[taskId] ?? [])];
}

const SAMPLE_USERS = [
  { userId: 1, userName: "Alex Nguyen" },
  { userId: 2, userName: "Bao Le" },
  { userId: 3, userName: "Chi Pham" },
  { userId: 4, userName: "Minh Tran" },
];

export const aiApi = {
  analyzeRisk: (taskId: number) => {
    const score = Math.round(20 + Math.random() * 70);
    const level = pickRiskLevel(score);
    const assessment: RiskAssessment = {
      runId: randomId(),
      taskId,
      totalScore: score,
      riskLevel: level,
      ruleVersion: "v2.3",
      calculationMode: "RULE_BASED",
      explanation:
        level === "LOW"
          ? "Task tiến độ ổn định, không phát hiện tín hiệu rủi ro đáng kể."
          : "Task có dấu hiệu chậm tiến độ so với deadline và độ phức tạp ước tính.",
      mitigationActions:
        level === "LOW"
          ? ["Tiếp tục theo dõi tiến độ định kỳ."]
          : ["Xem xét bổ sung nhân lực hoặc điều chỉnh deadline.", "Trao đổi với assignee về blocker hiện tại."],
      factors: [
        { code: "DEADLINE_PRESSURE", rawValue: "3 days left", score: Math.round(score * 0.4), weight: 0.4, contribution: Math.round(score * 0.4), evidence: "Deadline gần, tiến độ dưới 50%." },
        { code: "DEPENDENCY_BLOCKED", rawValue: "1 blocking dependency", score: Math.round(score * 0.35), weight: 0.35, contribution: Math.round(score * 0.35) },
        { code: "COMPLEXITY", rawValue: "difficulty 4/5", score: Math.round(score * 0.25), weight: 0.25, contribution: Math.round(score * 0.25) },
      ],
      createdAt: new Date().toISOString(),
    };
    riskHistory[taskId] = [assessment, ...(riskHistory[taskId] ?? [])];
    logExecution(taskId, "RISK_ANALYSIS");
    persist();
    return mockDelay(assessment, 700);
  }, // TODO: POST /ai-analysis/{taskId}/risk

  getRiskHistory: (taskId: number) => mockDelay(riskHistory[taskId] ?? []), // TODO: GET /ai-analysis/{taskId}/risk-history

  analyzeAllProject: (_projectId: number) => {
    const summary: ProjectRiskSummaryDto = {
      totalActive: 8,
      criticalRisk: 1,
      highRisk: 2,
      mediumRisk: 3,
      lowRisk: 2,
      averageScore: 46,
      status: "WARNING",
      warnings: ["2 task đang trễ deadline.", "1 task có dependency chưa hoàn thành nhưng gần deadline."],
    };
    return mockDelay(summary, 900);
  }, // TODO: POST /ai-analysis/project/{projectId}/analyze-all

  summarizeTask: (taskId: number) => {
    logExecution(taskId, "SUMMARY");
    analysesByTask[taskId] = [
      { id: nextMockId(analysesByTask[taskId] ?? [], "id"), taskId, analysisType: "SUMMARY", content: "AI summary generated for this task (mock).", createdAt: new Date().toISOString() },
      ...(analysesByTask[taskId] ?? []),
    ];
    persist();
    return mockDelay({ message: "Summary generated." });
  }, // TODO: POST /ai-analysis/{taskId}/summary

  classifyTask: (taskId: number) => {
    logExecution(taskId, "CLASSIFICATION");
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

  getTaskExecutions: (taskId: number) => mockDelay(executionsByTask[taskId] ?? []), // TODO: GET /ai-analysis/{taskId}/executions

  recommend: (taskId: number, _projectId: number) => {
    const suggestions: AssignmentSuggestion[] = SAMPLE_USERS.map((u, i) => {
      const skillMatchScore = Math.round(50 + Math.random() * 50);
      const semanticSimilarityScore = Math.round(40 + Math.random() * 60);
      const workloadScore = Math.round(30 + Math.random() * 70);
      const performanceScore = Math.round(50 + Math.random() * 50);
      const score = Math.round(skillMatchScore * 0.4 + semanticSimilarityScore * 0.25 + workloadScore * 0.2 + performanceScore * 0.15);
      return {
        rank: i + 1,
        userId: u.userId,
        userName: u.userName,
        score,
        reason: "Skill match cao, workload hiện tại thấp.",
        skillMatchScore,
        semanticSimilarityScore,
        workloadScore,
        performanceScore,
        status: "SUGGESTED",
      };
    }).sort((a, b) => b.score - a.score).map((s, i) => ({ ...s, rank: i + 1 }));

    const response: AssignmentResponse = {
      runId: randomId(),
      taskId,
      suggestions,
      generatedAt: new Date().toISOString(),
      modelVersion: "assignment-scorer-v1",
      providerStatus: "OK",
    };
    logExecution(taskId, "ASSIGNMENT");
    assignmentHistoryByTask[taskId] = [
      ...suggestions.map((s) => ({
        id: nextMockId(assignmentHistoryByTask[taskId] ?? [], "id"),
        runId: response.runId,
        taskId,
        userId: s.userId,
        userName: s.userName,
        rank: s.rank,
        score: s.score,
        skillMatchScore: s.skillMatchScore,
        semanticSimilarityScore: s.semanticSimilarityScore,
        workloadScore: s.workloadScore,
        performanceScore: s.performanceScore,
        reason: s.reason,
        status: s.status,
        decidedBy: null,
        decidedAt: null,
        outcome: null,
        modelVersion: response.modelVersion,
        createdAt: response.generatedAt,
      })),
      ...(assignmentHistoryByTask[taskId] ?? []),
    ];
    persist();
    return mockDelay(response, 800);
  }, // TODO: POST /task-assignment/recommend

  acceptRecommendation: (taskId: number, candidateId: number) => {
    assignmentHistoryByTask[taskId] = (assignmentHistoryByTask[taskId] ?? []).map((h) =>
      h.userId === candidateId && h.status === "SUGGESTED" ? { ...h, status: "ACCEPTED", outcome: "Accepted from AI Insights", decidedAt: new Date().toISOString() } : h
    );
    persist();
    return mockDelay({ message: "Assignment accepted." });
  }, // TODO: POST /task-assignment/accept

  rejectRecommendation: (taskId: number, candidateId: number) => {
    assignmentHistoryByTask[taskId] = (assignmentHistoryByTask[taskId] ?? []).map((h) =>
      h.userId === candidateId && h.status === "SUGGESTED" ? { ...h, status: "REJECTED", outcome: "Rejected from AI Insights", decidedAt: new Date().toISOString() } : h
    );
    persist();
    return mockDelay({ message: "Assignment rejected." });
  }, // TODO: POST /task-assignment/reject

  getAssignmentHistory: (taskId: number) => mockDelay(assignmentHistoryByTask[taskId] ?? []), // TODO: GET /task-assignment/task/{taskId}/history

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
