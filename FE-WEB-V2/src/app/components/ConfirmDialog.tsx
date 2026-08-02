import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  /** Optional detail line. Say what will actually happen, not "are you sure". */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions get a red confirm button. */
  tone?: "danger" | "default";
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * Replaces `window.confirm`.
 *
 * The native dialog renders in the browser's own chrome — it ignores the app's dark theme, says
 * "localhost:5173 says", and cannot be styled or tested the way the rest of the console is.
 */
export const useConfirm = (): Confirm => {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>.");
  return confirm;
};

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  // The promise is resolved by whichever button is pressed, so it has to outlive the render.
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((next) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = (ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setOptions(null);
  };

  const danger = options?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <AnimatePresence>
        {options && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Dismissing by clicking away is the same answer as Cancel.
            onClick={() => settle(false)}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-label={options.title}
              className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5"
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Escape") settle(false);
                if (e.key === "Enter") settle(true);
              }}
            >
              <div className="flex gap-3">
                {danger && (
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50">
                    <AlertTriangle size={15} className="text-red-600" aria-hidden />
                  </span>
                )}
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900">{options.title}</h2>
                  {options.description && (
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">{options.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => settle(false)}
                  className="rounded-md border border-gray-200 px-3.5 py-2 text-[11px] text-gray-700 hover:bg-gray-50"
                >
                  {options.cancelLabel ?? "Hủy"}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => settle(true)}
                  className={`rounded-md px-3.5 py-2 text-[11px] font-medium text-white ${
                    danger ? "bg-red-600 hover:bg-red-700" : "bg-[#1A237E] hover:bg-[#0D1757]"
                  }`}
                >
                  {options.confirmLabel ?? "Xác nhận"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};
