import { render, screen, waitFor } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectManagement } from "../ProjectManagement";
import { projectApi, ProjectDto } from "../../services/projectApi";
import { billingApi, EntitlementDto } from "../../services/billingApi";

vi.mock("../../services/projectApi");
vi.mock("../../services/billingApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/billingApi")>();
  return { ...actual, billingApi: { ...actual.billingApi, entitlement: vi.fn() } };
});

const api = vi.mocked(projectApi);
const billing = vi.mocked(billingApi);

const EXHAUSTED_ENTITLEMENT: EntitlementDto = {
  planCode: "FREE_PERSONAL",
  planName: "Free",
  isPremium: false,
  projectLimit: 2,
  projectUsage: 2,
  memberLimit: null,
  sources: ["personal:FREE_PERSONAL"],
  aiChatbotEnabled: false,
  currentPeriodEnd: null,
  daysUntilExpiry: null,
  canUseOrganizations: false,
};

const ROOM_ENTITLEMENT: EntitlementDto = { ...EXHAUSTED_ENTITLEMENT, projectUsage: 1 };

function project(overrides: Partial<ProjectDto> & { projectId: number; name: string }): ProjectDto {
  return { progress: 0, riskLevel: "LOW", ...overrides } as ProjectDto;
}

describe("ProjectManagement quota gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getTasksByProject.mockResolvedValue([]);
  });

  it("opens the quota modal from the New Project button once the free limit is reached, instead of the form", async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([
      project({ projectId: 1, name: "Alpha" }),
      project({ projectId: 2, name: "Beta" }),
    ]);
    billing.entitlement.mockResolvedValue(EXHAUSTED_ENTITLEMENT);
    render(<ProjectManagement />);

    await screen.findAllByText("Alpha");
    await waitFor(() => expect(billing.entitlement).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /create project/i }));

    expect(await screen.findByRole("dialog", { name: /project limit reached/i })).toBeInTheDocument();
    expect(screen.queryByText("New Project")).not.toBeInTheDocument();
  });

  it("still opens the create form when there is room under the quota", async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([project({ projectId: 1, name: "Alpha" })]);
    billing.entitlement.mockResolvedValue(ROOM_ENTITLEMENT);
    render(<ProjectManagement />);

    await screen.findAllByText("Alpha");
    await waitFor(() => expect(billing.entitlement).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /create project/i }));

    expect(screen.getByText("New Project")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /project limit reached/i })).not.toBeInTheDocument();
  });

  it("navigates to Subscription when Upgrade plan is clicked from the quota modal", async () => {
    const user = userEvent.setup();
    const onNavigateToSubscription = vi.fn();
    api.list.mockResolvedValue([
      project({ projectId: 1, name: "Alpha" }),
      project({ projectId: 2, name: "Beta" }),
    ]);
    billing.entitlement.mockResolvedValue(EXHAUSTED_ENTITLEMENT);
    render(<ProjectManagement onNavigateToSubscription={onNavigateToSubscription} />);

    await screen.findAllByText("Alpha");
    await waitFor(() => expect(billing.entitlement).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: /create project/i }));
    await user.click(await screen.findByRole("button", { name: /upgrade plan/i }));

    expect(onNavigateToSubscription).toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
  });
});
