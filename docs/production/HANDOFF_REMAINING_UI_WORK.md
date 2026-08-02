# HANDOFF — Phần việc UI còn lại (TaskGenie V2 Web)

> Viết cho agent tiếp theo. Đọc hết file này trước khi sửa code.
> Cập nhật lần cuối: 2026-08-02. Branch `Develope`, repo `/Users/jronehuynh/Downloads/TaskGenieV2-main`.

---

## 0. Trạng thái xác minh tại thời điểm bàn giao

Chạy đầy đủ, tất cả xanh:

| Lớp | Lệnh | Kết quả |
|---|---|---|
| Backend | `dotnet test tests/TaskGenie.Tests --artifacts-path /tmp/taskgenie-claude-tests` | **287/287 pass**, 0 fail |
| Component | `cd FE-WEB-V2 && node node_modules/vitest/vitest.mjs run` | **89/89 pass**, 13 file |
| E2E (Edge) | `cd FE-WEB-V2 && node node_modules/@playwright/test/cli.js test` | **26/26 pass**, ~100s |
| Build FE | `cd FE-WEB-V2 && node node_modules/vite/bin/vite.js build` | ✓ built |
| Build BE | 4 project `.csproj` với `--artifacts-path /tmp/taskgenie-claude-build` | ✓ |

**Chưa có commit nào được tạo.** Toàn bộ thay đổi còn ở working tree. Git index đang giữ sẵn
~4900 file do người dùng stage từ trước (`tmai-dashboard/`, `FE/`) — **không được** `git reset`,
`git checkout --`, `git clean`.

Node dùng bản portable: `/Users/jronehuynh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`
(thêm vào `PATH` trước khi chạy lệnh FE).

E2E cần biến môi trường: `E2E_ADMIN_EMAIL="uat-admin-1785631625@test.local" E2E_ADMIN_PASSWORD="P@ssword1"`.
Playwright chạy `channel: "msedge"` theo yêu cầu người dùng (họ dùng Edge).

---

## 1. Việc CÒN LẠI — làm theo thứ tự này

Người dùng chốt danh sách này qua 3 tin nhắn (xem §4 để đọc nguyên văn yêu cầu).

### J-01 — Luồng task trên UI giống Jira  ✅ XONG (đợt 1)
**Nguyên văn:** "tôi muốn đây là 1 mini jira cái luồng về task trên UI của nó phải giống y hệt nhé".

Đã làm:
- `src/app/lib/jira.ts` (mới) — issue key, workflow status, priority rank, issue type, initials.
  **Issue key sinh phía FE** từ tên project + `taskId` (`Website Revamp` #42 → `WR-42`); không thêm
  cột DB vì sẽ phải migration + sequence riêng cho từng project, trong khi key vẫn map 1-1 với taskId.
  **Issue type suy từ tiêu đề** (bug/fix/defect → Bug; story/feature/as a user → Story; còn lại Task)
  — API không có cột type, đây là tín hiệu trung thực duy nhất đang có.
- `TaskCard.tsx` — viết lại kiểu issue card: icon loại việc, issue key, mũi tên priority
  (Highest→Lowest), chấm risk, badge estimate, avatar assignee (hoặc vòng nét đứt "Unassigned"),
  gạch ngang khi Done, viền trái đỏ khi quá hạn.
- `KanbanBoard.tsx` — cột `TO DO / IN PROGRESS / DONE` in hoa + đếm số, nền `#F4F5F7`, highlight
  cột đích khi đang kéo. Nhận thêm prop `projectName`.
- `TaskDetailModal.tsx` — bố cục Jira 2 cột: breadcrumb `Project › 🐞 WR-42`; trái = title,
  description, priority/estimate/blockers, AI insights, AI assignee, comments (kèm avatar);
  phải = **dropdown chuyển trạng thái** + panel **Details** (Type/Status/Priority/Assignee/Risk/
  Due/Estimate/Logged) + Progress.
- `ProjectBoardHeader.tsx` báo tên project lên `App.tsx` qua `onProjectLoaded` (giữ trong ref để
  callback inline không gây fetch lặp) — board và modal dùng chung, không fetch project lần nữa.

Test: `src/app/lib/__tests__/jira.test.ts` (7 case) + E2E `JIRA-01` (issue key, tên cột Jira,
dropdown transition, xác minh status đã lưu server-side). Đã xem ảnh chụp Edge cả board lẫn modal.

**Còn có thể làm tiếp nếu muốn giống Jira hơn:** tab Activity/History trong modal, subtask thật,
backlog view, sprint, story points, chọn issue type thủ công (cần cột DB mới → phải hỏi người dùng).

### U-04 — Dashboard: chart + danh sách dự án  ✅ XONG
Đã làm: `FE-WEB-V2/src/app/components/DashboardCharts.tsx` (recharts) — donut trạng thái task,
bar risk theo project, stacked bar Done/Open theo project (8 project bận nhất). `App.tsx` gộp thành
`DashboardPage` gọi `useWorkspace` **một lần** thay vì 3 lần fetch song song như trước.
Test: `DashboardCharts.test.tsx` 4 case. Đã xác minh bằng ảnh chụp Edge với dữ liệu thật
(7 task: 2 To do / 2 In progress / 3 Done → donut đúng, completion 43%).

<details><summary>Yêu cầu gốc U-04 (đã đáp ứng)</summary>
**Yêu cầu:** "trong dashboard phải có rõ các cái chart và các dự án view rõ dự án".
- File: `FE-WEB-V2/src/app/components/MobileDashboard.tsx` là dashboard hiện tại đang render cho
  `activePage === "dashboard"` (kiểm tra lại trong `src/app/App.tsx`).
- `recharts` **đã có sẵn** trong `package.json` — dùng nó, đừng thêm thư viện mới.
- Dữ liệu thật lấy từ: `projectApi.mine()`, `taskApi.byProject()`, và `reportApi` (xem
  `src/app/services/`). **Tuyệt đối không mock** — `src/app/data/tmaiData.ts` đã bị xoá, đừng tạo lại.
- Cần: chart phân bố task theo status (Todo/InProgress/Done), chart theo risk level, danh sách
  project kèm progress bar + số member + deadline.
- Mẫu style: xem `ProjectBoardHeader.tsx` (đúng hệ màu sáng, primary `#1A237E`).
</details>

### U-06 — Report theo từng dự án  ✅ XONG
`ReportsDashboard.tsx`: thêm picker `#report-project` (All projects / từng dự án). Khi chọn 1 dự án →
banner thông tin dự án (risk, status, deadline, team), thẻ số đổi "At-risk projects" thành "Risk level",
và chart "Risk distribution" đổi thành "Tasks by priority" của chính dự án đó.
**Không cần backend**: không có `ReportsController` — số liệu vốn tính từ project/task rows mà user đã
được phép đọc, nên scope theo dự án là filter phía FE, không phải query mới phía server.
Nếu chọn phải dự án vừa bị xoá/mất quyền, picker tự rơi về "All projects" thay vì kẹt.
E2E `RPT-02`. `RPT-01` cũ vẫn xanh.

### U-07 — Header/sidebar responsive  ✅ XONG
`App.tsx`: `useIsMobile` → `useViewport` (trả `isMobile` <768 và `isNarrow` <1100 từ **một** listener).
Sidebar rộng 236px (rộng) / 190px (hẹp) / 52px (collapsed); dưới 1100px tự thu, rộng ra thì trả lại
đúng lựa chọn user đã bấm (giữ trong `userCollapsedRef`).
`Header.tsx`: breadcrump + view-switcher + phím tắt ⌘K chỉ hiện từ `lg`, nút AI Active từ `xl`, ô
search co giãn (`min-w-0 flex-1`), padding/gap nhỏ lại ở màn hẹp — không còn tràn ngang.

### U-10 — Profile 2 khung  ✅ XONG
`ProfilePage.tsx`: hàng trên `lg:grid-cols-2` — trái là **bảng** thông tin user (tên có thể sửa, email,
role, user ID, số skill, số project), phải là khung CRUD skill. Hàng dưới là khung rộng lịch sử project.

### U-11 — Settings + ngôn ngữ + dark/light  ✅ XONG
- `src/app/settings/PreferencesContext.tsx` (mới): theme `light/dark/system` + ngôn ngữ `en/vi`, lưu
  `localStorage`, `system` theo dõi `prefers-color-scheme` **liên tục** (không chỉ lúc load).
  **i18n tự viết, không thêm thư viện runtime** — thêm dependency là mục "Stop and ask" trong CLAUDE.md,
  mà phần cần dịch (settings + nav) vừa một bảng. Key thiếu thì rơi về tiếng Anh.
- `src/styles/dark.css` (mới): remap các utility sáng mà app đang dùng, scope dưới `.dark` trên `<html>`.
  ⚠️ **Component mới dùng utility sáng chưa có trong file này sẽ vẫn sáng khi bật dark** — thêm vào đây.
  Đã phải bổ sung `.dark .text-[#1A237E]` vì navy trên nền xanh mờ gần như vô hình (bắt được bằng ảnh chụp).
- `SettingsPage.tsx` (mới) thay `SettingsView` cũ: 2 cột, **cột phải là Appearance / Language / Session**
  đúng yêu cầu "ưu tiên nằm phía bên phải"; cột trái Account / Password / Notifications.
  **Đã gỡ toàn bộ toggle AI + notification cũ** — chúng chỉ set state local, không gọi API nào, vi phạm
  quy tắc "không button placeholder".
- Test: `PreferencesContext.test.tsx` (6 case) + E2E `SET-01` (đổi theme + ngôn ngữ, reload vẫn giữ).

### U-12 — Ô chatbot  ✅ XONG (kèm backend mới)
- **Backend mới**: `AskAssistantQuery` (`Features/AI/Queries/AskAssistantQuery.cs`) +
  `POST /api/ai-analysis/assistant`. Có validator (câu hỏi bắt buộc, ≤500 ký tự).
  **Không bao giờ nới quyền của người hỏi**: có `projectId` thì đi qua `EnsureCanAccessProjectAsync`;
  không có thì chỉ đọc project của chính user + task được assign cho user đó.
  Nếu AI provider chết → trả về tóm tắt tiền định từ chính rows của user, không fail request.
  Test: `AssistantApiTests.cs` **6 case** (401, 400 rỗng, 400 quá dài, 403 project người khác,
  200 project của mình, và unscoped không thấy dữ liệu người khác).
- **FE**: `AssistantChat.tsx` — nút tròn góc dưới phải, mở ra khung chat; tự scope theo board đang mở.
  Mỗi câu trả lời kèm dòng "based on <scope>" để user biết AI nhìn thấy gì.
  Test: `AssistantChat.test.tsx` (5 case) + E2E `AST-01`.

> **Gemini sau này**: endpoint đi qua `ITextGenerationService`. Cắm Gemini = thêm một implementation
> trong `Infrastructure/ExternalServices/` và đổi đăng ký trong `DependencyInjection.cs`.
> **Không phải sửa** `AskAssistantQuery`, `AssistantChat` hay bất kỳ UI nào.

### Đợt sửa giao diện theo phản hồi (ảnh chụp trang Projects tối)  ✅ XONG

1. **Lỗi màu dark mode** — `ProjectManagement.tsx` và các trang tổ chức viết theo bảng màu **slate**,
   trong khi `dark.css` mới chỉ phủ `gray`. Đã map toàn bộ thang slate (bg/text/border/hover).
   Đây đúng là cái bẫy đã ghi ở đầu file: **utility sáng không có trong dark.css thì vẫn sáng**.
2. **Xoá thanh search** khỏi header, bỏ luôn state `searchVal`/`searchFocused` và import `Search`.
3. **Header co duỗi**: breadcrumb + view switcher + ⌘K từ `lg`, nút AI Active từ `xl`, padding/gap
   nhỏ lại ở màn hẹp.
4. **Ô user ra sát góc phải**: có gạch phân cách, hiện avatar + tên + vai trò + chevron từ `lg`,
   dưới `lg` chỉ còn avatar.
5. **Organization — Settings thành nút nhỏ mở modal** (icon Shield góc phải header), không còn
   chiếm chỗ trong luồng trang.
6. **Organization — 3 cột dọc**: `xl:grid-cols-[220px_1fr_360px]` = switcher | members+projects |
   tổng quan dự án. Dưới `xl` rơi về 2 cột.
7. **Organization — bấm dự án ra tổng quan**: `OrganizationProjectPanel.tsx` (mới) — đếm task theo
   trạng thái (Tasks / To do / In progress / Done), nút **Risk estimate** quét tuần tự, **Add member**,
   **Set Project Leader**, danh sách thành viên tổ chức. Nút "Assign member" trong danh sách dùng
   `stopPropagation` để không mở panel khi bấm.
   Test: `OrganizationProjectPanel.test.tsx` (6 case, gồm 403 và ca provider chết giữa chừng).
8. **Data mẫu**: `scripts/seed-demo-data.mjs` (mới). Tạo qua **API thật** (ghi vào chính DB docker),
   **không INSERT SQL tay** — đúng quy tắc dự án và fail lớn tiếng nếu endpoint hỏng.
   Chạy: `node scripts/seed-demo-data.mjs`. Idempotent, chạy lại nhiều lần được.
   Tạo: 4 tài khoản, 2 dự án cá nhân + 2 dự án tổ chức (17 task), tổ chức "Acme Delivery" đã mua gói
   ORGANIZATION qua `FakePaymentProvider`, và **thêm `trongboigaren2107@gmail.com` vào mọi team với
   vai trò LEADER**.
   > Tài khoản đó đăng nhập bằng Google nên **không có mật khẩu** → không thể lấy token của họ.
   > `GetProjectsByUserIdAsync` trả dự án khi `CreatedBy == userId` **hoặc** là thành viên team,
   > nên chỉ cần cho vào team là họ thấy dữ liệu — **không đụng vào credential của họ**.
   > Đổi tài khoản đích bằng biến `TARGET_EMAIL`.

### Đợt thông báo + required skill  ✅ XONG

**Phát hiện quan trọng:** CLAUDE.md ghi rằng handler domain event "ghi activity log **và notification**"
— **sai**. Chỉ có 3 handler ghi activity log, không handler nào ghi `Notification`. Notification cho
comment thì đã có sẵn (nằm thẳng trong `CreateTaskCommentCommandHandler`), còn assign và risk thì chưa.

- **Assign** → `Features/Notifications/EventHandlers/TaskAssignedNotificationHandler.cs` (mới),
  bắt `TaskAssignedEvent`. Bỏ qua khi tự gán cho chính mình. Lỗi notification không được rollback
  việc gán.
- **Risk cao** → `AnalyzeTaskRiskCommand` bắn notification khi engine chấm **HIGH/CRITICAL**, gửi cho
  người làm + người tạo task, **bỏ qua người vừa bấm nút** (họ đã thấy kết quả trên màn hình).
- **Comment** → đã có sẵn, không sửa.
- **Mời thành viên** → `CreateInvitationCommandHandler` viết lại: tạo notification in-app (khi email
  đó đã có tài khoản) **và** gửi email qua `IEmailSender.SendTeamInvitationEmailAsync` (mới trong
  interface). Email **deep-link vào notification centre** (`AppUrlSettings.BuildNotificationsUrl()`),
  **không mang token quyết định** — chấp nhận/từ chối diễn ra trong app khi đã đăng nhập, nên email bị
  forward không thể chấp nhận thay người khác. Cả hai kênh đều bọc try/catch: hỏng kênh nào cũng
  không làm mất lời mời.
- Config mới `App:BaseUrl` + `App:NotificationsPath` trong `appsettings.json`
  (`Common/Options/AppUrlSettings.cs`).
- ⚠️ **`LoggingEmailSender` chỉ ghi log, KHÔNG gửi mail thật.** Muốn email đến hộp thư thật phải cắm
  SMTP/provider — đó là **runtime dependency + credential**, thuộc mục "Stop and ask", chưa làm.
  Kênh đang chạy được là notification in-app.
- Test: `InvitationNotificationApiTests.cs` 5 case (notification, link không mang quyết định, email
  lạ vẫn thành công, người ngoài bị 403 và không ai bị thông báo, mail provider chết vẫn giữ lời mời).

**Required skill khi tạo task** — `CreateTaskModal.tsx` thêm khối chọn skill từ catalog thật
(`taskApi.requiredSkills` / `setRequiredSkills` mới trong `taskApi.ts`, gọi `/api/taskrequiredskills`).
Đây là thiếu sót có hậu quả thật: **SkillMatch chiếm 40% điểm gán việc của AI**, task không có
required skill thì gợi ý assignee kém hẳn. Task được tạo trước, ghi skill sau — skill ghi hỏng thì
báo lỗi chứ không giả vờ là task tạo thất bại. Test: `CreateTaskModal.test.tsx` 6 case.

**Header bảng công việc** — bỏ chip risk, chip status ("Planning") và thanh progress theo yêu cầu.
Nút "Risk estimate" là số liệu sống, progress đã nằm trên từng card.

### Realtime (SignalR) + trung tâm thông báo  ✅ XONG

**Server**
- `Application/Interfaces/IRealtimeNotifier.cs` — abstraction; Application **không** tham chiếu
  SignalR. (Đặt tên `IRealtimeNotifier` vì `INotificationPublisher` **trùng tên với `MediatR`**.)
- `API/Realtime/`: `NotificationHub` (`[Authorize]`), `SignalRNotificationPublisher`,
  `JwtUserIdProvider` (map connection theo `ClaimTypes.NameIdentifier` — mặc định của SignalR dùng
  name claim, không khớp khoá của bảng notification).
- Hub tại `/hubs/notifications`. `AuthenticationExtensions` thêm `OnMessageReceived` đọc
  `access_token` từ query **chỉ cho path `/hubs`** (trình duyệt không set header được trên WebSocket
  handshake); mọi nơi khác vẫn chỉ nhận header.
- `AddJsonProtocol` ép **camelCase** — SignalR .NET **không** áp naming policy mặc định, payload về
  là `NotificationId/Title` và client đọc ra `undefined`. Đây là 1 trong 3 lỗi phải debug bằng log.
- `CreateNotificationCommandHandler` đẩy **sau khi** đã ghi DB. Dependency để **bắt buộc**, không
  optional: container **không điền tham số optional**, nên bản optional biến thiếu đăng ký thành
  no-op im lặng thay vì lỗi lúc khởi động.

**Client**
- `npm i @microsoft/signalr@8.0.7` (**runtime dependency** — người dùng yêu cầu SignalR đích danh).
- `src/app/realtime/useRealtimeNotifications.ts` — `accessTokenFactory`, `withCredentials: false`
  (API để `AllowAnyOrigin` nên không dùng được credential), `withAutomaticReconnect`.
  Kết nối hỏng chỉ log, không bao giờ ném lỗi: DB row mới là nguồn sự thật, mất socket chỉ là mất
  cú hích.
- `AuthContext` expose `accessToken` cho handshake (apiClient interceptor không dùng được ở đây).
- `App.tsx` nhận push → toast + tăng `notificationNonce`; `NotificationsCenter` nhận `refreshToken`
  và nạp lại (nó giữ danh sách riêng + đọc invitation riêng, nên bảo nó refetch sạch hơn là merge
  state server ở hai nơi).

**Trung tâm thông báo**
- Icon theo loại (COMMENT / TASK_ASSIGNED / TASK_RISK / INVITATION), nút "Open task" mở thẳng task.
- Khối **lời mời đang chờ** ở trên cùng với nút **Accept / Decline** thật.
- Sửa lỗi backend: `UpdateInvitationStatusCommandHandler` so sánh `== "Accepted"` **phân biệt hoa
  thường** → gửi `"ACCEPTED"` đổi được status nhưng **không thêm vào team**, tạo lời mời mâu thuẫn
  âm thầm. Nay chuẩn hoá và **từ chối status lạ bằng 400** thay vì ghi bừa vào DB.

Test: backend +2 case (`accepted` chữ thường vào team thật, status rác bị 400 và không đổi gì),
E2E `RT-01` (mời từ ngoài trình duyệt → hiện ra **không reload** → Accept → xác minh đã vào team qua API).

⚠️ **Lỗi tôi gây ra, đã sửa, cần biết:** tôi chạy `npm install` trong workspace **pnpm** → node_modules
bị chuyển sang layout npm phẳng trong khi `.pnpm` vẫn còn, dev server dựng 2 instance React
("Invalid hook call"). **Build production vẫn xanh** — chỉ dev server hỏng. Khắc phục bằng
`vite --force` (pre-bundle lại). `package-lock.json` và `pnpm-lock.yaml` **đều đang bị sửa** — chủ dự
án nên chọn một package manager và chạy install lại cho sạch.

### Luồng mời vào dự án + dọn navbar  ✅ XONG

**Nguyên nhân gốc người dùng chỉ ra đúng:** nút thêm thành viên trong `TeamManagement` gọi thẳng
`POST /teams/{id}/members` — **thêm luôn, không qua bước chấp nhận**. Backend invitation + notification
đã có, nhưng **không có đường nào trong UI tạo ra invitation**, nên card Accept không bao giờ xuất hiện.

- `TeamManagement.handleInvite` chuyển sang `invitationApi.create(teamId, email)` → tạo invitation
  `Pending` + notification + email. Người được mời chỉ thành member **sau khi bấm Accept**.
- Nút đổi nhãn `Add` → **`Invite`**, thêm câu giải thích. **Gỡ dropdown chọn role** — API invitation
  chỉ nhận email, người accept vào với vai trò MEMBER; để lại dropdown là một control không làm gì.
- **Xoá mục "Skills" khỏi sidebar.** Kéo theo: trang `skills` thành mồ côi → **chuyển
  `SkillManagement` vào trang Administration** (nó vốn là công cụ của admin). Skill cá nhân đã nằm ở
  **Profile** từ U-10.
- `SkillManagement` giờ guard `Array.isArray(...)` — 204 hoặc body lạ trả về `undefined` từng làm
  `.filter` nổ.
- **Xoá nốt thanh progress dự án** ở card dashboard, Project history, danh sách dự án tổ chức và
  panel tổng quan. Giữ thanh của **task** và thanh **điểm AI** (khác loại) — hỏi trước khi xoá.

E2E phải sửa theo (đều là test bám vào UI cũ, không phải lỗi sản phẩm):
`TEM-01` giờ khẳng định "Invitation sent" + invitation `Pending` tồn tại qua API; `SKL-01/03` vào qua
Administration; `SKL-04` vào qua Profile và khẳng định sidebar **không** còn "Skills".

### Google login — UAT cuối  ⬜  ← việc duy nhất còn lại, cần thao tác của chủ dự án
Client ID đã cấu hình trong `FE-WEB-V2/.env.local` (gitignored) và backend user-secrets — **đã đối
chiếu FE và BE khớp nhau**.

**Lỗi người dùng gặp:** `no registered origin` / `401: invalid_client`.
**Không phải lỗi code.** App dùng Google Identity Services (`accounts.id.initialize` + `renderButton`
trong `src/app/auth/GoogleSignInButton.tsx`) — luồng này **chỉ dùng Client ID, không hề dùng client
secret**. Google tìm thấy client nhưng client chưa đăng ký JavaScript origin nào.

**Chặn ở phía chủ dự án** — Google Cloud Console → Credentials → mở OAuth client:
- Application type **phải là "Web application"** (Desktop/Android/iOS không có ô origin → lỗi vĩnh viễn).
- *Authorized JavaScript origins* thêm **cả hai**: `http://localhost:5173` **và** `http://127.0.0.1:5173`.
  `pnpm dev` phục vụ ở `localhost:5173`, Playwright chạy `127.0.0.1:5173` — Google coi là **hai origin
  khác nhau**.
- Không cần *Authorized redirect URIs* cho luồng này.
- Nếu consent screen ở chế độ Testing → thêm tài khoản vào *Test users*, nếu không sẽ lỗi `access_denied`.

## 2. Đã HOÀN THÀNH (đừng làm lại)

### Backend / bảo mật (Slice 0 → 10)
- Audit 10 controller, sửa 8: actor luôn lấy từ JWT qua `ICurrentUser`, không còn nhận
  `CreatedBy`/`EvaluatorId`/`UserId` từ client; mọi mutation qua `IResourceAuthorizationService`.
- `ResourceAuthorizationService` đã có thêm: `EnsureCanAccessOrganizationAsync`,
  `EnsureCanManageOrganizationAsync`, `EnsureCanManageUserSkillAsync`, `EnsureSelfOrPlatformAdmin`,
  `EnsureCanViewUserPerformanceAsync` (cho phép leader xem lịch sử đánh giá của member — E-02 phụ thuộc).
- Chặn tự chấm điểm cho chính mình trong `ApplyManualScoreCommand` (privilege escalation).
- Refresh token xoay vòng + phát hiện tái sử dụng theo token-family, `/auth/me`, forgot/reset password.
- `OrganizationMember`, `Plan`/`Subscription`/`PaymentTransaction`/`Entitlement`, `IEntitlementService`
  (free = 2 project active, project thứ 3 → `PLAN_UPGRADE_REQUIRED`), `FakePaymentProvider`
  (chỉ Development/UAT, idempotent).
- Admin endpoints + policy `PlatformAdmin`; `PlatformAdminBootstrap` (bootstrap admin đầu tiên có
  kiểm soát, no-op khi đã có admin active).
- **Đã gỡ `DataSeeder.SeedAsync` khỏi `Program.cs`** — cổng release cấm runtime seed data.
- Rate limit nới cho Development/Testing/UAT, vẫn siết ở Staging/Production.
- Migration đã apply sạch vào SQL Server Docker `ai_task_management_uat` (`127.0.0.1:1433`).

### Frontend đã xong
| Mục | File |
|---|---|
| Kanban drag-drop (đã sửa lỗi trắng trang) + filter/sort risk/độ khó/assign/ngày | `KanbanBoard.tsx` |
| ErrorBoundary bọc main content, reset theo `activePage` | `ErrorBoundary.tsx` |
| Notification thật (đã sửa lỗi load vô hạn) | `NotificationsCenter.tsx` |
| AI gợi ý assignee (đã sửa bug hiển thị 5541%) | `AiAssignmentPanel.tsx` |
| AI task summary + classify + risk | `AiTaskInsights.tsx` |
| Priority / AI estimate / blocker kèm task reference | `TaskPlanningPanel.tsx` |
| Thông tin dự án + nút "Risk estimate" quét tuần tự | `ProjectBoardHeader.tsx` |
| Organization: gạt theo gói trả phí, đã xoá nút "New organization", chỉ còn tạo project + assign member | `OrganizationCenter.tsx` |
| Subscription (đã sửa palette tối → sáng) | `SubscriptionCenter.tsx` |
| Evaluation theo dự án: chọn project → member → chấm điểm → lịch sử kèm dự án khác | `EvaluationCenter.tsx` |

`src/app/data/tmaiData.ts` đã bị xoá. `src/app/components/ProjectDetailSheet.tsx` đã bị xoá.

---

## 3. Bẫy đã gặp — đừng lặp lại

1. **Ném lỗi bên trong updater của `setState` sẽ unmount cả cây React**, catch bên ngoài không bắt được.
   Nguyên nhân gốc của bug trắng trang khi kéo thả. Luôn guard trước khi deref response.
2. **API trả 204 → `apiClient` trả `undefined`.** Nếu FE cần object sau mutation, phải sửa backend
   trả về entity (đã làm cho `UpdateProgress`, `/ai/summary`, `/ai/classify`).
3. **Callback inline truyền xuống child làm dependency của `useEffect` → loop vô hạn.** Dùng ref
   (`onUnreadChangeRef`) như trong `NotificationsCenter.tsx`.
4. **Backend trả sẵn phần trăm (55.4), đừng nhân 100 lần nữa.** Dùng helper `clamp`/`pct`.
5. **TypeScript không bắt được lệch tên field khi cả hai đều optional.** Bug "Untitled task" do FE
   khai `dependsOnTitle` còn API trả `dependsOnTaskTitle`. Đối chiếu DTO với controller bằng mắt.
6. **App dùng palette SÁNG.** Mọi component mới phải theo hệ sáng, primary `#1A237E`.
7. **Build xanh + test xanh KHÔNG bắt được lỗi hiển thị.** Bắt buộc tự chụp màn hình bằng Edge và
   xem lại ảnh trước khi báo xong. Người dùng đã phàn nàn nhiều lần vì bỏ qua bước này.
8. Khi sửa file lớn bằng script python, **kiểm tra lại vị trí chèn** — đã từng chèn `useMemo` lọt
   vào trong thân hàm `load` làm board kẹt "Loading" mãi.

---

## 4. Nguyên văn yêu cầu người dùng (phần chưa xong)

> "trong dashboard phải có rõ các cái chart và các dự án view rõ dự án"
> "trang report phải có chức năng report theo dự án chứ k phhair report tổng như này"
> "thanh navbar đang bị set cứng component nó phải có responsive theo Giao diện kéo giãn ra được"
> "chỉnh lại header cho đẹp hiện tại thiếu responsive theo độ dài của trinhf duyệt"
> "trong trang profile thì phải có thêm các thông tin đầy đủ cho user theo như bảng để CRUD skill
> thì có 1 khung riêng chia ra 2 khung trái phải project thì khung to ở dưới"
> "setting thì sẽ có thêm nheieuf khung hơn ưu tiên nằm phía bên phải nhé và có thêm các chức nanưg
> đổi ngôn ngữ đổi giao diện theo chế độ tối hoặc trắng"
> "thêm 1 ô chatbot nhỏ ở dưới sẽ tiến hành code sau"

---

## 5. Quy trình bắt buộc cho mỗi mục

1. Đọc `CLAUDE.md` (đặc biệt mục "Stop and ask") + `docs/production/UI_REMEDIATION_PLAN.md`.
2. Nếu endpoint chưa tồn tại → làm backend + authorization + validation + test **trước**, rồi mới nối FE.
3. Viết/ cập nhật test: component (Vitest) cho logic UI, E2E (Playwright/Edge) cho luồng người dùng.
4. Chạy đủ 4 lệnh verify ở §0. Không sang mục kế khi còn đỏ.
5. **Tự chụp màn hình trong Edge và xem lại ảnh** trước khi báo hoàn thành.
6. Tick vào `docs/production/IMPLEMENTATION_PROGRESS_CHECKLIST.md` kèm số test thật.
7. Không commit/push/merge nếu người dùng không yêu cầu.
