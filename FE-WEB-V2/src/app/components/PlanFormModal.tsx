import React, { useState } from "react";
import { Loader2, X } from "lucide-react";
import { AdminPlanDto, AdminPlanPayload } from "../services/adminApi";
import { PlanAudience } from "../services/billingApi";

/**
 * Create or edit a plan.
 *
 * Editing sends the whole form, not a diff: a null limit has to mean "unlimited", and a payload
 * where null also meant "leave unchanged" could never express it — which is why the Unlimited
 * checkbox previously had nothing to submit.
 *
 * Code, audience and billing interval are fixed once a plan exists: subscriptions reference the
 * plan, and changing what it *is* underneath them would silently rewrite what people bought.
 */

const AUDIENCES: { value: PlanAudience; label: string }[] = [
  { value: "PERSONAL", label: "Cá nhân" },
  { value: "ORGANIZATION", label: "Tổ chức" },
];

const INTERVALS = [
  { value: "NONE", label: "Không định kỳ (gói miễn phí)" },
  { value: "MONTHLY", label: "Hàng tháng" },
  { value: "YEARLY", label: "Hàng năm" },
];

interface FormState {
  code: string;
  name: string;
  audience: PlanAudience;
  billingInterval: string;
  price: string;
  unlimitedProjects: boolean;
  projectLimit: string;
  memberLimit: string;
  sortOrder: string;
  aiChatbotEnabled: boolean;
  customDuration: boolean;
  durationDays: string;
}

const fromPlan = (plan: AdminPlanDto | null): FormState => ({
  code: plan?.code ?? "",
  name: plan?.name ?? "",
  audience: plan?.audience ?? "PERSONAL",
  billingInterval: plan?.billingInterval ?? "MONTHLY",
  price: String(plan?.priceMinor ?? 0),
  unlimitedProjects: plan ? plan.projectLimit == null : false,
  projectLimit: plan?.projectLimit != null ? String(plan.projectLimit) : "2",
  memberLimit: plan?.memberLimit != null ? String(plan.memberLimit) : "",
  sortOrder: String(plan?.sortOrder ?? 1),
  aiChatbotEnabled: plan?.aiChatbotEnabled ?? false,
  customDuration: plan?.durationDays != null,
  durationDays: plan?.durationDays != null ? String(plan.durationDays) : "30",
});

export const PlanFormModal = ({
  plan,
  busy,
  onCancel,
  onSubmit,
}: {
  /** Null creates a new plan. */
  plan: AdminPlanDto | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (
    payload: AdminPlanPayload & { code: string; audience: PlanAudience; billingInterval: string }
  ) => void;
}) => {
  const [form, setForm] = useState<FormState>(() => fromPlan(plan));
  const editing = plan != null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const priceNumber = Number(form.price);
  const projectLimitNumber = Number(form.projectLimit);
  const durationNumber = Number(form.durationDays);

  const invalid =
    form.name.trim() === "" ||
    (!editing && form.code.trim() === "") ||
    !Number.isInteger(priceNumber) ||
    priceNumber < 0 ||
    (!form.unlimitedProjects && (!Number.isInteger(projectLimitNumber) || projectLimitNumber < 0)) ||
    (form.customDuration && (!Number.isInteger(durationNumber) || durationNumber < 1));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (invalid || busy) return;

    onSubmit({
      code: form.code.trim().toUpperCase(),
      audience: form.audience,
      billingInterval: form.billingInterval,
      name: form.name.trim(),
      priceMinor: priceNumber,
      projectLimit: form.unlimitedProjects ? null : projectLimitNumber,
      memberLimit: form.memberLimit.trim() === "" ? null : Number(form.memberLimit),
      sortOrder: Number(form.sortOrder) || 0,
      aiChatbotEnabled: form.aiChatbotEnabled,
      durationDays: form.customDuration ? durationNumber : null,
    });
  };

  const field = "w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-900";
  const label = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Sửa gói" : "Tạo gói mới"}
    >
      <form
        onSubmit={submit}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{editing ? "Sửa gói" : "Tạo gói mới"}</h3>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Giá tính bằng VND (đồng nguyên) — PayOS chỉ thanh toán VND.
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Đóng" className="text-gray-400 hover:text-gray-700">
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="plan-name">Tên gói</label>
            <input
              id="plan-name" className={field} value={form.name}
              onChange={(e) => set("name", e.target.value)} placeholder="Pro"
            />
          </div>

          <div>
            <label className={label} htmlFor="plan-code">Mã gói</label>
            <input
              id="plan-code" className={`${field} font-mono disabled:bg-gray-50 disabled:text-gray-400`}
              value={form.code} disabled={editing}
              onChange={(e) => set("code", e.target.value)} placeholder="PRO_PERSONAL"
            />
            {editing && <p className="mt-1 text-[10px] text-gray-400">Không đổi được — các gói đã bán đang tham chiếu mã này.</p>}
          </div>

          <div>
            <label className={label} htmlFor="plan-price">Giá (VND)</label>
            <input
              id="plan-price" className={field} type="number" min={0} value={form.price}
              onChange={(e) => set("price", e.target.value)}
            />
            <p className="mt-1 text-[10px] text-gray-400">Để 0 nghĩa là gói miễn phí.</p>
          </div>

          <div>
            <label className={label} htmlFor="plan-audience">Đối tượng</label>
            <select
              id="plan-audience" className={`${field} disabled:bg-gray-50 disabled:text-gray-400`}
              value={form.audience} disabled={editing}
              onChange={(e) => set("audience", e.target.value as PlanAudience)}
            >
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div>
            <label className={label} htmlFor="plan-interval">Chu kỳ</label>
            <select
              id="plan-interval" className={`${field} disabled:bg-gray-50 disabled:text-gray-400`}
              value={form.billingInterval} disabled={editing}
              onChange={(e) => set("billingInterval", e.target.value)}
            >
              {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </div>

          {/* Project limit + the unlimited escape hatch */}
          <div className="sm:col-span-2 rounded-lg border border-gray-200 p-3">
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox" checked={form.unlimitedProjects}
                onChange={(e) => set("unlimitedProjects", e.target.checked)}
              />
              Không giới hạn số dự án
            </label>
            {!form.unlimitedProjects && (
              <div className="mt-2">
                <label className={label} htmlFor="plan-projects">Số dự án tối đa</label>
                <input
                  id="plan-projects" className={field} type="number" min={0} value={form.projectLimit}
                  onChange={(e) => set("projectLimit", e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <label className={label} htmlFor="plan-members">Thành viên tối đa</label>
            <input
              id="plan-members" className={field} type="number" min={0} value={form.memberLimit}
              onChange={(e) => set("memberLimit", e.target.value)} placeholder="Bỏ trống = không giới hạn"
            />
          </div>

          <div>
            <label className={label} htmlFor="plan-sort">Thứ tự hiển thị</label>
            <input
              id="plan-sort" className={field} type="number" value={form.sortOrder}
              onChange={(e) => set("sortOrder", e.target.value)}
            />
          </div>

          {/* AI chatbot is its own product decision, not a side effect of the price. */}
          <div className="sm:col-span-2 rounded-lg border border-gray-200 p-3">
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox" checked={form.aiChatbotEnabled}
                onChange={(e) => set("aiChatbotEnabled", e.target.checked)}
              />
              Bao gồm trợ lý AI chatbot
            </label>
            <p className="mt-1 text-[10px] text-gray-400">
              Người dùng gói không bật cờ này sẽ không thấy nút chatbot, và API cũng từ chối.
            </p>
          </div>

          <div className="sm:col-span-2 rounded-lg border border-gray-200 p-3">
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox" checked={form.customDuration}
                onChange={(e) => set("customDuration", e.target.checked)}
              />
              Đặt thời hạn riêng
            </label>
            {form.customDuration ? (
              <div className="mt-2">
                <label className={label} htmlFor="plan-duration">Thời hạn (ngày)</label>
                <input
                  id="plan-duration" className={field} type="number" min={1} value={form.durationDays}
                  onChange={(e) => set("durationDays", e.target.value)}
                />
              </div>
            ) : (
              <p className="mt-1 text-[10px] text-gray-400">
                Theo chu kỳ: {form.billingInterval === "YEARLY" ? "365" : "30"} ngày.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button" onClick={onCancel} disabled={busy}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="submit" disabled={invalid || busy}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1A237E] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" aria-hidden />}
            {editing ? "Lưu thay đổi" : "Tạo gói"}
          </button>
        </div>
      </form>
    </div>
  );
};
