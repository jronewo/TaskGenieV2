import React, { useEffect, useState } from "react";
import { Monitor, Moon, Sun, Languages, User, KeyRound, Bell, LogOut, Loader2, Check, Palette } from "lucide-react";
import { usePreferences, ThemeMode, Language } from "../settings/PreferencesContext";
import { useAuth } from "../auth/AuthContext";
import { billingApi, EntitlementDto } from "../services/billingApi";
import { userApi } from "../services/userApi";
import { ApiError } from "../services/apiClient";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message) return err.message;
    if (err.status === 400) return "Check the values you entered.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}

const Panel = ({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) => (
  <section className="rounded-lg border border-gray-200 bg-white">
    <header className="border-b border-gray-100 px-4 py-2.5">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
        <Icon size={13} className="text-[#1A237E]" /> {title}
      </h2>
      {subtitle && <p className="mt-0.5 text-[10px] text-gray-500">{subtitle}</p>}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

const THEMES: { id: ThemeMode; icon: typeof Sun; key: string }[] = [
  { id: "light", icon: Sun, key: "settings.theme.light" },
  { id: "dark", icon: Moon, key: "settings.theme.dark" },
  { id: "system", icon: Monitor, key: "settings.theme.system" },
];

const LANGUAGES: { id: Language; label: string }[] = [
  { id: "en", label: "English" },
  { id: "vi", label: "Tiếng Việt" },
];

interface Props {
  unreadCount?: number;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
  onLogout?: () => void;
}

/**
 * Every control here does something real: theme and language take effect immediately and persist
 * to this device, the password change hits the API, and the session actions use the auth flow.
 * The previous version had AI/notification toggles wired to nothing — they were removed rather
 * than left looking functional.
 */
export const SettingsPage = ({ unreadCount, onOpenProfile, onOpenNotifications, onLogout }: Props) => {
  // Read once on mount; a failure leaves the row on the free default rather than blocking settings.
  const [entitlement, setEntitlement] = useState<EntitlementDto | null | undefined>(undefined);

  useEffect(() => {
    void billingApi
      .entitlement()
      .then(setEntitlement)
      .catch(() => setEntitlement(null));
  }, []);

  const { theme, setTheme, resolvedTheme, language, setLanguage, t } = usePreferences();
  const { user } = useAuth();

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mismatch = pw.next.length > 0 && pw.confirm.length > 0 && pw.next !== pw.confirm;
  const canSubmit = pw.current.length > 0 && pw.next.length >= 6 && !mismatch && !busy;

  const changePassword = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await userApi.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      setNotice("Password changed.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <header className="mb-4">
        <h1 className="text-sm font-semibold text-gray-900">{t("settings.title")}</h1>
        <p className="mt-0.5 text-[10px] text-gray-500">{t("settings.subtitle")}</p>
      </header>

      {error && (
        <div role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </div>
      )}

      {/* The preferences the user asked to reach first sit in the right-hand column. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Panel title={t("settings.account")} icon={User}>
            <dl className="divide-y divide-gray-100 text-sm">
              {[
                ["Name", user?.name ?? "—"],
                ["Email", user?.email ?? "—"],
                // The plan is what a person can act on; their platform role is an internal label.
                ["Plan", entitlement?.planName ?? (entitlement === null ? "Free" : "…")],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[90px_1fr] gap-2 py-2">
                  <dt className="text-[11px] font-medium text-gray-500">{label}</dt>
                  <dd className="truncate text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="mt-3 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Open {t("nav.profile")}
              </button>
            )}
          </Panel>

          <Panel title="Password" subtitle="Changing it signs out your other devices." icon={KeyRound}>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label htmlFor="pw-current" className="mb-1 block text-[10px] font-medium text-gray-500">
                  Current
                </label>
                <input
                  id="pw-current"
                  type="password"
                  value={pw.current}
                  onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="pw-next" className="mb-1 block text-[10px] font-medium text-gray-500">
                  New
                </label>
                <input
                  id="pw-next"
                  type="password"
                  value={pw.next}
                  onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="pw-confirm" className="mb-1 block text-[10px] font-medium text-gray-500">
                  Confirm
                </label>
                <input
                  id="pw-confirm"
                  type="password"
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                  className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>
            {mismatch && <p className="mt-1.5 text-[11px] text-red-600">The two new passwords don't match.</p>}
            <button
              type="button"
              onClick={changePassword}
              disabled={!canSubmit}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0D1757] disabled:opacity-50"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
              Change password
            </button>
          </Panel>

          <Panel title={t("settings.notifications")} icon={Bell}>
            <p className="text-xs text-gray-600">
              {unreadCount && unreadCount > 0
                ? `You have ${unreadCount} unread notification(s).`
                : "You're all caught up."}
            </p>
            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="mt-3 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Open notifications
              </button>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title={t("settings.appearance")} subtitle={t("settings.appearance.desc")} icon={Palette}>
            <div role="radiogroup" aria-label={t("settings.appearance")} className="grid grid-cols-3 gap-2">
              {THEMES.map(({ id, icon: Icon, key }) => {
                const active = theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(id)}
                    className={`flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-[11px] ${
                      active ? "border-[#1A237E] bg-blue-50 text-[#1A237E]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={16} />
                    {t(key)}
                    {active && <Check size={11} />}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-gray-500">
              Currently showing the {resolvedTheme} theme.
            </p>
          </Panel>

          <Panel title={t("settings.language")} subtitle={t("settings.language.desc")} icon={Languages}>
            <div role="radiogroup" aria-label={t("settings.language")} className="space-y-2">
              {LANGUAGES.map(({ id, label }) => {
                const active = language === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setLanguage(id)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-xs ${
                      active ? "border-[#1A237E] bg-blue-50 text-[#1A237E]" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                    {active && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title={t("settings.session")} icon={LogOut}>
            <p className="mb-3 text-[11px] text-gray-500">
              Signing out revokes this device's refresh token on the server.
            </p>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                <LogOut size={12} /> Sign out
              </button>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
};
