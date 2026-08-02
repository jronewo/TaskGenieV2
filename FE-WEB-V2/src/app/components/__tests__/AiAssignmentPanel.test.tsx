import { render, screen, waitFor } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiAssignmentPanel } from "../AiAssignmentPanel";
import { coreAiApi } from "../../services/coreAiApi";
import { ApiError } from "../../services/apiClient";

vi.mock("../../services/coreAiApi");

const api = vi.mocked(coreAiApi);

/** Mirrors a real response: the engine returns percentages (0–100), not 0–1 fractions. */
const SUGGESTION = {
  rank: 1,
  userId: 9,
  userName: "Huynh Tran",
  score: 55.41,
  reason: "Best candidate for this task.",
  skillMatchScore: 50,
  semanticSimilarityScore: 71.6,
  workloadScore: 50,
  performanceScore: 50,
  status: "GENERATED",
};

const RESPONSE = {
  runId: "run-1",
  taskId: 1,
  suggestions: [SUGGESTION],
  generatedAt: "2026-08-02T00:00:00Z",
  modelVersion: "v1",
  providerStatus: "OK",
};

describe("AiAssignmentPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders scores as sane percentages, not multiplied a second time", async () => {
    const user = userEvent.setup();
    api.recommend.mockResolvedValue(RESPONSE as never);
    render(<AiAssignmentPanel taskId={1} projectId={2} />);

    await user.click(screen.getByRole("button", { name: /suggest/i }));

    // Regression: this once rendered "5541%" because the value was scaled twice.
    expect(await screen.findByText(/overall match 55%/i)).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument(); // 71.6 rounded
    expect(screen.queryByText(/5541%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/5000%/)).not.toBeInTheDocument();
  });

  it("never lets a bar exceed its track", async () => {
    const user = userEvent.setup();
    api.recommend.mockResolvedValue({
      ...RESPONSE,
      suggestions: [{ ...SUGGESTION, skillMatchScore: 420 }],
    } as never);
    render(<AiAssignmentPanel taskId={1} projectId={2} />);

    await user.click(screen.getByRole("button", { name: /suggest/i }));
    await screen.findByText(/overall match/i);

    const bars = document.querySelectorAll<HTMLElement>('[style*="width"]');
    bars.forEach((bar) => {
      const width = parseFloat(bar.style.width);
      expect(width).toBeLessThanOrEqual(100);
    });
  });

  it("explains an empty result instead of showing a blank panel", async () => {
    const user = userEvent.setup();
    api.recommend.mockResolvedValue({ ...RESPONSE, suggestions: [] } as never);
    render(<AiAssignmentPanel taskId={1} projectId={2} />);

    await user.click(screen.getByRole("button", { name: /suggest/i }));

    expect(await screen.findByText(/no suitable candidate/i)).toBeInTheDocument();
  });

  it("assigns a candidate and tells the parent to refresh", async () => {
    const user = userEvent.setup();
    const onAssigned = vi.fn();
    api.recommend.mockResolvedValue(RESPONSE as never);
    api.acceptRecommendation.mockResolvedValue({ message: "ok" });
    render(<AiAssignmentPanel taskId={1} projectId={2} onAssigned={onAssigned} />);

    await user.click(screen.getByRole("button", { name: /suggest/i }));
    await user.click(await screen.findByRole("button", { name: /assign huynh tran/i }));

    await waitFor(() => expect(api.acceptRecommendation).toHaveBeenCalledWith(1, 9));
    expect(onAssigned).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(/was assigned/i);
  });

  it("dismisses a candidate without assigning them", async () => {
    const user = userEvent.setup();
    api.recommend.mockResolvedValue(RESPONSE as never);
    api.rejectRecommendation.mockResolvedValue({ message: "ok" });
    render(<AiAssignmentPanel taskId={1} projectId={2} />);

    await user.click(screen.getByRole("button", { name: /suggest/i }));
    await user.click(await screen.findByRole("button", { name: /dismiss huynh tran/i }));

    await waitFor(() => expect(api.rejectRecommendation).toHaveBeenCalledWith(1, 9));
    expect(api.acceptRecommendation).not.toHaveBeenCalled();
  });

  it("offers a retry-friendly message when the AI provider is down", async () => {
    const user = userEvent.setup();
    api.recommend.mockRejectedValue(new ApiError(503, ""));
    render(<AiAssignmentPanel taskId={1} projectId={2} />);

    await user.click(screen.getByRole("button", { name: /suggest/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/unavailable right now/i);
  });

  it("reports a quota rejection distinctly from a generic failure", async () => {
    const user = userEvent.setup();
    api.recommend.mockRejectedValue(new ApiError(429, ""));
    render(<AiAssignmentPanel taskId={1} projectId={2} />);

    await user.click(screen.getByRole("button", { name: /suggest/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/usage limit/i);
  });
});
