import React from "react";
import { toast } from "sonner";
import { Check, Loader2, Mail, X } from "lucide-react";
import { useAuth } from "../../../core/auth/AuthContext";
import { ApiError } from "../../../core/api/client";
import { useMyInvitations, useUpdateInvitationStatus } from "../hooks/useInvitations";

const statusBadge = (status: string | null) => {
  if (status === "Accepted") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Rejected") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

export default function InvitationsPage() {
  const { user } = useAuth();
  const { data: invitations, isLoading } = useMyInvitations(user?.email ?? null);
  const updateStatus = useUpdateInvitationStatus(user?.email ?? null);

  const respond = async (id: number, status: "Accepted" | "Rejected") => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(status === "Accepted" ? "Đã tham gia team." : "Đã từ chối lời mời.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật lời mời thất bại.");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
          <Mail size={12} /> Invitations
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Team invitations sent to {user?.email}</h2>
        <p className="mt-1 text-sm text-slate-500">Accept to join the team, or reject to decline.</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} /> Loading invitations...
        </div>
      )}

      <div className="space-y-2.5">
        {(invitations ?? []).map((inv) => (
          <div key={inv.invitationId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{inv.teamName ?? `Team #${inv.teamId}`}</div>
              <div className="text-xs text-slate-500">Invited: {inv.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge(inv.status)}`}>{inv.status}</span>
              {inv.status === "Pending" && (
                <>
                  <button
                    onClick={() => respond(inv.invitationId, "Accepted")}
                    disabled={updateStatus.isPending}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Check size={12} /> Accept
                  </button>
                  <button
                    onClick={() => respond(inv.invitationId, "Rejected")}
                    disabled={updateStatus.isPending}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                  >
                    <X size={12} /> Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {!isLoading && (invitations ?? []).length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No invitations for you right now.</div>
        )}
      </div>
    </div>
  );
}
