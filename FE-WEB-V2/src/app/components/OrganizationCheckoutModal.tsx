import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Building2, ExternalLink, Loader2, X, ShieldCheck } from "lucide-react";
import { organizationApi } from "../services/organizationApi";
import { billingApi, PlanDto, formatMoney } from "../services/billingApi";
import { ApiError } from "../services/apiClient";

/**
 * Buying an organization plan when there is no organization yet.
 *
 * Checkout needs an organization id, and an organization is only useful once it is paid for — so
 * the two are done in one flow: name the company, then pay for it without leaving the page. The
 * company is created first because that is what the checkout session is attached to; an abandoned
 * payment leaves it inert (zero project quota, hidden from every list) rather than half-paid, and
 * the next attempt reuses it instead of creating a second one.
 *
 * The payment page is embedded rather than redirected to, but the "open in a new tab" link is
 * always visible: PayOS may refuse to be framed, and a blank iframe with no way out is worse than
 * no iframe at all.
 */

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    return `Request failed (${err.status}).`;
  }
  return "Không tạo được phiên thanh toán. Vui lòng thử lại.";
}

type Step = "form" | "pay";

export const OrganizationCheckoutModal = ({
  plan,
  existingOrganizationId,
  onClose,
  onPaid,
}: {
  plan: PlanDto;
  /** Set when the buyer already owns a company — the naming step is skipped entirely. */
  existingOrganizationId: number | null;
  onClose: () => void;
  /** Called when the buyer says they are done, so the caller can re-read billing state. */
  onPaid: () => void;
}) => {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Whether the embedded payment page actually appeared.
   *
   * A cross-origin frame cannot be inspected, so "did it work" is answered by whether it loaded at
   * all within a few seconds. If PayOS refuses to be framed the user gets a button out rather than
   * a blank rectangle with no explanation.
   */
  const [frameState, setFrameState] = useState<"loading" | "ready" | "blocked">("loading");
  const frameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (step !== "pay" || frameState !== "loading") return;
    frameTimer.current = setTimeout(() => setFrameState("blocked"), 6000);
    return () => {
      if (frameTimer.current) clearTimeout(frameTimer.current);
    };
  }, [step, frameState]);

  const startCheckout = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Reuse the company they already have; only create one when there is none.
      const organizationId =
        existingOrganizationId ??
        (await organizationApi.create(name.trim(), description.trim() || null)).organizationId;

      const result = await billingApi.checkout(plan.planId, organizationId, null);
      if (!result.redirectUrl) {
        // The simulated gateway returns no URL; there is nothing to embed, so hand back to the
        // page, which shows its own Simulate panel.
        onPaid();
        return;
      }
      setCheckoutUrl(result.redirectUrl);
      setStep("pay");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = existingOrganizationId != null || name.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Mua gói ${plan.name}`}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Building2 size={15} className="text-[#1A237E]" aria-hidden />
              {step === "form" ? "Thông tin công ty" : "Thanh toán"}
            </h3>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Gói {plan.name} · {formatMoney(plan.priceMinor, plan.currency)}
              {plan.billingInterval !== "NONE" && ` / ${plan.billingInterval === "YEARLY" ? "năm" : "tháng"}`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-gray-400 hover:text-gray-700">
            <X size={16} aria-hidden />
          </button>
        </header>

        {error && (
          <p role="alert" className="mx-5 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        {step === "form" ? (
          <div className="px-5 py-4">
            {existingOrganizationId != null ? (
              <p className="text-xs text-gray-600">
                Bạn đã có công ty. Bấm tiếp tục để thanh toán gói cho công ty này — không tạo thêm công ty mới.
              </p>
            ) : (
              <>
                <div className="mb-3">
                  <label htmlFor="org-name" className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Tên công ty
                  </label>
                  <input
                    id="org-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Công ty TNHH ABC"
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="org-desc" className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Mô tả <span className="font-normal normal-case text-gray-400">(không bắt buộc)</span>
                  </label>
                  <textarea
                    id="org-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Công ty được tạo trước khi thanh toán để gắn gói vào. Nếu bạn huỷ giữa chừng, công ty
                  vẫn ở đó nhưng chưa dùng được cho tới khi thanh toán xong.
                </p>
              </>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button" onClick={onClose} disabled={busy}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                type="button" onClick={startCheckout} disabled={!canSubmit || busy}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1A237E] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy && <Loader2 size={13} className="animate-spin" aria-hidden />}
                Xác nhận và thanh toán
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-5 py-2.5">
              <p className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <ShieldCheck size={12} className="text-emerald-600" aria-hidden />
                Quét mã QR trong khung bên dưới để thanh toán.
              </p>
              {/* Always visible: PayOS may refuse to be framed, and a blank iframe with no way out
                  is worse than no iframe at all. */}
              <a
                href={checkoutUrl ?? "#"} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1A237E] hover:underline"
              >
                <ExternalLink size={11} aria-hidden /> Không hiện được? Mở trang thanh toán
              </a>
            </div>

            {frameState === "blocked" ? (
              <div className="flex h-[520px] flex-col items-center justify-center gap-3 px-6 text-center">
                <AlertTriangle size={28} className="text-amber-500" aria-hidden />
                <p className="text-sm font-medium text-gray-800">Không hiển thị được trang thanh toán ở đây.</p>
                <p className="max-w-sm text-xs text-gray-500">
                  PayOS không cho nhúng trang thanh toán vào trang khác. Bấm nút bên dưới để mở trang
                  thanh toán và quét mã QR ở đó, rồi quay lại đây.
                </p>
                <a
                  href={checkoutUrl ?? "#"} target="_blank" rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[#1A237E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0D1757]"
                >
                  <ExternalLink size={14} aria-hidden /> Mở trang thanh toán PayOS
                </a>
              </div>
            ) : (
              <div className="relative">
                {frameState === "loading" && (
                  <p className="absolute inset-x-0 top-1/2 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Loader2 size={14} className="animate-spin" aria-hidden /> Đang mở trang thanh toán…
                  </p>
                )}
                <iframe
                  src={checkoutUrl ?? undefined}
                  title="Trang thanh toán PayOS"
                  onLoad={() => setFrameState("ready")}
                  className="h-[520px] w-full border-0"
                />
              </div>
            )}

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3">
              {/* The subscription only ever activates from the PayOS webhook, never from this
                  button — it just tells the page to re-read what the server already decided. */}
              <p className="text-[11px] text-gray-500">
                Gói được kích hoạt khi PayOS xác nhận, có thể mất vài giây sau khi bạn trả xong.
              </p>
              <button
                type="button" onClick={onPaid}
                className="rounded-lg bg-[#1A237E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D1757]"
              >
                Tôi đã thanh toán xong
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};
