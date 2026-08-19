import { render, screen, waitFor, within } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsCenter } from "../NotificationsCenter";
import { notificationApi } from "../../services/notificationApi";
import { ApiError } from "../../services/apiClient";

vi.mock("../../services/notificationApi");
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ user: { userId: 7, role: "NORMAL_USER" }, refreshUser: vi.fn() }),
}));

const api = vi.mocked(notificationApi);

const ITEMS = [
  {
    notificationId: 1, userId: 7, type: "RISK", title: "Deadline at risk",
    message: "Task X is late", referenceId: null, referenceType: null,
    isRead: false, createdAt: new Date().toISOString(),
  },
  {
    notificationId: 2, userId: 7, type: "INFO", title: "Task completed",
    message: "Task Y done", referenceId: null, referenceType: null,
    isRead: true, createdAt: new Date().toISOString(),
  },
];

describe("NotificationsCenter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches once even when the parent passes a brand-new callback each render", async () => {
    api.list.mockResolvedValue(ITEMS);

    // Reproduces the infinite-reload bug: an inline arrow prop changed identity every render,
    // which re-created the fetch effect and re-triggered it forever.
    const { rerender } = render(<NotificationsCenter onUnreadChange={() => {}} />);
    await screen.findByText("Deadline at risk");

    rerender(<NotificationsCenter onUnreadChange={() => {}} />);
    rerender(<NotificationsCenter onUnreadChange={() => {}} />);

    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(1));
  });

  it("reports the unread count to the parent", async () => {
    const onUnreadChange = vi.fn();
    api.list.mockResolvedValue(ITEMS);
    render(<NotificationsCenter onUnreadChange={onUnreadChange} />);

    await waitFor(() => expect(onUnreadChange).toHaveBeenCalledWith(1)); // only one unread
  });

  it("shows an empty state rather than a permanent spinner", async () => {
    api.list.mockResolvedValue([]);
    render(<NotificationsCenter />);

    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/loading notifications/i)).not.toBeInTheDocument();
  });

  it("surfaces a load failure instead of spinning forever", async () => {
    api.list.mockRejectedValue(new ApiError(500, "Service unavailable."));
    render(<NotificationsCenter />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable.");
    expect(screen.queryByText(/loading notifications/i)).not.toBeInTheDocument();
  });

  it("marks one as read when it is opened in the reading pane", async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue(ITEMS);
    api.markRead.mockResolvedValue(undefined);
    render(<NotificationsCenter />);

    // Opening an item is the read gesture, the same as an email client.
    await user.click(await screen.findByRole("button", { name: /deadline at risk/i }));

    await waitFor(() => expect(api.markRead).toHaveBeenCalledWith(1));
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it("shows the full message in the reading pane once a row is opened", async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue(ITEMS);
    api.markRead.mockResolvedValue(undefined);
    render(<NotificationsCenter />);

    // The empty-pane copy now comes from the dictionary, so match the English default.
    expect(screen.getByText(/select a notification/i)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /deadline at risk/i }));

    const detail = await screen.findByRole("region", { name: /notification detail/i });
    expect(detail).toHaveTextContent("Deadline at risk");
  });

  it("confirms in-app before deleting, and drops the delete when declined", async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue(ITEMS);
    api.markRead.mockResolvedValue(undefined);
    render(<NotificationsCenter />);

    await user.click(await screen.findByRole("button", { name: /deadline at risk/i }));
    await user.click(await screen.findByRole("button", { name: /delete "deadline at risk"/i }));

    // The app's own dialog, not the browser's — it has to honour the theme and be testable.
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /hủy/i }));

    expect(api.remove).not.toHaveBeenCalled();
  });

  it("only offers Mark all read when something is unread", async () => {
    api.list.mockResolvedValue([{ ...ITEMS[1] }]); // all read
    render(<NotificationsCenter />);

    await screen.findByText("Task completed");
    expect(screen.queryByRole("button", { name: /mark all read/i })).not.toBeInTheDocument();
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });
});
