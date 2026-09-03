import { render, screen } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiTaskInsights } from "../AiTaskInsights";
import { coreAiApi } from "../../services/coreAiApi";
import { TaskDetailDto } from "../../services/taskApi";

vi.mock("../../services/coreAiApi");
vi.mock("../../services/taskApi", async () => {
  const actual = await vi.importActual<typeof import("../../services/taskApi")>("../../services/taskApi");
  return { ...actual, taskApi: { ...actual.taskApi, estimate: vi.fn() } };
});

const api = vi.mocked(coreAiApi);

const TASK: TaskDetailDto = {
  taskId: 42,
  title: "Fix broken login redirect",
  assignees: [],
  dependencies: [],
  requiredSkillIds: [],
} as unknown as TaskDetailDto;

/** Mirrors a real response: DEADLINE contributes the most despite not having the top raw score. */
const RISK: import("../../services/coreAiApi").RiskAssessment = {
  runId: "run-1",
  taskId: 42,
  totalScore: 72.5,
  riskLevel: "HIGH",
  ruleVersion: "v1",
  calculationMode: "RULES_WITH_AI_EXPLANATION",
  explanation: "Risk HIGH (72.50/100). Main contributors: DEADLINE 90, PROGRESS 45, DEPENDENCY 30.",
  mitigationActions: ["Re-estimate remaining work, reduce scope, or negotiate the deadline."],
  factors: [
    { code: "PROGRESS", rawValue: "elapsed=0.6", score: 45, weight: 0.25, contribution: 11.25, evidence: "Progress shortfall against elapsed schedule and update staleness." },
    { code: "DEADLINE", rawValue: "daysRemaining=1", score: 90, weight: 0.4, contribution: 36, evidence: "Deadline proximity and remaining effort against 1 working day(s) of 8h." },
    { code: "DEPENDENCY", rawValue: "open=1;total=3", score: 30, weight: 0.2, contribution: 6, evidence: "Incomplete task dependencies." },
  ],
  createdAt: "2026-01-01T00:00:00Z",
};

describe("AiTaskInsights risk factor breakdown", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows each factor's weighted contribution, ranked by contribution not raw score", async () => {
    const user = userEvent.setup();
    api.analyzeRisk.mockResolvedValue(RISK);
    render(<AiTaskInsights task={TASK} />);

    await user.click(screen.getByRole("button", { name: /analyse risk/i }));

    await screen.findByText("HIGH · 73");

    // DEADLINE (contribution 36) must lead even though PROGRESS is listed first in the response.
    const deadlineLabel = screen.getByText((_, el) => el?.textContent === "Deadline proximity 40%");
    const progressLabel = screen.getByText((_, el) => el?.textContent === "Progress vs. schedule 25%");
    const dependencyLabel = screen.getByText((_, el) => el?.textContent === "Open dependencies 20%");
    const position = (el: Element) => Array.from(document.body.querySelectorAll("*")).indexOf(el);
    expect(position(deadlineLabel)).toBeLessThan(position(progressLabel));
    expect(position(progressLabel)).toBeLessThan(position(dependencyLabel));

    // Friendly label + weight are already asserted above (deadlineLabel); the per-factor evidence
    // sentence is the other half of "why this score", and the raw machine code must never leak.
    expect(screen.getByText(/Deadline proximity and remaining effort/)).toBeInTheDocument();
    expect(screen.queryByText("DEADLINE")).not.toBeInTheDocument();
  });

  it("renders nothing extra when the response has no factors", async () => {
    const user = userEvent.setup();
    api.analyzeRisk.mockResolvedValue({ ...RISK, factors: [] });
    render(<AiTaskInsights task={TASK} />);

    await user.click(screen.getByRole("button", { name: /analyse risk/i }));

    await screen.findByText("HIGH · 73");
    expect(screen.queryByText(/Deadline proximity/)).not.toBeInTheDocument();
  });
});
