import { render, screen, waitFor } from "../../../test/renderWithProviders";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionCenter } from "../SubscriptionCenter";
import { billingApi, formatMoney } from "../../services/billingApi";
import { organizationApi } from "../../services/organizationApi";
import { ApiError } from "../../services/apiClient";

vi.mock("../../services/billingApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/billingApi")>();
  return { ...actual, billingApi: { plans: vi.fn(), entitlement: vi.fn(), subscription: vi.fn(), checkout: vi.fn(), cancel: vi.fn(), payments: vi.fn(), simulate: vi.fn(), gateway: vi.fn() } };
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

const PRO_ORG_PLAN = {
  planId: 4, code: "PRO_ORGANIZATION", name: "Organization Pro", audience: "ORGANIZATION" as const,
  billingInterval: "MONTHLY" as const, priceMinor: 4999, currency: "USD",
  projectLimit: null, memberLimit: null, isActive: true,
};

const FREE_ENTITLEMENT = {
  planCode: "FREE_PERSONAL", planName: "Free", isPremium: false,
  projectLimit: 2, projectUsage: 1, memberLimit: null, sources: ["personal:FREE_PERSONAL"],
};

function mockLoaded(overrides: Partial<Parameters<typeof api.entitlement>[0]> = {}) {
  orgApi.mine.mockResolvedValue([]);
  // These tests exercise the simulated gateway, so the simulate controls must be offered.
  api.gateway.mockResolvedValue({ simulated: true, provider: "FAKE" });
  // Audience-aware, like the API: the organization tab must not be handed personal plans, or the
  // organization checkout path is never exercised.
  api.plans.mockImplementation(async (audience?: string) =>
    (audience === "ORGANIZATION" ? [PRO_ORG_PLAN] : [FREE_PLAN, PRO_PLAN]) as never
  );
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

    expect(await screen.findByText("1/2 dự án")).toBeInTheDocument();
  });

  it("describes an unlimited plan without inventing a number", async () => {
    mockLoaded({ projectLimit: null, projectUsage: 5, isPremium: true } as never);
    render(<SubscriptionCenter />);

    expect(await screen.findByText("5 dự án · không giới hạn")).toBeInTheDocument();
  });

  /// Being refused with no way forward is the failure mode: the cap has to say that deleting is
  /// what gets you back under it.
  it("says how to get back under the cap once the quota is exhausted", async () => {
    mockLoaded({ projectLimit: 2, projectUsage: 2 } as never);
    render(<SubscriptionCenter />);

    expect(await screen.findByText("2/2 dự án")).toBeInTheDocument();
    expect(screen.getByText(/xoá bớt dự án/i)).toBeInTheDocument();
  });

  /// The organization list resolves a moment after mount and fills `organizationId` in. On the
  /// Personal tab that changes nothing about what is fetched — but when the load effect depended
  /// on it, the page refetched and flashed back to its skeleton right after painting.
  it("loads once on the personal tab even after the organization list arrives", async () => {
    mockLoaded();
    orgApi.mine.mockResolvedValue([{ organizationId: 7, name: "Acme", role: "OWNER" }] as never);
    render(<SubscriptionCenter />);

    await screen.findByRole("heading", { name: "Pro" });
    // Let the organization list settle and any effect it triggers run.
    await waitFor(() => expect(orgApi.mine).toHaveBeenCalled());

    await waitFor(() => expect(api.entitlement).toHaveBeenCalledTimes(1));
    expect(api.payments).toHaveBeenCalledTimes(1);
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

  /// A database carried over from an earlier simulated run still holds FAKE/PENDING rows. Once a
  /// real gateway is configured those can never be settled — the endpoint 404s — so offering the
  /// button is offering a dead control.
  it("hides the simulate controls when a real gateway is configured", async () => {
    mockLoaded();
    api.gateway.mockResolvedValue({ simulated: false, provider: "PAYOS" });
    api.payments.mockResolvedValue([
      {
        paymentTransactionId: 3006, subscriptionId: 1, planId: 2, planName: "Pro",
        amountMinor: 999, currency: "VND", status: "PENDING", provider: "FAKE",
        isTest: true, createdAt: "2026-08-04T00:00:00Z", completedAt: null,
      },
    ] as never);
    render(<SubscriptionCenter />);

    await screen.findByRole("heading", { name: "Pro" });
    expect(screen.queryByText(/is pending\. the gateway is simulated/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /simulate succeeded/i })).not.toBeInTheDocument();
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

  /// Buying is how a company gets created: checkout needs an organization to attach to, so the
  /// tab offers the plans rather than a create form that would strand someone who has not paid.
  it("offers the organization plans when there is no company yet", async () => {
    const user = userEvent.setup();
    mockLoaded({ isPremium: false } as never);
    render(<SubscriptionCenter />);

    await screen.findByText("Pro");
    await user.click(screen.getByRole("tab", { name: /organization/i }));

    expect(await screen.findByText(/bạn chưa có công ty nào/i)).toBeInTheDocument();
    // Naming the company happens inside the checkout modal, not as a separate step before it.
    expect(screen.queryByRole("button", { name: /^tạo công ty$/i })).not.toBeInTheDocument();
  });

  /// Naming the company is the first step of checkout, not a separate action beforehand — that is
  /// what removes the chicken-and-egg where buying needed a company and a company needed paying.
  it("collects the company name inside checkout rather than as a separate step", async () => {
    const user = userEvent.setup();
    mockLoaded({ isPremium: false } as never);
    render(<SubscriptionCenter />);

    await screen.findByText("Pro");
    await user.click(screen.getByRole("tab", { name: /organization/i }));

    // Wait for the organization scope to actually render before acting: clicking during the tab
    // transition would hit the personal plan that is still on its way out.
    await screen.findByText("Organization Pro");
    await user.click(screen.getByRole("button", { name: /choose plan/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/tên công ty/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /xác nhận và thanh toán/i })).toBeInTheDocument();
  });
});
