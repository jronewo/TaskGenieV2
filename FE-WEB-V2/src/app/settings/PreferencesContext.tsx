import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type Language = "en" | "vi";

const THEME_KEY = "tmai.theme";
const LANG_KEY = "tmai.language";

/**
 * Translations live here rather than behind an i18n library: adding a runtime dependency needs the
 * project owner's sign-off, and the surface that actually needs translating (settings, navigation,
 * a handful of page titles) fits in one table. Missing keys fall through to English.
 */
export const STRINGS: Record<Language, Record<string, string>> = {
  en: {
    "settings.title": "Settings",
    "settings.subtitle": "Preferences are stored on this device.",
    "settings.appearance": "Appearance",
    "settings.appearance.desc": "Choose how the console looks.",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.theme.system": "System",
    "settings.language": "Language",
    "settings.language.desc": "Applies to the console's own labels.",
    "settings.ai": "AI Engine",
    "settings.notifications": "Notifications",
    "settings.account": "Account",
    "settings.session": "Session",
    "nav.dashboard": "Dashboard",
    "nav.board": "Task Board",
    "nav.projects": "Projects",
    "nav.reports": "Reports",
    "nav.team": "Team",
    "nav.settings": "Settings",
    "nav.profile": "Profile",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "nav.organizations": "Organizations",
    "nav.subscription": "Subscription",
    "nav.evaluations": "Evaluations",
    "nav.administration": "Administration",
    "nav.notifications": "Notifications",
    "nav.skills": "Skills",
    "nav.overview": "Overview",
    "nav.users": "Users",
    "nav.billing": "Billing",
    "nav.plans": "Plans",
    "nav.group.personal": "Personal",
    "nav.group.organization": "Organization",
    "header.toggleSidebar": "Toggle sidebar",
    "header.accountMenu": "Account menu",
    "header.signedIn": "Signed in",
    "header.administrator": "Administrator",
    "header.member": "Member",
    "header.seen": "I have seen these",
    "header.newTask": "New Task",
    "header.signOut": "Sign out",
    "board.todo": "TO DO",
    "board.inProgress": "IN PROGRESS",
    "board.inReview": "IN REVIEW",
    "board.done": "DONE",
    "board.noTasks": "No tasks here.",
    "board.noMatch": "No tasks match the filters.",
    "board.importTasks": "Import tasks",
    "board.riskEstimate": "Risk estimate",
    "board.workingHours": "Working hours/day",
    "board.addTask": "Add task",
    "task.priority": "Priority",
    "task.type": "Type",
    "task.deadline": "Deadline",
    "task.difficulty": "Difficulty",
    "task.status": "Status",
    "task.assignee": "Assignee",
    "task.risk": "Risk",
    "task.estimate": "Estimate",
    "task.comments": "Comments",
    "task.writeComment": "Write a comment...",
    "task.noComments": "No comments yet.",
    "task.autoEstimate": "Auto estimate",
    "task.analyseRisk": "Analyse risk",
    "task.unclassified": "Unclassified",
    "task.requiredSkills": "Required skills",
    "task.description": "Description",
    "task.title": "Title",
    "notif.title": "Notifications",
    "notif.unread": "unread",
    "notif.allRead": "All caught up",
    "notif.markAllRead": "Mark all read",
    "notif.empty": "No notifications yet.",
    "notif.select": "Select a notification to read it in full.",
    "notif.openProject": "Open project",
    "notif.openTask": "Open task",
    "notif.markRead": "Mark as read",
    "notif.accept": "Accept",
    "notif.decline": "Decline",
    "profile.title": "Profile",
    "profile.projectHistory": "Project history",
    "profile.mySkills": "My skills",
    "profile.personalProjects": "Personal projects",
    "profile.organizationProjects": "Organization projects",
    "settings.plan": "Plan",
    "settings.name": "Name",
    "settings.email": "Email",
    "settings.openProfile": "Open Profile",
    "common.delete": "Delete",
    "common.confirm": "Confirm",
    "common.close": "Close",
    "common.loading": "Loading…",
    "common.create": "Create",
    "common.add": "Add",
    "common.remove": "Remove",
    "common.search": "Search",
    "common.none": "—",
    "common.retry": "Retry",
    "common.import": "Import",
    "common.download": "Download template",
  },
  vi: {
    "settings.title": "Cài đặt",
    "settings.subtitle": "Tuỳ chọn được lưu trên thiết bị này.",
    "settings.appearance": "Giao diện",
    "settings.appearance.desc": "Chọn cách hiển thị của hệ thống.",
    "settings.theme.light": "Sáng",
    "settings.theme.dark": "Tối",
    "settings.theme.system": "Theo hệ thống",
    "settings.language": "Ngôn ngữ",
    "settings.language.desc": "Áp dụng cho nhãn giao diện của hệ thống.",
    "settings.ai": "Công cụ AI",
    "settings.notifications": "Thông báo",
    "settings.account": "Tài khoản",
    "settings.session": "Phiên đăng nhập",
    "nav.dashboard": "Tổng quan",
    "nav.board": "Bảng công việc",
    "nav.projects": "Dự án",
    "nav.reports": "Báo cáo",
    "nav.team": "Nhóm",
    "nav.settings": "Cài đặt",
    "nav.profile": "Hồ sơ",
    "common.save": "Lưu",
    "common.cancel": "Huỷ",
    "nav.organizations": "Tổ chức",
    "nav.subscription": "Gói đăng ký",
    "nav.evaluations": "Đánh giá",
    "nav.administration": "Quản trị",
    "nav.notifications": "Thông báo",
    "nav.skills": "Kỹ năng",
    "nav.overview": "Tổng quan",
    "nav.users": "Người dùng",
    "nav.billing": "Thanh toán",
    "nav.plans": "Gói dịch vụ",
    "nav.group.personal": "Cá nhân",
    "nav.group.organization": "Tổ chức",
    "header.toggleSidebar": "Ẩn/hiện thanh bên",
    "header.accountMenu": "Menu tài khoản",
    "header.signedIn": "Đang đăng nhập",
    "header.administrator": "Quản trị viên",
    "header.member": "Thành viên",
    "header.seen": "Tôi đã xem",
    "header.newTask": "Tạo công việc",
    "header.signOut": "Đăng xuất",
    "board.todo": "CẦN LÀM",
    "board.inProgress": "ĐANG LÀM",
    "board.inReview": "CHỜ DUYỆT",
    "board.done": "HOÀN THÀNH",
    "board.noTasks": "Chưa có công việc.",
    "board.noMatch": "Không có công việc khớp bộ lọc.",
    "board.importTasks": "Nhập từ Excel",
    "board.riskEstimate": "Ước tính rủi ro",
    "board.workingHours": "Giờ công/ngày",
    "board.addTask": "Thêm công việc",
    "task.priority": "Độ ưu tiên",
    "task.type": "Loại",
    "task.deadline": "Hạn chót",
    "task.difficulty": "Độ khó",
    "task.status": "Trạng thái",
    "task.assignee": "Người phụ trách",
    "task.risk": "Rủi ro",
    "task.estimate": "Ước tính",
    "task.comments": "Bình luận",
    "task.writeComment": "Viết bình luận...",
    "task.noComments": "Chưa có bình luận.",
    "task.autoEstimate": "Tự ước tính",
    "task.analyseRisk": "Phân tích rủi ro",
    "task.unclassified": "Chưa phân loại",
    "task.requiredSkills": "Kỹ năng yêu cầu",
    "task.description": "Mô tả",
    "task.title": "Tiêu đề",
    "notif.title": "Thông báo",
    "notif.unread": "chưa đọc",
    "notif.allRead": "Đã xem hết",
    "notif.markAllRead": "Đánh dấu đã đọc",
    "notif.empty": "Chưa có thông báo nào.",
    "notif.select": "Chọn một thông báo để xem đầy đủ.",
    "notif.openProject": "Mở dự án",
    "notif.openTask": "Mở công việc",
    "notif.markRead": "Đánh dấu đã đọc",
    "notif.accept": "Chấp nhận",
    "notif.decline": "Từ chối",
    "profile.title": "Hồ sơ",
    "profile.projectHistory": "Lịch sử dự án",
    "profile.mySkills": "Kỹ năng của tôi",
    "profile.personalProjects": "Dự án cá nhân",
    "profile.organizationProjects": "Dự án tổ chức",
    "settings.plan": "Gói dịch vụ",
    "settings.name": "Tên",
    "settings.email": "Email",
    "settings.openProfile": "Mở hồ sơ",
    "common.delete": "Xóa",
    "common.confirm": "Xác nhận",
    "common.close": "Đóng",
    "common.loading": "Đang tải…",
    "common.create": "Tạo",
    "common.add": "Thêm",
    "common.remove": "Gỡ",
    "common.search": "Tìm kiếm",
    "common.none": "—",
    "common.retry": "Thử lại",
    "common.import": "Nhập",
    "common.download": "Tải tệp mẫu",
  },
};

interface Preferences {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  /** The theme actually being rendered once "system" has been resolved. */
  resolvedTheme: "light" | "dark";
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const PreferencesContext = createContext<Preferences | null>(null);

/**
 * Storage access that cannot throw. Safari in private mode, and any embedding that blocks storage,
 * make `localStorage` either absent or throwing on access — reading preferences must never be the
 * thing that stops the console from rendering.
 */
function readStored(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // A preference that cannot be persisted still applies for this session.
  }
}

function readTheme(): ThemeMode {
  const stored = readStored(THEME_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function readLanguage(): Language {
  return readStored(LANG_KEY) === "vi" ? "vi" : "en";
}

function prefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export const PreferencesProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>(readTheme);
  const [language, setLanguageState] = useState<Language>(readLanguage);
  const [systemDark, setSystemDark] = useState(prefersDark);

  // "System" has to keep tracking the OS after the page has loaded, not just at startup.
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!query) return;
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  const resolvedTheme: "light" | "dark" = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Tailwind is configured with darkMode: "class", so the root class is what actually switches it.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setTheme = useCallback((next: ThemeMode) => {
    writeStored(THEME_KEY, next);
    setThemeState(next);
  }, []);

  const setLanguage = useCallback((next: Language) => {
    writeStored(LANG_KEY, next);
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key: string) => STRINGS[language][key] ?? STRINGS.en[key] ?? key,
    [language]
  );

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme, language, setLanguage, t }),
    [theme, setTheme, resolvedTheme, language, setLanguage, t]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export function usePreferences(): Preferences {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside a PreferencesProvider");
  return ctx;
}
