import { render, screen, waitFor } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskDetailModal } from "../TaskDetailModal";
import { taskApi, commentApi, TaskDetailDto } from "../../services/taskApi";

vi.mock("../../services/taskApi");
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ user: { userId: 1, name: "Leader", role: "NORMAL_USER" }, refreshUser: vi.fn() }),
}));
// The AI panels fetch on mount and are covered by their own tests.
vi.mock("../AiAssignmentPanel", () => ({ AiAssignmentPanel: () => null }));
vi.mock("../TaskPlanningPanel", () => ({ TaskPlanningPanel: () => null }));

const api = vi.mocked(taskApi);
const comments = vi.mocked(commentApi);

const TASK: TaskDetailDto = {
  taskId: 42,
  projectId: 7,
  title: "Fix broken login redirect",
  description: "Users bounce back to sign-in after a valid login.",
  status: "Todo",
  priority: "Critical",
  deadline: "2026-08-06",
  estimatedTime: null,
  aiEstimatedTime: 2,
  difficulty: 4,
  actualTime: null,
  progress: 0,
  riskLevel: "LOW",
  createdAt: null,
  completedAt: null,
  createdBy: 1,
  assignees: [],
  dependencies: [],
  requiredSkillIds: [],
};

describe("TaskDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getById.mockResolvedValue(TASK);
    comments.byTask.mockResolvedValue([]);
    api.progressLogs.mockResolvedValue([]);
  });

  it("renders the task instead of an empty overlay", async () => {
    // A prop mismatch inside this tree used to throw during render, leaving only the black
    // backdrop on screen — nothing here caught it, so this is the guard.
    render(<TaskDetailModal taskId={42} projectName="Website Revamp" onClose={vi.fn()} />);

    expect(await screen.findByText("Fix broken login redirect")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /task detail/i })).toBeInTheDocument();
  });

  it("shows the estimate produced when the task was created", async () => {
    render(<TaskDetailModal taskId={42} projectName="Website Revamp" onClose={vi.fn()} />);

    await screen.findByText("Fix broken login redirect");
    // "—" beside an AI estimate of 2h was simply untrue.
    expect(screen.getByText("2h (AI)")).toBeInTheDocument();
    // Shown in the Details list and in the AI panel, so both are expected.
    expect(screen.getAllByText("4/5").length).toBeGreaterThan(0);
  });

  it("posts a comment with the text that was typed", async () => {
    const user = userEvent.setup();
    comments.create.mockResolvedValue({ commentId: 1 } as never);
    render(<TaskDetailModal taskId={42} projectName="Website Revamp" onClose={vi.fn()} />);

    await screen.findByText("Fix broken login redirect");
    await user.type(screen.getByPlaceholderText(/write a comment/i), "Đã kiểm tra lại");
    await user.click(screen.getByRole("button", { name: /post comment/i }));

    await waitFor(() => expect(comments.create).toHaveBeenCalledWith(42, "Đã kiểm tra lại", null));
  });

  it("renders nothing when no task is selected", () => {
    const { container } = render(<TaskDetailModal taskId={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("TaskDetailModal Done gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    comments.byTask.mockResolvedValue([]);
    api.progressLogs.mockResolvedValue([]);
  });

  it("hides Done from a non-Lead viewer", async () => {
    api.getById.mockResolvedValue({ ...TASK, status: "InReview" });
    render(<TaskDetailModal taskId={42} projectName="Website Revamp" canManageTasks={false} onClose={vi.fn()} />);

    await screen.findByText("Fix broken login redirect");
    const options = screen.getByLabelText("Status").querySelectorAll("option");
    expect(Array.from(options).map((o) => o.value)).not.toContain("Done");
  });

  it("offers Done to a Lead even when the task hasn't reached In Review yet", async () => {
    const user = userEvent.setup();
    api.getById.mockResolvedValue({ ...TASK, status: "Todo", dependencies: [] });
    api.updateProgress.mockResolvedValue({ ...TASK, status: "Done", progress: 100 });
    render(<TaskDetailModal taskId={42} projectName="Website Revamp" canManageTasks onClose={vi.fn()} />);

    await screen.findByText("Fix broken login redirect");
    await user.selectOptions(screen.getByLabelText("Status"), "Done");

    await waitFor(() => expect(api.updateProgress).toHaveBeenCalledWith(42, expect.objectContaining({ status: "Done" })));
  });

  it("lets a Lead move an In Review task to Done directly when nothing is blocking it", async () => {
    const user = userEvent.setup();
    api.getById.mockResolvedValue({ ...TASK, status: "InReview", dependencies: [] });
    api.updateProgress.mockResolvedValue({ ...TASK, status: "Done", progress: 100 });
    render(<TaskDetailModal taskId={42} projectName="Website Revamp" canManageTasks onClose={vi.fn()} />);

    await screen.findByText("Fix broken login redirect");
    await user.selectOptions(screen.getByLabelText("Status"), "Done");

    await waitFor(() => expect(api.updateProgress).toHaveBeenCalledWith(42, expect.objectContaining({ status: "Done" })));
  });

  it("opens the force-complete modal instead of calling the API when a dependency is open", async () => {
    const user = userEvent.setup();
    api.getById.mockResolvedValue({
      ...TASK,
      status: "InReview",
      dependencies: [{ dependencyId: 1, dependsOnTaskId: 10, dependsOnTaskTitle: "Set up the database", status: "Todo" }],
    });
    render(<TaskDetailModal taskId={42} projectName="Website Revamp" canManageTasks onClose={vi.fn()} />);

    await screen.findByText("Fix broken login redirect");
    await user.selectOptions(screen.getByLabelText("Status"), "Done");

    expect(await screen.findByRole("dialog", { name: /complete task/i })).toBeInTheDocument();
    expect(api.updateProgress).not.toHaveBeenCalled();
  });
});
