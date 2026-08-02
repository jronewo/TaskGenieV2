import { render, screen } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AssistantMessage, parseAssistantAnswer } from "../AssistantMessage";

const UNASSIGNED_ANSWER = `Chưa giao cho ai (Website Revamp) (2):
• #12 Sửa lỗi đăng nhập (Todo, chưa giao)
• #13 Viết tài liệu (Todo, chưa giao)

Gõ "gợi ý người cho task 12" để xem 3 người phù hợp nhất, rồi "giao task 12 cho <tên>".`;

describe("parseAssistantAnswer", () => {
  it("separates the heading, the bullets and the follow-up", () => {
    const lines = parseAssistantAnswer(UNASSIGNED_ANSWER);

    expect(lines[0].kind).toBe("heading");
    expect(lines.filter((l) => l.kind === "bullet")).toHaveLength(2);
    expect(lines.at(-1)!.kind).toBe("follow-up");
  });

  it("pulls the command out of the follow-up so it can be run", () => {
    const followUp = parseAssistantAnswer(UNASSIGNED_ANSWER).find((l) => l.kind === "follow-up");

    expect(followUp!.command).toBe("gợi ý người cho task 12");
  });

  it("treats a plain sentence as text", () => {
    const lines = parseAssistantAnswer("Không có công việc nào quá hạn.");

    expect(lines).toHaveLength(1);
    expect(lines[0].kind).toBe("text");
  });

  it("drops blank lines rather than rendering empty rows", () => {
    expect(parseAssistantAnswer("A\n\n\nB")).toHaveLength(2);
  });
});

describe("AssistantMessage", () => {
  it("renders the bullets as one list", () => {
    render(<AssistantMessage answer={UNASSIGNED_ANSWER} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("list")).toHaveLength(1);
  });

  it("drops the trailing colon from the heading", () => {
    render(<AssistantMessage answer={UNASSIGNED_ANSWER} />);

    expect(screen.getByText("Chưa giao cho ai (Website Revamp) (2)")).toBeInTheDocument();
  });

  it("offers the suggested command as a button instead of asking the user to retype it", async () => {
    const user = userEvent.setup();
    const onRunCommand = vi.fn();
    render(<AssistantMessage answer={UNASSIGNED_ANSWER} onRunCommand={onRunCommand} />);

    await user.click(screen.getByRole("button", { name: "gợi ý người cho task 12" }));

    expect(onRunCommand).toHaveBeenCalledWith("gợi ý người cho task 12");
  });

  it("shows the follow-up text even when no handler is wired", () => {
    render(<AssistantMessage answer={UNASSIGNED_ANSWER} />);

    expect(screen.getByText(/3 người phù hợp nhất/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
