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

/** Prices arrive in integer minor units — format, never compute, on the client. */
export const formatMoney = (amountMinor: number, currency: string): string =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountMinor / 100);

export const billingApi = {
  plans: (audience?: PlanAudience) =>
    apiRequest<PlanDto[]>(`/plans${audience ? `?audience=${audience}` : ""}`),

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
