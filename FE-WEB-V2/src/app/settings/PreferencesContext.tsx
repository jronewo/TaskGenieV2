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
    "board.backlog": "BACKLOG",
    "board.todo": "TO DO",
    "board.inProgress": "IN PROGRESS",
    "board.inReview": "IN REVIEW",
    "board.done": "DONE",

    // Projects page — quota line, close/delete confirmations.
    "project.quota.unlimited": "{plan} plan: unlimited projects",
    "project.quota.used": "Up to {limit} projects · {used} used",
    "project.quota.exhausted": " · none left",
    "project.quota.remaining": " · {left} left",
    "project.close.title": "Close project",
    "project.close.question": "Close project {name}?",
    "project.close.detail": "The project moves to a finished state and leaves the active list. Closure scores are recorded for members. Every task is kept and stays readable under \u201CFinished projects\u201D in your profile. This cannot be undone.",
    "project.close.confirm": "Close project",
    "project.delete.detail": "Permanently deletes everything in the project: tasks, assignments, comments, attachments, dependencies, AI analyses, risk history, scores and meetings. Use End project to keep the data.",
    "project.risk.auto": "Auto",
    "project.risk.off": "Off",
    "project.risk.lastRun": "Last run: {when}",
    "project.risk.never": "Never run",
    "project.graph": "Dependency diagram",
    "project.hoursPerDay": "Hours per day",
    "project.hoursPerDayUnchanged": "Already set to this value",
    "project.save": "Save",
    "project.closing": "Closing…",
    "project.risk.disabled": "Automatic risk estimate turned off.",
    "project.risk.scheduled": "Risk estimate will run at {hour}:00 UTC every day.",
    "project.close.remaining": "The project still has {count} unfinished task(s). ",
    "project.close.allDone": "All tasks are finished. ",
    "project.close.done": "Closed project {name} — {count} task(s) finished.",
    "project.close.doneLong": "Closed \u201C{name}\u201D — {count} task(s) finished. Review it under \u201CFinished projects\u201D in your profile.",

    // Dependency diagram.
    "graph.dialogLabel": "Task dependency diagram",
    "graph.title": "Dependency diagram",
    "graph.subtitle": "Left to right is the order things must finish in. The first column can start now.",
    "graph.reload": "Reload diagram",
    "graph.loadFailed": "Could not load the dependency diagram.",
    "graph.building": "Building the diagram…",
    "graph.empty": "This project has no tasks yet.",
    "graph.cycleTitle": "There is a circular dependency.",
    "graph.cycleDetail": "The tasks outlined in red are waiting on each other, so none of them can ever finish — remove one link to break it.",
    "graph.summary": "{tasks} task(s) · {ready} ready to start",
    "graph.legend.cycle": "In a loop",
    "graph.legend.done": "Done",
    "graph.legend.ready": "Ready to start",
    "graph.legend.blocked": "Waiting",
    "graph.waitingOnNobody": "waiting on nobody",
    "graph.deadline": "Deadline {date}",
    "graph.footer": "Arrows point from the task that must finish first to the one that waits. A dashed line means the earlier task is not done yet. Click a box to open that task.",
    "graph.exportLabel": "Dependency diagram: {count} task(s) in {project}",
    "graph.waitingOn": "Waiting on {count}",
    "graph.blocks": "Blocks {count}",
    "graph.waitingShort": "waits {count}",
    "graph.blocksShort": " · blocks {count}",
    "graph.wave": "wave {n}",
    "graph.summaryFull": "{tasks} task(s) · {waves} wave(s) · {ready} ready to start",
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

    "subscription.title": "Subscription",
    "subscription.subtitle": "Plan, project quota and payment history.",
    "subscription.scopePersonal": "Personal",
    "subscription.scopeOrganization": "Organization",
    "subscription.noCompanyTitle": "You don't have a company yet.",
    "subscription.noCompanyBody": "There is no free plan for organizations. Pick a plan below — you'll name the company and pay in the same step.",
    "subscription.loading": "Loading plan information",
    "subscription.currentPlan": "Current plan",
    "subscription.via": "via {source}",
    "subscription.projectQuota": "Project quota",
    "subscription.quotaUnlimited": "{used} · unlimited",
    "subscription.quotaLimited": "{used}/{limit}",
    "subscription.quotaExhausted": "Quota reached. Upgrade your plan, or delete projects until you're under {limit} before creating another.",
    "subscription.quotaProgress": "Project quota used",
    "subscription.subscription": "Subscription",
    "subscription.none": "None",
    "subscription.ends": "Ends {date}",
    "subscription.cancelRenewal": "Cancel renewal",
    "subscription.free": "Free",
    "subscription.unlimitedProjects": "Unlimited projects",
    "subscription.projectsCount": "{count} projects",
    "subscription.membersCount": "{count} members",
    "subscription.aiChatbot": "AI chatbot assistant",
    "subscription.choosePlan": "Choose plan",
    "subscription.current": "Current",
    "subscription.simulatedGatewayNotice": "Payment #{id} is pending. The gateway is simulated in this environment — choose an outcome.",
    "subscription.simulateSucceeded": "Simulate succeeded",
    "subscription.simulateFailed": "Simulate failed",
    "subscription.paymentHistory": "Payment history",
    "subscription.noPayments": "No payments yet.",
    "subscription.colPlan": "Plan",
    "subscription.colAmount": "Amount",
    "subscription.colProvider": "Provider",
    "subscription.colStatus": "Status",
    "subscription.colDate": "Date",
    "subscription.cancelTitle": "Cancel subscription?",
    "subscription.cancelBody": "The plan stays active until the end of the current period, then won't renew.",
    "subscription.cancelConfirm": "Cancel plan",
    "subscription.cancelKeep": "Keep plan",
    "subscription.cancelNotice": "Subscription will end at the period end.",
    "subscription.paymentCanceled": "Payment was canceled.",
    "subscription.paymentConfirming": "Payment received — confirming with the gateway. This can take a few seconds.",
    "subscription.paymentMarked": "Payment marked {status}.",
    "subscription.error.forbidden": "You don't have permission to manage this organization.",
    "subscription.error.requestFailed": "Request failed ({status}).",
    "subscription.error.generic": "Something went wrong. Please try again.",
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
    "board.backlog": "TỒN ĐỌNG",
    "board.todo": "CẦN LÀM",
    "board.inProgress": "ĐANG LÀM",
    "board.inReview": "CHỜ DUYỆT",
    "board.done": "HOÀN THÀNH",

    // Trang Dự án — dòng hạn mức, xác nhận đóng/xoá.
    "project.quota.unlimited": "Gói {plan}: không giới hạn dự án",
    "project.quota.used": "Tối đa {limit} dự án · đã dùng {used}",
    "project.quota.exhausted": " · đã hết",
    "project.quota.remaining": " · còn {left}",
    "project.close.title": "Đóng dự án",
    "project.close.question": "Đóng dự án {name}?",
    "project.close.detail": "Dự án sẽ chuyển sang trạng thái đã kết thúc và biến mất khỏi danh sách đang hoạt động. Điểm tổng kết được ghi cho các thành viên. Toàn bộ công việc vẫn được giữ và xem lại được ở mục \u201CDự án đã xong\u201D trong trang cá nhân. Thao tác này không thể hoàn tác.",
    "project.close.confirm": "Đóng dự án",
    "project.delete.detail": "Xoá vĩnh viễn toàn bộ dữ liệu của dự án: công việc, phân công, bình luận, tệp đính kèm, phụ thuộc, phân tích AI, lịch sử rủi ro, điểm và cuộc họp. Muốn giữ lại dữ liệu thì dùng End project.",
    "project.risk.auto": "Tự động",
    "project.risk.off": "Tắt",
    "project.graph": "Sơ đồ phụ thuộc",
    "project.hoursPerDay": "Giờ công/ngày",
    "project.hoursPerDayUnchanged": "Đã đúng giá trị này",
    "project.save": "Lưu",
    "project.closing": "Đang đóng…",
    "project.risk.disabled": "Đã tắt tự động chạy Risk estimate.",
    "project.risk.scheduled": "Sẽ tự chạy Risk estimate lúc {hour}:00 UTC mỗi ngày.",
    "project.close.remaining": "Dự án còn {count} công việc chưa hoàn thành. ",
    "project.close.allDone": "Tất cả công việc đã hoàn thành. ",
    "project.close.done": "Đã đóng dự án {name} — {count} công việc hoàn thành.",
    "project.close.doneLong": "Đã đóng \u201C{name}\u201D — {count} công việc hoàn thành. Xem lại ở mục \u201CDự án đã xong\u201D trong trang cá nhân.",

    "graph.dialogLabel": "Sơ đồ phụ thuộc công việc",
    "graph.title": "Sơ đồ phụ thuộc",
    "graph.subtitle": "Trái sang phải là thứ tự phải hoàn thành. Cột đầu tiên làm được ngay.",
    "graph.reload": "Tải lại sơ đồ",
    "graph.loadFailed": "Không tải được sơ đồ phụ thuộc.",
    "graph.building": "Đang dựng sơ đồ…",
    "graph.empty": "Dự án này chưa có công việc nào.",
    "graph.cycleTitle": "Có phụ thuộc vòng tròn.",
    "graph.cycleDetail": "Những công việc viền đỏ đang chờ lẫn nhau nên không bao giờ hoàn thành được — gỡ bớt một liên kết để giải.",
    "graph.summary": "{tasks} công việc · {ready} làm được ngay",
    "graph.legend.cycle": "Vòng lặp",
    "graph.legend.done": "Đã xong",
    "graph.legend.ready": "Làm được ngay",
    "graph.legend.blocked": "Đang chờ",
    "graph.waitingOnNobody": "không chờ ai",
    "graph.deadline": "Hạn {date}",
    "graph.footer": "Mũi tên chỉ từ việc phải xong trước sang việc phải chờ. Nét đứt nghĩa là việc đứng trước vẫn chưa xong. Bấm vào một ô để mở công việc đó.",
    "graph.exportLabel": "Sơ đồ phụ thuộc: {count} công việc trong {project}",
    "graph.waitingOn": "Đang chờ {count} việc",
    "graph.blocks": "Chặn {count} việc",
    "graph.waitingShort": "chờ {count}",
    "graph.blocksShort": " · chặn {count}",
    "graph.wave": "đợt {n}",
    "graph.summaryFull": "{tasks} công việc · {waves} đợt · {ready} làm được ngay",
    "project.risk.lastRun": "Chạy gần nhất: {when}",
    "project.risk.never": "Chưa chạy lần nào",
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

    "subscription.title": "Gói đăng ký",
    "subscription.subtitle": "Gói đăng ký, hạn mức dự án và lịch sử thanh toán.",
    "subscription.scopePersonal": "Cá nhân",
    "subscription.scopeOrganization": "Tổ chức",
    "subscription.noCompanyTitle": "Bạn chưa có công ty nào.",
    "subscription.noCompanyBody": "Không còn gói miễn phí cho tổ chức. Chọn một gói bên dưới — bạn sẽ nhập tên công ty rồi thanh toán ngay trong cùng một bước.",
    "subscription.loading": "Đang tải thông tin gói",
    "subscription.currentPlan": "Gói hiện tại",
    "subscription.via": "Qua {source}",
    "subscription.projectQuota": "Hạn mức dự án",
    "subscription.quotaUnlimited": "{used} · không giới hạn",
    "subscription.quotaLimited": "{used}/{limit}",
    "subscription.quotaExhausted": "Đã hết hạn mức. Nâng cấp gói, hoặc xoá bớt dự án cho đến khi còn dưới {limit} thì mới tạo mới được.",
    "subscription.quotaProgress": "Đã dùng bao nhiêu hạn mức dự án",
    "subscription.subscription": "Gói đăng ký",
    "subscription.none": "Không có",
    "subscription.ends": "Kết thúc {date}",
    "subscription.cancelRenewal": "Hủy gia hạn",
    "subscription.free": "Miễn phí",
    "subscription.unlimitedProjects": "Không giới hạn dự án",
    "subscription.projectsCount": "{count} dự án",
    "subscription.membersCount": "{count} thành viên",
    "subscription.aiChatbot": "Trợ lý AI chatbot",
    "subscription.choosePlan": "Chọn gói",
    "subscription.current": "Hiện tại",
    "subscription.simulatedGatewayNotice": "Thanh toán #{id} đang chờ xử lý. Cổng thanh toán đang ở chế độ mô phỏng — hãy chọn kết quả.",
    "subscription.simulateSucceeded": "Mô phỏng thành công",
    "subscription.simulateFailed": "Mô phỏng thất bại",
    "subscription.paymentHistory": "Lịch sử thanh toán",
    "subscription.noPayments": "Chưa có giao dịch nào.",
    "subscription.colPlan": "Gói",
    "subscription.colAmount": "Số tiền",
    "subscription.colProvider": "Nhà cung cấp",
    "subscription.colStatus": "Trạng thái",
    "subscription.colDate": "Ngày",
    "subscription.cancelTitle": "Hủy gói đăng ký?",
    "subscription.cancelBody": "Gói vẫn chạy đến hết chu kỳ hiện tại, sau đó không gia hạn nữa.",
    "subscription.cancelConfirm": "Hủy gói",
    "subscription.cancelKeep": "Giữ gói",
    "subscription.cancelNotice": "Gói sẽ kết thúc vào cuối chu kỳ hiện tại.",
    "subscription.paymentCanceled": "Đã hủy thanh toán.",
    "subscription.paymentConfirming": "Đã nhận thanh toán — đang xác nhận với cổng thanh toán. Có thể mất vài giây.",
    "subscription.paymentMarked": "Thanh toán đã được đánh dấu {status}.",
    "subscription.error.forbidden": "Bạn không có quyền quản lý tổ chức này.",
    "subscription.error.requestFailed": "Yêu cầu thất bại ({status}).",
    "subscription.error.generic": "Đã có lỗi xảy ra. Vui lòng thử lại.",
  },
};

interface Preferences {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  /** The theme actually being rendered once "system" has been resolved. */
  resolvedTheme: "light" | "dark";
  language: Language;
  setLanguage: (language: Language) => void;
  /** `vars` fills `{name}` placeholders in the translated string. */
  t: (key: string, vars?: Record<string, string | number>) => string;
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

  /**
   * `vars` fills `{name}` placeholders. Sentences that embed a number or a title cannot be
   * assembled by concatenating fragments — word order differs between the two languages, and a
   * translated fragment glued to a value produces something neither language would say.
   */
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const template = STRINGS[language][key] ?? STRINGS.en[key] ?? key;
      if (!vars) return template;
      return Object.entries(vars).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        template
      );
    },
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
