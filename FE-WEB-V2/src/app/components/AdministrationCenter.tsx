import React, { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Users, Building2, BarChart2, Search, Power, PowerOff, Shield,
  CreditCard, Receipt, Loader2, Layers, AlertTriangle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  adminApi,
  AdminOrganizationDto,
  AdminPaymentDto,
  AdminPlanDto,
  AdminSubscriptionDto,
  AdminUserDto,
  PlatformStatsDto,
  SubscriptionAnalyticsDto,
} from "../services/adminApi";
import { formatMoney } from "../services/billingApi";
import { ApiError } from "../services/apiClient";
import { useAuth } from "../auth/AuthContext";

type AdminTab = "stats" | "users" | "organizations" | "billing" | "plans";

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: "stats", label: "Overview", icon: BarChart2 },
  { id: "users", label: "Users", icon: Users },
  { id: "organizations", label: "Organizations", icon: Building2 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "plans", label: "Plans", icon: Layers },
];

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 403) return "You don't have permission to perform this action.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

const PAGE_SIZE = 10;

interface AdministrationCenterProps {
  /** Driven by the admin sidebar; the page keeps its own tabs only when nothing is passed. */
  section?: AdminTab;
}

export const AdministrationCenter = ({ section }: AdministrationCenterProps = {}) => {
  const { user } = useAuth();
  const [ownTab, setOwnTab] = useState<AdminTab>("stats");
  const tab = section ?? ownTab;
  const setTab = setOwnTab;

  const [stats, setStats] = useState<PlatformStatsDto | null>(null);
  const [analytics, setAnalytics] = useState<SubscriptionAnalyticsDto | null>(null);
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [banTarget, setBanTarget] = useState<AdminUserDto | null>(null);
  const [banDays, setBanDays] = useState<string>("7");
  const [banReason, setBanReason] = useState("");
  const [userTotal, setUserTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [organizations, setOrganizations] = useState<AdminOrganizationDto[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionDto[]>([]);
  const [payments, setPayments] = useState<AdminPaymentDto[]>([]);
  const [plans, setPlans] = useState<AdminPlanDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "stats") {
        const [s, a] = await Promise.all([adminApi.platformStats(), adminApi.subscriptionAnalytics()]);
        setStats(s);
        setAnalytics(a);
      } else if (tab === "users") {
        const result = await adminApi.users(search, page, PAGE_SIZE);
        setUsers(result.items);
        setUserTotal(result.total);
      } else if (tab === "organizations") {
        setOrganizations(await adminApi.organizations());
      } else if (tab === "billing") {
        const [subs, pays] = await Promise.all([adminApi.subscriptions(), adminApi.payments()]);
        setSubscriptions(subs);
        setPayments(pays);
      } else if (tab === "plans") {
        setPlans(await adminApi.plans());
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmBan = () => {
    if (!banTarget) return;
    const days = banDays === "permanent" ? null : Number(banDays);
    const target = banTarget;

    void run(
      `ban-${target.userId}`,
      async () => {
        await adminApi.banUser(target.userId, days, banReason.trim() || null);
        setBanTarget(null);
        setBanReason("");
        await loadUsers();
      },
      days === null ? `${target.name} đã bị khóa vĩnh viễn.` : `${target.name} đã bị khóa ${days} ngày.`
    );
  };

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

  const toggleUserStatus = (target: AdminUserDto) => {
    const next = target.status === 1 ? 0 : 1;
    // Suspending asks for how long, so a ban is a deliberate decision with an end date rather than
    // an indefinite flag nobody remembers to clear.
    if (next === 0) {
      setBanTarget(target);
      return;
    }
    void run(
      `status-${target.userId}`,
      async () => {
        await adminApi.setUserStatus(target.userId, next);
        await load();
      },
      next === 1 ? "User activated." : "User deactivated."
    );
  };

  const changeUserRole = (target: AdminUserDto, role: string) =>
    run(
      `role-${target.userId}`,
      async () => {
        await adminApi.setUserRole(target.userId, role);
        await load();
      },
      "Role updated."
    );

  const togglePlanActive = (plan: AdminPlanDto) =>
    run(
      `plan-${plan.planId}`,
      async () => {
        await adminApi.setPlanActive(plan.planId, !plan.isActive);
        await load();
      },
      plan.isActive ? "Plan archived." : "Plan restored."
    );

  const totalPages = Math.max(1, Math.ceil(userTotal / PAGE_SIZE));

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Shield size={16} className="text-[#1A237E]" aria-hidden />
          Administration
        </h1>
        <p className="text-[10px] text-gray-500 mt-0.5">Platform-wide data — every figure below comes from the API.</p>
      </header>

      {/* The sidebar owns navigation for an administrator; these tabs are the fallback. */}
      {!section && (
      <nav className="flex gap-1 border-b border-gray-200" role="tablist" aria-label="Administration sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            type="button"
            onClick={() => {
              setTab(id);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px ${
              tab === id ? "border-[#1A237E] text-[#1A237E]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={13} aria-hidden />
            {label}
          </button>
        ))}
      </nav>
      )}

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-xs text-gray-500">
          <Loader2 size={14} className="animate-spin" aria-hidden /> Loading…
        </div>
      ) : (
        <>
          {tab === "stats" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Users", value: stats?.users ?? 0 },
                  { label: "Organizations", value: stats?.organizations ?? 0 },
                  { label: "Projects", value: stats?.projects ?? 0 },
                  { label: "Tasks", value: stats?.tasks ?? 0 },
                  { label: "Active subs", value: analytics?.activeSubscriptions ?? 0 },
                ].map((card) => (
                  <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">{card.label}</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Revenue</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {/* The plan catalog is VND-only (PayOS settles VND exclusively). */}
                    {formatMoney(analytics?.totalRevenueMinor ?? 0, "VND")}
                  </p>
                  {(analytics?.testRevenueMinor ?? 0) > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
                      <AlertTriangle size={11} aria-hidden />
                      {formatMoney(analytics!.testRevenueMinor, "VND")} from the simulated gateway — excluded above.
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-wide text-gray-500">Payments by month</p>
                  {analytics && analytics.byMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={analytics.byMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1A237E" name="Payments" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="py-8 text-center text-xs text-gray-400">No payment data yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {tab === "users" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" aria-hidden />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search name or email"
                    aria-label="Search users"
                    className="w-full rounded-md border border-gray-200 py-2 pl-8 pr-3 text-xs"
                  />
                </div>
                <span className="text-[10px] text-gray-500">{userTotal} user(s)</span>
              </div>

              {users.length === 0 ? (
                <p className="py-10 text-center text-xs text-gray-400">No users match this search.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map((u) => (
                        <tr key={u.userId}>
                          <td className="px-3 py-2 text-gray-900">{u.name}</td>
                          <td className="px-3 py-2 text-gray-500">{u.email}</td>
                          <td className="px-3 py-2">
                            <select
                              value={u.role}
                              onChange={(e) => changeUserRole(u, e.target.value)}
                              disabled={busy === `role-${u.userId}`}
                              aria-label={`Role for ${u.name}`}
                              className="rounded border border-gray-200 px-1.5 py-1 text-[11px] disabled:opacity-50"
                            >
                              <option value="NORMAL_USER">Normal user</option>
                              <option value="PLATFORM_ADMIN">Platform admin</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] ${
                                u.status === 1 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {u.status === 1 ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => toggleUserStatus(u)}
                              disabled={busy === `status-${u.userId}` || u.userId === user?.userId}
                              title={u.userId === user?.userId ? "You cannot change your own status" : undefined}
                              aria-label={u.status === 1 ? `Deactivate ${u.name}` : `Activate ${u.name}`}
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                            >
                              {u.status === 1 ? <PowerOff size={13} aria-hidden /> : <Power size={13} aria-hidden />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-gray-500">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "organizations" && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              {organizations.length === 0 ? (
                <p className="py-10 text-center text-xs text-gray-400">No organizations registered yet.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {organizations.map((o) => (
                      <tr key={o.organizationId}>
                        <td className="px-3 py-2 text-gray-900">{o.name}</td>
                        <td className="px-3 py-2 text-gray-500">{o.ownerName ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{o.createdAt?.slice(0, 10) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "billing" && (
            <div className="space-y-4">
              <section>
                <h2 className="mb-2 text-xs font-semibold text-gray-700">Subscriptions ({subscriptions.length})</h2>
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Plan</th>
                        <th className="px-3 py-2">Owner</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Period end</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {subscriptions.map((s) => (
                        <tr key={s.subscriptionId}>
                          <td className="px-3 py-2">{s.subscriptionId}</td>
                          <td className="px-3 py-2">{s.planCode ?? "—"}</td>
                          <td className="px-3 py-2 text-gray-500">
                            {s.ownerType === "PERSONAL" ? `User ${s.userId}` : `Org ${s.organizationId}`}
                          </td>
                          <td className="px-3 py-2">{s.status}</td>
                          <td className="px-3 py-2 text-gray-500">{s.currentPeriodEnd?.slice(0, 10) ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {subscriptions.length === 0 && <p className="py-8 text-center text-xs text-gray-400">No subscriptions.</p>}
                </div>
              </section>

              <section>
                <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <Receipt size={13} aria-hidden /> Payments ({payments.length})
                </h2>
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Plan</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map((p) => (
                        <tr key={p.paymentTransactionId}>
                          <td className="px-3 py-2">{p.paymentTransactionId}</td>
                          <td className="px-3 py-2">{p.planCode ?? "—"}</td>
                          <td className="px-3 py-2">{formatMoney(p.amountMinor, p.currency)}</td>
                          <td className="px-3 py-2">{p.status}</td>
                          <td className="px-3 py-2">
                            {p.isTest ? (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">SIMULATED</span>
                            ) : (
                              <span className="text-gray-500">{p.provider}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {payments.length === 0 && <p className="py-8 text-center text-xs text-gray-400">No payments.</p>}
                </div>
              </section>
            </div>
          )}

          {tab === "plans" && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Audience</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Projects</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {plans.map((p) => (
                    <tr key={p.planId}>
                      <td className="px-3 py-2 font-mono text-[11px] text-gray-900">{p.code}</td>
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2 text-gray-500">{p.audience}</td>
                      <td className="px-3 py-2">{p.priceMinor === 0 ? "Free" : formatMoney(p.priceMinor, p.currency)}</td>
                      <td className="px-3 py-2">{p.projectLimit ?? "Unlimited"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] ${
                            p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {p.isActive ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => togglePlanActive(p)}
                          disabled={busy === `plan-${p.planId}`}
                          className="rounded border border-gray-200 px-2 py-1 text-[11px] hover:bg-gray-50 disabled:opacity-40"
                        >
                          {p.isActive ? "Archive" : "Restore"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

    {banTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Khóa tài khoản"
        >
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">Khóa tài khoản</h3>
            <p className="mt-1 text-[11px] text-gray-500">
              {banTarget.name} ({banTarget.email}) sẽ bị đăng xuất khỏi mọi thiết bị ngay lập tức.
              Dữ liệu của họ được giữ nguyên — đây là khóa, không phải xoá.
            </p>

            <label htmlFor="ban-duration" className="mt-3 block text-[11px] font-medium text-gray-700">
              Thời hạn
            </label>
            <select
              id="ban-duration"
              value={banDays}
              onChange={(e) => setBanDays(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-2.5 py-2 text-sm"
            >
              <option value="1">1 ngày</option>
              <option value="7">7 ngày</option>
              <option value="30">30 ngày</option>
              <option value="90">90 ngày</option>
              <option value="permanent">Vĩnh viễn</option>
            </select>

            <label htmlFor="ban-reason" className="mt-3 block text-[11px] font-medium text-gray-700">
              Lý do (tuỳ chọn)
            </label>
            <input
              id="ban-reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              maxLength={300}
              placeholder="Vi phạm điều khoản…"
              className="mt-1 w-full rounded-md border border-gray-200 px-2.5 py-2 text-sm"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBanTarget(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={confirmBan}
                disabled={busy === `ban-${banTarget.userId}`}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy === `ban-${banTarget.userId}` && <Loader2 size={14} className="animate-spin" aria-hidden />}
                Khóa tài khoản
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};