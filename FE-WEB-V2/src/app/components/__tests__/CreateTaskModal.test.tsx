import { render, screen, waitFor } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTaskModal } from "../CreateTaskModal";
import { taskApi } from "../../services/taskApi";
import { skillApi } from "../../services/adminApi";
import { ApiError } from "../../services/apiClient";

vi.mock("../../services/taskApi");
vi.mock("../../services/adminApi");

const tasks = vi.mocked(taskApi);
const skills = vi.mocked(skillApi);

const CREATED = { taskId: 99, projectId: 1, title: "New task", assignees: [], dependencies: [] } as never;

const renderModal = (onCreated = vi.fn()) => {
  render(<CreateTaskModal open projectId={1} onClose={vi.fn()} onCreated={onCreated} />);
  return onCreated;
};

describe("CreateTaskModal required skills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasks.types.mockResolvedValue([
      { taskTypeId: 1, code: "DEVELOP", name: "Develop", colorHex: "#3B82F6", isActive: true },
      { taskTypeId: 2, code: "BUG", name: "Bug", colorHex: "#EF4444", isActive: true },
    ]);
    skills.catalog.mockResolvedValue([
      { skillId: 1, skillName: "React" },
      { skillId: 2, skillName: "SQL" },
    ]);
    tasks.create.mockResolvedValue(CREATED);
    tasks.setRequiredSkills.mockResolvedValue({ message: "ok" } as never);
  });

  it("offers the active skill catalog", async () => {
    renderModal();

    expect(await screen.findByRole("button", { name: "React" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SQL" })).toBeInTheDocument();
  });

  it("saves the selected skills against the task it just created", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/title/i), "Build the board");
    await user.click(await screen.findByRole("button", { name: "React" }));
    await user.click(screen.getByRole("button", { name: "SQL" }));
    await user.click(screen.getByRole("button", { name: /create task/i }));

    // Each skill carries the level the assignment score divides by; 3 is the default.
    await waitFor(() =>
      expect(tasks.setRequiredSkills).toHaveBeenCalledWith(99, [
        { skillId: 1, requiredLevel: 3 },
        { skillId: 2, requiredLevel: 3 },
      ])
    );
  });

  it("does not call the skills endpoint when none were picked", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/title/i), "Build the board");
    await user.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => expect(tasks.create).toHaveBeenCalled());
    expect(tasks.setRequiredSkills).not.toHaveBeenCalled();
  });

  it("sends the level the user picked, not the default", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/title/i), "Build the board");
    await user.click(await screen.findByRole("button", { name: "React" }));
    await user.selectOptions(screen.getByLabelText(/required level for react/i), "5");
    await user.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() =>
      expect(tasks.setRequiredSkills).toHaveBeenCalledWith(99, [{ skillId: 1, requiredLevel: 5 }])
    );
  });

  it("deselects a skill that is clicked twice", async () => {
    const user = userEvent.setup();
    renderModal();

    const react = await screen.findByRole("button", { name: "React" });
    await user.click(react);
    expect(react).toHaveAttribute("aria-pressed", "true");
    await user.click(react);
    expect(react).toHaveAttribute("aria-pressed", "false");
  });

  it("reports a rejected skill write without pretending the task failed", async () => {
    const user = userEvent.setup();
    tasks.setRequiredSkills.mockRejectedValue(new ApiError(403, "Not allowed."));
    const onCreated = renderModal();

    await user.type(screen.getByLabelText(/title/i), "Build the board");
    await user.click(await screen.findByRole("button", { name: "React" }));
    await user.click(screen.getByRole("button", { name: /create task/i }));

    // The task itself was created, so the caller is still told about it.
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(CREATED));
  });

  it("still allows task creation when the catalog cannot be read", async () => {
    skills.catalog.mockRejectedValue(new ApiError(500, "down"));
    renderModal();

    expect(await screen.findByText(/no skills in the catalog yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create task/i })).toBeInTheDocument();
  });
});
