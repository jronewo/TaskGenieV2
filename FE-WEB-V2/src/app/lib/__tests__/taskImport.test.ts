import { describe, expect, it } from "vitest";
import {
  buildTemplateCsv, parseTaskCsv, resolveSkillIds, resolveTypeId, IMPORT_COLUMNS,
} from "../taskImport";

const CATALOG = [
  { skillId: 1, skillName: "React" },
  { skillId: 2, skillName: "SQL" },
];

const TYPES = [
  { taskTypeId: 1, name: "Develop" },
  { taskTypeId: 2, name: "Bug" },
  { taskTypeId: 3, name: "Testing" },
  { taskTypeId: 7, name: "Design" },
];

const TYPE_NAMES = TYPES.map((t) => t.name);
const HEAD = IMPORT_COLUMNS.join(",");

describe("task import template", () => {
  it("starts with a BOM so Excel reads it as UTF-8", () => {
    expect(buildTemplateCsv().charCodeAt(0)).toBe(0xfeff);
  });

  it("carries the documented columns and no difficulty column", () => {
    const header = buildTemplateCsv().split("\r\n")[0].replace(/^﻿/, "");
    expect(header).toBe(HEAD);
    expect(header.toLowerCase()).not.toContain("difficulty");
  });

  it("round-trips through the parser with no errors", () => {
    const rows = parseTaskCsv(buildTemplateCsv(), TYPE_NAMES);
    expect(rows).toHaveLength(4);
    expect(rows.flatMap((r) => r.errors)).toEqual([]);
  });

  it("ships a worked dependency chain, because that is the column people get wrong", () => {
    const rows = parseTaskCsv(buildTemplateCsv(), TYPE_NAMES);
    expect(rows[0].dependsOn).toEqual([]);
    expect(rows[1].dependsOn).toEqual(["1"]);
    // The last row waits on two others, so the example shows a list as well as a single value.
    expect(rows[3].dependsOn).toEqual(["2", "3"]);
  });
});

describe("the ID column", () => {
  it("is the author's own reference, kept as typed", () => {
    const rows = parseTaskCsv(`${HEAD}\nT1,Design,,Design,High,,,\nT2,Build,,Develop,High,,,T1`);
    expect(rows[0].localId).toBe("T1");
    expect(rows[1].dependsOn).toEqual(["T1"]);
    expect(rows.flatMap((r) => r.errors)).toEqual([]);
  });

  it("rejects two rows claiming the same ID", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,,,,\n1,B,,,,,,`);
    expect(rows[0].errors[0]).toMatch(/trùng/i);
    expect(rows[1].errors[0]).toMatch(/trùng/i);
  });

  it("rejects a dependency on an ID that is not in the file", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,,,,\n2,B,,,,,,99`);
    expect(rows[1].errors[0]).toMatch(/không tìm thấy id "99"/i);
  });

  it("rejects a row that depends on itself", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,,,,1`);
    expect(rows[0].errors[0]).toMatch(/phụ thuộc chính nó/i);
  });

  it("rejects a loop before anything is created", () => {
    // A→B→C→A. Sending these one at a time would create three tasks and only fail on the last edge.
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,,,,3\n2,B,,,,,,1\n3,C,,,,,,2`);
    expect(rows.every((r) => r.errors.some((e) => /vòng tròn/i.test(e)))).toBe(true);
  });

  it("allows two rows to depend on the same row", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,Design,,,,,,\n2,API,,,,,,1\n3,UI,,,,,,1`);
    expect(rows.flatMap((r) => r.errors)).toEqual([]);
  });

  it("requires an ID on any row other rows must be able to reach", () => {
    const rows = parseTaskCsv(`${HEAD}\n,A,,,,,,1`);
    expect(rows[0].errors.some((e) => /phải có ID/i.test(e))).toBe(true);
  });
});

describe("the Type column", () => {
  it("rejects a type that is not in the catalog", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,Refactor,,,,`, TYPE_NAMES);
    expect(rows[0].errors[0]).toMatch(/không có trong danh mục/i);
  });

  it("accepts a catalog type whatever its casing", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,develop,,,,`, TYPE_NAMES);
    expect(rows[0].errors).toEqual([]);
    expect(resolveTypeId(rows[0].typeName, TYPES)).toBe(1);
  });

  it("leaves the task unclassified when the column is blank", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,,,,`, TYPE_NAMES);
    expect(rows[0].errors).toEqual([]);
    expect(resolveTypeId(rows[0].typeName, TYPES)).toBeNull();
  });
});

describe("parseTaskCsv", () => {
  it("keeps commas inside quoted descriptions", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,Fix it,"Broken, badly",Bug,High,,React,`, TYPE_NAMES);
    expect(rows[0].description).toBe("Broken, badly");
    expect(rows[0].errors).toEqual([]);
  });

  it("defaults an empty priority to Medium and rejects an unknown one", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,,,,\n2,B,,,Urgent,,,`);
    expect(rows[0].priority).toBe("Medium");
    expect(rows[1].errors[0]).toMatch(/phải là một trong/i);
  });

  it("rejects a deadline that is not yyyy-mm-dd", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,,31/12/2026,,`);
    expect(rows[0].errors[0]).toMatch(/yyyy-mm-dd/);
  });

  it("keeps a valid deadline", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,,2026-12-31,,`);
    expect(rows[0].deadline).toBe("2026-12-31");
    expect(rows[0].errors).toEqual([]);
  });

  it("reads a start date from the 9th column, appended so old files still parse", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,,2026-12-31,,,2026-12-01`);
    expect(rows[0].startDate).toBe("2026-12-01");
    expect(rows[0].errors).toEqual([]);
  });

  it("leaves start date empty for a file saved under the old 8-column layout", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,,2026-12-31,,`);
    expect(rows[0].startDate).toBe("");
    expect(rows[0].errors).toEqual([]);
  });

  it("rejects a start date that is not yyyy-mm-dd", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,,,,,01/12/2026`);
    expect(rows[0].errors[0]).toMatch(/yyyy-mm-dd/);
  });

  it("rejects a start date after the deadline", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,,2026-09-01,,,2026-09-10`);
    expect(rows[0].errors[0]).toMatch(/trước hoặc bằng/i);
  });

  it("flags a missing task name against its own row number", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,Good,,,High,,,\n2,,,,High,,,`);
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].row).toBe(3);
    expect(rows[1].errors[0]).toMatch(/thiếu tên/i);
  });

  it("defaults a skill without a level to 3 and rejects one outside 1–5", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,High,,SQL,\n2,B,,,High,,SQL:9,`);
    expect(rows[0].skills).toEqual([{ name: "SQL", level: 3 }]);
    expect(rows[1].errors[0]).toMatch(/1–5/);
  });

  it("rejects the same skill listed twice on one row", () => {
    const rows = parseTaskCsv(`${HEAD}\n1,A,,,High,,"React, react:5",`);
    expect(rows[0].errors[0]).toMatch(/hai lần/i);
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
