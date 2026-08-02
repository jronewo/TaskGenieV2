import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, FolderKanban, Check, ChevronDown } from "lucide-react";
import { coreAiApi } from "../services/coreAiApi";
import { predictPrompt, describeVerdict } from "../lib/promptIntent";
import { PROMPT_LIBRARY, searchPrompts } from "../lib/promptLibrary";
import { projectApi, ProjectDto } from "../services/projectApi";
import { AssistantMessage } from "./AssistantMessage";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../services/apiClient";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Your session expired. Sign in again.";
    if (err.status === 403) return "You don't have access to that project.";
    if (err.message) return err.message;
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

interface Message {
  role: "user" | "assistant";
  text: string;
  /** What the backend could see when it answered. */
  scope?: string;
  /** Tool calls the agent made, shown so its actions are auditable. */
  steps?: { tool: string; result: string }[];
}

interface Props {
  /** The board the user has open. Seeds the chat's scope; they can change it here. */
  projectId?: number | null;
}

/**
 * Questions the server answers straight from the database, without a model call. Offered as chips
 * because they are both the most useful and the only ones guaranteed to work when the AI provider
 * is down or out of quota.
 */
const QUICK_ASKS = [
  "Task nào đang rủi ro cao?",
  "Task nào sắp đến hạn?",
  "Task nào đã quá hạn?",
  "Task nào chưa được assign?",
  "Hôm nay đang làm những gì?",
  "Cho tôi tổng quan",
];

/**
 * A small assistant docked bottom-right. Every answer comes from `/ai-analysis/assistant`, which
 * reads only rows the caller is authorised to see — there is no client-side context stuffing here.
 */
/** Per-account key so two people on one machine do not read each other's history. */
const storageKey = (userId: number | null) => `tmai.assistant.session.${userId ?? "anon"}`;

/** Older turns are not worth carrying forever; the last stretch is what people scroll back to. */
const MAX_STORED_MESSAGES = 40;

export const AssistantChat = ({ projectId }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  // The agent is bound to one project or to the whole workspace, and that choice changes what it
  // may touch — so it is shown, not hidden. Seeded from the open board, overridable here, which is
  // what lets someone ask about a project without navigating to it first.
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [scopeId, setScopeId] = useState<number | null>(projectId ?? null);
  const [showScopePicker, setShowScopePicker] = useState(false);

  useEffect(() => {
    setScopeId(projectId ?? null);
  }, [projectId]);

  // Restore before the first write, or the empty initial state would overwrite the saved session.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey(user?.userId ?? null));
      if (saved) setMessages(JSON.parse(saved) as Message[]);
    } catch {
      // Corrupt or unavailable storage is not worth failing the chat over.
    }
    setRestored(true);
  }, [user?.userId]);

  useEffect(() => {
    if (!restored) return;
    try {
      const key = storageKey(user?.userId ?? null);
      // An empty conversation is nothing to restore, so it is removed rather than stored as "[]".
      if (messages.length === 0) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
    } catch {
      // Quota or private mode — the conversation still works, it just will not survive a reload.
    }
  }, [messages, restored, user?.userId]);

  // The persistence effect removes the key once the list is empty, so this only resets state.
  const clearSession = () => setMessages([]);

  useEffect(() => {
    if (!open || projects.length > 0) return;
    // A failed read just leaves the picker empty; the chat still works on the current scope.
    void projectApi.list().then(setProjects).catch(() => setProjects([]));
  }, [open, projects.length]);

  const scopeName = scopeId == null ? "Tất cả dự án" : projects.find((p) => p.projectId === scopeId)?.name ?? `Dự án #${scopeId}`;
  const [now, setNow] = useState(Date.now());
  const endRef = useRef<HTMLDivElement | null>(null);

  // Live read of what the server will do with this prompt, so a limited turn is not wasted on
  // something the assistant cannot handle.
  const hint = draft.trim() ? describeVerdict(predictPrompt(draft)) : null;
  // Suggestions only while the phrasing is still short — once it is a full sentence they get in
  // the way more than they help.
  const suggestions = draft.trim().length >= 2 && draft.trim().length < 25 ? searchPrompts(draft, 4) : [];

  const pickScope = (next: number | null) => {
    setScopeId(next);
    setShowScopePicker(false);
  };

  useEffect(() => {
    // Optional call: scrollIntoView is absent in jsdom and in a few older embedded browsers, and
    // failing to scroll must never take the chat down with it.
    if (open) endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, open]);

  const ask = async (override?: string) => {
    const question = (override ?? draft).trim();
    if (!question || busy) return;

    setMessages((current) => [...current, { role: "user", text: question }]);
    setDraft("");
    setBusy(true);
    setError(null);

    try {
      // The agent can act, not just answer, so it is the default; the read-only assistant is the
      // fallback when the agent has no provider configured.
      const reply = await coreAiApi.runAgent(question, scopeId);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: reply?.answer ?? "No answer came back.",
          steps: reply?.steps?.map((s) => ({ tool: s.tool, result: s.result })),
        },
      ]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open assistant"
        className="fixed bottom-4 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1A237E] text-white shadow-lg hover:bg-[#0D1757]"
      >
        <MessageCircle size={18} aria-hidden />
      </button>
    );
  }

  return (
    <section
      aria-label="Assistant"
      className="fixed bottom-4 right-4 z-40 flex h-[39rem] max-h-[calc(100vh-2rem)] w-[32rem] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-gray-200 bg-white shadow-xl"
    >
      <header className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
          <Sparkles size={13} className="text-[#1A237E]" aria-hidden /> Assistant
        </h2>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearSession}
              className="rounded px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-gray-50"
            >
              Xoá
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowLibrary((v) => !v)}
            aria-pressed={showLibrary}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              showLibrary ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Gợi ý
          </button>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="text-gray-400 hover:text-gray-700">
            <X size={15} aria-hidden />
          </button>
        </div>
      </header>

      {/* Scope bar — what the agent is pointed at right now. */}
      <div className="relative border-b border-gray-100 px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => setShowScopePicker((v) => !v)}
          aria-expanded={showScopePicker}
          aria-label={`Phạm vi: ${scopeName}`}
          className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-[10px] text-gray-600 hover:bg-gray-50"
        >
          <FolderKanban size={11} className="shrink-0 text-[#1A237E]" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-left font-medium text-gray-800">{scopeName}</span>
          <ChevronDown size={11} className="shrink-0 text-gray-400" aria-hidden />
        </button>

        {showScopePicker && (
          <div className="absolute left-2 right-2 top-full z-10 mt-1 max-h-44 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => pickScope(null)}
              className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[10px] text-gray-700 hover:bg-gray-50"
            >
              <span className="min-w-0 flex-1 truncate">Tất cả dự án</span>
              {scopeId == null && <Check size={11} className="shrink-0 text-[#1A237E]" aria-hidden />}
            </button>
            {projects.map((p) => (
              <button
                key={p.projectId}
                type="button"
                onClick={() => pickScope(p.projectId)}
                className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[10px] text-gray-700 hover:bg-gray-50"
              >
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {scopeId === p.projectId && <Check size={11} className="shrink-0 text-[#1A237E]" aria-hidden />}
              </button>
            ))}
            {projects.length === 0 && (
              <p className="px-2.5 py-1.5 text-[10px] text-gray-400">Chưa có dự án nào.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="py-6 text-center text-[11px] text-gray-500">
            Ask about your work — {scopeId ? "scoped to this project." : "across all your projects."}
            <br />
            <span className="text-[10px] text-gray-400">Tối đa 500 ký tự.</span>
          </p>
        )}

        {showLibrary && (
          <div className="space-y-2.5">
            {PROMPT_LIBRARY.map((group) => (
              <section key={group.id}>
                <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{group.title}</h3>
                <p className="mb-1 text-[9px] text-gray-400">{group.hint}</p>
                <div className="flex flex-wrap gap-1">
                  {group.prompts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setShowLibrary(false);
                        void ask(q);
                      }}
                      disabled={busy}
                      className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {messages.length === 0 && !showLibrary && (
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ASKS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                disabled={busy}
                className="rounded-full border border-gray-200 px-2.5 py-1 text-[10px] text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block max-w-[88%] rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
                m.role === "user" ? "bg-[#1A237E] text-white" : "bg-gray-100 text-left text-gray-800"
              }`}
            >
              {m.role === "user" ? m.text : <AssistantMessage answer={m.text} onRunCommand={(c) => void ask(c)} />}
            </div>
            {m.scope && <p className="mt-0.5 text-[9px] text-gray-400">based on {m.scope}</p>}
            {m.steps && m.steps.length > 0 && (
              <details className="mt-0.5 text-left">
                <summary className="cursor-pointer text-[9px] text-gray-400">
                  {m.steps.length} action(s) taken
                </summary>
                <ul className="mt-1 space-y-0.5">
                  {m.steps.map((step, si) => (
                    <li key={si} className="truncate text-[9px] text-gray-500" title={step.result}>
                      {step.tool}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}

        {busy && (
          <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Loader2 size={11} className="animate-spin" aria-hidden /> Thinking…
          </p>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div role="alert" className="mx-3 mb-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-gray-100 px-2.5 pt-1.5">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setDraft(q)}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-200"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {hint && (
        <p className="border-t border-gray-100 px-3 pt-1.5 text-[10px] text-gray-500">{hint}</p>
      )}

      <div className="flex gap-2 border-t border-gray-100 p-2.5">
        <label htmlFor="assistant-input" className="sr-only">
          Ask the assistant
        </label>
        <input
          id="assistant-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void ask()}
          maxLength={500}
          placeholder="Task nào đang rủi ro?"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] outline-none focus:border-[#1A237E]"
        />
        <button
          type="button"
          onClick={() => void ask()}
          disabled={!draft.trim() || busy}
          aria-label="Send"
          className="rounded-md bg-[#1A237E] px-2.5 text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Send size={12} aria-hidden />}
        </button>
      </div>
    </section>
  );
};
