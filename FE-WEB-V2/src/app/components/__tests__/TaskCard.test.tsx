import { render, screen } from "../../../test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";
import { TaskCard } from "../TaskCard";
import { TaskDetailDto } from "../../services/taskApi";

const AVATAR = "https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg";

const task = (overrides: Partial<TaskDetailDto> = {}): TaskDetailDto => ({
  taskId: 1,
  projectId: 7,
  title: "Tạo database",
  description: "Dựng database cho dự án này",
  status: "InProgress",
  priority: "High",
  deadline: "2026-08-04",
  estimatedTime: null,
  aiEstimatedTime: 4,
  difficulty: 5,
  actualTime: null,
  progress: 0,
  riskLevel: "MEDIUM",
  createdAt: null,
  completedAt: null,
  createdBy: 1,
  assignees: [],
  dependencies: [],
  requiredSkillIds: [],
  ...overrides,
});

describe("TaskCard", () => {
  it("shows the assignee's picture rather than their initials", () => {
    // The API sends this as `avatar`; the client read `userAvatar`, so it was always undefined and
    // every card fell back to initials.
    render(<TaskCard task={task({ assignees: [{ userId: 2, userName: "Trọng Huỳnh", avatar: AVATAR }] })} />);

    expect(screen.getByRole("img")).toHaveAttribute("src", AVATAR);
  });

  it("falls back to initials when the assignee has no picture", () => {
    render(<TaskCard task={task({ assignees: [{ userId: 2, userName: "Trọng Huỳnh", avatar: null }] })} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("TH")).toBeInTheDocument();
  });

  it("renders the stored task type instead of guessing from the title", () => {
    render(<TaskCard task={task({ taskTypeId: 1, taskTypeName: "Develop", taskTypeColor: "#3B82F6" })} />);

    expect(screen.getByText("Develop")).toBeInTheDocument();
  });

  it("puts the risk level where it is read before the title is finished", () => {
    render(<TaskCard task={task({ riskLevel: "HIGH" })} />);

    expect(screen.getByLabelText(/high risk/i)).toBeInTheDocument();
  });
});
