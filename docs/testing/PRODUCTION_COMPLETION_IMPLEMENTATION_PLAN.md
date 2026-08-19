# TaskGenie V2 – Production Completion Implementation Plan

Plan ID: `TG-PROD-PLAN-01`  
Ngày lập: 2026-08-01  
Đầu vào: `UAT-TG-V2-EXEC-01`, 126 UAT cases và UI/API audit  
Trạng thái hiện tại: **NO-GO**  
Mục tiêu: đưa TaskGenie V2 từ prototype có backend một phần thành production release có authentication, authorization, organization, subscription/payment, CRUD, AI và vận hành đầy đủ.

## 1. Quyết định nghiệp vụ cần dùng làm baseline

Plan này sử dụng các rule sau. Nếu Product Owner thay đổi rule, phải cập nhật API contract, entitlement tests và UAT cases trước khi code.

1. User miễn phí được sở hữu tối đa **2 project đang active**.
2. Khi tạo project thứ 3, backend trả `403 PLAN_UPGRADE_REQUIRED`; UI mở trang Upgrade hoặc cho user xóa/archive project cũ.
3. Project đã archive/soft-delete không tính quota; project chỉ đóng trạng thái `Completed` vẫn tính quota nếu chưa archive.
4. Subscription cá nhân cấp Premium cho chính user sở hữu subscription.
5. Subscription tổ chức cấp Premium entitlement cho các membership `ACTIVE` trong phạm vi và giới hạn member của plan.
6. Không đổi `User.Role` thành `PREMIUM`. Premium là entitlement thương mại, không phải quyền quản trị.
7. Platform role: `NORMAL_USER`, `PLATFORM_ADMIN`.
8. Organization role: `OWNER`, `ORG_ADMIN`, `PROJECT_LEADER`, `MEMBER`.
9. Một user có thể thuộc nhiều organization và có role khác nhau ở từng organization.
10. Project của organization phải thuộc đúng organization; Project Leader phải là active member của organization đó.
11. Chỉ `OWNER/ORG_ADMIN` được quản lý member và gán Project Leader. Leader chỉ quản lý project được giao.
12. Trong Development/UAT, payment dùng `FakePaymentProvider`: tạo transaction, subscription và entitlement thật trong database để kiểm thử toàn bộ nghiệp vụ.
13. Fake payment chỉ được bật bằng environment flag ở Development/UAT; endpoint giả phải trả 404 và service không được đăng ký trong Production.
14. Khi tích hợp provider thật, payment chỉ kích hoạt entitlement sau khi webhook hợp lệ được xử lý idempotent; không tin redirect từ browser.
15. Mọi actor ID như `CreatedBy`, `OrganizedBy`, `EvaluatorId`, comment `UserId` phải lấy từ JWT, không tin dữ liệu client.

## 2. Phạm vi production release

### Bắt buộc trong Release 1.0

- Email/password login, Google login, logout, refresh token, forgot/reset password.
- Role/ownership/tenant authorization cho toàn bộ 109 API actions hiện có.
- Core CRUD thật cho Project, Task, Team, Member, Invitation, Evaluation, Notification và User Profile.
- Free quota và entitlement service.
- Personal và Organization plan catalog.
- Checkout, payment history, webhook và subscription lifecycle.
- Fake payment ghi database cho Development/UAT; adapter provider thật cho Production.
- Organization registration, switch context, membership, invitation và role management.
- Assign/chuyển Project Leader.
- Admin quản lý user, organization, plan, subscription, payment và skill.
- AI Risk, Recommendation, Evidence, Summary và Classification hoạt động bằng session thật.
- Reports/charts lấy dữ liệu thật.
- Audit log, monitoring, backup, CI/CD, security hardening và rollback.
- Web responsive production-ready.

### Không chặn Release 1.0

- Native mobile production release. Mobile chỉ smoke nếu không được đưa vào scope phát hành.
- Real-time chat/streaming AI nâng cao.
- SSO enterprise ngoài Google.
- Multi-currency/tax invoice phức tạp.
- Marketplace skill hoặc custom organization billing.

## 3. Nguồn lực và lịch chuẩn

Ước lượng dưới đây dành cho 2 Backend, 2 Frontend, 1 QA và 0.5 DevOps, sprint 2 tuần. Nếu chỉ có một developer full-stack, nên nhân thời gian từ 2 đến 2.5 lần.

| Giai đoạn | Thời lượng | Kết quả bắt buộc |
|---|---:|---|
| Phase 0 – Contract và nền tảng | 3–5 ngày | Rule, role matrix, OpenAPI, CI và environment thống nhất |
| Phase 1 – Auth/session | 1.5 tuần | Không còn fake login; session refresh-safe |
| Phase 2 – Authorization/data integrity | 1.5 tuần | 28 negative cases trả 403/404; không orphan/500 |
| Phase 3 – Core CRUD và 92 buttons | 2 tuần | Project/Task/Team/Profile/Evaluation persist thật |
| Phase 4 – Organization | 2 tuần | Register org, member, role, leader chạy E2E |
| Phase 5A – Plan/subscription/fake payment UAT | 1 tuần | Personal/org fake checkout ghi DB và entitlement E2E |
| Phase 5B – Production payment provider | 1 tuần | Webhook provider thật, idempotency và reconciliation E2E |
| Phase 6 – Admin/Skill/AI/Reports | 2 tuần | Toàn bộ trang quản trị và AI dùng API thật |
| Phase 7 – Hardening/UAT/release | 1.5 tuần | 126 UAT cases, security/performance/backup/release gate |

Mốc mục tiêu: **12 tuần** với team chuẩn, có thể chồng một phần frontend và backend sau khi OpenAPI của từng domain được khóa.

## 4. Dependency và thứ tự triển khai bắt buộc

```text
Contract/roles
  -> Auth + session
    -> Resource authorization + tenant context
      -> Core CRUD + quota service
        -> Organization membership + leader
          -> Subscription/payment + entitlement
            -> Admin/AI/reports complete mapping
              -> Security/performance/UAT/release
```

Không merge UI báo thành công trước API. Không triển khai Premium bằng cách sửa global role. Fake payment được dùng để hoàn thiện và UAT domain trước, nhưng không được bật trong Production. Không mở production payment trước khi provider thật, webhook idempotency, audit và reconciliation test pass.

### Tiến độ thực thi tại revision 2026-08-01 R2

| Workstream | Trạng thái | Bằng chứng/việc còn lại |
|---|---|---|
| Security foundation | Hoàn thành bước đầu | Admin policy và JWT actor cho Project Create; automated suite 63/63 |
| Web AuthProvider/API client | Hoàn thành bước đầu | Register/login/logout/Google plumbing thật; browser + Docker SQL UAT pass cho email/password |
| Refresh token + `/auth/me` | Chưa làm | Blocker production session |
| Forgot/reset password | Chưa làm | UI chỉ báo unavailable, không fake success |
| Resource/tenant authorization | Đang thực hiện | Audit và negative integration tests cho cross-user/cross-org |
| Web CRUD/API mapping | Chưa làm | Dashboard/Admin vẫn dùng dữ liệu mẫu, cần ưu tiên sau authorization |
| Organization/member/leader | Chưa làm | Chưa có domain/API/UI đầy đủ |
| Subscription/quota/fake payment | Chưa làm | Chỉ gateway được fake; mọi record phải persist SQL Server |
| Mobile | Hoãn | Chỉ bắt đầu sau khi Web đạt release gate |

Thứ tự công việc cụ thể đang áp dụng:

1. Hoàn tất authorization/tenant isolation và chạy lại toàn bộ negative cases.
2. Nối Project/Task/Team/Profile/Evaluation web vào API thật, bỏ seed/local success.
3. Xây organization registration, membership, role và project leader.
4. Xây plan/subscription/quota và fake payment UAT có transaction/entitlement thật trong DB.
5. Nối Admin/Skill/charts/totals/payment-plan UI vào API thật.
6. Nối AI/Reports/Notifications vào shared Bearer client.
7. Chạy đủ 126 UAT cases, button/API audit, security, migration và production release gate.

## 5. Phase 0 – Khóa contract và nền tảng

### PROD-0001 – Chốt role/permission matrix

Owner: Product + Backend + QA  
Estimate: 1 ngày  
Depends on: none

Tạo matrix cho từng action theo các cột:

- Platform Admin.
- Organization Owner/Admin/Leader/Member.
- Personal project Owner/Member.
- Resource ownership.
- Read/Create/Update/Delete/Assign/Evaluate/AI/Export.

Definition of Done:

- 109 API actions đều có permission requirement cụ thể.
- Không dùng câu “authenticated user được phép” nếu action có resource/tenant.
- QA tạo negative case tương ứng cho từng quyền.

### PROD-0002 – Chuẩn hóa API contract

Owner: Backend  
Estimate: 2 ngày

- Dùng `/api/v1` hoặc versioning thống nhất.
- Chuẩn hóa error envelope: `code`, `message`, `fieldErrors`, `correlationId`.
- Chuẩn hóa pagination/filter/sort.
- Chuẩn hóa 400/401/403/404/409/422/429/500.
- Xuất OpenAPI và dùng generated TypeScript client.
- Không nhận actor ID từ client ở command DTO.
- Thêm optimistic concurrency token cho entity có cạnh tranh cập nhật.

Definition of Done:

- OpenAPI build thành công trong CI.
- Frontend client generate được mà không sửa tay.
- Contract tests khóa các error code quan trọng.

### PROD-0003 – Environment và secrets

Owner: DevOps + Backend  
Estimate: 1–2 ngày

Vùng code chính:

- `src/TaskGenie.API/appsettings.json`
- `src/TaskGenie.API/appsettings.Development.json`
- `src/TaskGenie.API/Program.cs`
- Docker Compose mới ở repository root.

Checklist:

- Tạo cấu hình Development/UAT/Staging/Production.
- Docker Compose cho API, SQL Server và Redis.
- Secret lấy từ environment/secret manager; rotate key đã từng commit.
- Health endpoints: `/health/live`, `/health/ready`.
- Startup không seed demo data ngoài Development/UAT.
- CORS allowlist theo environment.
- HTTPS, HSTS và forwarded headers đúng khi sau reverse proxy.

## 6. Phase 1 – Authentication và session thật

### PROD-0101 – Backend identity lifecycle

Owner: Backend  
Estimate: 4 ngày

Vùng code hiện có:

- `src/TaskGenie.API/Controllers/AuthController.cs`
- `src/TaskGenie.API/Extensions/AuthenticationExtensions.cs`
- `src/TaskGenie.Infrastructure/ExternalServices/JwtTokenService.cs`
- `src/TaskGenie.Infrastructure/ExternalServices/InMemoryTokenRevocationService.cs`
- `src/TaskGenie.Application/Features/Auth`

Thực hiện:

- `POST /api/auth/login` trả short-lived access token và rotating refresh token.
- `POST /api/auth/google` verify Google ID token và link account an toàn.
- `POST /api/auth/refresh` rotate token family; detect reuse.
- `POST /api/auth/logout` revoke refresh-token family.
- `GET /api/auth/me` trả identity, memberships, effective entitlements và available contexts.
- `POST /api/auth/forgot-password` và `/reset-password` dùng one-time token hash, expiry, attempts.
- Rate limit login/register/forgot/reset.
- Normalize email, password policy và audit security events.
- Thay in-memory revocation bằng DB/Redis hoặc refresh-token persistence.

Database:

- `refresh_tokens`
- `password_reset_tokens`
- tùy chọn `external_identities`
- index theo token hash/family/user/expiry.

Acceptance:

- Access token hết hạn tự refresh một lần.
- Refresh reuse làm revoke cả family.
- Logout ở một session không làm sai session khác nếu product chọn multi-session.
- Google account có email trùng được xử lý theo policy rõ ràng.
- Không log token/password/authorization header.

### PROD-0102 – Web AuthProvider và protected routes

Owner: Frontend  
Estimate: 4 ngày

Vùng code hiện có:

- `FE-WEB-V2/src/app/components/AuthModule.tsx`
- `FE-WEB-V2/src/app/App.tsx`
- `FE-WEB-V2/src/app/services/coreAiApi.ts`

Tạo mới đề xuất:

```text
FE-WEB-V2/src/app/auth/AuthProvider.tsx
FE-WEB-V2/src/app/auth/ProtectedRoute.tsx
FE-WEB-V2/src/app/auth/PermissionGate.tsx
FE-WEB-V2/src/app/services/apiClient.ts
FE-WEB-V2/src/app/services/generated/
FE-WEB-V2/src/app/routes.tsx
```

Thực hiện:

- Xóa toàn bộ fake delay/fixed user/fake OTP.
- Dùng một API client tự gắn Bearer token và correlation ID.
- Queue request trong lúc refresh, không chạy nhiều refresh song song.
- Bootstrap session bằng `/auth/me` khi refresh browser.
- Protected route và role-aware navigation.
- Google button/SDK và xử lý cancel/error.
- Forgot/reset pages dùng token thật.
- Logout gọi backend rồi xóa state/cache.

Acceptance:

- Arbitrary credentials không thể đăng nhập.
- Refresh trang vẫn giữ đúng session.
- User không quyền không thấy admin navigation và nhập URL trực tiếp vẫn bị chặn bởi backend.
- AI request gửi cùng session, không còn `X-User-Id`.

## 7. Phase 2 – Authorization, tenant và data integrity

### PROD-0201 – Current actor và organization context

Owner: Backend  
Estimate: 2 ngày

Tạo abstraction:

```text
ICurrentUser
ICurrentOrganization
IPermissionService
IResourceAuthorizationService
```

- Lấy User ID từ immutable JWT subject.
- Context organization phải là membership active của user.
- Có thể truyền organization context bằng route/claim/header, nhưng luôn verify membership server-side.
- Handler không nhận `CreatedBy`, `OrganizedBy`, `EvaluatorId`, `UserId` làm actor.

### PROD-0202 – Policies và resource handlers

Owner: Backend  
Estimate: 5 ngày

Áp dụng vào toàn bộ controller trong `src/TaskGenie.API/Controllers`:

- `PlatformAdmin` cho platform stats và platform CRUD.
- `OrganizationAdmin` cho org/member/plan assignment.
- `ProjectRead`, `ProjectManage`, `TaskManage`, `TeamManage`.
- `EvaluationCreate`, `ManualScoreManage`, `SkillCatalogManage`.
- `AiAnalyze` và `ExportProject` đều kiểm tra project access.

Quy tắc response:

- `401`: chưa xác thực/token sai.
- `403`: đã xác thực nhưng thiếu permission.
- `404`: resource không tồn tại hoặc cần che existence khỏi cross-tenant actor.
- `409`: conflict/data dependency/quota race.

Acceptance:

- 28 negative authorization attempts trong báo cáo UAT đều không còn trả 2xx.
- User 5 không đọc/sửa Project 1, Task, AI history, Evidence, Evaluation hoặc User 2.
- NORMAL_USER không gọi Admin/skill master/manual score.

### PROD-0203 – Sửa Project/Team transaction và schema

Owner: Backend + DBA  
Estimate: 3 ngày

Vùng code:

- `src/TaskGenie.Infrastructure/Persistence/AppDbContext.cs`
- `src/TaskGenie.Infrastructure/Persistence/Repositories/ProjectRepository.cs`
- `src/TaskGenie.Infrastructure/Persistence/Repositories/TeamRepository.cs`
- Project/Team command handlers.

Thực hiện:

- Map `Project.CreatedBy` đúng FK/cột, loại shadow `CreatedByNavigationUserId` bằng migration an toàn.
- Create Project + default Team + leader trong một transaction.
- Delete/Archive Project xử lý Team/TeamMember theo aggregate policy.
- Delete Team đang có member trả 409 hoặc transaction explicit; không trả 500.
- Soft delete và audit cho entity quan trọng.
- FK/index/cascade policy được document và test.

Acceptance:

- Failure giữa transaction không để project/team một nửa.
- Không còn orphan Team/TeamMember.
- Migration chạy được trên bản sao UAT có dữ liệu và có rollback procedure.

## 8. Phase 3 – Core CRUD và hoàn thiện 92 button declarations

### PROD-0301 – Project và quota

Owner: Backend + Frontend  
Estimate: 4 ngày

Backend:

- Project list/detail/create/update/archive/restore/delete/close.
- `IEntitlementService.CanCreateProject(actor, ownerType, ownerId)`.
- Atomic quota check trong transaction.
- Trả `PLAN_UPGRADE_REQUIRED` cùng current limit/usage.
- Personal project không cho client giả `OrganizationId`.

Frontend:

- Sửa `ProjectManagement.tsx`, Sidebar project list và Project Detail.
- Tất cả create/edit/delete dùng API, loading, error, confirm và rollback.
- Khi quota hết: modal có `Upgrade plan` và `Manage existing projects`.

Acceptance:

- Free user tạo được project 1–2, project 3 bị chặn.
- Hai create đồng thời không vượt quota.
- Premium entitlement cho phép theo plan limit.
- Refresh browser vẫn thấy mutation.

### PROD-0302 – Task/Kanban/detail

Owner: Backend + Frontend  
Estimate: 5 ngày

Vùng frontend:

- `KanbanBoard.tsx`
- `CreateTaskModal.tsx`
- `TaskDetailModal.tsx`
- `TaskCard.tsx`

Thực hiện:

- Project-scoped task query.
- Create/update/delete/progress/dependency/required skill/comment/evidence API.
- Drag/drop optimistic update có rollback và concurrency handling.
- Actor của comment/evidence lấy từ session.
- Empty/loading/error/offline states.
- Double-submit prevention.

### PROD-0303 – Team, invitation và evaluation

Owner: Backend + Frontend  
Estimate: 4 ngày

Vùng frontend:

- `TeamManagement.tsx`
- `EvaluationCenter.tsx`

- CRUD team/member thật.
- Invitation token/status/expiry và accept/reject authorization.
- Chặn tự ý thay inviter/creator.
- Evaluation chỉ đúng evaluator/subject/project relationship.
- Manual score chỉ permission phù hợp.

### PROD-0304 – Profile, settings và notifications

Owner: Backend + Frontend  
Estimate: 3 ngày

- Profile `/me` thay vì cho user sửa ID bất kỳ.
- Change password verify password hiện tại.
- Avatar upload type/size/signature validation.
- Settings persistence hoặc remove khỏi Release 1.0.
- Notifications lấy theo current user; View all, mark read/all và delete thật.
- Header search có API/query thật hoặc bỏ khỏi release.

### Button completion gate

Đối chiếu từng declaration trong `UAT_UI_API_AUDIT.md`. Mỗi button chỉ Done khi:

- Có action/navigation chủ đích, không dead.
- Có accessible name/`aria-label` và keyboard focus.
- Permission visibility đúng.
- Gọi generated API client đúng contract.
- Có loading/disabled/error/success thật.
- Mutation persist sau refresh/logout-login.
- Có component test và ít nhất một E2E success/negative test cho flow quan trọng.

## 9. Phase 4 – Organization hoàn chỉnh

### PROD-0401 – Organization domain và database

Owner: Backend + DBA  
Estimate: 3 ngày

Thêm:

```text
organization_members
organization_invitations
organization_audit_logs hoặc audit_logs dùng chung
```

`organization_members` tối thiểu:

- `Id`, `OrganizationId`, `UserId`.
- `Role`: OWNER/ORG_ADMIN/PROJECT_LEADER/MEMBER.
- `Status`: INVITED/ACTIVE/SUSPENDED/REMOVED.
- `JoinedAt`, `InvitedBy`, timestamps.
- Unique active membership `(OrganizationId, UserId)`.

### PROD-0402 – Organization registration và context switch

Owner: Backend + Frontend  
Estimate: 4 ngày

API:

- `POST /api/organizations`
- `GET /api/organizations/my`
- `GET/PUT/DELETE /api/organizations/{id}`
- `POST /api/organizations/{id}/switch` nếu dùng context token.

UI mới:

```text
OrganizationRegistrationPage
OrganizationSettingsPage
OrganizationSwitcher
```

Acceptance:

- User đăng ký organization trở thành OWNER active.
- Login lại thấy organization trong `/auth/me` và switch đúng context.
- `/Organizations/my` trả membership, không chỉ organization do user sở hữu.

### PROD-0403 – Member management và Premium inheritance

Owner: Backend + Frontend  
Estimate: 5 ngày

API:

- List/invite/resend/cancel member invitation.
- Accept/reject invitation.
- Update role/status/remove member.
- Transfer ownership có re-authentication và audit.

Premium rule:

- Effective Premium = active personal entitlement OR active organization entitlement qua active membership.
- Khi member bị remove, entitlement tổ chức hết hiệu lực ngay hoặc cuối kỳ theo policy đã chốt.
- Không làm mất personal Premium của user.
- Không thay global User.Role.

Acceptance:

- Member active được Premium nếu org subscription đủ seat.
- Suspended/removed member mất org entitlement.
- Seat limit được kiểm tra atomically.
- Không remove/disable owner cuối cùng.

### PROD-0404 – Assign Project Leader

Owner: Backend + Frontend  
Estimate: 3 ngày

- Chỉ OWNER/ORG_ADMIN được assign/change Leader.
- Candidate phải là active org member.
- Project và candidate cùng organization.
- Thay Leader tạo audit/notification.
- Xử lý leader bị remove: bắt buộc reassignment hoặc project chuyển unassigned có cảnh báo.

## 10. Phase 5 – Plan, subscription và payment

### PROD-0501 – Commercial domain

Owner: Backend + DBA  
Estimate: 4 ngày

Thêm entity/table:

- `plans`
- `subscriptions`
- `payment_transactions`
- `payment_webhook_events`
- `entitlements`
- tùy chọn `subscription_seats`

Schema tối thiểu đề xuất:

| Table | Trường quan trọng và constraint |
|---|---|
| `plans` | `Id`, unique `Code`, `Audience`, `BillingInterval`, `PriceMinor`, `Currency`, `ProjectLimit`, `MemberLimit`, `AiLimit`, `Version`, `IsActive`, timestamps |
| `subscriptions` | `Id`, `PlanId`, `OwnerType`, nullable `UserId`/`OrganizationId` với XOR check, `Status`, `Provider`, nullable external ID, period dates, `CancelAtPeriodEnd`, row version |
| `payment_transactions` | `Id`, owner/plan/subscription refs, `AmountMinor`, `Currency`, `Status`, unique `IdempotencyKey`, provider/reference, `IsTest`, completed/refunded timestamps |
| `payment_webhook_events` | unique `ProviderEventId`, event type, payload hash/reference, processing status, attempts, processed/error timestamps |
| `entitlements` | owner/source refs, `Feature`, limit/value, starts/expires, `Status`; unique effective source-feature constraint |

Database rules:

- Money lưu integer minor units hoặc decimal chuẩn đã thống nhất; không dùng `float/real`.
- Subscription owner phải là đúng một trong User hoặc Organization.
- `IsTest = 1` chỉ được tạo từ Development/UAT service; production reporting mặc định loại test data.
- Idempotency key và provider event ID có unique index.
- Status dùng check constraint hoặc conversion được kiểm thử.
- Subscription/transaction/entitlement update có row version để chống ghi đè cạnh tranh.

Plan fields:

- Code/name/audience `PERSONAL|ORGANIZATION`.
- Billing interval, price, currency.
- Project limit, member/seat limit, AI usage limit.
- Active/public/sort order/version.

Subscription lifecycle:

```text
PENDING -> ACTIVE -> PAST_DUE -> CANCELED/EXPIRED
```

### PROD-0502 – Plan catalog và pricing page

Owner: Backend + Frontend  
Estimate: 3 ngày

API:

- `GET /api/plans?audience=personal|organization`
- Admin plan CRUD/version/archive.

UI:

- Pricing page có tab Personal/Organization.
- Hiển thị limit, price, billing interval và current plan.
- Không hardcode plan/price trong React.
- Archived plan không nhận checkout mới nhưng subscription cũ vẫn tham chiếu đúng version.

### PROD-0503 – Fake payment ghi database cho Development/UAT

Owner: Backend + Frontend + QA  
Estimate: 4 ngày

Mục tiêu là test đầy đủ subscription/payment mà chưa phụ thuộc cổng thanh toán bên ngoài. Fake provider vẫn dùng cùng application service, bảng dữ liệu, state machine và entitlement service với production provider.

Kiến trúc đề xuất:

```text
IPaymentProvider
  |- FakePaymentProvider       # Development/UAT only
  `- ProductionPaymentProvider # Phase 5B

BillingApplicationService
  -> payment_transactions
  -> subscriptions
  -> entitlements
  -> audit_logs
```

API nghiệp vụ dùng chung:

- `POST /api/billing/checkout-sessions`
- `GET /api/billing/subscription`
- `POST /api/billing/subscription/cancel`
- `POST /api/billing/subscription/resume`
- `GET /api/billing/payments`

Endpoint test-only:

- `POST /api/test-payments/{paymentId}/simulate`
- Body status được allowlist: `SUCCEEDED`, `FAILED`, `CANCELED`, `REFUNDED`, `EXPIRED`.
- Chỉ build/register khi environment là Development/UAT và caller có test-admin policy.
- Trong Production endpoint phải trả 404; application startup phải fail nếu `FakePaymentProvider` được cấu hình.

Luồng fake success:

1. Checkout tạo `payment_transactions` trạng thái `PENDING` với idempotency key.
2. QA/Admin UAT bấm Simulate Success hoặc gọi test-only endpoint.
3. Một DB transaction đổi payment sang `SUCCEEDED`.
4. Tạo/cập nhật `subscriptions` thành `ACTIVE`.
5. Tạo effective `entitlements` cho user hoặc organization.
6. Ghi `audit_logs` và trả current subscription/entitlement.
7. Project/member/AI quota đọc entitlement mới ngay.

Không cho frontend ghi SQL trực tiếp. Có thể cung cấp SQL seed fixture cho automated integration test, nhưng browser phải đi qua API để test đúng authorization, validation và transaction.

Fake test matrix bắt buộc:

| Case | Expected database/business result |
|---|---|
| Personal payment success | Payment SUCCEEDED, personal subscription ACTIVE, user Premium |
| Organization payment success | Org subscription ACTIVE, active members nhận org entitlement theo seat |
| Payment failed | Transaction FAILED, không tạo entitlement |
| User cancel checkout | Transaction CANCELED, plan hiện tại không đổi |
| Duplicate simulate success | Idempotent; một subscription/entitlement, không nhân đôi |
| Refund | Payment REFUNDED, subscription/entitlement chuyển theo refund policy |
| Subscription cancel | `cancel_at_period_end` hoặc CANCELED theo policy; entitlement đúng thời điểm |
| Expire | Subscription EXPIRED, entitlement hết hiệu lực, quota quay về Free |
| Member removed | Chỉ org entitlement của member bị revoke; personal Premium còn nguyên |
| Project thứ 3 sau expire | Bị chặn nếu usage đã vượt Free limit |
| Cross-tenant fake payment | 403/404, không thay đổi DB |

Data fixture tối thiểu:

- Personal Free, Personal Premium Monthly/Yearly.
- Organization Starter/Business Monthly/Yearly.
- Transaction PENDING/SUCCEEDED/FAILED/REFUNDED.
- Subscription ACTIVE/CANCELED/EXPIRED.
- User có personal entitlement, user chỉ có org entitlement và user có cả hai nguồn.

Acceptance UAT:

- Tất cả trạng thái trên hiển thị đúng ở Pricing, Payment History, Admin chart và `/auth/me`.
- Fake success cấp Premium và mở quota ngay sau response.
- Fake failure không cấp Premium.
- Duplicate requests không tạo dữ liệu trùng.
- Mọi mutation có actor/correlation/audit và rollback khi transaction lỗi.
- Test xác nhận endpoint/service giả không tồn tại khi chạy `Production` environment.

### PROD-0504 – Production payment provider

Owner: Backend + Frontend  
Estimate: 5 ngày, thực hiện sau khi fake payment UAT pass

Giữ nguyên `IPaymentProvider` và application service đã kiểm thử; chỉ thay adapter provider. Bổ sung:

- `POST /api/webhooks/payment-provider`.
- Verify webhook signature trên raw body.
- Unique provider event/payment/order ID.
- Idempotency key cho checkout và webhook.
- Không activate subscription từ success URL.
- Reconciliation job cho event lỗi/chậm/out-of-order.
- Audit mọi status transition.
- Money dùng decimal/minor units, không dùng floating point.
- Không lưu card data.

Production acceptance:

- Chạy lại cùng contract test suite của FakePaymentProvider với provider sandbox.
- Personal và Organization success/failed/canceled/refund pass.
- Duplicate/out-of-order webhook không cấp entitlement hai lần.
- Payment history chỉ owner/admin phù hợp thấy được.
- Production config không chứa hoặc resolve FakePaymentProvider.

### PROD-0505 – Entitlement/quota service

Owner: Backend  
Estimate: 3 ngày

Một service duy nhất trả:

```text
EffectivePlan
CanCreateProject
ProjectLimit/Usage
MemberLimit/Usage
AiLimit/Usage
PremiumStatus
EntitlementSources
```

Tất cả Project/Organization/AI handlers phải gọi service này; không rải logic plan trong controller hoặc UI.

## 11. Phase 6 – Admin, Skill, AI và Reports

### PROD-0601 – Administration production APIs

Owner: Backend + Frontend  
Estimate: 5 ngày

Mở rộng `AdminController.cs` hoặc controller versioned riêng:

- User search/list/detail/status/role.
- Organization list/detail/status.
- Subscription/payment aggregates.
- Total active/archived projects.
- Registered organization count/trend.
- Revenue/subscription chart theo period/plan/audience/status.
- Audit history.

Sửa `AdministrationCenter.tsx`:

- Bỏ seed/local chart/local CRUD.
- Pagination/filter/loading/error/empty state.
- Confirm destructive/status actions.
- Không cho disable platform admin cuối cùng.
- Export có quyền và audit.

### PROD-0602 – Skill management

Owner: Backend + Frontend  
Estimate: 3 ngày

- Skill catalog list/create/update/archive.
- Chỉ Platform Admin quản lý master skill.
- User quản lý skill của chính mình; org admin chỉ khi policy cho phép.
- Không hard-delete skill đang được TaskRequiredSkill/UserSkill tham chiếu.
- Unique normalized skill name.
- Tạo Skill Management page và mapping toàn bộ CRUD.

### PROD-0603 – AI complete mapping

Owner: Backend + Frontend + QA  
Estimate: 4 ngày

Vùng code:

- `FE-WEB-V2/src/app/services/coreAiApi.ts`
- `FE-WEB-V2/src/app/components/CoreAiDemoPanel.tsx`
- `src/TaskGenie.API/Controllers/AiAnalysisController.cs`
- `src/TaskGenie.API/Controllers/TaskAssignmentController.cs`

- Dùng shared authenticated client.
- Không cho nhập/gửi actor ID tùy ý.
- Kiểm tra project/task access cho risk/recommendation/evidence/history/summary/classification.
- Response trả run ID/status/result/error cụ thể.
- Timeout/retry/circuit breaker và provider failure state.
- Track AI usage theo entitlement nếu plan giới hạn.
- Accept/reject recommendation idempotent và audit được.
- AI Chat Send/Quick question: triển khai endpoint thật hoặc remove khỏi Release 1.0.

### PROD-0604 – Reports và charts

Owner: Backend + Frontend  
Estimate: 3 ngày

- Project/user/org/report queries lấy dữ liệu thật.
- Timezone và date range thống nhất.
- Permission cho report/export.
- Empty/loading/error state.
- PDF/XLSX export kiểm tra ownership và chống formula injection.
- Route lazy loading để giảm bundle hơn 1 MB hiện tại.

## 12. Phase 7 – Test automation và production hardening

### PROD-0701 – Test pyramid tối thiểu

Owner: QA + Developers  
Estimate: chạy xuyên suốt, hardening 5 ngày

Backend tests:

- Unit tests cho entitlement/quota/role rules.
- Integration tests với SQL Server container và `FakePaymentProvider` dùng chung state machine/application service với production adapter.
- Authorization matrix tests cho 109 actions.
- Transaction/concurrency tests cho project quota, seats và webhook.
- Migration test từ schema hiện tại lên production schema.

Frontend tests:

- Component tests cho loading/error/permission/button state.
- API contract tests dùng generated client.
- E2E cho Auth, Project, Task, Organization, Payment, Admin và AI.
- Accessibility scan và keyboard navigation.

Regression gate:

- Chạy lại 126 cases trong `UAT_TEST_CASES.md`.
- 100% P0 pass.
- Không Critical/High mở.
- Mọi negative authorization case có automated regression.

### PROD-0702 – Security checklist

Owner: Backend + DevOps + QA  
Estimate: 3 ngày

- Secret scan và dependency vulnerability scan trong CI.
- SAST và container image scan.
- Rate limiting cho auth, AI, upload, export và webhook.
- File upload allowlist, size limit, malware workflow nếu public upload.
- CSP, secure cookie policy nếu refresh token dùng cookie, anti-CSRF tương ứng.
- Strict CORS, HSTS, HTTPS-only.
- Input validation và output encoding.
- IDOR/tenant isolation penetration test.
- Log redaction cho PII/token/secret.
- Audit log immutable đủ cho admin/payment/member/leader changes.

### PROD-0703 – Performance/reliability

Owner: Backend + DevOps + QA  
Estimate: 3 ngày

Baseline trước release:

- API p95 read < 500 ms, mutation < 800 ms không tính external AI/payment.
- Error rate < 1% dưới target load.
- Pagination bắt buộc cho list lớn.
- Index review theo actual query plan.
- Async/background job cho email, webhook retry, AI long-run và reconciliation.
- Timeout/retry/circuit breaker chỉ ở boundary external service.
- Web bundle split theo route; bỏ warning chunk > 500 kB hoặc có budget được phê duyệt.

### PROD-0704 – Observability và vận hành

Owner: DevOps + Backend  
Estimate: 3 ngày

- Structured log kèm correlation/user/tenant ID nhưng không chứa secret.
- Metrics: request rate/error/latency, login failures, subscription state, webhook failures, AI failures/latency/cost, quota rejection.
- Distributed tracing cho API -> DB/external provider.
- Dashboard và alerts cho 5xx, database, webhook backlog, refresh failures, payment mismatch.
- Runbook cho database outage, provider outage, secret rotation và account compromise.

### PROD-0705 – Backup/restore và data operations

Owner: DevOps + DBA  
Estimate: 2 ngày

- Automated encrypted SQL backup với retention.
- Restore drill vào isolated environment.
- Chốt RPO/RTO.
- Migration pre-check, backup và rollback/forward-fix procedure.
- Dữ liệu demo/test không đi vào production.
- Data retention/deletion/export policy cho user và organization.

## 13. CI/CD pipeline bắt buộc

Mỗi pull request:

1. Format/lint/type-check frontend.
2. Frontend unit/component tests.
3. Backend build + unit tests.
4. SQL Server integration tests.
5. OpenAPI compatibility/generation check.
6. Secret/dependency/SAST scan.
7. Production builds và artifact/container image.
8. Preview/staging deployment cho PR quan trọng.

Deployment pipeline:

```text
Merge main
 -> build immutable image
 -> migrate staging
 -> smoke + E2E
 -> manual production approval
 -> backup/preflight
 -> migrate production
 -> rolling/blue-green deploy
 -> health/smoke/payment webhook check
 -> monitor
 -> rollback hoặc complete
```

Không chạy migration tự động không kiểm soát ở startup production. Artifact production phải được promote, không rebuild khác nhau giữa staging và production.

## 14. Production data và infrastructure checklist

### SQL Server

- Production database riêng, TLS/encryption theo hạ tầng.
- Least-privilege application login, không dùng `sa`.
- Connection pooling, timeout và retry policy phù hợp.
- Index cho normalized email, FK, membership, project owner/org, subscription status, webhook ID.
- Backup/restore test thành công.

### Redis/background jobs

- Dùng cho distributed cache/token/session/rate-limit hoặc job lock nếu kiến trúc cần.
- Không coi cache là source of truth của payment/subscription.
- Job queue có retry, dead-letter và idempotency.

### External services

- Google OAuth production client và allowlisted redirect origins.
- Email provider/domain/SPF-DKIM cho invitation/reset.
- Payment sandbox và production keys tách biệt.
- AI provider key/limits/timeout/cost budgets tách environment.
- Cloudinary/upload credentials tách environment.

## 15. Pull request breakdown đề xuất

Không tạo một PR khổng lồ. Dùng chuỗi PR có thể deploy/rollback độc lập:

| PR | Nội dung | Merge gate |
|---|---|---|
| PR-01 | API error contract, current actor, OpenAPI client pipeline | Contract tests |
| PR-02 | Refresh token/auth me/logout persistence | Auth integration tests |
| PR-03 | Web AuthProvider/routes/Google/forgot-reset | Auth E2E |
| PR-04 | Role/resource authorization policies | 28 negative cases pass |
| PR-05 | Project schema/transaction/delete integrity | Migration + orphan tests |
| PR-06 | Entitlement abstraction + free quota | Concurrent quota tests |
| PR-07 | Project/Task web API mapping | Project/Task E2E |
| PR-08 | Team/Invitation/Evaluation mapping | Permission E2E |
| PR-09 | Organization domain/membership/context | Org migration + E2E |
| PR-10 | Org member roles/Premium/leader | Seat/leader negative tests |
| PR-11 | Plan/subscription entities and admin plan API | Domain/integration tests |
| PR-12 | FakePaymentProvider/DB transaction/payment history | Fake success/failure/idempotency tests |
| PR-13 | Pricing/payment pages + UAT simulator | Fake Payment E2E và Production environment guard |
| PR-13B | Provider thật/webhook/reconciliation | Provider sandbox + webhook idempotency tests |
| PR-14 | Admin users/org/charts/skill | Admin authorization E2E |
| PR-15 | AI authenticated mapping and usage limits | AI E2E/authorization |
| PR-16 | Reports/notifications/settings/dead buttons/a11y | Button coverage gate |
| PR-17 | Observability/security/performance/CI-CD | Production rehearsal |

## 16. Definition of Done cho mọi backlog item

Một item chỉ được Done khi đáp ứng tất cả mục phù hợp:

- Business rule và acceptance criteria đã rõ.
- Backend authorization ở resource level, không chỉ ẩn UI.
- Validation và stable error code.
- Migration/index/backfill/rollback được review nếu đổi dữ liệu.
- OpenAPI cập nhật và TypeScript client regenerate.
- Frontend có loading/error/empty/success và accessibility.
- Không hardcode user/project/organization/plan/price.
- Audit/metric/log phù hợp.
- Unit/integration/component/E2E tests pass.
- Negative path và cross-tenant path được test.
- Không phát sinh warning Critical/High hoặc dead button.
- QA evidence đính kèm và Product acceptance nếu thay đổi nghiệp vụ.

## 17. Release readiness gate

### Go/No-Go checklist

- [ ] Không còn fake authentication, fake OTP hoặc fake success mutation.
- [ ] Google login, email login, refresh, logout và reset password E2E pass.
- [ ] 109 API actions có permission matrix và automated negative tests.
- [ ] 28 lỗi authorization đã xác nhận đều trả 403/404 đúng.
- [ ] Free quota chặn project thứ 3 trong cả normal và concurrent create.
- [ ] Personal subscription E2E pass.
- [ ] Organization subscription/member/Premium E2E pass.
- [ ] Fake payment DB matrix pass ở UAT và endpoint/service giả không tồn tại trong Production.
- [ ] Trước public production: provider thật và webhook/reconciliation E2E pass.
- [ ] Organization registration/context/member/leader E2E pass.
- [ ] Admin CRUD/charts/payment/skill dùng dữ liệu thật.
- [ ] 92 button declarations và 13 form flows không dead/local-only.
- [ ] AI gửi Bearer và kiểm tra project access.
- [ ] Không orphan Team/TeamMember và không unhandled 500 khi delete.
- [ ] 126 UAT cases: 100% P0 pass, không Critical/High mở.
- [ ] Security scan và tenant isolation test pass.
- [ ] Performance baseline đạt hoặc được phê duyệt bằng văn bản.
- [ ] Backup restore drill pass.
- [ ] Monitoring/alerts/runbooks/rollback đã rehearsal.
- [ ] Production secrets/domain/OAuth/email/payment/AI configurations được kiểm tra.
- [ ] Product Owner, QA, Engineering và Operations ký Go.

## 18. Release và rollback runbook rút gọn

### Trước release

- Freeze schema/API contract.
- Backup production và xác minh backup có thể đọc.
- Chạy migration dry-run trên production-like copy.
- Xác minh payment webhook URL/signature secret, Google origins và email domain.
- Chốt image tag, changelog, on-call và rollback owner.

### Sau deploy

- Health/readiness.
- Login/refresh/logout.
- Project create/quota.
- Organization context/member read.
- Plan catalog và sandbox-safe billing health.
- AI authorized smoke.
- Admin stats authorization.
- Theo dõi 5xx, latency, DB, webhook và auth failure tối thiểu 30–60 phút.

### Rollback

- Rollback application image nếu schema backward compatible.
- Nếu migration không backward compatible, dùng forward-fix đã chuẩn bị hoặc restore theo runbook; không tự ý down migration trên dữ liệu production.
- Reconcile webhook/payment events phát sinh trong thời gian rollback.
- Ghi incident timeline và customer impact.

## 19. Công việc đầu tiên nên bắt đầu ngay

Thứ tự cho 10 ngày làm việc đầu tiên:

### Ngày 1–2

- Chốt role/permission matrix và quota rule.
- Chốt API error envelope và organization context.
- Tạo CI build/test/OpenAPI/SQL integration foundation.

### Ngày 3–5

- Backend `/auth/me`, refresh token persistence, logout, forgot/reset.
- Current actor abstraction.
- Xóa actor IDs khỏi command DTO mới.

### Ngày 6–7

- Web AuthProvider, API client, protected routes và Google button.
- Thay login/logout/register fake.

### Ngày 8–10

- Project/Admin/User/AI authorization handlers.
- Chạy lại 28 negative cases.
- Không chuyển sang CRUD/payment cho đến khi security gate này pass.

Deliverable cuối ngày 10:

- Authentication thật hoạt động sau refresh.
- NORMAL_USER không vào Admin hoặc cross-project.
- AI dùng Bearer.
- OpenAPI client và CI gate hoạt động.
- Báo cáo regression cho toàn bộ 28 negative authorization cases.

## 20. Tài liệu kiểm thử dùng để nghiệm thu

- `docs/testing/TASKGENIE_UAT_EXECUTION_AND_CODE_COMPLETION.md`: actual results và defect evidence.
- `docs/testing/UAT_TEST_CASES.md`: 126 UAT cases.
- `docs/testing/UAT_UI_API_AUDIT.md`: inventory button/form và API mapping.
- `docs/testing/UAT_MASTER_PLAN.md`: scope, actors, environments và test strategy.

Roadmap này là nguồn thứ tự triển khai; actual evidence trong UAT report là baseline để xác nhận lỗi đã được đóng thật, không chỉ sửa giao diện.
