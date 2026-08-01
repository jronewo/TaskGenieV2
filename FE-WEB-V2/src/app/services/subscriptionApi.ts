import { apiRequest } from "./apiClient";

export interface PlanDto {
  planId: number;
  code: string;
  name: string;
  scope: "Personal" | "Organization";
  priceCents: number;
  currency: string;
  billingPeriodDays: number;
  projectLimit: number | null;
  features?: string | null;
  isActive: boolean;
}

export interface SubscriptionDto {
  subscriptionId: number;
  subscriberUserId?: number | null;
  subscriberOrganizationId?: number | null;
  plan: PlanDto;
  status: "PendingPayment" | "Active" | "Canceled" | "Expired";
  startedAt?: string | null;
  currentPeriodEnd?: string | null;
  canceledAt?: string | null;
  createdAt: string;
}

export interface EntitlementDto {
  planCode: string;
  planName: string;
  isUnlimited: boolean;
  projectLimit: number | null;
  currentProjectCount: number;
  remainingProjects: number | null;
  canCreateProject: boolean;
  subscriptionStatus: string;
  currentPeriodEnd?: string | null;
  activeSubscriptionId?: number | null;
}

export interface SubscriptionSummaryDto {
  activeSubscription: SubscriptionDto | null;
  entitlement: EntitlementDto;
}

export interface PaymentTransactionDto {
  paymentTransactionId: number;
  subscriptionId: number;
  amountCents: number;
  currency: string;
  gatewayReference: string;
  status: "Pending" | "Succeeded" | "Failed";
  createdAt: string;
  confirmedAt?: string | null;
  planCode?: string | null;
  planName?: string | null;
}

export interface SubscribeResult {
  subscription: SubscriptionDto;
  payment: PaymentTransactionDto;
}

// All payment/subscription persistence is real (SQL-backed via the Slice-1/2 backend); the
// "gateway" is purely simulated — subscribe() opens a pending transaction, confirmPayment()
// simulates the gateway's success/failure callback. Never call a real payment provider here.
export const subscriptionApi = {
  getPlans: (scope?: "Personal" | "Organization") =>
    apiRequest<PlanDto[]>(`/subscriptions/plans${scope ? `?scope=${scope}` : ""}`),

  getMySubscription: (organizationId?: number) =>
    apiRequest<SubscriptionSummaryDto>(
      `/subscriptions/me${organizationId ? `?organizationId=${organizationId}` : ""}`
    ),

  getPaymentHistory: (organizationId?: number) =>
    apiRequest<PaymentTransactionDto[]>(
      `/subscriptions/payments${organizationId ? `?organizationId=${organizationId}` : ""}`
    ),

  subscribe: (planId: number, organizationId?: number) =>
    apiRequest<SubscribeResult>("/subscriptions/subscribe", {
      method: "POST",
      body: JSON.stringify({ planId, organizationId: organizationId ?? null }),
    }),

  confirmPayment: (paymentTransactionId: number, success: boolean) =>
    apiRequest<SubscriptionDto>(`/subscriptions/payments/${paymentTransactionId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ success }),
    }),

  cancel: (organizationId?: number) =>
    apiRequest<{ message: string }>("/subscriptions/cancel", {
      method: "POST",
      body: JSON.stringify({ organizationId: organizationId ?? null }),
    }),
};
