import { describe, expect, it } from "vitest";
import { INTENTS, describeVerdict, predictPrompt } from "../promptIntent";

describe("predictPrompt", () => {
  it.each([
    ["task nào đang rủi ro cao?", "at-risk"],
    ["tính toán risk estimate", "at-risk"],
    ["task nào sắp đến hạn", "due-soon"],
    ["what is due soon", "due-soon"],
    ["có task nào quá hạn không", "overdue"],
    ["task nào chưa được assign", "unassigned"],
    ["hôm nay đang làm gì", "in-progress"],
    ["cho tôi tổng quan", "overview"],
  ])("recognises %s", (prompt, intent) => {
    const verdict = predictPrompt(prompt);
    expect(verdict.kind).toBe("instant");
    if (verdict.kind === "instant") expect(verdict.intent).toBe(intent);
  });

  it("puts overdue ahead of the broader deadline phrases", () => {
    // "trễ deadline" contains "deadline"; ordering decides which answer the user is promised.
    const verdict = predictPrompt("task nào trễ deadline");
    expect(verdict.kind).toBe("instant");
    if (verdict.kind === "instant") expect(verdict.intent).toBe("overdue");
  });

  it.each([
    "tạo 1 project mới giúp tôi",
    "tạo dự án mới",
    "giao task 5 cho ai đó",
    "thêm task vào dự án này",
    "create a new project for me",
    "assign this to someone",
  ])("marks %s as something the agent can do with an AI turn", (prompt) => {
    // Keyword matching, not exact phrases: real prompts carry filler ("tạo *1* project *mới*").
    expect(predictPrompt(prompt).kind).toBe("agent");
  });

  it("warns before a turn is spent on something the agent has no tool for", () => {
    const verdict = predictPrompt("mời thêm thành viên vào team");
    expect(verdict.kind).toBe("out-of-scope");
    if (verdict.kind === "out-of-scope") expect(verdict.where).toContain("Team");
  });

  it("suggests the closest built-in question when nothing matches exactly", () => {
    const verdict = predictPrompt("công việc nào quan trọng");
    expect(verdict.kind).toBe("unknown");
    if (verdict.kind === "unknown") expect(verdict.suggestion).toContain("Công việc");
  });

  it("stays silent rather than guessing on an unrelated prompt", () => {
    const verdict = predictPrompt("viết cho tôi một bài thơ về mùa thu");
    expect(verdict.kind).toBe("unknown");
    if (verdict.kind === "unknown") expect(verdict.suggestion).toBeNull();
  });

  it("treats an empty prompt as nothing to say", () => {
    expect(describeVerdict(predictPrompt("   "))).toBeNull();
  });
});

describe("vocabulary parity with the server", () => {
  /**
   * These phrases are duplicated in WorkspaceDiagnostics on the server. The hint lies if the two
   * drift, so the list is pinned here — a change on one side has to be made on both.
   */
  it("keeps the six recognised intents and their phrases", () => {
    expect(INTENTS.map((i) => i.intent)).toEqual([
      "overdue",
      "due-soon",
      "at-risk",
      "unassigned",
      "in-progress",
      "overview",
    ]);

    expect(INTENTS.find((i) => i.intent === "at-risk")!.phrases).toContain("risk estimate");
    expect(INTENTS.find((i) => i.intent === "due-soon")!.phrases).toContain("sắp đến hạn");
    expect(INTENTS.find((i) => i.intent === "unassigned")!.phrases).toContain("chưa được assign");
  });

  it("describes what the assistant will actually do", () => {
    // No language model is involved any more: a recognised question is answered from the rows,
    // and an action names the API it will call.
    expect(describeVerdict(predictPrompt("task nào rủi ro"))).toContain("trực tiếp từ dữ liệu");
    expect(describeVerdict(predictPrompt("tạo dự án mới"))).toContain("gọi API");
  });
});
