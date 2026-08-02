import React from "react";
import { ShieldAlert, Clock, Mail } from "lucide-react";

export interface BanDetails {
  message?: string | null;
  bannedUntil?: string | null;
  isPermanent?: boolean;
  reason?: string | null;
}

/** Days remaining, rounded up — "0 days left" on a ban that is still in force reads as a bug. */
function daysLeft(until: string): number {
  return Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / 86_400_000));
}

interface Props {
  details: BanDetails;
  onBack: () => void;
}

/**
 * Shown instead of a login error when the account is suspended.
 *
 * A flat "wrong credentials" would send someone round in circles retyping a password that is fine.
 * This says what happened, for how long, and what to do next — which is the only useful thing the
 * page can offer, since they cannot resolve it themselves.
 */
export const AccountBannedNotice = ({ details, onBack }: Props) => {
  const until = details.bannedUntil ? new Date(details.bannedUntil) : null;
  const permanent = details.isPermanent || !until;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <ShieldAlert size={22} className="text-red-600" aria-hidden />
        </div>

        <h1 className="text-base font-semibold text-gray-900">
          {permanent ? "Tài khoản đã bị khóa vĩnh viễn" : "Tài khoản đang bị tạm khóa"}
        </h1>

        {!permanent && until && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-amber-800">
              <Clock size={14} aria-hidden />
              Còn {daysLeft(details.bannedUntil!)} ngày
            </p>
            <p className="mt-0.5 text-[11px] text-amber-700">
              Mở khóa vào {until.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
            </p>
          </div>
        )}

        {details.reason && (
          <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Lý do</p>
            <p className="mt-0.5 text-xs text-gray-700">{details.reason}</p>
          </div>
        )}

        <p className="mt-3 text-xs leading-relaxed text-gray-600">
          {permanent
            ? "Bạn không thể đăng nhập lại bằng tài khoản này."
            : "Bạn sẽ đăng nhập lại được ngay khi hết thời hạn — không cần thao tác gì thêm."}
          {" "}Dữ liệu và công việc của bạn vẫn được giữ nguyên.
        </p>

        <a
          href="mailto:support@taskgenie.local"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#1A237E] hover:underline"
        >
          <Mail size={12} aria-hidden /> Liên hệ quản trị viên
        </a>

        <button
          type="button"
          onClick={onBack}
          className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Quay lại đăng nhập
        </button>
      </div>
    </div>
  );
};
