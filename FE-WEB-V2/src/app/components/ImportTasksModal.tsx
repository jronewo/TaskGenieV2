import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, Upload, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { taskApi } from "../services/taskApi";
import { skillApi } from "../services/adminApi";
import { ApiError } from "../services/apiClient";
import {
  IMPORT_COLUMNS,
  ParsedTaskRow,
  buildTemplateCsv,
  parseTaskCsv,
  resolveSkillIds,
} from "../lib/taskImport";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "You don't have permission to add tasks to this project.";
    if (err.message) return err.message;
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

interface Props {
  open: boolean;
  projectId: number | null;
  onClose: () => void;
  /** Called after at least one task was created, so the board refetches. */
  onImported: () => void;
}

interface RowResult {
  row: ParsedTaskRow;
  status: "pending" | "created" | "failed";
  detail?: string;
}

/**
 * Bulk task import from a spreadsheet.
 *
 * Rows are created one at a time and reported individually: a partial import is a normal outcome
 * (a bad priority on line 7 must not throw away the six good rows before it), so the user always
 * sees exactly what landed and what did not.
 */
export const ImportTasksModal = ({ open, projectId, onClose, onImported }: Props) => {
  const [catalog, setCatalog] = useState<{ skillId: number; skillName: string }[]>([]);
  const [rows, setRows] = useState<RowResult[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows([]);
    setFileName(null);
    setError(null);
    setDone(false);
    void skillApi.catalog().then(setCatalog).catch(() => setCatalog([]));
  }, [open]);

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "taskgenie-task-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setError(null);
    setDone(false);
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseTaskCsv(text);
      if (parsed.length === 0) setError("That file has no task rows.");
      setRows(parsed.map((row) => ({ row, status: "pending" })));
    } catch {
      setError("That file could not be read as text.");
      setRows([]);
    }
  };

  const importable = rows.filter((r) => r.row.errors.length === 0 && r.status !== "created");

  const runImport = async () => {
    if (projectId == null || busy || importable.length === 0) return;
    setBusy(true);
    setError(null);

    const next = [...rows];
    let created = 0;

    for (let i = 0; i < next.length; i += 1) {
      const entry = next[i];
      if (entry.row.errors.length > 0 || entry.status === "created") continue;

      try {
        const task = await taskApi.create({
          projectId,
          title: entry.row.title,
          description: entry.row.description || null,
          priority: entry.row.priority,
          deadline: null,
          // Difficulty is left for the AI estimate rather than guessed from a spreadsheet.
          difficulty: null,
        });

        const { resolved, unknown } = resolveSkillIds(entry.row.skills, catalog);
        if (resolved.length > 0) {
          await taskApi.setRequiredSkills(task.taskId, resolved);
        }

        next[i] = {
          ...entry,
          status: "created",
          detail: unknown.length > 0 ? `Created. Unknown skill(s) skipped: ${unknown.join(", ")}` : "Created.",
        };
        created += 1;
      } catch (err) {
        next[i] = { ...entry, status: "failed", detail: errorMessage(err) };
      }
      setRows([...next]);
    }

    setBusy(false);
    setDone(true);
    if (created > 0) onImported();
  };

  const createdCount = rows.filter((r) => r.status === "created").length;
  const invalidCount = rows.filter((r) => r.row.errors.length > 0).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Import tasks"
        >
          <motion.div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white p-5"
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Import tasks from a spreadsheet</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
                <X size={16} aria-hidden />
              </button>
            </div>

            <p className="mb-3 text-[11px] text-gray-500">
              Columns: <span className="font-medium text-gray-700">{IMPORT_COLUMNS.join(" · ")}</span>. Write skills as
              <span className="font-medium text-gray-700"> React:4, SQL</span> — the number is the level the assignee
              should have (1–5, default 3). Difficulty is left to the AI estimate.
            </p>

            {projectId == null && (
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Select a project first.
              </p>
            )}
            {error && (
              <div role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                <Download size={13} aria-hidden /> Download template
              </button>

              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                aria-label="Spreadsheet file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                <Upload size={13} aria-hidden /> Choose file
              </button>
              {fileName && <span className="self-center text-[11px] text-gray-500">{fileName}</span>}
            </div>

            {rows.length > 0 && (
              <>
                <p className="mb-2 text-[11px] text-gray-600">
                  {rows.length} row(s) read
                  {invalidCount > 0 && `, ${invalidCount} with problems`}
                  {createdCount > 0 && `, ${createdCount} created`}.
                </p>

                <ul className="mb-3 flex-1 space-y-1.5 overflow-y-auto">
                  {rows.map(({ row, status, detail }) => {
                    const bad = row.errors.length > 0 || status === "failed";
                    return (
                      <li
                        key={row.row}
                        className={`rounded-md border px-2.5 py-2 text-[11px] ${
                          bad
                            ? "border-red-200 bg-red-50"
                            : status === "created"
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {bad ? (
                            <AlertTriangle size={12} className="mt-0.5 shrink-0 text-red-600" aria-hidden />
                          ) : status === "created" ? (
                            <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
                          ) : (
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" aria-hidden />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-gray-900">
                              Row {row.row}: {row.title || "(no name)"}
                            </p>
                            <p className="text-gray-500">
                              {row.priority}
                              {row.skills.length > 0 &&
                                ` · ${row.skills.map((s) => `${s.name}:${s.level}`).join(", ")}`}
                            </p>
                            {row.errors.map((e) => (
                              <p key={e} className="text-red-700">
                                {e}
                              </p>
                            ))}
                            {detail && <p className={status === "failed" ? "text-red-700" : "text-emerald-700"}>{detail}</p>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <div className="mt-auto flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                {done ? "Close" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={runImport}
                disabled={projectId == null || busy || importable.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1A237E] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
                Import {importable.length > 0 ? `${importable.length} task(s)` : ""}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
