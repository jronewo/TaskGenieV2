import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CreditCard, Check, X, Loader2, Sparkles, Receipt, AlertTriangle, Building2, User } from "lucide-react";
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
import { SubscriptionExpiryBanner } from "./SubscriptionExpiryBanner";
import { OrganizationCheckoutModal } from "./OrganizationCheckoutModal";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

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
  /** Null until known. The simulate controls stay hidden unless the gateway really is the fake one. */
  const [simulatedGateway, setSimulatedGateway] = useState<boolean | null>(null);

  useEffect(() => {
    void billingApi
      .gateway()
      .then((g) => setSimulatedGateway(g.simulated))
      // Unknown means "assume real": showing a dead simulate button is worse than hiding a live one.
      .catch(() => setSimulatedGateway(false));
  }, []);

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

  /**
   * `background` keeps the current content on screen while refetching.
   *
   * The post-payment poll calls this five times two seconds apart; flipping the page back to its
   * skeleton each time made it flash repeatedly while the user waited for the webhook. A refresh
   * of data already on screen is not a loading state — only the first fetch is.
   */
  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
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
      // Rehydrate the simulate box after a reload/navigation — otherwise a fake payment left
      // PENDING becomes unreachable from the UI (no PayOS webhook will ever resolve it).
      //
      // Only ever sets, never clears: checkout sets the id and then calls this, and the payment it
      // just created may not be in `history` yet — clearing here made the Simulate panel vanish the
      // instant it appeared. Settling clears the id explicitly.
      const stillPending = history.find((p) => p.provider === "FAKE" && p.status === "PENDING");
      if (stillPending) setPendingPaymentId(stillPending.paymentTransactionId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [scope, orgScopeId]);

  useEffect(() => {
    if (scope === "ORGANIZATION" && orgScopeId == null) {
      // No company yet, so entitlement/subscription/payments have nothing to be scoped to — but
      // the plans still have to load, because buying one is how a company gets created.
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          setPlans(await billingApi.plans("ORGANIZATION"));
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setLoading(false);
        }
      })();
      return;
    }
    void load();
    // Keyed on `orgScopeId`, never on `organizationId`. The organization list resolves a moment
    // after mount and fills `organizationId` in — on the Personal tab that changes nothing about
    // what is fetched, but depending on it re-ran this effect and flashed the whole page back to
    // its skeleton right after the first load had painted. `orgScopeId` is null on Personal, so
    // it stays still.
  }, [load, scope, orgScopeId]);

  // Returning from PayOS's hosted checkout page (?paymentId=...&canceled=1). The subscription
  // only ever activates from the webhook, never from this redirect, so poll briefly rather than
  // trusting the return itself — the webhook is usually near-instant but not synchronous with it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedPaymentId = params.get("paymentId");
    if (!returnedPaymentId) return;

    const canceled = params.get("canceled") === "1";
    setNotice(
      canceled
        ? "Payment was canceled."
        : "Payment received — confirming with the gateway. This can take a few seconds."
    );

    params.delete("paymentId");
    params.delete("canceled");
    const rest = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));

    if (canceled) return;

    let attempts = 0;
    const poll = setInterval(() => {
      attempts += 1;
      // Background: the page already shows the right thing, it is only waiting for the webhook to
      // flip the status. Re-rendering the skeleton five times would make it flash while it waits.
      void load(true);
      if (attempts >= 5) clearInterval(poll);
    }, 2000);
    return () => clearInterval(poll);
  }, [load]);

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

  /** Set while buying an organization plan; the modal names the company then pays for it. */
  const [orgCheckoutPlan, setOrgCheckoutPlan] = useState<PlanDto | null>(null);

  const handleCheckout = (plan: PlanDto) => {
    // Buying for an organization needs an organization to attach the subscription to. Rather than
    // refusing until one exists, the modal collects it and pays in one flow — and reuses the
    // company they already have instead of creating a second one.
    if (plan.audience === "ORGANIZATION") {
      setOrgCheckoutPlan(plan);
      return;
    }
    return startCheckout(plan);
  };

  const startCheckout = (plan: PlanDto) =>
    run(`checkout-${plan.planId}`, async () => {
      const result = await billingApi.checkout(plan.planId, orgScopeId, null);
      if (result.redirectUrl) {
        // Real gateway (PayOS): hand off to its hosted checkout page. The subscription only
        // activates once PayOS calls the webhook back — never from this redirect alone.
        window.location.href = result.redirectUrl;
        return;
      }
      setPendingPaymentId(result.paymentTransactionId);
      await load(true);
    });

  const handleSimulate = (status: PaymentStatus) =>
    pendingPaymentId != null &&
    run(
      `simulate-${status}`,
      async () => {
        await billingApi.simulate(pendingPaymentId, status);
        setPendingPaymentId(null);
        await load(true);
      },
      `Payment marked ${status.toLowerCase()}.`
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
        await load(true);
      },
      "Subscription will end at the period end."
    );
  };

  const quotaLabel = entitlement
    ? entitlement.projectLimit == null
      ? `${entitlement.projectUsage} dự án · không giới hạn`
      : `${entitlement.projectUsage}/${entitlement.projectLimit} dự án`
    : "—";

  /** At or over the cap: creating another is refused until one is deleted. */
  const quotaExhausted =
    entitlement != null &&
    entitlement.projectLimit != null &&
    entitlement.projectUsage >= entitlement.projectLimit;

  const currentPlanCode = subscription?.planCode ?? entitlement?.planCode;

  /** Ratio for the quota meter; unlimited plans have nothing to fill. */
  const quotaRatio =
    entitlement?.projectLimit == null || entitlement.projectLimit === 0
      ? null
      : Math.min(100, Math.round((entitlement.projectUsage / entitlement.projectLimit) * 100));

  const scopeTabs: { id: PlanAudience; label: string; Icon: typeof User }[] = [
    { id: "PERSONAL", label: "Personal", Icon: User },
    { id: "ORGANIZATION", label: "Organization", Icon: Building2 },
  ];

  const reduceMotion = useReducedMotion();

  /**
   * Content slides in from the side the tab sits on, so the movement matches the direction you
   * clicked. Distance is deliberately small — a long slide on a full page of cards reads as the
   * layout breaking rather than as a transition.
   */
  const slideFrom = scope === "PERSONAL" ? -12 : 12;
  const scopeMotion = reduceMotion
    ? { initial: false as const, animate: {}, exit: {}, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, x: slideFrom },
        animate: { opacity: 1, x: 0 },
        // Stops pointer events on the way out: mid-transition the outgoing scope's buttons are
        // still on screen, and clicking one would check out a plan from the tab you just left.
        exit: { opacity: 0, x: -slideFrom, pointerEvents: "none" as const },
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
      };

  /** One plan card, used by both the normal grid and the no-company grid. */
  const planCard = (plan: PlanDto) => {
    const isCurrent = currentPlanCode === plan.code;
    return (
      <Card
        key={plan.planId}
        className={`relative flex flex-col transition-shadow hover:shadow-brand-md ${
          isCurrent ? "border-[var(--brand-600)] ring-1 ring-[var(--brand-600)]" : ""
        }`}
      >
        {isCurrent && (
          <Badge className="absolute -top-2.5 right-4 bg-[var(--brand-600)] text-white">Current</Badge>
        )}
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-strong">{plan.name}</CardTitle>
          <CardDescription className="font-display text-2xl font-bold text-strong">
            {plan.priceMinor === 0 ? "Free" : formatMoney(plan.priceMinor, plan.currency)}
            {plan.billingInterval !== "NONE" && (
              <span className="ml-1 text-xs font-normal text-subtle">
                /{plan.billingInterval.toLowerCase().replace("ly", "")}
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 pb-3">
          <ul className="space-y-1.5 text-xs text-muted">
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
              {plan.projectLimit == null ? "Unlimited projects" : `${plan.projectLimit} projects`}
            </li>
            {plan.memberLimit != null && (
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                {plan.memberLimit} members
              </li>
            )}
            {/* Listed on every plan, not only the paid ones: a feature missing from the free card
                reads as an oversight rather than as the difference you are paying for. */}
            <li className={`flex items-center gap-2 ${plan.priceMinor === 0 ? "text-subtle line-through" : ""}`}>
              {plan.priceMinor === 0 ? (
                <X className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
              ) : (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
              )}
              Trợ lý AI chatbot
            </li>
          </ul>
        </CardContent>

        <CardFooter>
          {plan.priceMinor > 0 && !isCurrent && (
            <Button
              type="button"
              onClick={() => handleCheckout(plan)}
              disabled={busy === `checkout-${plan.planId}`}
              className="w-full bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)]"
            >
              {busy === `checkout-${plan.planId}` && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Choose plan
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-strong">
            <CreditCard className="h-6 w-6 text-brand" aria-hidden />
            Subscription
          </h1>
          <p className="mt-0.5 text-sm text-subtle">Gói đăng ký, hạn mức dự án và lịch sử thanh toán.</p>
        </div>
        {entitlement && (
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs">
            {entitlement.isPremium && <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />}
            {entitlement.planName}
          </Badge>
        )}
      </header>

      {/* Warns a week ahead and states plainly once the plan has lapsed. Above the tabs so it is
          the first thing read, not something scrolled past. */}
      <SubscriptionExpiryBanner entitlement={entitlement} />

      <div className="flex flex-wrap items-center gap-2">
        {/* One sliding pill rather than two buttons swapping colour: the movement itself shows
            which way you went, so the change reads as navigation instead of a flicker. */}
        <div
          className="relative inline-flex gap-1 rounded-xl bg-surface-inset p-1"
          role="tablist"
          aria-label="Billing scope"
        >
          {scopeTabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={scope === id}
              type="button"
              onClick={() => setScope(id)}
              className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)] ${
                scope === id ? "text-white" : "text-muted hover:text-strong"
              }`}
            >
              {scope === id && (
                <motion.span
                  layoutId="subscription-scope-pill"
                  // Without this the layout animation also runs on mount: the pill has no measured
                  // position yet, so it paints at the wrong size and springs into place — a brand
                  // blue flash every single time the page is opened. It should only animate when
                  // moving between tabs, never on arrival.
                  initial={false}
                  className="absolute inset-0 rounded-lg bg-[var(--brand-600)] shadow-brand-md"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                  aria-hidden
                />
              )}
              <Icon className="relative h-4 w-4" aria-hidden />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>


        {scope === "ORGANIZATION" && organizations.length > 0 && (
          <select
            value={organizationId ?? ""}
            onChange={(e) => setOrganizationId(Number(e.target.value))}
            aria-label="Organization"
            className="ml-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-default cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
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
        <Alert role="alert" variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert role="status" className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <Check className="h-4 w-4" aria-hidden />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {/* `mode="wait"` so the outgoing scope finishes leaving before the new one arrives —
          cross-fading them on top of each other doubled the page height mid-transition, which was
          the jump. min-h keeps the footer still while the skeleton swaps for real content. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={scope} {...scopeMotion} className="min-h-[26rem] space-y-6">
      {scope === "ORGANIZATION" && organizationId == null ? (
        /* No company yet: the organization plans are still shown, because buying one is how a
           company gets created. The modal on "Choose plan" names it and pays in one flow — there
           is no separate "create company first" step to get stuck on. */
        <div className="space-y-4">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <Building2 className="mb-3 h-9 w-9 text-subtle" aria-hidden />
              <p className="text-sm font-medium text-strong">Bạn chưa có công ty nào.</p>
              <p className="mt-1 max-w-md text-xs text-subtle">
                Không còn gói miễn phí cho tổ chức. Chọn một gói bên dưới — bạn sẽ nhập tên công ty
                rồi thanh toán ngay trong cùng một bước.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{plans.map(planCard)}</div>
        </div>
      ) : loading ? (
        <div className="space-y-4" role="status" aria-label="Đang tải thông tin gói">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
                  Current plan
                </CardDescription>
                <CardTitle className="flex items-center gap-2 text-lg text-strong">
                  {entitlement?.planName ?? "Free"}
                  {entitlement?.isPremium && <Sparkles className="h-4 w-4 text-amber-500" aria-label="Premium" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {entitlement && entitlement.sources.length > 0 && (
                  <p className="truncate text-[11px] text-subtle" title={entitlement.sources.join(", ")}>
                    via {entitlement.sources.join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
                  Project quota
                </CardDescription>
                <CardTitle className={`text-lg ${quotaExhausted ? "text-red-600 dark:text-red-400" : "text-strong"}`}>
                  {quotaLabel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* A meter makes "nearly full" visible before the refusal happens. */}
                {quotaRatio != null && (
                  <Progress
                    value={quotaRatio}
                    aria-label="Đã dùng bao nhiêu hạn mức dự án"
                    className={quotaExhausted ? "[&>div]:bg-red-500" : ""}
                  />
                )}
                {/* Deleting is the only way back under the cap, so say so rather than leaving
                    someone stuck on a refusal they cannot act on. */}
                {quotaExhausted && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    Đã hết hạn mức. Nâng cấp gói, hoặc xoá bớt dự án cho đến khi còn dưới{" "}
                    {entitlement!.projectLimit} thì mới tạo mới được.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
                  Subscription
                </CardDescription>
                <CardTitle className="text-lg text-strong">{subscription?.status ?? "None"}</CardTitle>
              </CardHeader>
              <CardContent>
                {subscription?.cancelAtPeriodEnd && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Ends {subscription.currentPeriodEnd?.slice(0, 10)}
                  </p>
                )}
                {subscription?.status === "ACTIVE" && !subscription.cancelAtPeriodEnd && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={busy === "cancel"}
                    className="mt-1"
                  >
                    {busy === "cancel" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                    Hủy gia hạn
                  </Button>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{plans.map(planCard)}</section>

          {/* Simulated gateway only — PayOS resolves itself through the webhook. The gateway flag
              matters as much as the pending id: a database carried over from an earlier simulated
              run still holds FAKE/PENDING rows, and settling them is impossible once a real
              provider is configured (the endpoint 404s). */}
          {pendingPaymentId != null && simulatedGateway === true && (
            <Card className="border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
              <CardContent className="flex flex-wrap items-center gap-3 py-4">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                <p className="flex-1 text-sm text-amber-900 dark:text-amber-200">
                  Payment #{pendingPaymentId} is pending. The gateway is simulated in this environment — choose an outcome.
                </p>
                {(["SUCCEEDED", "FAILED"] as PaymentStatus[]).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={status === "SUCCEEDED" ? "default" : "outline"}
                    onClick={() => handleSimulate(status)}
                    disabled={busy?.startsWith("simulate") ?? false}
                  >
                    Simulate {status.toLowerCase()}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-strong">
              <Receipt className="h-4 w-4 text-brand" aria-hidden /> Payment history
            </h2>
            {payments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-subtle">No payments yet.</CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.paymentTransactionId}>
                        <TableCell className="text-strong">{p.planName ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{formatMoney(p.amountMinor, p.currency)}</TableCell>
                        <TableCell className="text-subtle">
                          {p.provider}
                          {p.isTest && <span className="ml-1 text-[10px] text-amber-600">(test)</span>}
                        </TableCell>
                        <TableCell>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[p.status] ?? ""}`}>
                            {p.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-subtle tabular-nums">{p.createdAt.slice(0, 10)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </section>
        </>
      )}
        </motion.div>
      </AnimatePresence>

      {orgCheckoutPlan && (
        <OrganizationCheckoutModal
          plan={orgCheckoutPlan}
          existingOrganizationId={organizations[0]?.organizationId ?? null}
          onClose={() => setOrgCheckoutPlan(null)}
          onPaid={async () => {
            setOrgCheckoutPlan(null);
            // The webhook is what activates the subscription, so re-read rather than assume.
            const orgs = await organizationApi.mine().catch(() => organizations);
            setOrganizations(orgs);
            setOrganizationId((current) => current ?? orgs[0]?.organizationId ?? null);
            onOrganizationsChanged?.();
            await load(true);
          }}
        />
      )}
    </div>
  );
};
