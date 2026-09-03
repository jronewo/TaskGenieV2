import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles } from "lucide-react";
import { EntitlementDto } from "../services/billingApi";

interface QuotaExceededModalProps {
  entitlement: EntitlementDto;
  onClose: () => void;
  onUpgrade: () => void;
}

/**
 * Reached right when project creation is blocked — either by the "+ New Project" button itself
 * (quota already known to be exhausted) or by the create form's submit — instead of a generic
 * inline error banner reusing whatever sentence the 403 happened to carry. The numbers come from
 * the caller's own entitlement, never hardcoded, since the free-plan limit is admin-configurable.
 */
export const QuotaExceededModal = ({ entitlement, onClose, onUpgrade }: QuotaExceededModalProps) => {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Project limit reached"
      >
        <motion.div
          className="w-full max-w-sm rounded-xl bg-white p-5"
          initial={{ scale: 0.96, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 8 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">You've reached your project limit</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
              <X size={16} aria-hidden />
            </button>
          </div>

          <p className="text-xs leading-relaxed text-gray-600">
            The <span className="font-semibold">{entitlement.planName}</span> plan allows{" "}
            {entitlement.projectLimit} project{entitlement.projectLimit === 1 ? "" : "s"} —{" "}
            {entitlement.projectUsage}/{entitlement.projectLimit} already in use. Upgrade your plan,
            or delete a project until you're under the limit, then create again.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onUpgrade}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0D1757]"
            >
              <Sparkles size={12} aria-hidden />
              Upgrade plan
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
