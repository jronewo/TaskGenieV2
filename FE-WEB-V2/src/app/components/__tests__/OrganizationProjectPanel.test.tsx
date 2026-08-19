import { render, screen, waitFor } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationProjectPanel } from "../OrganizationProjectPanel";
import { taskApi } from "../../services/taskApi";
import { coreAiApi } from "../../services/coreAiApi";
import { ApiError } from "../../services/apiClient";

vi.mock("../../services/taskApi");
vi.mock("../../services/coreAiApi");

const tasks = vi.mocked(taskApi);
const ai = vi.mocked(coreAiApi);

const PROJECT = {
  projectId: 5,
  name: "Q3 Platform Migration",
  status: "Planning",
  riskLevel: "LOW",
  progress: 25,
  deadline: null,
  teamMemberCount: 3,
} as never;

const MEMBERS = [
  { organizationMemberId: 1, organizationId: 1, userId: 1, userName: "Demo Owner", email: "owner@x.local", avatar: null, role: "OWNER" as const, status: "ACTIVE", joinedAt: null },
  { organizationMemberId: 2, organizationId: 1, userId: 2, userName: "Linh Tran", email: "linh@x.local", avatar: null, role: "MEMBER" as const, status: "ACTIVE", joinedAt: null },
] as never;

function task(taskId: number, status: string) {
  return { taskId, projectId: 5, title: `Task ${taskId}`, status, priority: "Medium", assignees: [], dependencies: [] } as never;
}

const renderPanel = (manageable = true, onAssign = vi.fn(), onViewInfo = vi.fn()) => {
  render(
    <OrganizationProjectPanel
      project={PROJECT}
      members={MEMBERS}
      manageable={manageable}
      onAssign={onAssign}
      onViewInfo={onViewInfo}
    />
  );
  return onAssign;
};

describe("OrganizationProjectPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasks.byProject.mockResolvedValue([task(1, "Todo"), task(2, "InProgress"), task(3, "Done")]);
  });

  it("counts the project's own tasks by status", async () => {
    renderPanel();

    await waitFor(() => expect(tasks.byProject).toHaveBeenCalledWith(5));
    const counts = await screen.findByText("Tasks");
    expect(counts).toBeInTheDocument();
    expect(screen.getByText("To do")).toBeInTheDocument();
    // 3 tasks: one in each column.
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(3);
  });

  it("hides the staffing actions from someone who cannot manage the organization", async () => {
    renderPanel(false);

    await screen.findByText("Tasks");
    expect(screen.queryByRole("button", { name: /add member/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /set project leader/i })).not.toBeInTheDocument();
  });

  it("asks the parent to open the assign dialog for this project", async () => {
    const user = userEvent.setup();
    const onAssign = renderPanel();

    await screen.findByText("Tasks");
    await user.click(screen.getByRole("button", { name: /add member/i }));

    expect(onAssign).toHaveBeenCalledWith(5, false);
  });

  it("pre-selects the leader option when setting a project leader", async () => {
    const user = userEvent.setup();
    const onAssign = renderPanel();

    await screen.findByText("Tasks");
    await user.click(screen.getByRole("button", { name: /set project leader/i }));

    // The button used to open the same dialog with the leader box unticked, so it did nothing.
    expect(onAssign).toHaveBeenCalledWith(5, true);
  });

  it("offers a read-only view of the project's tasks", async () => {
    const user = userEvent.setup();
    const onViewInfo = vi.fn();
    renderPanel(true, vi.fn(), onViewInfo);

    await screen.findByText("Tasks");
    await user.click(screen.getByRole("button", { name: /view project information/i }));

    expect(onViewInfo).toHaveBeenCalledWith(PROJECT);
  });

  it("reports only the tasks the sweep found to be at risk", async () => {
    const user = userEvent.setup();
    ai.analyzeRisk
      .mockResolvedValueOnce({ riskLevel: "HIGH", totalScore: 72, explanation: "", mitigationActions: [] } as never)
      .mockResolvedValueOnce({ riskLevel: "LOW", totalScore: 10, explanation: "", mitigationActions: [] } as never);
    renderPanel();

    await screen.findByText("Tasks");
    await user.click(screen.getByRole("button", { name: /risk estimate/i }));

    // Only the two open tasks are scanned, and only the HIGH one is listed.
    await waitFor(() => expect(ai.analyzeRisk).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/1 of 2 open task\(s\) need attention/i)).toBeInTheDocument();
    expect(screen.getByText(/HIGH · 72/)).toBeInTheDocument();
  });

  it("keeps the sweep going when one task's analysis fails", async () => {
    const user = userEvent.setup();
    ai.analyzeRisk
      .mockRejectedValueOnce(new ApiError(500, "provider down"))
      .mockResolvedValueOnce({ riskLevel: "MEDIUM", totalScore: 40, explanation: "", mitigationActions: [] } as never);
    renderPanel();

    await screen.findByText("Tasks");
    await user.click(screen.getByRole("button", { name: /risk estimate/i }));

    expect(await screen.findByText(/1 of 2 open task\(s\) need attention/i)).toBeInTheDocument();
  });

  it("surfaces a refused task read instead of showing zero tasks as fact", async () => {
    tasks.byProject.mockRejectedValue(new ApiError(403, "You don't have access to this project."));
    renderPanel();

    expect(await screen.findByRole("alert")).toHaveTextContent("You don't have access to this project.");
  });
});
