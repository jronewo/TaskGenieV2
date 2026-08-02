/**
 * Spreadsheet import for tasks.
 *
 * The file is CSV rather than a binary .xlsx: Excel opens, edits and saves CSV natively, and a
 * real .xlsx parser would mean adding a runtime dependency. The BOM below is what makes Excel read
 * the file as UTF-8 — without it Vietnamese text arrives mangled.
 *
 * Difficulty is deliberately not a column: the AI estimates it after the task exists.
 */

export const IMPORT_COLUMNS = ["Task name", "Description", "Priority", "Required skills"] as const;

export const VALID_PRIORITIES = ["Low", "Medium", "High", "Critical"];

/** Prepended so Excel reads the file as UTF-8 instead of the local codepage. */
const BOM = "﻿";

export interface ParsedTaskRow {
  /** 1-based row number in the file, for error messages the user can act on. */
  row: number;
  title: string;
  description: string;
  priority: string;
  /** Skill names exactly as typed, with the level the author asked for. */
  skills: { name: string; level: number }[];
  errors: string[];
}

function escapeCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** A ready-to-edit file with the header row and two worked examples. */
export function buildTemplateCsv(): string {
  const rows = [
    IMPORT_COLUMNS as unknown as string[],
    ["Fix the login redirect", "Users bounce back to sign-in after a valid login.", "Critical", "React:4, Testing:3"],
    ["Write the rollback runbook", "Steps to revert the migration safely.", "Medium", "DevOps"],
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
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

/** "React:4, SQL" → [{ name: "React", level: 4 }, { name: "SQL", level: 3 }] */
function parseSkills(raw: string): { skills: { name: string; level: number }[]; errors: string[] } {
  const errors: string[] = [];
  const skills: { name: string; level: number }[] = [];

  for (const part of raw.split(/[,;]/).map((p) => p.trim()).filter(Boolean)) {
    const [namePart, levelPart] = part.split(":").map((p) => p.trim());
    if (!namePart) continue;

    let level = 3; // matches the default the create-task form uses
    if (levelPart) {
      const parsed = Number(levelPart);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        errors.push(`Level for "${namePart}" must be a whole number 1–5.`);
        continue;
      }
      level = parsed;
    }

    if (skills.some((s) => s.name.toLowerCase() === namePart.toLowerCase())) {
      errors.push(`"${namePart}" is listed twice.`);
      continue;
    }
    skills.push({ name: namePart, level });
  }

  return { skills, errors };
}

/**
 * Parses the uploaded text. Rows are returned even when invalid, each carrying its own errors, so
 * the user can see exactly which line to fix rather than a single opaque failure.
 */
export function parseTaskCsv(text: string): ParsedTaskRow[] {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Skip the header if it looks like one; a file pasted without headers still works.
  const firstCells = splitLine(lines[0]).map((c) => c.toLowerCase());
  const hasHeader = firstCells[0] === "task name" || firstCells[0] === "title";
  const bodyLines = hasHeader ? lines.slice(1) : lines;
  const offset = hasHeader ? 2 : 1;

  return bodyLines.map((line, index) => {
    const cells = splitLine(line);
    const [title = "", description = "", priority = "", skillsRaw = ""] = cells;
    const errors: string[] = [];

    if (!title) errors.push("Task name is required.");

    let normalisedPriority = "Medium";
    if (priority) {
      const match = VALID_PRIORITIES.find((p) => p.toLowerCase() === priority.toLowerCase());
      if (match) {
        normalisedPriority = match;
      } else {
        errors.push(`Priority "${priority}" is not one of ${VALID_PRIORITIES.join(", ")}.`);
      }
    }

    const { skills, errors: skillErrors } = parseSkills(skillsRaw);

    return {
      row: index + offset,
      title,
      description,
      priority: normalisedPriority,
      skills,
      errors: [...errors, ...skillErrors],
    };
  });
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
