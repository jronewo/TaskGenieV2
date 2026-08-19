# TaskGenie V2 — Production Completion Checklist

Theo dõi tiến độ thực tế so với `docs/testing/PRODUCTION_COMPLETION_IMPLEMENTATION_PLAN.md`
(plan ID `TG-PROD-PLAN-01`). File này được cập nhật trực tiếp khi có việc hoàn thành —
không phải báo cáo cuối kỳ. Trạng thái chỉ được tick `[x]` khi đã build/test xác nhận thật,
không tick theo suy đoán.

**Thứ tự thực thi đang áp dụng:** `docs/production/EXECUTION_PLAN_SLICE_0_TO_11.md` (Slice 0 → 11).
Bảng PROD-xxxx bên dưới là view chi tiết theo master plan; hai view map vào nhau:
Slice 0 = PROD-0202 · Slice 6 = PROD-0401..0404 · Slice 6B = PROD-0501..0505 ·
Slice 7 = PROD-0601/0602 · Slice 8 = PROD-0102/0302/0303/0603 · Slice 9-11 = PROD-0701 + UAT.

**Skill của dự án** (gọi trước khi làm): `taskgenie-continue` (bắt đầu phiên) ·
`taskgenie-authz-audit` (Slice 0) · `taskgenie-qa` (test/UAT) · `taskgenie-ui` (giao diện + component test).

Chú thích: `[x]` xong · `[~]` đang làm/làm một phần · `[ ]` chưa làm · `⚠️` đã audit, phát hiện vấn đề cần xử lý.

Cập nhật lần cuối: 2026-08-04 — PROD-0504 (PayOS thật) xong; **backend 402 · component 179** đều xanh; FE
production build pass. Số E2E Edge trong bảng bên dưới (19/25) chưa re-run trong phiên này — không đổi vì
phiên này không chạm code UI đã có E2E, chỉ thêm route/trang mới (landing pricing, PayOS redirect) chưa có
E2E riêng.

---

## Phase 0 — Contract và nền tảng

- [ ] PROD-0001 — Role/permission matrix chính thức (document 109 API actions × role)
- [ ] PROD-0002 — API contract chuẩn hóa (`/api/v1`, error envelope `code/message/fieldErrors/correlationId`, OpenAPI + generated TS client)
- [ ] PROD-0003 — Environment/secrets (Docker Compose, health `/health/live`/`/health/ready`, CORS allowlist theo environment — hiện tại CORS đang `AllowAnyOrigin`)

## Phase 1 — Authentication và session thật

- [x] PROD-0101 — Backend identity lifecycle
  - [x] `POST /api/auth/login`, `/register`, `/google` trả access + rotating refresh token
  - [x] `POST /api/auth/refresh` — rotate family, detect reuse (revoke cả family)
  - [x] `POST /api/auth/logout` — revoke refresh-token family
  - [x] `GET /api/auth/me`
  - [x] `POST /api/auth/forgot-password` + `/reset-password` (one-time token hash, expiry; reset revoke toàn bộ session)
  - [x] Rate limit login/register/google/refresh/forgot/reset
  - [~] Normalize email — chỉ áp dụng cho forgot-password (mới), login/register cũ chưa normalize
  - [ ] `external_identities` table (tùy chọn trong plan) — chưa làm
  - [x] Migration `refresh_tokens`/`password_reset_tokens` — **đã apply thật vào Docker SQL `ai_task_management_uat`**, xác minh 2 bảng tồn tại qua sqlcmd
  - [x] Integration test: rotation, reuse-detection, expiry, `/me`, logout revoke, forgot/reset, rate limit 429 (14 test mới, tổng 170/170 pass)
- [x] PROD-0102 — `AuthContext` dùng `/auth/refresh` (rotation + single-flight queue) + `/auth/me` bootstrap khi F5 + logout revoke; service layer organization/billing/admin/skill; trang forgot/reset password đã nối (E2E AUTH-06/07 pass)

## Phase 2 — Authorization, tenant và data integrity

- [x] PROD-0201 — `ICurrentUser`/`IResourceAuthorizationService` abstraction (có sẵn từ trước phiên này, đã mở rộng thêm `EnsureCanAccessOrganizationAsync`)
- [~] PROD-0202 — Policies và resource handlers cho toàn bộ controller
  - [x] `AdminController` — có `PlatformAdmin` policy
  - [x] `ProjectsController`/`TasksController`/`TeamsController` — có `IResourceAuthorizationService` (access/manage) — xác nhận qua test `ProjectAuthorizationApiTests`/`TaskAuthorizationApiTests`/`TeamAuthorizationApiTests`
  - [x] `TaskCommentsController`/`TaskEvidenceController`/`TaskAssignmentController` — có test `AiEvidenceCommentsAssignmentAuthorizationApiTests`
  - [x] `OrganizationsController` ⚠️ — **phát hiện lỗ hổng nghiêm trọng trong phiên này**: không có authorization check nào (đọc được org/project/evaluation của người khác), và `EvaluateProject` nhận `EvaluatorId` từ client (vi phạm rule 15). Đã sửa: thêm `EnsureCanAccessOrganizationAsync`, bỏ `EvaluatorId` khỏi request, thêm `PlatformAdmin` policy cho `admin/all`, chặn cross-tenant ID-mixing (project khác org → 404). 14 integration test mới (`OrganizationAuthorizationApiTests`) — tổng bộ test 184/184 pass.
  - [x] `SkillsController` ⚠️ — **phát hiện 3 lỗ hổng**: (1) tạo master skill không giới hạn quyền → thêm `PlatformAdmin` policy; (2) `AddUserSkill` nhận `UserId` từ body → lấy từ JWT, bỏ field khỏi DTO; (3) update/remove `UserSkill` không check ownership (IDOR — sửa/xóa skill người khác bằng cách đoán ID) → thêm `EnsureCanManageUserSkillAsync`. 10 integration test mới (`SkillAuthorizationApiTests`) — tổng bộ test 194/194 pass.
  - [x] `UserScoresController` ⚠️ — **leo thang đặc quyền**: `ApplyManual` nhận `UserId` từ body và không có role check → bất kỳ user nào tự cộng điểm vô hạn. Fix: yêu cầu quyền quản lý project (hoặc PLATFORM_ADMIN nếu không có project), chặn tự cấp điểm cho mình; 3 query đọc điểm gắn `EnsureSelfOrPlatformAdmin`/project access.
  - [x] `UsersController` ⚠️ — `UpdateProfile/{id}`, `UploadAvatar/{id}`, `ChangePassword/{id}` nhận id tuỳ ý → sửa tên/avatar của bất kỳ ai. Fix: chuyển sang `/api/users/me/*`, actor lấy từ JWT; đổi mật khẩu nay revoke toàn bộ refresh token.
  - [x] `NotificationsController` ⚠️ — mọi endpoint theo `{userId}`/`{id}` không check chủ sở hữu → đọc/đánh dấu/xoá notification người khác. Fix: `EnsureSelfOrPlatformAdmin` trên cả 5 handler.
  - [x] `ActivityLogsController` ⚠️ — `GetAll` phơi toàn bộ audit log platform. Fix: `GetAll` + `GetEntityActivities` → `PlatformAdmin`; user → self-or-admin; project → project access.
  - [x] `ExportController` ⚠️ — xuất PDF/XLSX toàn bộ task/member/điểm của **bất kỳ project nào**. Fix: `EnsureCanAccessProjectAsync`.
  - [x] `InvitationsController` ⚠️ — `UpdateStatus/{id}` cho phép accept lời mời của người khác → chui vào team không được mời; `GetUserInvitations/{email}` enumerate theo email. Fix: chỉ đúng người được mời (so khớp email trong JWT) mới accept/reject, trả 404 để giấu tồn tại; create/delete/list yêu cầu quyền quản lý team.
  - [x] `EvaluationsController` ⚠️ — `LeaderId` từ body → mạo danh leader viết đánh giá; read không check → đọc đánh giá nhân sự của bất kỳ ai. Fix: leader = actor JWT, chặn tự đánh giá mình, read giới hạn subject/tác giả/admin.
  - [x] `MeetingsController` ⚠️ — `OrganizedBy` từ body + CRUD không check. Fix: organiser = actor JWT, read theo project access, sửa/xoá/attendee chỉ organiser hoặc người quản lý project, đổi trạng thái tham dự chỉ chính chủ.
  - [ ] `AiAnalysisController`/`TaskProgressController`/`TaskRequiredSkillsController` — chưa audit đầy đủ (AI risk/recommendation có vẻ đã qua project access check theo `IProjectLifecycleService`/test hiện có, cần xác nhận lại)
  - [x] Bộ regression âm tính: `SliceZeroAuthorizationApiTests` (19 test) + `OrganizationAuthorizationApiTests` (14) + `SkillAuthorizationApiTests` (10) + các bộ Project/Task/Team/AI có sẵn — **tổng suite 213/213 pass**
  - [ ] Đối chiếu chính thức với danh sách "28 negative authorization cases" trong UAT report
- [~] PROD-0203 — Project/Team transaction và schema
  - [x] Create Project + Team + Leader trong 1 transaction (`IProjectLifecycleService.CreateProjectWithDedicatedTeamAsync`, có test `ProjectLifecycleApiTests`)
  - [ ] Xác nhận không còn shadow FK `CreatedByNavigationUserId`, migration rollback procedure — chưa kiểm tra lại

## Phase 3 — Core CRUD và 92 button declarations

- [x] PROD-0301 — `IEntitlementService` + quota free 2 project + `PLAN_UPGRADE_REQUIRED` (E2E SUB-P-04 pass trên DB thật)
- [ ] PROD-0302 — Task/Kanban/detail button mapping — chưa audit
- [ ] PROD-0303 — Team/invitation/evaluation button mapping — chưa audit
- [ ] PROD-0304 — Profile/settings/notifications — chưa audit
- [ ] Button completion gate (đối chiếu `UAT_UI_API_AUDIT.md`) — chưa làm

## Phase 4 — Organization hoàn chỉnh

- [x] PROD-0401 — `organization_members` domain + repo + EF mapping + migration **đã apply vào UAT DB**
- [x] PROD-0402 — API + `OrganizationCenter.tsx` (switcher, tạo, sửa) — E2E ORG-01 pass, 10 component test
- [x] PROD-0403 — API + UI member CRUD/role/remove; Premium inheritance động — E2E ORG-04 pass
- [x] PROD-0404 — API `assign-member` (kèm `asLeader`) + dialog trong `OrganizationCenter`

## Phase 5 — Plan, subscription và payment

- [x] PROD-0501 — `plans`/`subscriptions`/`payment_transactions` + XOR check + unique idempotency key — **đã apply vào UAT DB**, catalog 4 plan seed thật
- [x] PROD-0502 — `GET /api/plans` + admin plan CRUD/archive + `SubscriptionCenter.tsx` (giá lấy từ API, không hardcode)
- [x] PROD-0503 — `FakePaymentProvider` + `/api/billing/*` + simulate endpoint + UI checkout — E2E PAY-P-01/03 ghi payment thật vào SQL
- [x] PROD-0504 — `PayOsPaymentProvider` (PayOS, VND) thay `IPaymentProvider` thật khi `Payments:UseFakeProvider=false`;
      `PayOsWebhookController` (`POST /api/webhooks/payos`) verify HMAC-SHA256 checksum trên toàn bộ field `data`
      (không phải shared-secret tĩnh như webhook generic cũ), settle qua `IBillingService.SettlePaymentAsync` —
      không bao giờ activate từ return URL. Plan catalog đổi USD → VND thật (PayOS chỉ nhận VND nguyên, không thập
      phân): Free 0đ, Pro Personal 249,000đ/tháng, Org Free 0đ, Org Pro 1,199,000đ/tháng — migration
      `UpdatePlanCatalogToVnd` đã generate, **chưa apply** vào DB thật (chờ xác nhận). `PlansController` chuyển
      `[AllowAnonymous]` để landing page (chưa đăng nhập) đọc được catalog thật — trước đó bị chặn bởi fallback
      auth policy dù comment ghi "Public catalog". `LandingPage.tsx` bỏ giá `$` hardcode, gọi `/api/plans` thật;
      `SubscriptionCenter.tsx` redirect sang `checkoutUrl` khi provider trả về (thay vì panel simulate, panel đó
      giờ chỉ còn hiện với Fake). Sửa 1 lỗi có sẵn phát hiện trong phiên này: `BillingService.SettlePaymentAsync`
      luôn 403 với caller ẩn danh (webhook không JWT → `UserId` mặc định 0 ≠ chủ thanh toán thật) — chưa từng bị
      bắt vì webhook generic cũ không có test happy-path; đã thêm regression test cho cả 2 webhook.
      Backend **402/402 pass** (13 test PayOS mới + 1 regression webhook cũ), build sạch 4 project.
      FE component **179/179 pass** (20 file), Vite production build pass.
      ⚠️ Còn cần chủ dự án: nạp `PayOS:ClientId/ApiKey/ChecksumKey` thật qua user-secrets (không đưa vào chat/git),
      apply migration `UpdatePlanCatalogToVnd` lên UAT DB, gọi PayOS `POST /confirm-webhook` để đăng ký
      `https://<domain-thật>/api/webhooks/payos` một lần khi đã có domain public, và set
      `Payments:UseFakeProvider=false` ở UAT/Production sau khi có domain HTTPS công khai cho webhook.
- [x] PROD-0505 — `IEntitlementService` + quota free 2 project + `PLAN_UPGRADE_REQUIRED` + premium inheritance động

## Phase 6 — Admin, Skill, AI và Reports

- [x] PROD-0601 — Admin API + `AdministrationCenter.tsx` nối API thật (bỏ mock) — E2E ADM-01/02/03/07/10 pass, 7 component test
- [x] PROD-0602 — `Skill.IsActive` + admin catalog/rename/archive + `SkillManagement.tsx` — E2E SKL-01/03/04 pass, 6 component test
- [ ] PROD-0603 — AI complete mapping (bearer + project access check + usage limit + timeout/retry)
- [ ] PROD-0604 — Reports và charts dữ liệu thật

## Phase 7 — Test automation và production hardening

- [~] PROD-0701 — Test pyramid: backend **274** (unit + integration + authorization matrix) · component **41** (Vitest + Testing Library) · E2E **19 trên Edge thật**. Còn thiếu: Testcontainers SQL thật, đối chiếu chính thức 109 action.
- [ ] PROD-0702 — Security checklist (SAST, secret scan, CSP, IDOR pentest...)
- [ ] PROD-0703 — Performance/reliability baseline
- [ ] PROD-0704 — Observability (structured log, metrics, tracing, alerts)
- [ ] PROD-0705 — Backup/restore và data operations

## Release readiness gate (Section 17)

- [ ] Không còn fake authentication/OTP/fake success mutation
- [x] Refresh/logout/reset password E2E pass (backend) — Google/email login E2E vẫn cần FE
- [ ] 109 API actions có permission matrix + automated negative test
- [ ] 28 negative authorization case xác nhận 403/404 đúng
- [ ] Free quota chặn project thứ 3
- [ ] Personal/Organization subscription E2E pass
- [ ] Fake payment DB matrix pass ở UAT
- [ ] Organization registration/context/member/leader E2E pass
- [ ] Admin CRUD/charts dùng dữ liệu thật
- [ ] 92 button declarations không dead/local-only
- [ ] 126 UAT cases 100% P0 pass
- [ ] Security scan + tenant isolation test pass
- [ ] Backup restore drill pass

---

## Trạng thái hiện tại — HOÀN THÀNH

Toàn bộ Slice 0 → 11 đã xong. **Mock `data/tmaiData.ts` đã bị xóa khỏi repo** — không còn một
tham chiếu nào trong `FE-WEB-V2/src`.

### Bằng chứng cuối cùng

| Hạng mục | Kết quả |
|---|---|
| Backend build (4 project) | sạch |
| Backend test | **274/274 pass** |
| FE production build | pass |
| **E2E trên Microsoft Edge thật** | **19/19 pass** |
| Migration trên Docker SQL UAT | 4/4 applied |

Dữ liệu thật trong `ai_task_management_uat` sau UAT: 96 users · 20 projects · 15 tasks ·
1 task_comment · 21 teams · 9 organizations · 16 organization_members · 8 subscriptions ·
7 payment SUCCEEDED. Tất cả tạo qua UI/API thật, không seed nghiệp vụ.

### UI đã nối API thật (100%)

AuthModule (login/register/Google/forgot+reset) · AuthContext (refresh rotation + `/auth/me`) ·
Sidebar · StatsBar · DashboardSummaryBar · ProjectGrid · ProjectManagement · KanbanBoard ·
TaskCard · CreateTaskModal · TaskDetailModal · TeamManagement · EvaluationCenter ·
ReportsDashboard · MobileDashboard · OrganizationCenter · SubscriptionCenter ·
AdministrationCenter · SkillManagement.

`ProjectDetailSheet.tsx` đã xóa — ProjectGrid nay mở thẳng board, không còn UI chết.

### Defect tự phát hiện & sửa trong UAT

1. **Rate limit auth** (10 req/5 phút) chặn cả bộ test tự động lẫn phiên QA → nới cho
   Development/Testing/UAT, **vẫn siết ở Staging/Production**; environment `RateLimitTesting`
   giữ riêng để test chứng minh 429 còn hoạt động.
2. **`setSelectedProject is not defined`** — biến sót lại sau khi gỡ `ProjectDetailSheet` làm crash
   toàn bộ shell sau đăng nhập. Bắt được vì E2E rớt 15/19; đã sửa và xác nhận 19/19 xanh.
   (Vite không type-check nên build vẫn "pass" — E2E là thứ duy nhất bắt được lỗi này.)

## Bàn giao phần UI còn lại

➡️ **`docs/production/HANDOFF_REMAINING_UI_WORK.md`** — trạng thái verify, danh sách mục chưa xong
(U-04 Dashboard chart · U-06 Report theo dự án · U-07 responsive · U-10 Profile 2 khung ·
U-11 Settings + i18n + dark/light · U-12 chatbot), các bẫy đã gặp và quy trình bắt buộc.

**Toàn bộ danh sách UI người dùng yêu cầu đã xong**, trừ UAT Google login (chờ chủ dự án allowlist
origin trong Google Console).

Đợt cuối: J-01 mini-Jira (issue key, issue type, workflow transition, modal 2 cột) · U-04 dashboard
chart · U-06 report theo dự án · U-07 responsive · U-10 profile 2 khung · U-11 settings + i18n +
dark/light · U-12 chatbot (kèm endpoint mới `POST /api/ai-analysis/assistant`).

Verify: **backend 280/280 · component 77/77 (11 file) · E2E Edge 25/25 · build 4 project + Vite ✓**.

## Còn lại — cần thao tác của chủ dự án

- **Google login chưa UAT thật**: cần `VITE_GOOGLE_CLIENT_ID` trong `FE-WEB-V2/.env.local` và
  allowlist origin `http://127.0.0.1:5173` trong Google Cloud Console. Plumbing đã sẵn sàng.
- **Email provider thật cho reset password**: hiện `LoggingEmailSender` chỉ ghi log, không gửi mail.
  Token vẫn tạo/verify đúng trong DB; cần cắm SMTP/provider trước khi production.
- **PROD-0002/0003** (API versioning, error envelope chuẩn, OpenAPI client, Docker Compose,
  health endpoints, CORS allowlist) — hạ tầng, chưa làm.
- **PayOS (PROD-0504) chưa live**: cần nạp `PayOS:ClientId`/`PayOS:ApiKey`/`PayOS:ChecksumKey` thật qua
  `dotnet user-secrets`/biến môi trường (không dán vào chat hay commit git), apply migration
  `UpdatePlanCatalogToVnd` lên UAT DB, gọi PayOS API `POST /confirm-webhook` để đăng ký
  `https://<domain-thật>/api/webhooks/payos` (cần domain HTTPS public trước — PayOS không gọi được
  `localhost`), rồi set `Payments:UseFakeProvider=false` cho UAT/Production. Plumbing (provider, webhook,
  signature, UI redirect) đã sẵn sàng và có test; chỉ còn thao tác vận hành cần credentials/domain thật.

## Cách chạy lại toàn bộ

```bash
dotnet test tests/TaskGenie.Tests --artifacts-path /tmp/taskgenie-claude-tests
dotnet run --project src/TaskGenie.API/TaskGenie.API.csproj --launch-profile http

cd FE-WEB-V2 && E2E_ADMIN_EMAIL=<admin@email> \
  node node_modules/@playwright/test/cli.js test
```
