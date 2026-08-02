import { render, screen, waitFor, within } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationCenter } from "../OrganizationCenter";
import { organizationApi } from "../../services/organizationApi";
import { ApiError } from "../../services/apiClient";

vi.mock("../../services/organizationApi");
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ user: { userId: 1, role: "NORMAL_USER" }, refreshUser: vi.fn() }),
}));

const api = vi.mocked(organizationApi);

const ORG = {
  organizationId: 7,
  name: "Acme",
  description: "desc",
  logo: null,
  ownerId: 1,
  ownerName: "Owner",
  createdAt: null,
};

const OWNER_MEMBERSHIP = {
  organizationId: 7,
  name: "Acme",
  description: "desc",
  logo: null,
  role: "OWNER" as const,
  isOwner: true,
};

const MEMBERS = [
  {
    organizationMemberId: 1,
    organizationId: 7,
    userId: 1,
    userName: "Owner",
    email: "owner@test.local",
    avatar: null,
    role: "OWNER" as const,
    status: "ACTIVE",
    joinedAt: "2026-01-01T00:00:00Z",
  },
  {
    organizationMemberId: 2,
    organizationId: 7,
    userId: 2,
    userName: "Bob",
    email: "bob@test.local",
    avatar: null,
    role: "MEMBER" as const,
    status: "ACTIVE",
    joinedAt: "2026-01-02T00:00:00Z",
  },
];

function mockLoadedAs(role: "OWNER" | "MEMBER") {
  api.mine.mockResolvedValue([{ ...OWNER_MEMBERSHIP, role, isOwner: role === "OWNER" }]);
  api.getById.mockResolvedValue(ORG);
  api.members.mockResolvedValue(MEMBERS);
  api.projects.mockResolvedValue([]);
}

describe("OrganizationCenter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a loading state before the organization list resolves", () => {
    api.mine.mockReturnValue(new Promise(() => {})); // never settles
    render(<OrganizationCenter />);

    expect(screen.getByText(/loading organizations/i)).toBeInTheDocument();
  });

  it("points users at Subscription when no organization workspace exists", async () => {
    api.mine.mockResolvedValue([]);
    render(<OrganizationCenter />);

    // Organization creation lives in Subscription now — this page is the paid workspace only.
    expect(await screen.findByText(/no organization workspace yet/i)).toBeInTheDocument();
    expect(screen.getByText(/buy an organization plan/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new organization/i })).not.toBeInTheDocument();
  });

  it("surfaces the server's message when loading fails", async () => {
    api.mine.mockRejectedValue(new ApiError(500, "Database unavailable."));
    render(<OrganizationCenter />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Database unavailable.");
  });

  it("renders members once loaded", async () => {
    mockLoadedAs("OWNER");
    render(<OrganizationCenter />);

    expect(await screen.findByText("bob@test.local")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /members \(2\)/i })).toBeInTheDocument();
  });

  it("hides member management from a plain MEMBER", async () => {
    mockLoadedAs("MEMBER");
    render(<OrganizationCenter />);

    await screen.findByText("bob@test.local");
    // No invite field, no remove buttons — management belongs to owners and admins.
    expect(screen.queryByLabelText("Member email")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove bob/i })).not.toBeInTheDocument();
  });

  it("lets an owner add a member and refreshes the list afterwards", async () => {
    const user = userEvent.setup();
    mockLoadedAs("OWNER");
    api.addMember.mockResolvedValue(MEMBERS[1]);
    render(<OrganizationCenter />);

    await screen.findByText("bob@test.local");
    await user.type(screen.getByLabelText("Member email"), "new@test.local");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() =>
      expect(api.addMember).toHaveBeenCalledWith(7, "new@test.local", "MEMBER")
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/member added/i);
    // Re-fetched so the table reflects the server, not optimistic local state.
    expect(api.members).toHaveBeenCalledTimes(2);
  });

  it("keeps the add button disabled until an email is entered", async () => {
    mockLoadedAs("OWNER");
    render(<OrganizationCenter />);

    await screen.findByText("bob@test.local");
    expect(screen.getByRole("button", { name: /^add$/i })).toBeDisabled();
  });

  it("reports a rejected mutation without wiping the loaded data", async () => {
    const user = userEvent.setup();
    mockLoadedAs("OWNER");
    api.addMember.mockRejectedValue(new ApiError(403, "You don't have permission."));
    render(<OrganizationCenter />);

    await screen.findByText("bob@test.local");
    await user.type(screen.getByLabelText("Member email"), "x@test.local");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You don't have permission.");
    expect(screen.getByText("bob@test.local")).toBeInTheDocument();
  });

  it("asks for confirmation before removing a member", async () => {
    const user = userEvent.setup();
    mockLoadedAs("OWNER");
    api.removeMember.mockResolvedValue(undefined);
    render(<OrganizationCenter />);

    await screen.findByText("bob@test.local");
    await user.click(screen.getByRole("button", { name: /remove bob/i }));

    // The app's own dialog, not the browser's.
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /hủy/i }));

    expect(api.removeMember).not.toHaveBeenCalled(); // declined → nothing happened // declined → nothing happened
  });

  it("switches organizations and marks the active one", async () => {
    const user = userEvent.setup();
    api.mine.mockResolvedValue([
      { ...OWNER_MEMBERSHIP, organizationId: 7, name: "Acme" },
      { ...OWNER_MEMBERSHIP, organizationId: 8, name: "Globex" },
    ]);
    api.getById.mockResolvedValue(ORG);
    api.members.mockResolvedValue(MEMBERS);
    api.projects.mockResolvedValue([]);
    render(<OrganizationCenter />);

    const nav = await screen.findByRole("navigation", { name: /your organizations/i });
    await user.click(within(nav).getByRole("button", { name: /globex/i }));

    await waitFor(() => expect(api.members).toHaveBeenCalledWith(8));
  });
});
