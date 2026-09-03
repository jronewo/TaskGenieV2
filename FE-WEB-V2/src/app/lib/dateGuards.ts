/**
 * Shared date-picker guard: every deadline/start-date input in the app should refuse a past date,
 * both as the native `min` attribute (blocks it in the picker UI) and as a submit-time check (a
 * pasted value, or a browser that ignores `min`, still gets caught before the request goes out).
 *
 * Backend note: only project *create* validates this server-side today (`CreateProjectCommandValidator`).
 * Project update and every task date field currently accept a past date via the API — so these guards
 * are the only thing stopping a bad write for those fields, not just a UX nicety.
 */

/** Today's date as `YYYY-MM-DD`, in the browser's local timezone — matches what a `type="date"`
 *  input's `value` looks like, so it can be compared or used as `min` directly. */
export const todayIso = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** True when `value` (a `YYYY-MM-DD` string, possibly empty) is a date strictly before today. */
export const isPastDate = (value: string | null | undefined): boolean =>
  Boolean(value && value < todayIso());
