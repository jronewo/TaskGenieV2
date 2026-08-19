import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Plus,
  Archive,
  RotateCcw,
  Pencil,
  Loader2,
  Check,
  X,
  Upload,
  Download,
  AlertTriangle,
} from "lucide-react";
import { skillApi, AdminSkillDto } from "../services/adminApi";
import { ApiError } from "../services/apiClient";
import { buildSkillTemplateCsv, parseSkillCsv, ParsedSkillRow, SKILL_IMPORT_COLUMNS } from "../lib/skillImport";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to perform this action.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

interface ImportRow extends ParsedSkillRow {
  status: "pending" | "created" | "failed";
  detail?: string;
}

/**
 * The platform skill catalog — the single place skills are managed.
 *
 * Personal skills are not here: this page is only reachable by a platform administrator, and an
 * administrator has no use for skills on their own profile. People manage their own skills from
 * their profile page, which is where the assignment scoring reads them from.
 */
export const SkillManagement = () => {
  const [catalog, setCatalog] = useState<AdminSkillDto[]>([]);

  const [search, setSearch] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFile, setImportFile] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const full = await skillApi.adminCatalog(search || undefined);
      // A 204 or a malformed body reaches here as undefined; rendering must not depend on the
      // server always returning a list.
      setCatalog(Array.isArray(full) ? full : []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, action: () => Promise<void>, successMessage?: string) => {
    if (busy) return; // double-submit guard
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (successMessage) setNotice(successMessage);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = () =>
    run(
      "create",
      async () => {
        await skillApi.create(newSkill.trim());
        setNewSkill("");
        await load();
      },
      "Skill created."
    );

  const handleRename = () =>
    renaming &&
    run(
      "rename",
      async () => {
        await skillApi.rename(renaming.id, renaming.name.trim());
        setRenaming(null);
        await load();
      },
      "Skill renamed."
    );

  const handleToggleActive = (skill: AdminSkillDto) =>
    run(
      `active-${skill.skillId}`,
      async () => {
        await skillApi.setActive(skill.skillId, !skill.isActive);
        await load();
      },
      skill.isActive ? "Skill archived." : "Skill restored."
    );

  // ── Excel import ──────────────────────────────────────────────────────────────────────

  const downloadTemplate = () => {
    const blob = new Blob([buildSkillTemplateCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "taskgenie-skills-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const readFile = async (file: File) => {
    setError(null);
    setNotice(null);
    const text = await file.text();
    const parsed = parseSkillCsv(text, catalog.map((c) => c.skillName));
    setImportFile(file.name);
    setImportRows(parsed.map((row) => ({ ...row, status: "pending" })));
  };

  const importable = importRows.filter((r) => r.errors.length === 0 && r.status !== "created");

  /**
   * Rows are created one at a time and reported individually: a partial import is a normal outcome
   * — a duplicate on line 7 must not throw away the six good rows before it.
   */
  const runImport = () =>
    run("import", async () => {
      const results: ImportRow[] = [...importRows];

      for (let i = 0; i < results.length; i += 1) {
        const row = results[i];
        if (row.errors.length > 0 || row.status === "created") continue;
        try {
          await skillApi.create(row.name);
          results[i] = { ...row, status: "created" };
        } catch (err) {
          results[i] = { ...row, status: "failed", detail: errorMessage(err) };
        }
        setImportRows([...results]);
      }

      const created = results.filter((r) => r.status === "created").length;
      if (created > 0) await load();
      setNotice(`Đã thêm ${created}/${results.length} kỹ năng từ tệp.`);
    });

  const closeImport = () => {
    setImportOpen(false);
    setImportRows([]);
    setImportFile(null);
  };

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Sparkles size={16} className="text-[#1A237E]" aria-hidden />
            Skills
          </h1>
          <p className="mt-0.5 text-[10px] text-gray-500">
            Danh mục kỹ năng của nền tảng — dùng cho yêu cầu kỹ năng của task và gợi ý giao việc.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50"
        >
          <Upload size={12} aria-hidden /> Import Excel
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-xs text-gray-500">
          <Loader2 size={14} className="animate-spin" aria-hidden /> Loading skills…
        </div>
      ) : (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-xs font-semibold text-gray-700">Platform catalog ({catalog.length})</h2>

          <div className="mb-3 flex flex-wrap gap-2">
            <input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="New skill name"
              aria-label="New skill name"
              className="min-w-[160px] flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newSkill.trim() || busy === "create"}
              className="inline-flex items-center gap-1 rounded-md bg-[#1A237E] px-3 py-1.5 text-xs text-white disabled:opacity-40"
            >
              {busy === "create" ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Plus size={12} aria-hidden />}
              Create
            </button>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter catalog"
            aria-label="Filter catalog"
            className="mb-3 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs"
          />

          <ul className="divide-y divide-gray-100">
            {catalog.map((s) => (
              <li key={s.skillId} className="flex items-center gap-2 py-2">
                {renaming?.id === s.skillId ? (
                  <>
                    <input
                      value={renaming.name}
                      onChange={(e) => setRenaming({ id: s.skillId, name: e.target.value })}
                      aria-label={`Rename ${s.skillName}`}
                      className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleRename}
                      disabled={busy === "rename"}
                      aria-label="Save name"
                      className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                    >
                      <Check size={13} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming(null)}
                      aria-label="Cancel rename"
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
                    >
                      <X size={13} aria-hidden />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 truncate text-xs ${s.isActive ? "text-gray-900" : "text-gray-400 line-through"}`}>
                      {s.skillName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRenaming({ id: s.skillId, name: s.skillName })}
                      aria-label={`Rename ${s.skillName}`}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil size={13} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(s)}
                      disabled={busy === `active-${s.skillId}`}
                      aria-label={s.isActive ? `Archive ${s.skillName}` : `Restore ${s.skillName}`}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                    >
                      {s.isActive ? <Archive size={13} aria-hidden /> : <RotateCcw size={13} aria-hidden />}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {catalog.length === 0 && <p className="py-6 text-center text-xs text-gray-400">No skills in the catalog.</p>}
          <p className="mt-3 text-[10px] text-gray-400">
            Skills are archived, never deleted — tasks and profiles keep referencing them.
          </p>
        </section>
      )}

      {/* ── Import dialog ──────────────────────────────────────────────────────────────── */}
      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Import skills"
        >
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-gray-200 bg-white">
            <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Import kỹ năng từ Excel</h2>
              <button type="button" onClick={closeImport} aria-label="Close" className="text-gray-400 hover:text-gray-700">
                <X size={16} aria-hidden />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <p className="text-xs leading-relaxed text-gray-600">
                Tệp cần một cột: <span className="font-medium">{SKILL_IMPORT_COLUMNS.join(", ")}</span>. Tải mẫu về,
                điền rồi lưu dưới dạng CSV (Excel mở và lưu CSV trực tiếp).
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50"
                >
                  <Download size={12} aria-hidden /> Tải tệp mẫu
                </button>
                <label
                  htmlFor="skill-import-file"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50"
                >
                  <Upload size={12} aria-hidden /> Chọn tệp
                </label>
                <input
                  id="skill-import-file"
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void readFile(file);
                    e.target.value = "";
                  }}
                />
                {importFile && <span className="self-center text-[10px] text-gray-500">{importFile}</span>}
              </div>

              {importRows.length > 0 && (
                <ul className="mt-4 divide-y divide-gray-100 rounded-md border border-gray-200">
                  {importRows.map((row) => (
                    <li key={row.row} className="flex items-start gap-2 px-3 py-2">
                      <span className="mt-0.5 w-6 shrink-0 text-[10px] text-gray-400">#{row.row}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-gray-900">{row.name || <em>(trống)</em>}</p>
                        {row.errors.map((e) => (
                          <p key={e} className="flex items-center gap-1 text-[10px] text-red-600">
                            <AlertTriangle size={9} aria-hidden /> {e}
                          </p>
                        ))}
                        {row.detail && <p className="text-[10px] text-red-600">{row.detail}</p>}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                          row.status === "created"
                            ? "bg-emerald-100 text-emerald-700"
                            : row.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : row.errors.length > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {row.status === "created"
                          ? "Đã thêm"
                          : row.status === "failed"
                            ? "Lỗi"
                            : row.errors.length > 0
                              ? "Bỏ qua"
                              : "Sẵn sàng"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="flex items-center justify-between gap-2 border-t border-gray-200 px-5 py-3">
              <span className="text-[10px] text-gray-500">
                {importRows.length > 0 && `${importable.length}/${importRows.length} dòng sẽ được thêm`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeImport}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={runImport}
                  disabled={importable.length === 0 || busy === "import"}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
                >
                  {busy === "import" ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Upload size={12} aria-hidden />}
                  Import
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
