/**
 * Spreadsheet import for the skill catalog.
 *
 * CSV rather than binary .xlsx for the same reason the task importer is: Excel reads, edits and
 * saves CSV natively, and parsing .xlsx properly would mean a new runtime dependency. The BOM is
 * what makes Excel treat the file as UTF-8 — without it Vietnamese skill names arrive mangled.
 */

export const SKILL_IMPORT_COLUMNS = ["Skill name"] as const;

/** Prepended so Excel reads the file as UTF-8 instead of the local codepage. */
const BOM = "﻿";

export interface ParsedSkillRow {
  /** 1-based row number in the file, so an error message points at a line the user can find. */
  row: number;
  name: string;
  errors: string[];
}

function escapeCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** A ready-to-edit file with the header row and a few worked examples. */
export function buildSkillTemplateCsv(): string {
  const rows = [SKILL_IMPORT_COLUMNS as unknown as string[], ["React"], ["Kiểm thử tự động"], ["PostgreSQL"]];
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

/**
 * Parses the file into rows. Duplicates within the file, and names already in the catalog, are
 * reported rather than sent — the API rejects them anyway, and a row-level message says which line
 * to fix instead of failing the whole import.
 */
export function parseSkillCsv(
  text: string,
  existingNames: string[] = []
): ParsedSkillRow[] {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Skip the header if it looks like one; a file pasted without headers still works.
  const firstCell = (splitLine(lines[0])[0] ?? "").toLowerCase();
  const hasHeader = firstCell === "skill name" || firstCell === "skill" || firstCell === "name";
  const bodyLines = hasHeader ? lines.slice(1) : lines;
  const offset = hasHeader ? 2 : 1;

  const existing = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  const seen = new Set<string>();

  return bodyLines.map((line, index) => {
    const name = splitLine(line)[0] ?? "";
    const key = name.trim().toLowerCase();
    const errors: string[] = [];

    if (!name) errors.push("Skill name is required.");
    else if (name.length > 100) errors.push("Skill name is longer than 100 characters.");
    else if (seen.has(key)) errors.push("This name appears more than once in the file.");
    else if (existing.has(key)) errors.push("A skill with this name is already in the catalog.");

    if (key) seen.add(key);

    return { row: index + offset, name: name.trim(), errors };
  });
}
