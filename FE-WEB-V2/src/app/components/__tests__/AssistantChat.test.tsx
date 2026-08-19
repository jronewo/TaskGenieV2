import { render, screen, waitFor } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantChat } from "../AssistantChat";
import { coreAiApi } from "../../services/coreAiApi";
import { ApiError } from "../../services/apiClient";

vi.mock("../../services/coreAiApi");
vi.mock("../../services/projectApi", () => ({ projectApi: { list: vi.fn().mockResolvedValue([]) } }));
// The session is keyed per account, so the chat needs an identity.
vi.mock("../../auth/AuthContext", () => ({ useAuth: () => ({ user: { userId: 1 } }) }));

const api = vi.mocked(coreAiApi);

const REPLY = {
  answer: "Two tasks are still open.",
  steps: [{ tool: "list_project_tasks", arguments: "{}", result: "[]" }],
};

async function open(projectId: number | null = null) {
  const user = userEvent.setup();
  render(<AssistantChat projectId={projectId} />);
  await user.click(screen.getByRole("button", { name: /open assistant/i }));
  return user;
}

describe("AssistantChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("starts collapsed to a single launcher button", () => {
    render(<AssistantChat projectId={null} />);

    expect(screen.getByRole("button", { name: /open assistant/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/ask the assistant/i)).not.toBeInTheDocument();
  });

  it("sends the question with the current project scope and shows the answer", async () => {
    api.runAgent.mockResolvedValue(REPLY);
    const user = await open(7);

    await user.type(screen.getByLabelText(/ask the assistant/i), "How is it going?");
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => expect(api.runAgent).toHaveBeenCalledWith("How is it going?", 7));
    expect(await screen.findByText("Two tasks are still open.")).toBeInTheDocument();
  });

  it("passes a null scope when no board is open", async () => {
    api.runAgent.mockResolvedValue(REPLY);
    const user = await open(null);

    await user.type(screen.getByLabelText(/ask the assistant/i), "What's mine?");
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => expect(api.runAgent).toHaveBeenCalledWith("What's mine?", null));
  });

  it("exposes the actions the agent took so they can be audited", async () => {
    api.runAgent.mockResolvedValue(REPLY);
    const user = await open(7);

    await user.type(screen.getByLabelText(/ask the assistant/i), "How is it going?");
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    expect(await screen.findByText(/1 action\(s\) taken/i)).toBeInTheDocument();
    expect(screen.getByText("list_project_tasks")).toBeInTheDocument();
  });

  it("keeps the send button disabled until something is typed", async () => {
    await open();

    expect(screen.getByRole("button", { name: /^send$/i })).toBeDisabled();
  });

  it("restores the previous session after a reload", async () => {
    const user = userEvent.setup();
    api.runAgent.mockResolvedValue(REPLY);
    const { unmount } = render(<AssistantChat projectId={7} />);
    await user.click(screen.getByRole("button", { name: /open assistant/i }));
    await user.type(screen.getByLabelText(/ask the assistant/i), "How is it going?");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    await screen.findByText("Two tasks are still open.");
    unmount();

    render(<AssistantChat projectId={7} />);
    await user.click(screen.getByRole("button", { name: /open assistant/i }));

    // The conversation survives a page reload rather than starting blank every time.
    expect(await screen.findByText("How is it going?")).toBeInTheDocument();
    expect(screen.getByText("Two tasks are still open.")).toBeInTheDocument();
  });

  it("clears the stored session on request", async () => {
    const user = userEvent.setup();
    api.runAgent.mockResolvedValue(REPLY);
    render(<AssistantChat projectId={7} />);
    await user.click(screen.getByRole("button", { name: /open assistant/i }));
    await user.type(screen.getByLabelText(/ask the assistant/i), "hello");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    await screen.findByText("Two tasks are still open.");

    await user.click(screen.getByRole("button", { name: "Xoá" }));

    expect(screen.queryByText("hello")).not.toBeInTheDocument();
    expect(localStorage.getItem("tmai.assistant.session.1")).toBeNull();
  });

  it("surfaces a rejected request without losing the question already asked", async () => {
    api.runAgent.mockRejectedValue(new ApiError(403, "You don't have access to that project."));
    const user = await open(7);

    await user.type(screen.getByLabelText(/ask the assistant/i), "Secret?");
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You don't have access to that project.");
    expect(screen.getByText("Secret?")).toBeInTheDocument();
  });
});
