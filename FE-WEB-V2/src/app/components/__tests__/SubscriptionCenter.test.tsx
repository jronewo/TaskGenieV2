import { render, screen, waitFor } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionCenter } from "../SubscriptionCenter";
import { billingApi, formatMoney } from "../../services/billingApi";
import { organizationApi } from "../../services/organizationApi";
import { ApiError } from "../../services/apiClient";

vi.mock("../../services/billingApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/billingApi")>();
  return { ...actual, billingApi: { plans: vi.fn(), entitlement: vi.fn(), subscription: vi.fn(), checkout: vi.fn(), cancel: vi.fn(), payments: vi.fn(), simulate: vi.fn() } };
});
vi.mock("../../services/organizationApi");

const api = vi.mocked(billingApi);
const orgApi = vi.mocked(organizationApi);

const FREE_PLAN = {
  planId: 1, code: "FREE_PERSONAL", name: "Free", audience: "PERSONAL" as const,
  billingInterval: "NONE" as const, priceMinor: 0, currency: "USD",
  projectLimit: 2, memberLimit: null, isActive: true,
};
const PRO_PLAN = {
  planId: 2, code: "PRO_PERSONAL", name: "Pro", audience: "PERSONAL" as const,
  billingInterval: "MONTHLY" as const, priceMinor: 999, currency: "USD",
  projectLimit: null, memberLimit: null, isActive: true,
};

const FREE_ENTITLEMENT = {
  planCode: "FREE_PERSONAL", planName: "Free", isPremium: false,
  projectLimit: 2, projectUsage: 1, memberLimit: null, sources: ["personal:FREE_PERSONAL"],
};

function mockLoaded(overrides: Partial<Parameters<typeof api.entitlement>[0]> = {}) {
  orgApi.mine.mockResolvedValue([]);
  api.plans.mockResolvedValue([FREE_PLAN, PRO_PLAN]);
  api.entitlement.mockResolvedValue({ ...FREE_ENTITLEMENT, ...overrides } as never);
  api.subscription.mockResolvedValue(null);
  api.payments.mockResolvedValue([]);
}

describe("SubscriptionCenter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders plan prices from the API rather than hardcoded values", async () => {
    mockLoaded();
    render(<SubscriptionCenter />);

    await screen.findByRole("heading", { name: "Pro" });

    // The price comes from the API's minor units, formatted — not hardcoded in the component.
    expect(screen.getByText(formatMoney(999, "USD"), { exact: false })).toBeInTheDocument();

    // A zero-price plan reads as "Free", never "$0.00".
    expect(screen.queryByText(formatMoney(0, "USD"), { exact: false })).not.toBeInTheDocument();
  });

  it("shows quota usage against the plan limit", async () => {
    mockLoaded();
    render(<SubscriptionCenter />);

    expect(await screen.findByText("1 / 2 projects used")).toBeInTheDocument();
  });

  it("describes an unlimited plan without inventing a number", async () => {
    mockLoaded({ projectLimit: null, projectUsage: 5, isPremium: true } as never);
    render(<SubscriptionCenter />);

    expect(await screen.findByText("5 projects · unlimited")).toBeInTheDocument();
  });

  it("shows an empty payment history rather than a blank panel", async () => {
    mockLoaded();
    render(<SubscriptionCenter />);

    expect(await screen.findByText(/no payments yet/i)).toBeInTheDocument();
  });

  it("offers to settle a pending payment because the gateway is simulated", async () => {
    const user = userEvent.setup();
    mockLoaded();
    api.checkout.mockResolvedValue({
      paymentTransactionId: 42, subscriptionId: 9, status: "PENDING",
      providerReference: "fake_42", redirectUrl: null, requiresManualSimulation: true,
    });
    render(<SubscriptionCenter />);

    await user.click(await screen.findByRole("button", { name: /choose plan/i }));

    expect(await screen.findByText(/payment #42 is pending/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simulate succeeded/i })).toBeInTheDocument();
  });

  it("settles the payment and reloads billing state", async () => {
    const user = userEvent.setup();
    mockLoaded();
    api.checkout.mockResolvedValue({
      paymentTransactionId: 42, subscriptionId: 9, status: "PENDING",
      providerReference: "fake_42", redirectUrl: null, requiresManualSimulation: true,
    });
    api.simulate.mockResolvedValue({} as never);
    render(<SubscriptionCenter />);

    await user.click(await screen.findByRole("button", { name: /choose plan/i }));
    await user.click(await screen.findByRole("button", { name: /simulate succeeded/i }));

    await waitFor(() => expect(api.simulate).toHaveBeenCalledWith(42, "SUCCEEDED"));
    expect(await screen.findByRole("status")).toHaveTextContent(/marked succeeded/i);
  });

  it("reports a failed checkout without leaving a phantom pending panel", async () => {
    const user = userEvent.setup();
    mockLoaded();
    api.checkout.mockRejectedValue(new ApiError(400, "This plan is no longer available."));
    render(<SubscriptionCenter />);

    await user.click(await screen.findByRole("button", { name: /choose plan/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This plan is no longer available.");
    expect(screen.queryByText(/is pending/i)).not.toBeInTheDocument();
  });

  it("never offers checkout for the plan the user is already on", async () => {
    mockLoaded({ planCode: "PRO_PERSONAL", isPremium: true } as never);
    render(<SubscriptionCenter />);

    await screen.findByText("Current");
    // Only the Free card remains without a purchase button; Pro is marked current instead.
    expect(screen.queryByRole("button", { name: /choose plan/i })).not.toBeInTheDocument();
  });

  it("tells organization-less users why the organization tab is empty", async () => {
    const user = userEvent.setup();
    mockLoaded();
    render(<SubscriptionCenter />);

    await screen.findByText("Pro");
    await user.click(screen.getByRole("tab", { name: /organization/i }));

    expect(await screen.findByText(/don't belong to any organization/i)).toBeInTheDocument();
  });
});
