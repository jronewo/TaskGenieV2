import React from "react";

/**
 * Renders one assistant reply.
 *
 * The server answers in a small, predictable shape — a heading ending in "(N):", bullet lines, and
 * sometimes a follow-up telling the user what to type next. Rendering that as one blob of text
 * wastes the structure, so it is parsed back out here: headings get weight, bullets get a list, and
 * the follow-up becomes a button, because retyping a suggested command by hand is the part people
 * get wrong.
 */

export interface ParsedLine {
  kind: "heading" | "bullet" | "text" | "follow-up";
  text: string;
  /** For a follow-up: the command the user is being told to type. */
  command?: string;
}

/** Matches the trailing hint, e.g. Gõ "gợi ý người cho task 12" để xem 3 người phù hợp nhất. */
const FOLLOW_UP = /^Gõ\s+"([^"]+)"/;

export function parseAssistantAnswer(answer: string): ParsedLine[] {
  return answer
    .split("\n")
    .map((raw) => raw.trimEnd())
    .filter((line, index, all) => line.length > 0 || (index > 0 && all[index - 1].length > 0))
    .filter((line) => line.length > 0)
    .map<ParsedLine>((line) => {
      const followUp = FOLLOW_UP.exec(line);
      if (followUp) return { kind: "follow-up", text: line, command: followUp[1] };

      if (line.startsWith("•")) return { kind: "bullet", text: line.slice(1).trim() };

      // "Chưa giao cho ai (Website Revamp) (1):" — a count-bearing heading.
      if (/\(\d+\):$/.test(line) || line.endsWith(":")) return { kind: "heading", text: line };

      return { kind: "text", text: line };
    });
}

interface Props {
  answer: string;
  /** Runs a suggested command directly, so it never has to be retyped. */
  onRunCommand?: (command: string) => void;
}

export const AssistantMessage = ({ answer, onRunCommand }: Props) => {
  const lines = parseAssistantAnswer(answer);
  const bullets = lines.filter((l) => l.kind === "bullet");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.kind === "heading") {
          return (
            <p key={i} className="text-[11px] font-semibold text-gray-900">
              {line.text.replace(/:$/, "")}
            </p>
          );
        }

        if (line.kind === "bullet") {
          // Rendered once, at the position of the first bullet, so the list stays a real list.
          if (line !== bullets[0]) return null;
          return (
            <ul key={i} className="space-y-1">
              {bullets.map((bullet, bi) => (
                <li key={bi} className="flex gap-1.5 text-[11px] leading-relaxed text-gray-700">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gray-400" aria-hidden />
                  <span className="min-w-0">{bullet.text}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (line.kind === "follow-up") {
          return (
            <div key={i} className="rounded-md bg-white/70 px-2 py-1.5">
              <p className="text-[10px] leading-relaxed text-gray-500">{line.text}</p>
              {line.command && onRunCommand && (
                <button
                  type="button"
                  onClick={() => onRunCommand(line.command!)}
                  className="mt-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-[#1A237E] hover:bg-gray-50"
                >
                  {line.command}
                </button>
              )}
            </div>
          );
        }

        return (
          <p key={i} className="text-[11px] leading-relaxed text-gray-700">
            {line.text}
          </p>
        );
      })}
    </div>
  );
};
