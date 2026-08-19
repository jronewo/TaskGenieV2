/**
 * Spreadsheet import for tasks.
 *
 * The file is CSV rather than a binary .xlsx: Excel opens, edits and saves CSV natively, and a
 * real .xlsx parser would mean adding a runtime dependency. The BOM below is what makes Excel read
 * the file as UTF-8 — without it Vietnamese text arrives mangled.
 *
 * Difficulty is deliberately not a column: the AI estimates it from the description once the task
 * exists.
 */

export const IMPORT_COLUMNS = [
  "ID",
  "Task name",
  "Description",
  "Type",
  "Priority",
  "Deadline",
  "Required skills",
  "Depends on",
] as const;

export const VALID_PRIORITIES = ["Low", "Medium", "High", "Critical"];

/** Prepended so Excel reads the file as UTF-8 instead of the local codepage. */
const BOM = "﻿";

export interface ParsedTaskRow {
  /** 1-based line number in the file, for error messages the user can act on. */
  row: number;
  /**
   * The author's own identifier for this row — "1", "T1", "design", anything. It exists only
   * inside the file so that `Depends on` can point at other rows. It is never a database id: the
   * real task ids do not exist until the import runs, and a spreadsheet written last week would
   * otherwise reference tasks that have since been deleted or renumbered.
   */
  localId: string;
  title: string;
  description: string;
  /** Type name as typed; resolved against the catalog at import time. */
  typeName: string;
  priority: string;
  /** yyyy-mm-dd, or empty. */
  deadline: string;
  /** Skill names exactly as typed, with the level the author asked for. */
  skills: { name: string; level: number }[];
  /** Local ids of the rows this task waits on. */
  dependsOn: string[];
  errors: string[];
}

function escapeCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * A ready-to-edit file with the header row and a worked example.
 *
 * The example is a real chain — design, then two tasks that wait on it, then a release that waits
 * on both — because "Depends on" is the column people get wrong, and a filled-in example explains
 * it faster than any instruction.
 */
export function buildTemplateCsv(): string {
  const rows = [
    IMPORT_COLUMNS as unknown as string[],
    ["1", "Thiết kế màn hình đăng nhập", "Wireframe và luồng đăng nhập", "Design", "High", "2026-09-01", "UI/UX:4", ""],
    ["2", "Dựng API đăng nhập", "Endpoint, JWT, refresh token", "Develop", "High", "2026-09-05", "C#:4, SQL:3", "1"],
    ["3", "Dựng giao diện đăng nhập", "Nối API vào màn hình", "Develop", "Medium", "2026-09-06", "React:4", "1"],
    ["4", "Kiểm thử luồng đăng nhập", "Ca kiểm thử cho đăng nhập và khoá tài khoản", "Testing", "Medium", "2026-09-10", "Testing:3", "2, 3"],
  ];
  return BOM + rows.map((cells) => cells.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}

/** Splits one CSV line, honouring quoted fields that contain commas or escaped quotes. */
function splitLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

/** "React:4, Testing" → levels default to 3, the middle of the 1–5 scale. */
function parseSkills(raw: string): { skills: { name: string; level: number }[]; errors: string[] } {
  const skills: { name: string; level: number }[] = [];
  const errors: string[] = [];

  const seen = new Set<string>();

  for (const part of raw.split(/[,;]/).map((p) => p.trim()).filter(Boolean)) {
    const [name, levelRaw] = part.split(":").map((p) => p.trim());
    if (!name) continue;

    // Listing a skill twice usually means two different levels were intended; guessing which one
    // wins would quietly change how the assignment score reads the task.
    if (seen.has(name.toLowerCase())) {
      errors.push(`Kỹ năng "${name}" bị liệt kê hai lần trên cùng một dòng.`);
      continue;
    }
    seen.add(name.toLowerCase());

    let level = 3;
    if (levelRaw) {
      const parsed = Number(levelRaw);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        errors.push(`Mức kỹ năng "${part}" phải là số nguyên 1–5.`);
        continue;
      }
      level = parsed;
    }
    skills.push({ name, level });
  }

  return { skills, errors };
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

/**
 * Parses the file and validates it as a whole.
 *
 * Cross-row problems — a duplicate ID, a dependency pointing at a row that is not there, a loop —
 * can only be seen once every row is read, and they must be caught here rather than halfway
 * through the import, when some tasks already exist and cannot be taken back.
 */
export function parseTaskCsv(text: string, knownTypeNames: string[] = []): ParsedTaskRow[] {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Skip the header if it looks like one; a file pasted without headers still works.
  const firstCells = splitLine(lines[0]).map((c) => c.toLowerCase());
  const hasHeader = firstCells[0] === "id" || firstCells[0] === "task name" || firstCells[0] === "title";
  const bodyLines = hasHeader ? lines.slice(1) : lines;
  const offset = hasHeader ? 2 : 1;

  const types = knownTypeNames.map((t) => t.toLowerCase());

  const rows: ParsedTaskRow[] = bodyLines.map((line, index) => {
    const cells = splitLine(line);
    const [idRaw = "", title = "", description = "", typeName = "", priority = "", deadline = "", skillsRaw = "", dependsRaw = ""] = cells;
    const errors: string[] = [];

    if (!title) errors.push("Thiếu tên công việc.");

    let normalisedPriority = "Medium";
    if (priority) {
      const match = VALID_PRIORITIES.find((p) => p.toLowerCase() === priority.toLowerCase());
      if (match) normalisedPriority = match;
      else errors.push(`Độ ưu tiên "${priority}" phải là một trong ${VALID_PRIORITIES.join(", ")}.`);
    }

    if (typeName && types.length > 0 && !types.includes(typeName.toLowerCase())) {
      errors.push(`Loại "${typeName}" không có trong danh mục.`);
    }

    if (deadline && !isValidDate(deadline)) {
      errors.push(`Hạn "${deadline}" phải theo dạng yyyy-mm-dd.`);
    }

    const { skills, errors: skillErrors } = parseSkills(skillsRaw);
    const dependsOn = dependsRaw.split(/[,;]/).map((d) => d.trim()).filter(Boolean);

    return {
      row: index + offset,
      localId: idRaw.trim(),
      title,
      description,
      typeName: typeName.trim(),
      priority: normalisedPriority,
      deadline: deadline.trim(),
      skills,
      dependsOn,
      errors: [...errors, ...skillErrors],
    };
  });

  return validateReferences(rows);
}

/** Duplicate ids, dangling references, self-reference and loops — all only visible across rows. */
function validateReferences(rows: ParsedTaskRow[]): ParsedTaskRow[] {
  const byId = new Map<string, ParsedTaskRow[]>();
  for (const row of rows) {
    if (!row.localId) continue;
    const key = row.localId.toLowerCase();
    byId.set(key, [...(byId.get(key) ?? []), row]);
  }

  for (const [id, sharing] of byId) {
    if (sharing.length > 1) {
      const lines = sharing.map((r) => r.row).join(", ");
      sharing.forEach((r) => r.errors.push(`ID "${r.localId}" bị trùng (dòng ${lines}).`));
    }
    void id;
  }

  for (const row of rows) {
    if (row.dependsOn.length === 0) continue;

    if (!row.localId) {
      row.errors.push("Dòng có phụ thuộc thì phải có ID để dòng khác tham chiếu tới.");
    }

    for (const ref of row.dependsOn) {
      if (ref.toLowerCase() === row.localId.toLowerCase()) {
        row.errors.push("Một công việc không thể phụ thuộc chính nó.");
      } else if (!byId.has(ref.toLowerCase())) {
        row.errors.push(`Không tìm thấy ID "${ref}" trong cột ID của tệp.`);
      }
    }
  }

  // Loops are refused by the API too, but catching them here means nothing is created at all —
  // rather than half the tasks existing before the first bad edge is rejected.
  for (const id of findCycle(rows)) {
    rows
      .filter((r) => r.localId.toLowerCase() === id)
      .forEach((r) => r.errors.push("Phụ thuộc vòng tròn: các công việc này chờ lẫn nhau."));
  }

  return rows;
}

/** Ids left unsettled by a topological pass — exactly the rows caught in a loop. */
function findCycle(rows: ParsedTaskRow[]): Set<string> {
  const ids = new Set(rows.filter((r) => r.localId).map((r) => r.localId.toLowerCase()));
  const waitsOn = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.localId) continue;
    waitsOn.set(
      row.localId.toLowerCase(),
      row.dependsOn.map((d) => d.toLowerCase()).filter((d) => ids.has(d))
    );
  }

  const settled = new Set<string>();
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const id of ids) {
      if (settled.has(id)) continue;
      if ((waitsOn.get(id) ?? []).every((d) => settled.has(d))) {
        settled.add(id);
        progressed = true;
      }
    }
  }

  return new Set([...ids].filter((id) => !settled.has(id)));
}

/**
 * Maps skill names onto catalog ids. Unknown names are reported rather than silently dropped —
 * importing a task whose required skills vanished would quietly degrade the assignment score.
 */
export function resolveSkillIds(
  skills: { name: string; level: number }[],
  catalog: { skillId: number; skillName: string }[]
): { resolved: { skillId: number; requiredLevel: number }[]; unknown: string[] } {
  const resolved: { skillId: number; requiredLevel: number }[] = [];
  const unknown: string[] = [];

  for (const skill of skills) {
    const match = catalog.find((c) => c.skillName?.toLowerCase() === skill.name.toLowerCase());
    if (match) resolved.push({ skillId: match.skillId, requiredLevel: skill.level });
    else unknown.push(skill.name);
  }

  return { resolved, unknown };
}

/** Resolves the Type column against the catalog; blank leaves the task unclassified. */
export function resolveTypeId(
  typeName: string,
  catalog: { taskTypeId: number; name: string }[]
): number | null {
  if (!typeName) return null;
  return catalog.find((t) => t.name.toLowerCase() === typeName.toLowerCase())?.taskTypeId ?? null;
}
