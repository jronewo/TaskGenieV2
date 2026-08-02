import React, { useCallback, useEffect, useState } from "react";
import { CreditCard, Check, Loader2, Sparkles, Receipt, AlertTriangle, Building2, User } from "lucide-react";
import {
  billingApi,
  formatMoney,
  EntitlementDto,
  PaymentDto,
  PaymentStatus,
  PlanAudience,
  PlanDto,
  SubscriptionDto,
} from "../services/billingApi";
import { organizationApi, MyOrganizationSummaryDto } from "../services/organizationApi";
import { ApiError } from "../services/apiClient";
import { useConfirm } from "./ConfirmDialog";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to perform this action.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

const STATUS_STYLES: Record<string, string> = {
  SUCCEEDED: "bg-emerald-50 text-emerald-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-700",
  CANCELED: "bg-gray-100 text-gray-600",
  REFUNDED: "bg-sky-50 text-sky-700",
  EXPIRED: "bg-gray-100 text-gray-500",
};

interface Props {
  /** Lets the shell re-evaluate whether the Organizations nav should appear. */
  onOrganizationsChanged?: () => void;
}

export const SubscriptionCenter = ({ onOrganizationsChanged }: Props = {}) => {
  const confirm = useConfirm();

  const [scope, setScope] = useState<PlanAudience>("PERSONAL");
  const [organizations, setOrganizations] = useState<MyOrganizationSummaryDto[]>([]);
  const [organizationId, setOrganizationId] = useState<number | null>(null);

  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [entitlement, setEntitlement] = useState<EntitlementDto | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<number | null>(null);
  const [newOrgName, setNewOrgName] = useState("");

  const orgScopeId = scope === "ORGANIZATION" ? organizationId : null;

  useEffect(() => {
    void (async () => {
      try {
        const orgs = await organizationApi.mine();
        setOrganizations(orgs);
        setOrganizationId((current) => current ?? orgs[0]?.organizationId ?? null);
      } catch {
        // Organization scope simply stays unavailable if this fails.
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planList, ent, sub, history] = await Promise.all([
        billingApi.plans(scope),
        billingApi.entitlement(orgScopeId),
        billingApi.subscription(orgScopeId),
        billingApi.payments(orgScopeId),
      ]);
      setPlans(planList);
      setEntitlement(ent);
      setSubscription(sub);
      setPayments(history);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [scope, orgScopeId]);

  useEffect(() => {
    if (scope === "ORGANIZATION" && organizationId == null) {
      setLoading(false);
      return;
    }
    void load();
  }, [load, scope, organizationId]);

  const run = async (key: string, action: () => Promise<void>, successMessage?: string) => {
    if (busy) return; // double-submit guard
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (successMessage) setNotice(successMessage);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleCheckout = (plan: PlanDto) =>
    run(`checkout-${plan.planId}`, async () => {
      const result = await billingApi.checkout(plan.planId, orgScopeId, null);
      setPendingPaymentId(result.paymentTransactionId);
      await load();
    });

  const handleSimulate = (status: PaymentStatus) =>
    pendingPaymentId != null &&
    run(
      `simulate-${status}`,
      async () => {
        await billingApi.simulate(pendingPaymentId, status);
        setPendingPaymentId(null);
        await load();
      },
      `Payment marked ${status.toLowerCase()}.`
    );

  /** Creating the first organization; the nav entry appears once membership exists. */
  const handleCreateOrganization = () =>
    run(
      "create-org",
      async () => {
        const org = await organizationApi.create(newOrgName.trim(), null);
        setNewOrgName("");
        const orgs = await organizationApi.mine();
        setOrganizations(orgs);
        setOrganizationId(org.organizationId);
        onOrganizationsChanged?.();
      },
      "Organization created. It's now available from the Organizations menu."
    );

  const handleCancel = async () => {
    if (!(await confirm({
      title: "Hủy gói đăng ký?",
      description: "Gói vẫn chạy đến hết chu kỳ hiện tại, sau đó không gia hạn nữa.",
      confirmLabel: "Hủy gói",
      cancelLabel: "Giữ gói",
      tone: "danger",
    }))) return;
    void run(
      "cancel",
      async () => {
        await billingApi.cancel(orgScopeId, true);
        await load();
      },
      "Subscription will end at the period end."
    );
  };

  const quotaLabel = entitlement
    ? entitlement.projectLimit == null
      ? `${entitlement.projectUsage} projects · unlimited`
      : `${entitlement.projectUsage} / ${entitlement.projectLimit} projects used`
    : "—";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
          <CreditCard className="h-6 w-6 text-[#1A237E]" aria-hidden />
          Subscription
        </h1>
        <p className="text-sm text-gray-500">Plans, quota and payment history.</p>
      </header>

      {/* Scope tabs */}
      <div className="flex gap-2" role="tablist" aria-label="Billing scope">
        {(["PERSONAL", "ORGANIZATION"] as PlanAudience[]).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={scope === s}
            type="button"
            onClick={() => setScope(s)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
              scope === s ? "bg-[#1A237E] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s === "PERSONAL" ? <User className="h-4 w-4" aria-hidden /> : <Building2 className="h-4 w-4" aria-hidden />}
            {s === "PERSONAL" ? "Personal" : "Organization"}
          </button>
        ))}
        {scope === "ORGANIZATION" && organizations.length > 0 && (
          <select
            value={organizationId ?? ""}
            onChange={(e) => setOrganizationId(Number(e.target.value))}
            aria-label="Organization"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {organizations.map((o) => (
              <option key={o.organizationId} value={o.organizationId}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {scope === "ORGANIZATION" && organizationId == null ? (
        /* The Organizations nav only appears once you belong to one, so this is the entry point
           for creating your first — otherwise a new account would have no way in at all. */
        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-14 text-center">
          <Building2 className="mx-auto mb-3 h-9 w-9 text-gray-300" aria-hidden />
          <p className="text-sm text-gray-700">You don't belong to any organization yet.</p>
          <p className="mt-1 text-xs text-gray-500">
            Create one to invite teammates, share projects and buy an organization plan.
          </p>

          <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2 sm:flex-row">
            <input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Organization name"
              aria-label="New organization name"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            />
            <button
              type="button"
              onClick={handleCreateOrganization}
              disabled={!newOrgName.trim() || busy === "create-org"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1A237E] px-4 py-2 text-sm font-medium text-white hover:bg-[#0D1757] disabled:opacity-50"
            >
              {busy === "create-org" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Create organization
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 py-16 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading billing…
        </div>
      ) : (
        <>
          {/* Current state */}
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Current plan</p>
              <p className="mt-1 flex items-center gap-2 text-lg text-gray-900">
                {entitlement?.planName ?? "Free"}
                {entitlement?.isPremium && <Sparkles className="h-4 w-4 text-amber-400" aria-label="Premium" />}
              </p>
              {entitlement && entitlement.sources.length > 0 && (
                <p className="mt-1 text-xs text-gray-400">via {entitlement.sources.join(", ")}</p>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Project quota</p>
              <p className="mt-1 text-lg text-gray-900">{quotaLabel}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Subscription</p>
              <p className="mt-1 text-lg text-gray-900">{subscription?.status ?? "None"}</p>
              {subscription?.cancelAtPeriodEnd && (
                <p className="mt-1 text-xs text-amber-700">Ends {subscription.currentPeriodEnd?.slice(0, 10)}</p>
              )}
              {subscription?.status === "ACTIVE" && !subscription.cancelAtPeriodEnd && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={busy === "cancel"}
                  className="mt-2 text-xs text-red-600 underline hover:text-red-700 disabled:opacity-50"
                >
                  Cancel subscription
                </button>
              )}
            </div>
          </section>

          {/* Pending simulated payment */}
          {pendingPaymentId != null && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="mb-3 flex items-center gap-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Payment #{pendingPaymentId} is pending. The gateway is simulated in this environment — choose an outcome.
              </p>
              <div className="flex flex-wrap gap-2">
                {(["SUCCEEDED", "FAILED", "CANCELED"] as PaymentStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleSimulate(status)}
                    disabled={busy?.startsWith("simulate") ?? false}
                    className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                  >
                    Simulate {status.toLowerCase()}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Plans */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Available plans</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent = entitlement?.planCode === plan.code;
                return (
                  <div key={plan.planId} className="rounded-lg border border-gray-200 bg-white p-5">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-base text-gray-900">{plan.name}</h3>
                      {isCurrent && <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">Current</span>}
                    </div>
                    <p className="mt-2 text-2xl text-gray-900">
                      {plan.priceMinor === 0 ? "Free" : formatMoney(plan.priceMinor, plan.currency)}
                      {plan.billingInterval !== "NONE" && (
                        <span className="text-sm text-gray-400">/{plan.billingInterval.toLowerCase().replace("ly", "")}</span>
                      )}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-gray-500">
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                        {plan.projectLimit == null ? "Unlimited projects" : `${plan.projectLimit} projects`}
                      </li>
                      {plan.memberLimit != null && (
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                          {plan.memberLimit} members
                        </li>
                      )}
                    </ul>
                    {plan.priceMinor > 0 && !isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleCheckout(plan)}
                        disabled={busy === `checkout-${plan.planId}`}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A237E] px-4 py-2 text-sm text-white hover:bg-[#0D1757] disabled:opacity-50"
                      >
                        {busy === `checkout-${plan.planId}` && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                        Choose plan
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Payment history */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Receipt className="h-4 w-4 text-[#1A237E]" aria-hidden /> Payment history
            </h2>
            {payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No payments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">Plan</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-600">
                    {payments.map((p) => (
                      <tr key={p.paymentTransactionId}>
                        <td className="py-2 pr-4">{p.paymentTransactionId}</td>
                        <td className="py-2 pr-4">
                          {p.planName ?? "—"}
                          {p.isTest && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">TEST</span>}
                        </td>
                        <td className="py-2 pr-4">{formatMoney(p.amountMinor, p.currency)}</td>
                        <td className="py-2 pr-4">
                          <span className={`rounded px-2 py-0.5 text-[11px] ${STATUS_STYLES[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2">{p.createdAt.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
