import { describe, expect, it } from "vitest";
import { initials, issueKey, issueType, priorityRank, projectKey, statusLabel } from "../jira";

describe("jira helpers", () => {
  it("builds a project key from the words of the name", () => {
    expect(projectKey("Website Revamp")).toBe("WR");
    expect(projectKey("Mobile")).toBe("MOB");
    expect(projectKey("TaskGenie API v2")).toBe("TAV");
  });

  it("falls back to TASK when there is no usable project name", () => {
    expect(projectKey(null)).toBe("TASK");
    expect(projectKey("   ")).toBe("TASK");
    expect(issueKey(undefined, 42)).toBe("TASK-42");
  });

  it("pairs the project key with the task id", () => {
    expect(issueKey("Website Revamp", 42)).toBe("WR-42");
  });

  it("infers the issue type from the title and defaults to Task", () => {
    expect(issueType({ title: "Fix the broken login" })).toBe("Bug");
    expect(issueType({ title: "As a user I want dark mode" })).toBe("Story");
    expect(issueType({ title: "Update the deployment docs" })).toBe("Task");
    expect(issueType({ title: null })).toBe("Task");
  });

  it("maps backend statuses onto Jira's column labels", () => {
    expect(statusLabel("Todo")).toBe("TO DO");
    expect(statusLabel("InProgress")).toBe("IN PROGRESS");
    expect(statusLabel("Done")).toBe("DONE");
    expect(statusLabel(undefined)).toBe("TO DO");
  });

  it("ranks priority and keeps Medium as the default", () => {
    expect(priorityRank("Critical").label).toBe("Highest");
    expect(priorityRank("Low").direction).toBe("down");
    expect(priorityRank(null).label).toBe("Medium");
    expect(priorityRank("Nonsense").label).toBe("Medium");
  });

  it("derives avatar initials from first and last name", () => {
    expect(initials("Team Lead")).toBe("TL");
    expect(initials("Madonna")).toBe("MA");
    expect(initials(null)).toBe("?");
  });
});
