import { render, screen } from "../../../test/renderWithProviders";
import { describe, expect, it } from "vitest";
import { DashboardCharts } from "../DashboardCharts";
import { ProjectDto, TaskSummaryDto } from "../../services/projectApi";

const project = (projectId: number, name: string, riskLevel: string): ProjectDto => ({
  projectId,
  name,
  description: null,
  status: "Active",
  organizationId: null,
  organizationName: null,
  teamId: null,
  teamName: null,
  deadline: null,
  progress: 50,
  predictedEndDate: null,
  riskLevel,
  createdAt: null,
  updatedAt: null,
});

const task = (taskId: number, projectId: number, status: string): TaskSummaryDto => ({
  taskId,
  projectId,
  title: `Task ${taskId}`,
  status,
  priority: "Medium",
});

describe("DashboardCharts", () => {
  it("renders nothing when the workspace has no projects", () => {
    const { container } = render(<DashboardCharts projects={[]} tasks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("counts the real rows it was given rather than a sample series", () => {
    render(
      <DashboardCharts
        projects={[project(1, "Alpha", "HIGH"), project(2, "Beta", "LOW")]}
        tasks={[task(1, 1, "Todo"), task(2, 1, "Done"), task(3, 2, "InProgress")]}
      />
    );

    expect(screen.getByText("3 task trong các dự án của bạn")).toBeInTheDocument();
    // The donut hole carries the figure people came for.
    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("1/3 xong")).toBeInTheDocument();
  });

  it("counts the In Review column as its own slice", () => {
    render(
      <DashboardCharts
        projects={[project(1, "Alpha", "LOW")]}
        tasks={[task(1, 1, "InReview"), task(2, 1, "Done")]}
      />
    );

    // A fourth workflow stage that no chart plots is a stage nobody manages.
    expect(screen.getByText("In review")).toBeInTheDocument();
  });

  it("says there are no tasks instead of drawing an empty pie", () => {
    render(<DashboardCharts projects={[project(1, "Alpha", "LOW")]} tasks={[]} />);

    expect(screen.getByText("Chưa có task nào.")).toBeInTheDocument();
    expect(screen.getByText("0 task trong các dự án của bạn")).toBeInTheDocument();
  });

  it("no longer renders the removed risk and per-project panels", () => {
    render(<DashboardCharts projects={[project(1, "Alpha", "MEDIUM")]} tasks={[task(1, 1, "Todo")]} />);

    expect(screen.queryByText("Project risk")).not.toBeInTheDocument();
    expect(screen.queryByText("Tasks by project")).not.toBeInTheDocument();
  });
});
