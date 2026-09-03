import { render, screen } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuotaExceededModal } from "../QuotaExceededModal";
import { EntitlementDto } from "../../services/billingApi";

const FREE_ENTITLEMENT: EntitlementDto = {
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

describe("QuotaExceededModal", () => {
  it("renders the caller's real plan limit and usage, not a hardcoded number", async () => {
    render(<QuotaExceededModal entitlement={FREE_ENTITLEMENT} onClose={vi.fn()} onUpgrade={vi.fn()} />);

    expect(screen.getByText(/Free/)).toBeInTheDocument();
    expect(screen.getByText(/2\/2 already in use/i)).toBeInTheDocument();
  });

  it("reflects a different plan's limit without any code change", async () => {
    render(
      <QuotaExceededModal
        entitlement={{ ...FREE_ENTITLEMENT, planName: "Starter", projectLimit: 5, projectUsage: 5 }}
        onClose={vi.fn()}
        onUpgrade={vi.fn()}
      />
    );

    expect(screen.getByText(/Starter/)).toBeInTheDocument();
    expect(screen.getByText(/5\/5 already in use/i)).toBeInTheDocument();
  });

  it("fires onUpgrade when the Upgrade plan button is clicked", async () => {
    const user = userEvent.setup();
    const onUpgrade = vi.fn();
    render(<QuotaExceededModal entitlement={FREE_ENTITLEMENT} onClose={vi.fn()} onUpgrade={onUpgrade} />);

    await user.click(screen.getByRole("button", { name: /upgrade plan/i }));

    expect(onUpgrade).toHaveBeenCalled();
  });

  it("fires onClose when Cancel is clicked, without calling onUpgrade", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onUpgrade = vi.fn();
    render(<QuotaExceededModal entitlement={FREE_ENTITLEMENT} onClose={onClose} onUpgrade={onUpgrade} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
    expect(onUpgrade).not.toHaveBeenCalled();
  });
});
