import { render, screen, waitFor } from "../../../test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";
import { ProjectGanttChart } from "../ProjectGanttChart";
import { taskApi, TaskDetailDto } from "../../services/taskApi";

vi.mock("../../services/taskApi");

const tasks = vi.mocked(taskApi);

const task = (overrides: Partial<TaskDetailDto>): TaskDetailDto => ({
  taskId: 1,
  title: "Task",
  status: "InProgress",
  progress: 0,
  assignees: [],
  dependencies: [],
  ...overrides,
} as TaskDetailDto);

describe("ProjectGanttChart", () => {
  it("shows a loading state before the fetch resolves", () => {
    tasks.byProject.mockReturnValue(new Promise(() => {}));
    render(<ProjectGanttChart projectId={1} />);

    expect(screen.getByText(/loading schedule/i)).toBeInTheDocument();
  });

  it("shows an empty state when the project has no tasks", async () => {
    tasks.byProject.mockResolvedValue([]);
    render(<ProjectGanttChart projectId={1} />);

    expect(await screen.findByText(/this project has no tasks yet/i)).toBeInTheDocument();
  });

  it("renders a bar for a task that has both a start date and a deadline", async () => {
    tasks.byProject.mockResolvedValue([
      task({ taskId: 5, title: "Design the schema", startDate: "2026-09-01", deadline: "2026-09-10", progress: 40 }),
    ]);
    render(<ProjectGanttChart projectId={1} />);

    expect(await screen.findByRole("button", { name: "Design the schema" })).toBeInTheDocument();
  });

  it("lists tasks missing a start date or deadline separately instead of dropping them", async () => {
    tasks.byProject.mockResolvedValue([
      task({ taskId: 5, title: "Scheduled", startDate: "2026-09-01", deadline: "2026-09-10" }),
      task({ taskId: 6, title: "No dates yet", startDate: null, deadline: null }),
    ]);
    render(<ProjectGanttChart projectId={1} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Scheduled" })).toBeInTheDocument());
    expect(screen.getByText(/1 task\(s\) not shown/i)).toBeInTheDocument();
    expect(screen.queryByText("No dates yet")).not.toBeInTheDocument();
  });
});
