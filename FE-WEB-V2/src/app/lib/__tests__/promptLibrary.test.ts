import { describe, expect, it } from "vitest";
import { ALL_PROMPTS, PROMPT_LIBRARY, searchPrompts } from "../promptLibrary";
import { predictPrompt } from "../promptIntent";

describe("prompt library", () => {
  it("offers at least fifty suggestions", () => {
    expect(ALL_PROMPTS.length).toBeGreaterThanOrEqual(50);
  });

  it("has no duplicates", () => {
    expect(new Set(ALL_PROMPTS).size).toBe(ALL_PROMPTS.length);
  });

  it("gives every group an id, a title and a hint", () => {
    for (const group of PROMPT_LIBRARY) {
      expect(group.id).toBeTruthy();
      expect(group.title).toBeTruthy();
      expect(group.hint).toBeTruthy();
      expect(group.prompts.length).toBeGreaterThan(0);
    }
  });

  it("never suggests something the agent has no tool for", () => {
    // A suggestion the assistant then refuses is worse than none: the user spent a turn on it.
    const refused = ALL_PROMPTS.filter((p) => predictPrompt(p).kind === "out-of-scope");
    expect(refused).toEqual([]);
  });

  it("keeps the risk group answerable even when the AI is down", () => {
    // These map to the deterministic diagnostics, so they survive a provider outage.
    const risk = PROMPT_LIBRARY.find((g) => g.id === "risk")!;
    const resilient = risk.prompts.filter((p) => predictPrompt(p).kind === "instant");
    expect(resilient.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps the deadline group answerable even when the AI is down", () => {
    const deadline = PROMPT_LIBRARY.find((g) => g.id === "deadline")!;
    const resilient = deadline.prompts.filter((p) => predictPrompt(p).kind === "instant");
    expect(resilient.length).toBeGreaterThanOrEqual(5);
  });

  it("routes the create group to the agent rather than the diagnostics", () => {
    const create = PROMPT_LIBRARY.find((g) => g.id === "create")!;
    for (const prompt of create.prompts) {
      expect(predictPrompt(prompt).kind).toBe("agent");
    }
  });

  it("finds suggestions by substring", () => {
    expect(searchPrompts("quá hạn").length).toBeGreaterThan(0);
    expect(searchPrompts("QUÁ HẠN").length).toBeGreaterThan(0);
    expect(searchPrompts("")).toEqual([]);
  });

  it("caps how many search results it returns", () => {
    expect(searchPrompts("task", 3)).toHaveLength(3);
  });
});
