import { render, screen, waitFor } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectBoardHeader } from "../ProjectBoardHeader";
import { projectApi } from "../../services/projectApi";
import { taskApi } from "../../services/taskApi";

vi.mock("../../services/projectApi");
vi.mock("../../services/taskApi");
vi.mock("../../services/coreAiApi");

const projects = vi.mocked(projectApi);
const tasks = vi.mocked(taskApi);

const PROJECT = {
  projectId: 7,
  name: "APP",
  status: "Active",
  canManageTasks: true,
} as any;

const GRAPH = {
  hasCycle: false,
  levelCount: 2,
  nodes: [
    {
      id: "101",
      title: "Set up the database",
      status: "Todo",
      priority: "High",
      deadline: null,
      assigneeName: null,
      level: 0,
      blockedByCount: 0,
      blocksCount: 1,
      isReady: true,
      inCycle: false,
    },
    {
      id: "102",
      title: "Build the API",
      status: "Todo",
      priority: "Medium",
      deadline: null,
      assigneeName: null,
      level: 1,
      blockedByCount: 1,
      blocksCount: 0,
      isReady: false,
      inCycle: false,
    },
  ],
  edges: [{ from: "101", to: "102", isBlocking: true }],
} as any;

describe("ProjectBoardHeader dependency diagram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projects.getById.mockResolvedValue(PROJECT);
    tasks.dependencyGraph.mockResolvedValue(GRAPH);
  });

  it("keeps the diagram open when a node is opened, so the reader keeps their place", async () => {
    const user = userEvent.setup();
    const onOpenTask = vi.fn();
    render(<ProjectBoardHeader projectId={7} tasks={[]} onOpenTask={onOpenTask} />);

    await user.click(await screen.findByRole("button", { name: /dependency diagram/i }));
    await user.click(await screen.findByText("Set up the database"));

    expect(onOpenTask).toHaveBeenCalledWith(101);

    // Closing the diagram here was the bug: checking one node threw away the whole picture.
    //
    // Checked on opacity rather than presence. A closing dialog stays mounted for the length of
    // its exit animation, so "is it still in the DOM?" answers yes for a dialog that is already
    // fading out — the assertion has to distinguish open from leaving.
    await waitFor(() => {
      const dialog = screen.getByRole("dialog", { name: /dependency diagram/i });
      expect(dialog.style.opacity === "" || Number(dialog.style.opacity) === 1).toBe(true);
    });
  });
});
