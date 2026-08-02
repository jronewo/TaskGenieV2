# Kế hoạch thực thi — TaskGenie V2 Web Production (Slice 0 → 11)

## Context

Bám đúng chuỗi thực thi trong `docs/production/WEB_PRODUCTION_COMPLETION_AND_UAT_PLAN.md` §9
(Slice 6 → 7 → 8 → 9 → 10 → 11 → fix defect → readiness report), có bổ sung 2 slice do đối chiếu
code thực tế.

**Lý do bổ sung:** phần "Đã hoàn thành" của tài liệu web KHÔNG khớp code. Đã verify trực tiếp
trong repo:

| Tài liệu nói đã xong | Thực tế trong code |
|---|---|
| Backend subscription, plan, quota, payment transaction | ❌ Không có entity `Plan`/`Subscription`/`PaymentTransaction`/`Entitlement` nào |
| Backend organization/member/project assignment | ❌ Chỉ có `Organization` (Name/Description/OwnerId). Không có `organization_members` |
| Backend platform admin, analytics, user/org/subscription/payment/plan management | ❌ `AdminController` chỉ có duy nhất `platform-stats` |
| Backend skill catalog | ⚠️ Có `Skill` nhưng không có cờ `IsActive` → không archive được |
| Desktop web Subscription Center | ❌ Không tồn tại file nào |
| Test 214/214 | ❌ Thực tế 156/156 tại thời điểm đó; hiện 194/194 sau các fix phiên này |

Vì vậy Slice 6 và 7 phải xây backend trước rồi mới nối web, và chèn **Slice 6B** cho domain
thương mại (Slice 7 cần `subscription-analytics`, Slice 11 có case SUB-P/PAY-P/ORG-S).

**Đã xong trong phiên hiện tại** (194/194 test pass, build sạch 4 project + Vite build):
- PROD-0101: refresh token xoay vòng + phát hiện tái sử dụng, `/auth/me`, forgot/reset password, rate limit.
- Vá lỗ hổng `OrganizationsController` (không có authz + `EvaluatorId` từ client) và `SkillsController` (IDOR sửa/xoá skill người khác + `UserId` từ client + tạo master skill không giới hạn quyền).

**Trạng thái frontend đã verify:**
- Đã nối API thật: `src/app/auth/authApi.ts` (register/login/google/logout), `src/app/services/projectApi.ts`, `src/app/services/coreAiApi.ts`.
- `src/app/services/apiClient.ts` đã tự gắn Bearer + có `setUnauthorizedHandler`. **Tái sử dụng, không viết client mới.**
- `src/app/auth/AuthContext.tsx` còn comment "KNOWN PRODUCTION BLOCKER: backend has no refresh token" — nay đã hết đúng, cần nâng cấp.
- Còn **13 component dùng mock** `src/app/data/tmaiData.ts`: App, Sidebar, StatsBar, KanbanBoard, TaskCard, TaskDetailModal, CreateTaskModal, ProjectDetailSheet, TeamManagement, EvaluationCenter, ReportsDashboard, AdministrationCenter, MobileDashboard.
- **Không có** UI Organization / Skill Management / Pricing-Subscription.

---

## Nguyên tắc bắt buộc (§2 tài liệu web)

1. Chỉ desktop web; không đụng `mobile-FE`.
2. Không runtime seed/demo data.
3. Không chèn thẳng SQL để làm test pass — mọi nghiệp vụ qua UI/API thật.
4. Ngoại lệ duy nhất: payment gateway mô phỏng, nhưng `subscriptions`/`payment_transactions` phải ghi thật vào SQL Server.
5. Endpoint chưa có → làm backend + authorization + validation + automated test TRƯỚC khi nối frontend.
6. Mọi button phải có API/action thật hoặc bị gỡ khỏi UI. Không placeholder/mock success/`console.log`.
7. Không apply migration/UAT trước khi qua cổng review (Slice 9).
8. Không commit/push khi chưa được yêu cầu.

---

## Slice 0 — Đóng nốt security gate (làm trước Slice 6)

Audit 10 controller còn lại theo đúng 2 tiêu chí đã bắt được lỗi 2/2 lần: **(a)** thiếu
authorization/ownership check, **(b)** actor ID nhận từ request body thay vì JWT.

- `EvaluationsController`, `InvitationsController`, `MeetingsController`, `UserScoresController`,
  `ActivityLogsController`, `NotificationsController`, `ExportController`, `UsersController`,
  `TaskProgressController`, `TaskRequiredSkillsController`.

Cách sửa: tái sử dụng `IResourceAuthorizationService`
(`src/TaskGenie.Application/Interfaces/IResourceAuthorizationService.cs`) — đã có
`EnsureCanAccessProject/ManageProject/AccessTeam/ManageTeam/AccessTask/ManageTask/AccessOrganization/ManageUserSkill`.
Chỉ thêm method mới khi thật sự thiếu; actor luôn lấy từ `ICurrentUser`.

Mỗi lỗ hổng phải có test âm tính (401/403/404) theo mẫu
`tests/TaskGenie.Tests/Integration/SkillAuthorizationApiTests.cs`.

**DoD:** không controller nào còn nhận actor từ client; mọi mutation/read có resource check; full test pass.

---

## Slice 6 — Organization (backend trước, rồi desktop web)

### 6.1 Backend (chưa tồn tại — phải xây)

Domain mới `src/TaskGenie.Domain/Entities/OrganizationMember.cs`:
`Id`, `OrganizationId`, `UserId`, `Role` (OWNER/ORG_ADMIN/MEMBER), `Status` (ACTIVE/REMOVED),
`JoinedAt`, `InvitedBy`, unique active `(OrganizationId, UserId)`.
Kèm `IOrganizationMemberRepository` + implementation + mapping trong `AppDbContext.cs` + migration.

Endpoint còn thiếu (theo §3 tài liệu, đối chiếu thực tế):

| Endpoint | Trạng thái |
|---|---|
| `GET /api/organizations/my`, `GET /{orgId}`, `GET /{orgId}/projects` | ✅ đã có, đã vá authz |
| `POST /api/organizations` | ❌ phải làm |
| `PUT /api/organizations/{orgId}` | ❌ phải làm |
| `GET/POST /api/organizations/{orgId}/members` | ❌ phải làm |
| `PUT /api/organizations/{orgId}/members/{memberId}/role` | ❌ phải làm |
| `DELETE /api/organizations/{orgId}/members/{memberId}` | ❌ phải làm |
| `POST /api/organizations/{orgId}/projects/{projectId}/assign-member` | ❌ phải làm |

Sau khi có bảng member, **mở rộng** `EnsureCanAccessOrganizationAsync` (hiện chỉ chấp nhận
owner/platform-admin) để chấp nhận cả active member — đây là TODO đã ghi sẵn trong code.

Test âm tính bắt buộc: user ngoài org không đọc được member/project; MEMBER không quản lý member;
không assign user ngoài org vào project; không đổi ID để thao tác org khác; không xoá OWNER cuối cùng.

### 6.2 Web

File mới: `OrganizationRegistrationPage.tsx`, `OrganizationSettingsPage.tsx`,
`OrganizationSwitcher.tsx`, `OrganizationMembers.tsx` trong `FE-WEB-V2/src/app/components/`,
service `src/app/services/organizationApi.ts` (dùng `apiRequest` sẵn có).

Button checklist theo §3: tạo tổ chức / lưu thông tin / thêm member bằng email / đổi role / xoá
member (confirm + chống double-submit) / tạo project thuộc org / assign member / promote Project
Leader. Mọi button có loading/error/empty/disabled và reload sau mutation.

---

## Slice 6B — Domain thương mại (chèn thêm; Slice 7 và 11 phụ thuộc)

Entity + bảng: `plans`, `subscriptions`, `payment_transactions`, `entitlements`
(tiền lưu integer minor units, KHÔNG dùng float; unique `IdempotencyKey`; subscription owner XOR
User/Organization).

- `IPaymentProvider` + `FakePaymentProvider` — **chỉ đăng ký ở Development/UAT**, Production phải
  fail startup nếu resolve được; endpoint test-only trả 404 ở Production.
- `IEntitlementService`: `CanCreateProject`, `ProjectLimit/Usage`, `PremiumStatus`, `EntitlementSources`.
  Free = tối đa 2 project active, project thứ 3 trả `PLAN_UPGRADE_REQUIRED`, check atomic trong transaction.
- Premium tổ chức = entitlement động qua active membership; **không** sửa `User.Role`.
- API: `POST /api/billing/checkout-sessions`, `GET /api/billing/subscription`,
  `POST /api/billing/subscription/cancel`, `GET /api/billing/payments`,
  `POST /api/test-payments/{paymentId}/simulate` (allowlist SUCCEEDED/FAILED/CANCELED/REFUNDED/EXPIRED).

Test theo ma trận §3 tài liệu: personal success, org success, failed, cancel, **duplicate simulate
phải idempotent**, refund, expire, member removed chỉ mất entitlement org (giữ personal Premium),
cross-tenant fake payment trả 403/404.

Web: `SubscriptionCenter.tsx` (tab Personal/Organization, quota, payment history, fake checkout) —
không hardcode plan/price trong React.

---

## Slice 7 — Platform Admin + Skill Management (backend trước, rồi web)

### Backend còn thiếu
`/api/admin/users*` (search/list/detail/status/role), `/api/admin/organizations*`,
`/api/admin/subscriptions`, `/api/admin/payments`, `/api/admin/plans*`,
`/api/admin/subscription-analytics` — tất cả gắn `[Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]`
(policy đã tồn tại trong `src/TaskGenie.API/Authorization/AuthorizationPolicies.cs`).

Skill: thêm `Skill.IsActive` + migration, `/api/skills/admin` (pagination/search/filter),
`/api/skills/{id}/active`, `/api/skills/me`. User thường chỉ thấy skill active.

Rule chặn: không hạ quyền/xoá platform admin active cuối cùng; không hard-delete skill đang được
`TaskRequiredSkill`/`UserSkill` tham chiếu (deactivate thay thế); unique normalized skill name.

### Web
Viết lại `AdministrationCenter.tsx` (bỏ mock `tmaiData`), thêm `SkillManagement.tsx`.
Sidebar/page ẩn với user thường **và** backend vẫn trả 403 khi gọi thẳng.
Chart dùng dữ liệu API thật.

---

## Slice 8 — Audit toàn bộ button/API Task, Team, AI

Lập inventory mọi phần tử tương tác trong `FE-WEB-V2` theo bảng §3 tài liệu
(Page/Label/Handler/Endpoint/Auth/Success/Failure/DB evidence/Status).

Gỡ nốt mock `tmaiData` khỏi các component còn lại: Sidebar, StatsBar, KanbanBoard, TaskCard,
TaskDetailModal, CreateTaskModal, ProjectDetailSheet, TeamManagement, EvaluationCenter,
ReportsDashboard, App.tsx, MobileDashboard.

Nâng cấp `src/app/auth/AuthContext.tsx`: dùng `/auth/refresh` + `/auth/me` (đã có backend từ phiên
này), queue request khi đang refresh, bootstrap session khi F5; thêm trang forgot/reset password.
Xoá comment "KNOWN PRODUCTION BLOCKER" đã lỗi thời.

AI: dùng chung client đã xác thực, kiểm tra project/task access, hiển thị lỗi timeout/provider rõ
ràng, accept/reject recommendation idempotent. Cấu hình HuggingFace key thật qua user-secrets.

**DoD:** không còn button placeholder; không còn fake response ngoài payment gateway; không còn sai
method/path/payload.

---

## Slice 9 — Cổng review + verification tự động

⚠️ **Khác tài liệu:** tài liệu giả định Claude làm trong worktree
`.claude/worktrees/security-foundation-v2` rồi Codex import về main. Thực tế phiên này làm **trực
tiếp trong repo chính** (đúng theo CLAUDE.md: "This repository is the canonical implementation
workspace"). Nên Slice 9 là cổng verify tại chỗ, không phải bước import.

Kiểm: authorization/validation/transaction boundary/null handling; DTO frontend khớp controller;
không file mobile bị sửa; không còn `DataSeeder` chạy lúc startup; không secret trong git/log/bundle.

```bash
dotnet build src/TaskGenie.Domain/TaskGenie.Domain.csproj --artifacts-path /tmp/taskgenie-claude-build
dotnet build src/TaskGenie.Application/TaskGenie.Application.csproj --artifacts-path /tmp/taskgenie-claude-build
dotnet build src/TaskGenie.Infrastructure/TaskGenie.Infrastructure.csproj --artifacts-path /tmp/taskgenie-claude-build
dotnet build src/TaskGenie.API/TaskGenie.API.csproj --artifacts-path /tmp/taskgenie-claude-build
dotnet test tests/TaskGenie.Tests --artifacts-path /tmp/taskgenie-claude-tests

cd FE-WEB-V2 && /Users/jronehuynh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build
```

---

## Slice 10 — Docker SQL Server + migration

Chỉ chạy sau khi Slice 9 pass. Container `sqlserver2022`, `localhost,1433`, DB
`ai_task_management_uat`. Lấy password từ environment container, **không in ra**, truyền qua
`dotnet user-secrets` (kèm `Jwt:Secret`, `GoogleAuth:ClientId`, `HuggingFace:ApiKey`, Cloudinary).

Migration đang chờ apply (thực tế, không phải danh sách trong tài liệu):
`20260801120000_AddTeamIsProjectManaged`, `20260801135729_AddRefreshTokensAndPasswordResetTokens`,
cộng các migration mới sinh ở Slice 6/6B/7.

```bash
dotnet ef migrations list --project src/TaskGenie.Infrastructure --startup-project src/TaskGenie.API
dotnet ef database update --project src/TaskGenie.Infrastructure --startup-project src/TaskGenie.API
```

Không `database drop`/`docker rm`/`TRUNCATE`/xoá volume nếu chưa được xác nhận.
Xác minh `__EFMigrationsHistory` + các bảng mới bằng sqlcmd trong container.

---

## Slice 11 — UAT trên trình duyệt với DB thật

Chuẩn bị dữ liệu theo §5: Google login thật tạo user → bootstrap PLATFORM_ADMIN một lần có kiểm
soát → logout/login lại lấy JWT mới → tạo plan catalog qua Admin UI → owner/member login → tạo
org/member/project/task/skill qua UI thật. **Không DataSeeder, không INSERT tay.**

Chạy đủ các bảng case: ENV-01/02, AUTH-01..05, SUB-P-01..07, PAY-P-01..05, ORG-01..10,
ORG-P-01..06, ORG-S-01..07, ADM-01..10, SKL-01..08, PRJ/TSK/TEM/CMT/EVD/AI-01..08.

Evidence mỗi case: screenshot trước/sau, user+role, method+endpoint+status, ID record, SQL query
đối chiếu, kết quả PASS/FAIL/BLOCKED. **Không đưa token/password/API key vào evidence.**

---

## Fix defect → automated regression → UAT retest

Mỗi defect: ID, severity (P0..P3), environment, user/role, precondition, steps, expected/actual,
screenshot/network, endpoint+status, DB evidence, root cause, fix + retest.
Mọi defect bảo mật phải có automated regression test trước khi đóng.

## Production readiness report

Điều kiện đạt (§8): 0 P0/P1 mở; full backend test pass; FE production build pass; migration apply
sạch trên DB UAT; Google login/logout/authorization pass; free quota chặn đúng project thứ 3;
Personal/Org Pro chạy qua payment mô phỏng ghi DB thật; org role + Project Leader pass; premium
inheritance đúng và không mutate plan cá nhân; admin dashboard/CRUD/chart/plan/skill pass;
Task/Team/AI button mapping pass; không runtime seed; không file mobile bị đổi; không secret rò rỉ.

---

## Verification xuyên suốt

Sau **mỗi** slice: build 4 project + `dotnet test` + Vite build (lệnh ở Slice 9). Không sang slice
kế tiếp khi còn đỏ. Cập nhật `docs/production/IMPLEMENTATION_PROGRESS_CHECKLIST.md` (tick + ghi số
test) ngay khi xong từng mục, kèm dòng "Đang làm ngay bây giờ".
