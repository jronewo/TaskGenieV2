import { describe, expect, it } from "vitest";
import { buildTemplateCsv, parseTaskCsv, resolveSkillIds, IMPORT_COLUMNS } from "../taskImport";

const CATALOG = [
  { skillId: 1, skillName: "React" },
  { skillId: 2, skillName: "SQL" },
];

describe("task import template", () => {
  it("starts with a BOM so Excel reads it as UTF-8", () => {
    expect(buildTemplateCsv().charCodeAt(0)).toBe(0xfeff);
  });

  it("carries the documented columns and no difficulty column", () => {
    const header = buildTemplateCsv().split("\r\n")[0].replace(/^﻿/, "");
    expect(header).toBe(IMPORT_COLUMNS.join(","));
    expect(header.toLowerCase()).not.toContain("difficulty");
  });

  it("round-trips through the parser", () => {
    const rows = parseTaskCsv(buildTemplateCsv());
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.errors.length === 0)).toBe(true);
    expect(rows[0].priority).toBe("Critical");
    expect(rows[0].skills).toEqual([
      { name: "React", level: 4 },
      { name: "Testing", level: 3 },
    ]);
  });
});

describe("parseTaskCsv", () => {
  it("keeps commas inside quoted descriptions", () => {
    const rows = parseTaskCsv('Task name,Description,Priority,Required skills\nFix it,"Broken, badly",High,React');
    expect(rows[0].description).toBe("Broken, badly");
    expect(rows[0].errors).toEqual([]);
  });

  it("defaults an empty priority to Medium and rejects an unknown one", () => {
    const rows = parseTaskCsv("Task name,Description,Priority,Required skills\nA,,,\nB,,Urgent,");
    expect(rows[0].priority).toBe("Medium");
    expect(rows[1].errors[0]).toMatch(/not one of/i);
  });

  it("flags a missing task name against its own row number", () => {
    const rows = parseTaskCsv("Task name,Description,Priority,Required skills\nGood,,High,\n,,High,");
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].row).toBe(3);
    expect(rows[1].errors[0]).toMatch(/required/i);
  });

  it("defaults a skill without a level to 3 and rejects one outside 1–5", () => {
    const rows = parseTaskCsv("Task name,Description,Priority,Required skills\nA,,High,SQL\nB,,High,SQL:9");
    expect(rows[0].skills).toEqual([{ name: "SQL", level: 3 }]);
    expect(rows[1].errors[0]).toMatch(/1–5/);
  });

  it("rejects the same skill listed twice on one row", () => {
    const rows = parseTaskCsv("Task name,Description,Priority,Required skills\nA,,High,\"React, react:5\"");
    expect(rows[0].errors[0]).toMatch(/twice/i);
  });

  it("accepts a file pasted without a header row", () => {
    const rows = parseTaskCsv("Just a task,,High,React");
    expect(rows).toHaveLength(1);
    expect(rows[0].row).toBe(1);
    expect(rows[0].title).toBe("Just a task");
  });

  it("returns nothing for an empty file", () => {
    expect(parseTaskCsv("")).toEqual([]);
    expect(parseTaskCsv("\n\n")).toEqual([]);
  });
});

describe("resolveSkillIds", () => {
  it("matches catalog names case-insensitively", () => {
    const { resolved, unknown } = resolveSkillIds([{ name: "react", level: 4 }], CATALOG);
    expect(resolved).toEqual([{ skillId: 1, requiredLevel: 4 }]);
    expect(unknown).toEqual([]);
  });

  it("reports unknown skills instead of dropping them silently", () => {
    const { resolved, unknown } = resolveSkillIds(
      [{ name: "SQL", level: 2 }, { name: "Cobol", level: 3 }],
      CATALOG
    );
    expect(resolved).toEqual([{ skillId: 2, requiredLevel: 2 }]);
    expect(unknown).toEqual(["Cobol"]);
  });
});
