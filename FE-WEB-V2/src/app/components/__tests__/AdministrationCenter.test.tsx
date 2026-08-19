import { fireEvent, render, screen, waitFor } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdministrationCenter } from "../AdministrationCenter";
import { adminApi } from "../../services/adminApi";
import { ApiError } from "../../services/apiClient";

vi.mock("../../services/adminApi");
// The skill catalog now renders inside this page; it has its own test file.
vi.mock("../SkillManagement", () => ({ SkillManagement: () => null }));
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ user: { userId: 1, name: "Root Admin", role: "PLATFORM_ADMIN" }, refreshUser: vi.fn() }),
}));

const api = vi.mocked(adminApi);

const STATS = { users: 42, organizations: 5, projects: 12, tasks: 30, tasksDone: 18 };

const ANALYTICS = {
  activeSubscriptions: 3,
  totalRevenueMinor: 0,
  testRevenueMinor: 2997,
  byMonth: [{ period: "2026-08", planCode: "PRO_PERSONAL", audience: "PERSONAL" as const, count: 3, revenueMinor: 2997 }],
};

const USERS = [
  { userId: 1, name: "Root Admin", email: "root@test.local", avatar: null, role: "PLATFORM_ADMIN", status: 1, createdAt: null },
  { userId: 2, name: "Normal Person", email: "normal@test.local", avatar: null, role: "NORMAL_USER", status: 1, createdAt: null },
];

function mockAll() {
  api.platformStats.mockResolvedValue(STATS);
  api.subscriptionAnalytics.mockResolvedValue(ANALYTICS);
  api.users.mockResolvedValue({ items: USERS, total: 2, page: 1, pageSize: 20 });
  api.organizations.mockResolvedValue([]);
  api.subscriptions.mockResolvedValue([]);
  api.payments.mockResolvedValue([]);
  api.plans.mockResolvedValue([]);
}

describe("AdministrationCenter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders live platform counts from the API", async () => {
    mockAll();
    render(<AdministrationCenter />);

    expect(await screen.findByText("42")).toBeInTheDocument(); // users
    expect(screen.getByText("12")).toBeInTheDocument(); // projects
  });

  it("reports simulated gateway money separately from real revenue", async () => {
    mockAll();
    render(<AdministrationCenter />);

    // Test money must be labelled, never folded into the revenue figure.
    expect(await screen.findByText(/simulated gateway/i)).toBeInTheDocument();
  });

  it("surfaces a load failure as an alert", async () => {
    api.platformStats.mockRejectedValue(new ApiError(500, "Stats unavailable."));
    api.subscriptionAnalytics.mockRejectedValue(new ApiError(500, "Stats unavailable."));
    render(<AdministrationCenter />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Stats unavailable.");
  });

  it("searches users through the API instead of filtering locally", async () => {
    const user = userEvent.setup();
    mockAll();
    render(<AdministrationCenter />);

    await user.click(await screen.findByRole("tab", { name: /users/i }));
    await screen.findByText("normal@test.local");

    // fireEvent.change sets the whole term at once; the list re-renders per keystroke, so typing
    // character-by-character would race the remount rather than test the contract.
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "normal" } });

    await waitFor(() =>
      expect(api.users).toHaveBeenCalledWith("normal", 1, expect.any(Number))
    );
  });

  it("disables the admin's own status toggle so they cannot lock themselves out", async () => {
    const user = userEvent.setup();
    mockAll();
    render(<AdministrationCenter />);

    await user.click(await screen.findByRole("tab", { name: /users/i }));
    await screen.findByText("root@test.local");

    expect(screen.getByRole("button", { name: /deactivate root admin/i })).toBeDisabled();
    // Someone else's toggle stays usable.
    expect(screen.getByRole("button", { name: /deactivate normal person/i })).toBeEnabled();
  });

  it("asks how long the ban lasts instead of suspending immediately", async () => {
    const user = userEvent.setup();
    mockAll();
    render(<AdministrationCenter />);

    await user.click(await screen.findByRole("tab", { name: /users/i }));
    await screen.findByText("normal@test.local");
    await user.click(screen.getByRole("button", { name: /deactivate normal person/i }));

    // A ban is a decision with an end date, not a flag flipped behind a yes/no prompt.
    expect(await screen.findByRole("dialog", { name: /khóa tài khoản/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/thời hạn/i)).toBeInTheDocument();
    expect(api.setUserStatus).not.toHaveBeenCalled();
    expect(api.banUser).not.toHaveBeenCalled();
  });

  it("bans for the chosen duration once confirmed", async () => {
    const user = userEvent.setup();
    mockAll();
    api.banUser.mockResolvedValue({} as never);
    render(<AdministrationCenter />);

    await user.click(await screen.findByRole("tab", { name: /users/i }));
    await screen.findByText("normal@test.local");
    await user.click(screen.getByRole("button", { name: /deactivate normal person/i }));
    await user.selectOptions(screen.getByLabelText(/thời hạn/i), "30");
    await user.type(screen.getByLabelText(/lý do/i), "Spam");
    await user.click(screen.getByRole("button", { name: /^khóa tài khoản$/i }));

    await waitFor(() => expect(api.banUser).toHaveBeenCalledWith(2, 30, "Spam"));
  });

  it("sends a null duration for a permanent ban", async () => {
    const user = userEvent.setup();
    mockAll();
    api.banUser.mockResolvedValue({} as never);
    render(<AdministrationCenter />);

    await user.click(await screen.findByRole("tab", { name: /users/i }));
    await screen.findByText("normal@test.local");
    await user.click(screen.getByRole("button", { name: /deactivate normal person/i }));
    await user.selectOptions(screen.getByLabelText(/thời hạn/i), "permanent");
    await user.click(screen.getByRole("button", { name: /^khóa tài khoản$/i }));

    // null is what the API reads as "no end date".
    await waitFor(() => expect(api.banUser).toHaveBeenCalledWith(2, null, null));
  });

  it("shows an empty state when there are no organizations", async () => {
    const user = userEvent.setup();
    mockAll();
    render(<AdministrationCenter />);

    await user.click(await screen.findByRole("tab", { name: /organizations/i }));

    expect(await screen.findByText(/no organizations/i)).toBeInTheDocument();
  });
});
