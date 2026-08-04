import { apiRequest } from "./apiClient";

export type PlanAudience = "PERSONAL" | "ORGANIZATION";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELED" | "REFUNDED" | "EXPIRED";

export interface PlanDto {
  planId: number;
  code: string;
  name: string;
  audience: PlanAudience;
  billingInterval: "NONE" | "MONTHLY" | "YEARLY";
  priceMinor: number;
  currency: string;
  projectLimit: number | null;
  memberLimit: number | null;
  isActive: boolean;
}

export interface EntitlementDto {
  planCode: string;
  planName: string;
  isPremium: boolean;
  projectLimit: number | null;
  projectUsage: number;
  memberLimit: number | null;
  sources: string[];
  /** Read from the plan's own flag, not inferred from the price. */
  aiChatbotEnabled: boolean;
  /** End of the current paid period; null on a free plan. */
  currentPeriodEnd: string | null;
  /** Whole days left, 0 once reached, null when there is no end date. */
  daysUntilExpiry: number | null;
  /** Organizations are paid-only: true only while an organization plan is actually active. */
  canUseOrganizations: boolean;
}

export interface SubscriptionDto {
  subscriptionId: number;
  planId: number;
  planCode: string | null;
  planName: string | null;
  ownerType: PlanAudience;
  userId: number | null;
  organizationId: number | null;
  status: "PENDING" | "ACTIVE" | "CANCELED" | "EXPIRED";
  startedAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface PaymentDto {
  paymentTransactionId: number;
  subscriptionId: number;
  planId: number;
  planName: string | null;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  isTest: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface CheckoutResultDto {
  paymentTransactionId: number;
  subscriptionId: number;
  status: PaymentStatus;
  providerReference: string;
  redirectUrl: string | null;
  requiresManualSimulation: boolean;
}

/** Currencies with no minor subdivision — the integer amount itself is the whole unit. */
const ZERO_DECIMAL_CURRENCIES = new Set(["VND", "JPY", "KRW"]);

/** Prices arrive in integer minor units — format, never compute, on the client. */
export const formatMoney = (amountMinor: number, currency: string): string => {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
  return new Intl.NumberFormat(currency.toUpperCase() === "VND" ? "vi-VN" : undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: isZeroDecimal ? 0 : undefined,
  }).format(isZeroDecimal ? amountMinor : amountMinor / 100);
};

export const billingApi = {
  plans: (audience?: PlanAudience) =>
    apiRequest<PlanDto[]>(`/plans${audience ? `?audience=${audience}` : ""}`),

  /**
   * Which gateway is wired up. The simulate controls must only appear when it is actually the
   * fake one — old PENDING rows from a previous simulated run otherwise offer a button whose
   * endpoint answers 404.
   */
  gateway: () => apiRequest<{ simulated: boolean; provider: string }>("/billing/gateway"),

  entitlement: (organizationId?: number | null) =>
    apiRequest<EntitlementDto>(`/billing/entitlement${organizationId ? `?organizationId=${organizationId}` : ""}`),

  subscription: (organizationId?: number | null) =>
    apiRequest<SubscriptionDto | null>(
      `/billing/subscription${organizationId ? `?organizationId=${organizationId}` : ""}`
    ),

  checkout: (planId: number, organizationId: number | null, idempotencyKey: string | null) =>
    apiRequest<CheckoutResultDto>("/billing/checkout-sessions", {
      method: "POST",
      body: JSON.stringify({ planId, organizationId, idempotencyKey }),
    }),

  cancel: (organizationId: number | null, atPeriodEnd: boolean) =>
    apiRequest<SubscriptionDto>("/billing/subscription/cancel", {
      method: "POST",
      body: JSON.stringify({ organizationId, atPeriodEnd }),
    }),

  payments: (organizationId?: number | null) =>
    apiRequest<PaymentDto[]>(`/billing/payments${organizationId ? `?organizationId=${organizationId}` : ""}`),

  /** Development/UAT only — stands in for a gateway callback. Returns 404 in Production. */
  simulate: (paymentId: number, status: PaymentStatus) =>
    apiRequest<PaymentDto>(`/test-payments/${paymentId}/simulate`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
};
