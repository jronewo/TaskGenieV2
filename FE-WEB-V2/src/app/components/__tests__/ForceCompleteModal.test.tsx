import { render, screen, waitFor } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForceCompleteModal } from "../ForceCompleteModal";
import { taskApi, TaskDetailDto } from "../../services/taskApi";
import { ApiError } from "../../services/apiClient";

vi.mock("../../services/taskApi");

const api = vi.mocked(taskApi);

const TASK: TaskDetailDto = {
  taskId: 42,
  projectId: 7,
  title: "Ship the login redirect fix",
  status: "InReview",
  progress: 90,
  assignees: [],
  dependencies: [
    { dependencyId: 1, dependsOnTaskId: 10, dependsOnTaskTitle: "Set up the database", status: "Todo" },
    { dependencyId: 2, dependsOnTaskId: 11, dependsOnTaskTitle: "Build the API", status: "InProgress" },
  ],
  requiredSkillIds: [],
} as TaskDetailDto;

const OPEN_DEPENDENCIES = TASK.dependencies;

describe("ForceCompleteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists every open dependency, none checked by default", () => {
    render(
      <ForceCompleteModal task={TASK} openDependencies={OPEN_DEPENDENCIES} onClose={vi.fn()} onMoved={vi.fn()} />
    );

    expect(screen.getByText("Set up the database")).toBeInTheDocument();
    expect(screen.getByText("Build the API")).toBeInTheDocument();
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).not.toBeChecked();
    }
  });

  it("completing with nothing selected only forces the primary task", async () => {
    const user = userEvent.setup();
    const onMoved = vi.fn();
    api.updateProgress.mockResolvedValue({ ...TASK, status: "Done", progress: 100 });
    render(
      <ForceCompleteModal task={TASK} openDependencies={OPEN_DEPENDENCIES} onClose={vi.fn()} onMoved={onMoved} />
    );

    await user.click(screen.getByRole("button", { name: /complete task only/i }));

    await waitFor(() =>
      expect(api.updateProgress).toHaveBeenCalledWith(42, {
        status: "Done",
        progress: 100,
        force: true,
        forceDependencyTaskIds: [],
      })
    );
    expect(onMoved).toHaveBeenCalled();
  });

  it("includes selected dependencies in the submit payload", async () => {
    const user = userEvent.setup();
    api.updateProgress.mockResolvedValue({ ...TASK, status: "Done", progress: 100 });
    render(
      <ForceCompleteModal task={TASK} openDependencies={OPEN_DEPENDENCIES} onClose={vi.fn()} onMoved={vi.fn()} />
    );

    await user.click(screen.getByRole("checkbox", { name: /set up the database/i }));
    await user.click(screen.getByRole("button", { name: /complete task \+ 1 selected/i }));

    await waitFor(() =>
      expect(api.updateProgress).toHaveBeenCalledWith(42, {
        status: "Done",
        progress: 100,
        force: true,
        forceDependencyTaskIds: [10],
      })
    );
  });

  it("shows an error and stays open when the submit fails", async () => {
    const user = userEvent.setup();
    const onMoved = vi.fn();
    const onClose = vi.fn();
    api.updateProgress.mockRejectedValue(new ApiError(403, "You don't have permission to complete this task."));
    render(
      <ForceCompleteModal task={TASK} openDependencies={OPEN_DEPENDENCIES} onClose={onClose} onMoved={onMoved} />
    );

    await user.click(screen.getByRole("button", { name: /complete task only/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/don't have permission/i);
    expect(onMoved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes without calling the API on Cancel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ForceCompleteModal task={TASK} openDependencies={OPEN_DEPENDENCIES} onClose={onClose} onMoved={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
    expect(api.updateProgress).not.toHaveBeenCalled();
  });
});
