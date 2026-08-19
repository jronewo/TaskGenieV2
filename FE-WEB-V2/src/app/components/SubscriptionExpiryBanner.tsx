import React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { EntitlementDto } from "../services/billingApi";

/**
 * Warns before a plan lapses, and says so plainly once it has.
 *
 * Shown from the day the backend starts sending its reminder, so the banner and the notification
 * never disagree about whether the plan is "about to expire". Renders nothing on a free plan or
 * while the period end is comfortably away — a banner that is always there is wallpaper.
 */

/** Matches SubscriptionLifecycleOptions.WarnDaysBefore on the server. */
const WARN_DAYS = 7;

export const SubscriptionExpiryBanner = ({
  entitlement,
  onRenew,
}: {
  entitlement: EntitlementDto | null;
  onRenew?: () => void;
}) => {
  if (!entitlement) return null;

  const days = entitlement.daysUntilExpiry;
  const hasLapsed = !entitlement.isPremium && entitlement.currentPeriodEnd != null;

  // A free account with no period end has nothing to warn about.
  if (!hasLapsed && (days == null || days > WARN_DAYS)) return null;

  const endsOn = entitlement.currentPeriodEnd
    ? new Date(entitlement.currentPeriodEnd).toLocaleDateString("vi-VN")
    : null;

  const expired = hasLapsed || days === 0;

  return (
    <div
      role="alert"
      className={`mb-4 flex flex-wrap items-start gap-3 rounded-lg border p-3 ${
        expired
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
      }`}
    >
      <span className="mt-0.5 shrink-0">
        {expired ? <AlertTriangle size={16} aria-hidden /> : <Clock size={16} aria-hidden />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {expired
            ? `Gói ${entitlement.planName} đã hết hạn`
            : `Gói ${entitlement.planName} còn ${days} ngày`}
        </p>
        {/* Says what is actually lost. "Your plan expired" alone gives nobody a reason to act. */}
        <p className="mt-0.5 text-xs">
          {expired
            ? "Tài khoản đã trở về gói miễn phí: tối đa 2 dự án, không dùng được trợ lý AI, và dự án tổ chức đã bị ẩn. Gia hạn để dùng lại."
            : `Hết hạn ngày ${endsOn}. Sau đó tài khoản trở về gói miễn phí: tối đa 2 dự án, không có trợ lý AI, dự án tổ chức sẽ bị ẩn.`}
        </p>
      </div>

      {onRenew && (
        <button
          type="button"
          onClick={onRenew}
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold text-white ${
            expired ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
          }`}
        >
          {expired ? "Gia hạn" : "Gia hạn ngay"}
        </button>
      )}
    </div>
  );
};
