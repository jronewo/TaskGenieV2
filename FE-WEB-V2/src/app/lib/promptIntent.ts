/**
 * Predicts, in the browser, which assistant skill a prompt will hit.
 *
 * The assistant matches declared skills rather than asking a language model, so a sentence either
 * lands on one or is refused. Saying which — before send — is what stops someone burning their
 * one-per-minute turn on a phrasing that matches nothing.
 *
 * ⚠️ Mirrors `AssistantSkillRegistry` on the server, which is authoritative. A phrase added on one
 * side only makes this hint lie; the tests pin the vocabulary so that shows up.
 */

export type PromptIntent =
  | "at-risk"
  | "due-soon"
  | "overdue"
  | "unassigned"
  | "in-progress"
  | "overview"
  | "none";

interface IntentDefinition {
  intent: PromptIntent;
  /** Shown to the user as what this question resolves to. */
  label: string;
  /** Matched case-insensitively as substrings, in this order. */
  phrases: string[];
}

/** Order matters: "quá hạn" must win before the broader deadline phrases. */
export const INTENTS: IntentDefinition[] = [
  {
    intent: "overdue",
    label: "Công việc đã quá hạn",
    phrases: ["overdue", "late", "past due", "trễ hạn", "quá hạn", "trễ deadline"],
  },
  {
    intent: "due-soon",
    label: "Công việc đến hạn trong 5 ngày",
    phrases: ["due soon", "deadline", "sắp đến hạn", "sắp tới hạn", "sắp hết hạn", "gần deadline"],
  },
  {
    intent: "at-risk",
    label: "Công việc rủi ro cao",
    phrases: ["at risk", "risk estimate", "risky", "rủi ro", "nguy cơ"],
  },
  {
    intent: "unassigned",
    label: "Công việc chưa giao cho ai",
    phrases: ["unassigned", "nobody", "no assignee", "chưa được assign", "chưa giao", "chưa ai làm"],
  },
  {
    intent: "in-progress",
    label: "Công việc đang thực hiện",
    phrases: ["in progress", "đang làm", "đang thực hiện", "hôm nay"],
  },
  {
    intent: "overview",
    label: "Tổng quan",
    phrases: ["overview", "summary", "status", "tổng quan", "tình hình", "báo cáo"],
  },
];

/**
 * Things the agent has a tool for. Matched as keyword groups rather than exact phrases: people
 * write "tạo 1 project mới giúp tôi", and a literal "tạo project" misses it entirely.
 * Every keyword in a group must appear somewhere in the prompt.
 */
const AGENT_CAPABILITIES: { keywords: string[][]; label: string }[] = [
  {
    keywords: [["tạo", "project"], ["tạo", "dự án"], ["create", "project"], ["new", "project"]],
    label: "Tạo dự án mới",
  },
  {
    keywords: [["tạo", "task"], ["thêm", "task"], ["tạo", "công việc"], ["create", "task"], ["add", "task"]],
    label: "Tạo công việc",
  },
  {
    keywords: [["assign"], ["giao", "task"], ["giao", "việc"], ["phân công"]],
    label: "Gợi ý và giao việc",
  },
  {
    keywords: [["hoàn thành"], ["chuyển", "trạng thái"], ["update", "status"], ["đánh dấu", "done"]],
    label: "Cập nhật trạng thái",
  },
  {
    keywords: [["gợi ý", "người"], ["đề xuất", "người"], ["who should"]],
    label: "Gợi ý 3 người phù hợp",
  },
  {
    keywords: [["phân tích", "rủi ro"], ["đánh giá", "rủi ro"], ["analyse risk"], ["analyze risk"]],
    label: "Phân tích rủi ro một task",
  },
  {
    keywords: [["chi tiết", "task"], ["thông tin", "task"], ["show", "task"]],
    label: "Xem chi tiết công việc",
  },
];

/** Things TaskGenie does but the assistant has no skill for — worth saying before a turn is spent. */
const OUT_OF_SCOPE = [
  { phrases: ["mời", "invite", "thêm thành viên", "add member"], label: "Mời thành viên", where: "trang Team" },
  { phrases: ["xoá project", "xóa project", "delete project"], label: "Xoá dự án", where: "trang Projects" },
  { phrases: ["đánh giá", "evaluation", "review member"], label: "Đánh giá", where: "trang Evaluations" },
  { phrases: ["skill", "kỹ năng"], label: "Quản lý kỹ năng", where: "trang Profile" },
  { phrases: ["thanh toán", "billing", "gói", "subscription"], label: "Thanh toán", where: "trang Subscription" },
  { phrases: ["import", "excel", "csv"], label: "Nhập từ bảng tính", where: 'nút "Import tasks"' },
];

export type PromptVerdict =
  /** Recognised shape: answerable from data if the AI is unavailable. */
  | { kind: "instant"; intent: PromptIntent; label: string }
  | { kind: "agent"; label: string }
  | { kind: "out-of-scope"; label: string; where: string }
  | { kind: "unknown"; suggestion: string | null };

function matches(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

/** True when any group has all of its keywords present, in any order and with filler between. */
function matchesKeywords(text: string, groups: string[][]): boolean {
  return groups.some((group) => group.every((word) => text.includes(word)));
}

/**
 * Very small similarity: share of the prompt's words that appear in a candidate question. Enough to
 * surface "did you mean…" without pulling in a fuzzy-matching library for six fixed strings.
 */
function overlap(prompt: string, candidate: string): number {
  const words = prompt.split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return 0;
  const target = candidate.toLowerCase();
  return words.filter((w) => target.includes(w)).length / words.length;
}

/** What will happen to this prompt, and what to say about it. */
export function predictPrompt(prompt: string): PromptVerdict {
  const text = prompt.trim().toLowerCase();
  if (!text) return { kind: "unknown", suggestion: null };

  for (const { intent, label, phrases } of INTENTS) {
    if (matches(text, phrases)) return { kind: "instant", intent, label };
  }

  for (const { keywords, label } of AGENT_CAPABILITIES) {
    if (matchesKeywords(text, keywords)) return { kind: "agent", label };
  }

  for (const { phrases, label, where } of OUT_OF_SCOPE) {
    if (matches(text, phrases)) return { kind: "out-of-scope", label, where };
  }

  // Nothing matched: offer the closest built-in question rather than a blank shrug.
  let best: { label: string; score: number } | null = null;
  for (const { label } of INTENTS) {
    const score = overlap(text, label);
    if (score > 0 && (best === null || score > best.score)) best = { label, score };
  }

  return { kind: "unknown", suggestion: best && best.score >= 0.34 ? best.label : null };
}

/** One line of guidance for the composer. Null when there is nothing worth saying. */
export function describeVerdict(verdict: PromptVerdict): string | null {
  switch (verdict.kind) {
    case "instant":
      return `${verdict.label} — trả lời trực tiếp từ dữ liệu.`;
    case "agent":
      return `${verdict.label} — trợ lý sẽ gọi API tương ứng.`;
    case "out-of-scope":
      return `${verdict.label} không làm được ở đây. Dùng ${verdict.where}.`;
    case "unknown":
      return verdict.suggestion ? `Ý bạn là "${verdict.suggestion}"?` : null;
  }
}
