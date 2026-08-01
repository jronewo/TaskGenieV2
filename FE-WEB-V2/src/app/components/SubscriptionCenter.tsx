import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Loader2,
  XCircle,
  Building2,
  User as UserIcon,
  History,
  X,
} from "lucide-react";
import { subscriptionApi, PlanDto, SubscriptionSummaryDto, PaymentTransactionDto } from "../services/subscriptionApi";
import { organizationApi, MyOrganizationDto } from "../services/organizationApi";
import { ApiError } from "../services/apiClient";

type Scope =
  | { kind: "personal" }
  | { kind: "organization"; organizationId: number; name: string; role: MyOrganizationDto["role"] };

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export const SubscriptionCenter = () => {
  const [myOrgs, setMyOrgs] = useState<MyOrganizationDto[]>([]);
  const [scope, setScope] = useState<Scope>({ kind: "personal" });

  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [summary, setSummary] = useState<SubscriptionSummaryDto | null>(null);
  const [payments, setPayments] = useState<PaymentTransactionDto[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [pendingPlanId, setPendingPlanId] = useState<number | null>(null);
  const [checkout, setCheckout] = useState<{ paymentTransactionId: number; planName: string; amountCents: number; currency: string; gatewayReference: string } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const organizationId = scope.kind === "organization" ? scope.organizationId : undefined;
  const canManage = scope.kind === "personal" || scope.role === "OWNER" || scope.role === "ADMIN";

  useEffect(() => {
    organizationApi
      .listMine()
      .then(setMyOrgs)
      .catch(() => setMyOrgs([]));
  }, []);

  const loadScopeData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const scopeParam = scope.kind === "personal" ? "Personal" : "Organization";
      const [plansData, summaryData, paymentsData] = await Promise.all([
        subscriptionApi.getPlans(scopeParam),
        subscriptionApi.getMySubscription(organizationId),
        subscriptionApi.getPaymentHistory(organizationId).catch(() => [] as PaymentTransactionDto[]),
      ]);
      setPlans(plansData);
      setSummary(summaryData);
      setPayments(paymentsData);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [scope, organizationId]);

  useEffect(() => {
    loadScopeData();
  }, [loadScopeData]);

  const entitlement = summary?.entitlement;

  const usageLabel = useMemo(() => {
    if (!entitlement) return "";
    if (entitlement.isUnlimited) return `${entitlement.currentProjectCount} projects (unlimited)`;
    return `${entitlement.currentProjectCount} / ${entitlement.projectLimit} projects`;
  }, [entitlement]);

  const handleSubscribe = async (plan: PlanDto) => {
    setPendingPlanId(plan.planId);
    try {
      const result = await subscriptionApi.subscribe(plan.planId, organizationId);
      if (result.payment.status === "Succeeded") {
        await loadScopeData();
        setFeedback({ type: "success", message: `Now on the ${plan.name} plan.` });
      } else {
        setCheckout({
          paymentTransactionId: result.payment.paymentTransactionId,
          planName: plan.name,
          amountCents: result.payment.amountCents,
          currency: result.payment.currency,
          gatewayReference: result.payment.gatewayReference,
        });
      }
    } catch (err) {
      setFeedback({ type: "error", message: errorMessage(err) });
    } finally {
      setPendingPlanId(null);
    }
  };

  const handleConfirmPayment = async (success: boolean) => {
    if (!checkout) return;
    setIsConfirming(true);
    try {
      await subscriptionApi.confirmPayment(checkout.paymentTransactionId, success);
      setCheckout(null);
      await loadScopeData();
      setFeedback(
        success
          ? { type: "success", message: "Simulated payment succeeded — plan updated." }
          : { type: "error", message: "Simulated payment failed. No changes were made." }
      );
    } catch (err) {
      setFeedback({ type: "error", message: errorMessage(err) });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      await subscriptionApi.cancel(organizationId);
      setShowCancelConfirm(false);
      await loadScopeData();
      setFeedback({ type: "success", message: "Subscription canceled." });
    } catch (err) {
      setFeedback({ type: "error", message: errorMessage(err) });
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
          <CreditCard size={12} /> Plans &amp; Billing
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Manage your subscription</h2>
        <p className="mt-1 text-sm text-slate-500">Personal and organization plans, project quota, and simulated payment history.</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setScope({ kind: "personal" })}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${scope.kind === "personal" ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          <UserIcon size={13} /> Personal
        </button>
        {myOrgs.map((m) => (
          <button
            key={m.organization.organizationId}
            onClick={() =>
              setScope({ kind: "organization", organizationId: m.organization.organizationId, name: m.organization.name, role: m.role })
            }
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              scope.kind === "organization" && scope.organizationId === m.organization.organizationId
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Building2 size={13} /> {m.organization.name}
            <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] uppercase">{m.role}</span>
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {loadError}{" "}
          <button onClick={() => loadScopeData()} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> Loading subscription data…
        </div>
      ) : (
        <>
          {entitlement && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Current Plan</h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  {entitlement.subscriptionStatus}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Plan</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{entitlement.planName}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Project Usage</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{usageLabel}</div>
                  {!entitlement.canCreateProject && (
                    <div className="mt-1 text-[11px] font-medium text-rose-600">Quota reached — upgrade to create more projects.</div>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Renews / Ends</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {entitlement.currentPeriodEnd ? new Date(entitlement.currentPeriodEnd).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
              {canManage && entitlement.activeSubscriptionId && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <XCircle size={13} /> Cancel Subscription
                  </button>
                </div>
              )}
              {!canManage && (
                <p className="mt-3 text-[11px] text-slate-400">Only an organization OWNER or ADMIN can change this plan.</p>
              )}
            </div>
          )}

          {showCancelConfirm && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm text-rose-700">Cancel the current subscription? This takes effect immediately.</p>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setShowCancelConfirm(false)} disabled={isCanceling} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-60">
                  Keep Plan
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isCanceling}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCanceling && <Loader2 size={14} className="animate-spin" />} Confirm Cancel
                </button>
              </div>
            </motion.div>
          )}

          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No plans available for this scope.
              </div>
            )}
            {plans.map((plan) => {
              const isCurrent = entitlement?.planCode === plan.code;
              const isPending = pendingPlanId === plan.planId;
              return (
                <div key={plan.planId} className={`rounded-2xl border p-4 shadow-sm ${isCurrent ? "border-slate-800 bg-slate-50" : "border-slate-200 bg-white"}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">{plan.name}</h4>
                    {isCurrent && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-semibold uppercase text-white">Current</span>}
                  </div>
                  <div className="mb-2 text-xl font-bold text-slate-900">
                    {plan.priceCents === 0 ? "Free" : formatMoney(plan.priceCents, plan.currency)}
                    {plan.priceCents > 0 && <span className="text-xs font-normal text-slate-400"> / {plan.billingPeriodDays}d</span>}
                  </div>
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
                    <Sparkles size={12} /> {plan.projectLimit === null ? "Unlimited projects" : `Up to ${plan.projectLimit} projects`}
                  </div>
                  {plan.features && (
                    <ul className="mb-3 space-y-1 text-xs text-slate-600">
                      {plan.features.split(",").map((f) => (
                        <li key={f} className="flex items-center gap-1.5">
                          <CheckCircle2 size={11} className="text-emerald-600" /> {f.trim()}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrent || isPending || !canManage}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending && <Loader2 size={13} className="animate-spin" />}
                    {isCurrent ? "Current Plan" : "Subscribe"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <History size={15} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Payment History (Simulated)</h3>
            </div>
            {payments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">No payment history yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="py-2 pr-3 font-semibold uppercase tracking-wide">Date</th>
                      <th className="py-2 pr-3 font-semibold uppercase tracking-wide">Plan</th>
                      <th className="py-2 pr-3 font-semibold uppercase tracking-wide">Amount</th>
                      <th className="py-2 pr-3 font-semibold uppercase tracking-wide">Status</th>
                      <th className="py-2 pr-3 font-semibold uppercase tracking-wide">Gateway Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.paymentTransactionId}>
                        <td className="py-2 pr-3 text-slate-600">{new Date(p.createdAt).toLocaleString()}</td>
                        <td className="py-2 pr-3 text-slate-800 font-medium">{p.planName ?? "—"}</td>
                        <td className="py-2 pr-3 text-slate-600">{formatMoney(p.amountCents, p.currency)}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              p.status === "Succeeded"
                                ? "bg-emerald-50 text-emerald-700"
                                : p.status === "Failed"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-slate-400">{p.gatewayReference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {checkout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/25 backdrop-blur-sm"
              onClick={() => !isConfirming && setCheckout(null)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                  <CreditCard size={14} /> Simulated Payment
                </div>
                <button onClick={() => !isConfirming && setCheckout(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2 p-4 text-sm">
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
                  This is a fake gateway simulation. No real payment provider is contacted — the outcome you choose below is recorded as-is.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-semibold text-slate-900">{checkout.planName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-900">{formatMoney(checkout.amountCents, checkout.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-mono text-[11px] text-slate-500">{checkout.gatewayReference}</span>
                </div>
              </div>
              <div className="flex gap-2 border-t border-slate-100 p-4">
                <button
                  onClick={() => handleConfirmPayment(false)}
                  disabled={isConfirming}
                  className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Simulate Failure
                </button>
                <button
                  onClick={() => handleConfirmPayment(true)}
                  disabled={isConfirming}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isConfirming && <Loader2 size={13} className="animate-spin" />} Simulate Success
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
