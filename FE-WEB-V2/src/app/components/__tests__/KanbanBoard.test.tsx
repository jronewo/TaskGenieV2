import { render, screen, waitFor, within } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "../KanbanBoard";
import { taskApi, TaskDetailDto } from "../../services/taskApi";

vi.mock("../../services/taskApi");

const api = vi.mocked(taskApi);

function task(overrides: Partial<TaskDetailDto> & { taskId: number; title: string }): TaskDetailDto {
  return {
    projectId: 1,
    description: null,
    status: "Todo",
    priority: "Medium",
    deadline: null,
    estimatedTime: null,
    aiEstimatedTime: null,
    actualTime: null,
    progress: 0,
    difficulty: null,
    taskTypeId: null,
    taskTypeName: null,
    taskTypeColor: null,
    riskLevel: "LOW",
    aiSummary: null,
    createdAt: "2026-01-01T00:00:00Z",
    completedAt: null,
    createdBy: 1,
    isLate: false,
    daysLateOrEarly: null,
    assignees: [],
    dependencies: [],
    requiredSkillIds: [],
    ...overrides,
  } as TaskDetailDto;
}

/**
 * A four-task plan shaped like the one the user was scrolling through: one foundation task that
 * everything else waits on, two that are blocked by it, and one unrelated task. Creation order is
 * deliberately the reverse of dependency order, so a board that ignores dependencies puts the
 * foundation last.
 */
const FOUNDATION = task({
  taskId: 10,
  title: "Set up the database",
  createdAt: "2026-01-01T00:00:00Z",
  blockingCount: 2,
});
const API_TASK = task({
  taskId: 11,
  title: "Build the API",
  createdAt: "2026-01-02T00:00:00Z",
  blockingCount: 0,
  dependencies: [{ dependencyId: 1, dependsOnTaskId: 10, dependsOnTaskTitle: "Set up the database", status: "Todo" }],
});
const UI_TASK = task({
  taskId: 12,
  title: "Build the login screen",
  createdAt: "2026-01-03T00:00:00Z",
  blockingCount: 0,
  dependencies: [{ dependencyId: 2, dependsOnTaskId: 10, dependsOnTaskTitle: "Set up the database", status: "Todo" }],
});
const CHORE = task({
  taskId: 13,
  title: "Update the README",
  createdAt: "2026-01-04T00:00:00Z",
  blockingCount: 0,
});

const ALL = [FOUNDATION, API_TASK, UI_TASK, CHORE];

/**
 * Card titles in the Todo column, top to bottom. Read off each card's accessible name, which the
 * board already publishes as "KEY-42: Title" — no test-only markup needed.
 */
function todoOrder(): string[] {
  const column = screen.getByTestId("column-Todo");
  return within(column)
    .getAllByRole("button")
    .map((card) => (card.getAttribute("aria-label") ?? "").split(": ").slice(1).join(": "))
    .filter(Boolean);
}

async function renderBoard(tasks: TaskDetailDto[] = ALL) {
  api.byProject.mockResolvedValue(tasks);
  render(<KanbanBoard projectId={1} projectName="APP" onTaskClick={() => {}} />);
  await waitFor(() => expect(api.byProject).toHaveBeenCalled());
  await screen.findByText(tasks[0].title!);
}

describe("KanbanBoard dependency ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("puts the task that is holding up the most work at the top", async () => {
    const user = userEvent.setup();
    await renderBoard();

    // Newest-first is the default, so the foundation starts at the bottom.
    expect(todoOrder()[0]).toBe("Update the README");

    await user.selectOptions(screen.getByLabelText("Sort"), "dependency");

    expect(todoOrder()[0]).toBe("Set up the database");
  });

  it("ranks a task that is free to start above one still waiting, when both block nothing", async () => {
    const user = userEvent.setup();
    await renderBoard();
    await user.selectOptions(screen.getByLabelText("Sort"), "dependency");

    const order = todoOrder();

    // All three block nobody; the chore can be picked up now while the other two cannot, so
    // sorting purely on blocking count would leave the actionable card stranded at the bottom.
    expect(order.indexOf("Update the README")).toBeLessThan(order.indexOf("Build the API"));
    expect(order.indexOf("Update the README")).toBeLessThan(order.indexOf("Build the login screen"));
  });

  it("stops treating a prerequisite as a blocker once it is done", async () => {
    const user = userEvent.setup();
    const unblocked = {
      ...API_TASK,
      dependencies: [{ dependencyId: 1, dependsOnTaskId: 10, dependsOnTaskTitle: "Set up the database", status: "Done" }],
    };
    await renderBoard([FOUNDATION, unblocked, UI_TASK, CHORE]);

    await user.selectOptions(screen.getByLabelText("Filter by dependency"), "READY");

    expect(screen.getByText("Build the API")).toBeInTheDocument();
    // Still waiting on the unfinished foundation.
    expect(screen.queryByText("Build the login screen")).not.toBeInTheDocument();
  });

  it("narrows the board to what is blocking others", async () => {
    const user = userEvent.setup();
    await renderBoard();

    await user.selectOptions(screen.getByLabelText("Filter by dependency"), "BLOCKING");

    expect(screen.getByText("Set up the database")).toBeInTheDocument();
    expect(screen.queryByText("Update the README")).not.toBeInTheDocument();
  });

  it("finds a task by title without leaving the board", async () => {
    const user = userEvent.setup();
    await renderBoard();

    await user.type(screen.getByLabelText("Search tasks"), "login");

    expect(screen.getByText("Build the login screen")).toBeInTheDocument();
    expect(screen.queryByText("Update the README")).not.toBeInTheDocument();
  });

  it("finds a task by what it is waiting on, so a prerequisite surfaces its followers", async () => {
    const user = userEvent.setup();
    await renderBoard();

    await user.type(screen.getByLabelText("Search tasks"), "database");

    // The foundation itself, plus the two tasks that name it as a prerequisite.
    expect(screen.getByText("Set up the database")).toBeInTheDocument();
    expect(screen.getByText("Build the API")).toBeInTheDocument();
    expect(screen.queryByText("Update the README")).not.toBeInTheDocument();
  });
});
