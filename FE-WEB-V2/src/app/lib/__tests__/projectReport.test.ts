import { describe, expect, it } from "vitest";
import { buildProjectReport } from "../projectReport";
import { ProjectDto } from "../../services/projectApi";
import { TaskDetailDto } from "../../services/taskApi";

const project = (overrides: Partial<ProjectDto> = {}): ProjectDto => ({
  projectId: 1,
  name: "Website Revamp",
  description: null,
  status: "Completed",
  organizationId: null,
  organizationName: null,
  teamId: null,
  teamName: null,
  deadline: "2026-03-10",
  progress: 100,
  predictedEndDate: null,
  riskLevel: "LOW",
  createdAt: "2026-01-01T00:00:00Z",
  // The project was closed on this date; the report measures everything against it.
  updatedAt: "2026-03-15T00:00:00Z",
  ...overrides,
});

const task = (overrides: Partial<TaskDetailDto> = {}): TaskDetailDto => ({
  taskId: 1,
  projectId: 1,
  title: "Task",
  description: null,
  status: "Todo",
  priority: "Medium",
  deadline: null,
  estimatedTime: null,
  aiEstimatedTime: null,
  actualTime: null,
  progress: 0,
  riskLevel: "LOW",
  aiSummary: null,
  createdAt: null,
  completedAt: null,
  createdBy: null,
  assignees: [],
  dependencies: [],
  requiredSkillIds: [],
  ...overrides,
});

const anna = { userId: 10, userName: "Anna" };
const ben = { userId: 11, userName: "Ben" };

describe("buildProjectReport", () => {
  it("reports how many days past its planned deadline the project closed", () => {
    const report = buildProjectReport(project(), []);

    expect(report.scheduleVerdict).toBe("LATE");
    expect(report.daysOverdue).toBe(5);
    expect(report.daysEarly).toBe(0);
  });

  it("reports an early closure with the days saved", () => {
    const report = buildProjectReport(project({ updatedAt: "2026-03-04T00:00:00Z" }), []);

    expect(report.scheduleVerdict).toBe("EARLY");
    expect(report.daysEarly).toBe(6);
    expect(report.daysOverdue).toBe(0);
  });

  it("treats closing exactly on the planned date as on time, not early", () => {
    const report = buildProjectReport(project({ updatedAt: "2026-03-10T00:00:00Z" }), []);

    expect(report.scheduleVerdict).toBe("ON_TIME");
    expect(report.daysOverdue).toBe(0);
    expect(report.daysEarly).toBe(0);
  });

  it("cannot judge the schedule when the project was created without a deadline", () => {
    const report = buildProjectReport(project({ deadline: null }), []);

    expect(report.scheduleVerdict).toBe("NO_PLAN");
    expect(report.daysOverdue).toBeNull();
  });

  it("counts a finished task as late only when it was completed after its own deadline", () => {
    const report = buildProjectReport(project(), [
      task({ taskId: 1, status: "Done", deadline: "2026-02-01", completedAt: "2026-01-30T09:00:00Z" }),
      task({ taskId: 2, status: "Done", deadline: "2026-02-01", completedAt: "2026-02-05T09:00:00Z" }),
    ]);

    expect(report.doneTasks).toBe(2);
    expect(report.onTimeTasks).toBe(1);
    expect(report.lateTasks).toBe(1);
  });

  it("counts unfinished work past its deadline as late, so an abandoned task cannot read as on time", () => {
    const report = buildProjectReport(project(), [
      task({ taskId: 1, status: "Todo", deadline: "2026-02-01" }),
    ]);

    expect(report.lateTasks).toBe(1);
    expect(report.overdueUnfinishedTasks).toBe(1);
    expect(report.unfinishedTasks).toBe(1);
  });

  it("excludes tasks without a deadline from both the on-time and the late count", () => {
    const report = buildProjectReport(project(), [
      task({ taskId: 1, status: "Todo", deadline: null }),
      task({ taskId: 2, status: "Done", deadline: null, completedAt: "2026-03-01T00:00:00Z" }),
    ]);

    expect(report.tasksWithoutDeadline).toBe(2);
    expect(report.onTimeTasks).toBe(0);
    expect(report.lateTasks).toBe(0);
  });

  it("attributes each task to every assignee and lists who was late", () => {
    const report = buildProjectReport(project(), [
      task({ taskId: 1, status: "Done", deadline: "2026-02-01", completedAt: "2026-02-09T00:00:00Z", assignees: [anna] }),
      task({ taskId: 2, status: "Done", deadline: "2026-02-01", completedAt: "2026-01-20T00:00:00Z", assignees: [anna, ben] }),
      task({ taskId: 3, status: "Todo", deadline: "2026-04-30", assignees: [ben] }),
    ]);

    const annaRow = report.members.find((m) => m.userId === anna.userId)!;
    expect(annaRow.assignedTasks).toBe(2);
    expect(annaRow.doneTasks).toBe(2);
    expect(annaRow.lateTasks).toBe(1);

    const benRow = report.members.find((m) => m.userId === ben.userId)!;
    expect(benRow.assignedTasks).toBe(2);
    expect(benRow.lateTasks).toBe(0);

    expect(report.mostLate?.userName).toBe("Anna");
    expect(report.highestWorkload?.assignedTasks).toBe(2);
  });

  it("lists every late task with its own days-late figure and averages them", () => {
    const report = buildProjectReport(project(), [
      // 8 days late
      task({ taskId: 1, status: "Done", deadline: "2026-02-01", completedAt: "2026-02-09T00:00:00Z", assignees: [anna] }),
      // 2 days late
      task({ taskId: 2, status: "Done", deadline: "2026-02-10", completedAt: "2026-02-12T00:00:00Z", assignees: [ben] }),
    ]);

    expect(report.lateTaskRows.map((r) => r.daysLate)).toEqual([8, 2]);
    expect(report.longestDelay).toBe(8);
    expect(report.averageDaysLate).toBe(5);
    // Codes come from the project name, matching the issue keys shown on the board.
    expect(report.lateTaskRows[0].code).toBe("WR-1");
  });

  it("averages a member's own delay rather than the project-wide delay", () => {
    const report = buildProjectReport(project(), [
      task({ taskId: 1, status: "Done", deadline: "2026-02-01", completedAt: "2026-02-05T00:00:00Z", assignees: [anna] }),
      task({ taskId: 2, status: "Done", deadline: "2026-02-01", completedAt: "2026-02-03T00:00:00Z", assignees: [anna] }),
      task({ taskId: 3, status: "Done", deadline: "2026-02-01", completedAt: "2026-01-25T00:00:00Z", assignees: [anna] }),
    ]);

    const row = report.members.find((m) => m.userId === anna.userId)!;
    expect(row.lateTasks).toBe(2);
    expect(row.averageDaysLate).toBe(3); // (4 + 2) / 2
    expect(row.onTimeRate).toBeCloseTo(33.3, 1);
  });

  it("takes the project manager and each member's role from the team", () => {
    const report = buildProjectReport(
      project(),
      [task({ taskId: 1, assignees: [anna] })],
      [
        { id: 1, userId: anna.userId, userName: "Anna", role: "LEADER" },
        { id: 2, userId: ben.userId, userName: "Ben", role: "MEMBER" },
      ]
    );

    expect(report.projectManager).toBe("Anna");
    expect(report.members.find((m) => m.userId === anna.userId)!.role).toBe("Trưởng nhóm");
  });

  it("keeps unassigned work visible instead of dropping it from the member totals", () => {
    const report = buildProjectReport(project(), [task({ taskId: 1, assignees: [] })]);

    const row = report.members[0];
    expect(row.userName).toBe("Chưa phân công");
    expect(row.assignedTasks).toBe(1);
  });
});
