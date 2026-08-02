# UAT Readiness và UI–API Audit – TaskGenie V2

Audit ID: `AUDIT-TG-V2-UAT-01`  
Ngày audit: 2026-08-01  
Phương pháp: static inspection repository; chưa phải kết quả chạy UAT trên môi trường deploy

## 1. Executive result

**Quyết định hiện tại: NO-GO cho UAT end-to-end đầy đủ.**

- Backend công bố 109 HTTP actions qua 21 controller.
- Web chỉ có 7 action được mapping về mặt mã nguồn, tất cả nằm trong AI Core Demo.
- 7 action AI này chưa operational với cấu hình auth hiện tại vì frontend gửi `X-User-Id` nhưng không gửi `Authorization: Bearer ...`, trong khi backend áp fallback policy yêu cầu authenticated user.
- Các màn hình login, project, team, admin, evaluation, task, reports và notification đang thao tác seed data/React state, nên có thể hiển thị success dù backend không đổi.
- Không tìm thấy backend domain/API và frontend page cho payment, subscription, billing, plan entitlement, organization membership hoặc organization registration.
- Backend có JWT authentication nhưng chưa có role/ownership/tenant policy tại action/service level đủ để nghiệm thu các vai trò được yêu cầu.

## 2. Các gap chặn UAT

| Gap ID | Severity | Phát hiện | Tác động |
|---|---|---|---|
| GAP-001 | Critical | Login/register web chỉ dùng `setTimeout` và gọi callback local | Bất kỳ credential hợp lệ về format đều có thể “login” trên UI |
| GAP-002 | Critical | App chỉ giữ `isAuthenticated` trong React state; không lưu/refresh JWT hoặc user context | Refresh mất session; API không có Bearer token |
| GAP-003 | Critical | Menu Administration render không có role guard | User thường có thể thấy admin UI; backend cũng chưa có Admin policy |
| GAP-004 | Critical | Project/Team/Admin/Evaluation/Task mutations chỉ cập nhật local state/seed data | Fake-success, refresh mất dữ liệu |
| GAP-005 | Critical | Project create API nhận `CreatedBy` và `OrganizationId` từ body | Có nguy cơ mạo danh creator/gắn sai tenant nếu không đối chiếu token |
| GAP-006 | Critical | Không có ownership/tenant authorization rõ trên GET/PUT/DELETE theo ID | Nguy cơ IDOR/cross-organization access |
| GAP-007 | High | Không có subscription/payment/plan/entitlement model/API/page | Không thể test quota, upgrade, payment, Premium |
| GAP-008 | High | Không có organization membership và org-role model/API | Không thể quản lý member hoặc cấp/revoke Premium đúng vòng đời |
| GAP-009 | High | Organization API chủ yếu read/evaluate; không có register/update/delete/member CRUD | Luồng tổ chức không hoàn chỉnh |
| GAP-010 | High | Skill có backend API nhưng không có page/service web | Không thể UAT skill management từ UI |
| GAP-011 | High | Chỉ 7/109 HTTP actions có FE mapping; 102 action không được web gọi | Phần lớn button/page chưa dùng backend |
| GAP-012 | High | AI service dùng ID người dùng nhập tay và `X-User-Id`; không gắn current authenticated user | Có thể thao tác sai actor; hiện sẽ 401 với fallback policy |
| GAP-013 | High | Mobile chưa thấy network layer | Không thể UAT mobile E2E |
| GAP-014 | Medium | Charts/reports/admin totals lấy seed arrays | Số liệu có thể đẹp nhưng không phản ánh DB |

## 3. Bằng chứng mã nguồn chính

### Authentication web là mô phỏng

- `AuthModule.tsx` login chờ 1.3 giây rồi gọi `onLogin()`, không gọi `/api/auth/login`.
- Register/OTP/reset password cũng dùng delay và chuyển screen cục bộ; backend hiện chỉ có register/login/google/logout, chưa có OTP/forgot/reset endpoints.
- `App.tsx` dùng `useState(false)` cho login và logout chỉ đổi state.

### Dữ liệu CRUD là local

- `ProjectManagement.tsx` khởi tạo từ `initialProjects`, create/update/delete bằng `setProjects`.
- `TeamManagement.tsx` khởi tạo từ `initialTeams`, create/invite/remove bằng `setTeams`.
- `AdministrationCenter.tsx` dùng `seedUsers`/`seedOrganizations`; role, status và organization CRUD chỉ đổi state.
- `EvaluationCenter.tsx` dùng seed evaluations; submit chỉ thêm vào arrays local.
- `App.tsx` tạo/sửa task bằng `setTaskList`.

### Auth contract FE–BE không khớp

- `coreAiApi.ts` chỉ gửi `Content-Type` và `X-User-Id`.
- Backend cấu hình JWT Bearer và fallback policy `RequireAuthenticatedUser()`.
- `HttpContext.GetCurrentUserId()` đọc claim `NameIdentifier`, không đọc `X-User-Id`.
- Kết luận: mapping AI tồn tại về route/method nhưng request từ web không có credential mà API yêu cầu.

### Project và tenant

- POST project lấy `CreatedBy` và `OrganizationId` từ request body.
- Handler dùng trực tiếp `cmd.CreatedBy` làm creator/Team Leader và `cmd.OrganizationId` để gắn organization.
- Không thấy quota/plan lookup hoặc ownership check trong create handler.
- GET project detail, update, delete và add member không truyền current actor vào command/query.

### Domain còn thiếu

- `User` hiện có `Role` dạng string và `Status`; không có subscription/plan/entitlement.
- `Organization` hiện chỉ có owner và projects; không có memberships, org roles, plan/subscription.
- Không có controller/service/page tên payment, subscription, billing hoặc plan trong source được audit.

## 4. Backend endpoint family → frontend mapping

`Mapped` nghĩa là có lời gọi fetch tương ứng trong web source, chưa đồng nghĩa pass UAT.

| Controller/API family | HTTP actions | Mapped web actions | Chức năng đã map | Phần còn thiếu trên web |
|---|---:|---:|---|---|
| ActivityLogs | 4 | 0 | — | Toàn bộ activity/audit views |
| Admin | 1 | 0 | — | Platform stats |
| AiAnalysis | 8 | 2 | Run task risk, risk history | Analyze project, summary, classify, workload, analyses, executions |
| Auth | 4 | 0 | — | Register, login, Google, logout |
| Evaluations | 5 | 0 | — | Get/create/delete evaluations |
| Export | 2 | 0 | — | XLSX, PDF |
| Invitations | 6 | 0 | — | List/create/status/delete invitations |
| Meetings | 10 | 0 | — | CRUD, attendee, upcoming/user views |
| Notifications | 5 | 0 | — | List/count/read/read-all/delete |
| Organizations | 7 | 0 | — | Admin/all, my org, projects, detail, evaluation |
| Projects | 8 | 0 | — | List/detail/CRUD/member/summary/close |
| Skills | 7 | 0 | — | Skill list/create và user-skill CRUD |
| TaskAssignment | 4 | 3 | Recommend, accept, reject | Recommendation history |
| TaskComments | 3 | 0 | — | List/create/delete comments |
| TaskEvidence | 2 | 2 | List, add URL evidence | File upload UI/contract hoàn chỉnh |
| TaskProgress | 2 | 0 | — | Update progress, logs |
| TaskRequiredSkills | 2 | 0 | — | Get/update required skills |
| Tasks | 12 | 0 | — | My/project/list/CRUD/progress/estimate/dependency/template |
| Teams | 7 | 0 | — | My/all/detail/create/member/delete |
| UserScores | 4 | 0 | — | History/summary/leaderboard/manual |
| Users | 6 | 0 | — | Search/profile/avatar/image/password |
| **Tổng** | **109** | **7** | **7 structural mappings** | **102 actions chưa map** |

Operational mapping tại thời điểm audit: **0/109**, vì 7 structural mappings không gửi Bearer token theo auth contract hiện có.

## 5. UI/page/button audit

| Khu vực UI | Dữ liệu hiện tại | Nút/action chính | API hiện được gọi | Kết luận |
|---|---|---|---|---|
| Login/Register/Google/Reset | Email login/register đã gọi API thật; Google GIS render; reset chỉ là thông báo | Login, register, Google, reset | Login/register có; Google partial; reset không có | Login/register persist SQL thật; Google consent còn blocked; reset missing |
| Dashboard/Stats | `tmaiData` | Open project/task, filters | Không | Mock data |
| Project Management | `initialProjects` | Create, edit, delete | Không | Fake CRUD/local only |
| Kanban/Task modal/detail | `tasks`/`taskList` | Create, update, move/progress | Không | Fake CRUD/local only |
| Team Management | `initialTeams`, `teamMembers` | Create, invite, remove | Không | Fake CRUD/local only |
| Evaluation Center | Seed evaluations | Submit member/project evaluation | Không | Fake submit/local only |
| Administration | Seed users/orgs/tasks | Role/status, org CRUD, charts | Không | Fake admin/local only |
| Reports | Hardcoded series | View chart | Không | Không phản ánh backend |
| Notifications | Hardcoded list | View | Không | Không dùng notification API |
| Settings | Local booleans | Toggle settings | Không | Không persist |
| AI Core Demo | Numeric IDs nhập tay | Risk, recommend, accept/reject, evidence | Có 7 action | Route map đúng một phần; auth header sai |
| Organization registration | Không có page | — | Không | Missing |
| Organization member management | Không có page riêng | — | Không | Missing |
| Payment/Pricing/Subscription | Không có page | — | Không | Missing |
| Skill Management | Không có page | — | Không | Missing |
| Mobile screens | Static arrays | Navigation/UI demo | Không thấy | Mock only |

## 6. AI mapping chi tiết

| UI action | Frontend call | Backend route | Route/method | Auth/actor | UAT status |
|---|---|---|---|---|---|
| Analyze risk | `analyzeRisk` | POST `/api/ai-analysis/{taskId}/risk` | Khớp | Thiếu Bearer; ID leader chỉ dùng làm header không được backend đọc | BLOCKED |
| Load risk history | `getRiskHistory` | GET `/api/ai-analysis/{taskId}/risk-history` | Khớp | Thiếu Bearer | BLOCKED |
| Recommend Top 3 | `recommend` | POST `/api/task-assignment/recommend` | Khớp | Thiếu Bearer; cần authorization project | BLOCKED |
| Accept | `acceptRecommendation` | POST `/api/task-assignment/accept` | Khớp body cơ bản | Thiếu Bearer; backend lấy decision actor từ JWT | BLOCKED |
| Reject | `rejectRecommendation` | POST `/api/task-assignment/reject` | Khớp body cơ bản | Thiếu Bearer | BLOCKED |
| Refresh evidence | `getEvidence` | GET `/api/tasks/{taskId}/evidence` | Khớp | Thiếu Bearer; cần project isolation | BLOCKED |
| Add URL evidence | `addUrlEvidence` | POST `/api/tasks/{taskId}/evidence` | Khớp | Thiếu Bearer; backend lấy submitter từ JWT | BLOCKED |
| Analyze all project | — | POST `/api/ai-analysis/project/{projectId}/analyze-all` | Chưa map | — | MISSING |
| Task summary | — | POST `/api/ai-analysis/{taskId}/summary` | Chưa map | — | MISSING |
| Task classify | — | POST `/api/ai-analysis/{taskId}/classify` | Chưa map | — | MISSING |
| Workload | — | GET `/api/ai-analysis/project/{projectId}/workload` | Chưa map | — | MISSING |
| Analyses | — | GET `/api/ai-analysis/{taskId}` | Chưa map | — | MISSING |
| Execution logs | — | GET `/api/ai-analysis/{taskId}/executions` | Chưa map | — | MISSING |
| Recommendation history | — | GET `/api/task-assignment/task/{taskId}/history` | Chưa map | — | MISSING |

## 7. Backend capability gap theo yêu cầu UAT

| Requirement | API/domain cần có tối thiểu | Hiện trạng |
|---|---|---|
| Personal/org plan catalog | Plans + prices + features + quota + audience | Không thấy |
| Checkout/payment | Checkout session/order, provider callback/webhook, transaction/invoice | Không thấy |
| Subscription lifecycle | Active/pending/failed/canceled/expired, renewal/downgrade | Không thấy |
| Entitlement/quota | Effective plan lookup + atomic project/member limit | Không thấy |
| Organization registration | POST/PUT organization với owner từ token | Không thấy create/update API |
| Organization member | Invitation acceptance → membership; list/add/update/remove | Không thấy org membership model/API |
| Org role | Owner/Admin/Member scoped theo organization | Không thấy |
| Auto Premium | Entitlement source organization + grant/revoke rules | Không thấy |
| Assign Project Leader | Validate active org member + set/change project-scoped role | Add project member có free-form role nhưng thiếu org validation/authorization |
| Admin user CRUD | List/create/update/lock/delete/restore/role | Chỉ platform stats; Users controller là self/profile-oriented và thiếu admin policy |
| Admin subscription chart | Aggregate subscription API theo period/plan/status | Không thấy |
| Admin organization view | List có sẵn nhưng chưa role-protected/mapped | Partial backend |
| Skill management | Master update/archive/delete và web page | Backend chỉ list/get/create + user-skill CRUD |

## 8. Authorization matrix cần triển khai và test

Legend: `R` read, `W` mutate, `A` administer, `—` denied. Quyền cuối cùng phải được backend enforce.

| Resource/action | System Admin | Org Owner | Org Admin | Project Leader | Member | External user |
|---|---:|---:|---:|---:|---:|---:|
| Platform stats/users/orgs/plans | A | — | — | — | — | — |
| Org profile/billing | R/A | A own | R hoặc theo grant | — | — | — |
| Org member management | R/A | A own | A own theo grant | — | — | — |
| Org project create/list | R/A | W own | W own | R assigned | R assigned | — |
| Project profile/team | R/A | A own | A own | W assigned | R assigned | — |
| Assign/change Project Leader | A | A own | A own theo grant | — | — | — |
| Task CRUD | R/A | A own | A own | W assigned | W giới hạn | — |
| AI run/history/evidence | R/A | R/W own | R/W own | R/W assigned | Theo task assignment | — |
| Master skill | A | R | R | R | R | R authenticated |
| Own user skill/profile | R/A | Own | Own | Own | Own | Own |
| Payment history | A | Own/org own | Theo grant | — | Own personal | Own personal |

## 9. Baseline build/test ngày 2026-08-01

| Check | Kết quả | Ghi chú |
|---|---|---|
| Backend restore/build/test từ source, output ở thư mục tạm | PASS | 59/59 tests pass, 0 failed, 0 skipped |
| Backend compiler warnings | WARNING | `OrganizationRepository.cs:43` có CS8602 possible null dereference |
| Web Vite production build, output ở thư mục tạm | PASS | 2,699 modules transformed, Vite 6.3.5 |
| Web bundle size | WARNING | JS bundle khoảng 1,024.68 kB (gzip 285.43 kB), vượt warning threshold 500 kB |

59 tests hiện có chủ yếu bao phủ AI Core. Baseline xanh chỉ xác nhận code compile và suite hiện hữu pass; không thay thế 126 UAT cases trong kế hoạch này và không làm thay đổi quyết định readiness `NO-GO`.

## 10. Remediation order trước UAT

1. Chốt BR/role/plan matrix và database model cho subscription, entitlement, org membership.
2. Enforce actor từ JWT, resource ownership và tenant scope trong backend; bỏ việc tin `CreatedBy`, `OrganizedBy`, `EvaluatorId` từ client.
3. Hoàn thiện payment webhook idempotency và atomic quota enforcement.
4. Hoàn thiện org registration/member/role/Project Leader APIs.
5. Tạo một API client web dùng Bearer token, chuẩn hóa 401/403/validation/error/loading.
6. Thay toàn bộ seed/local mutation trong các page thuộc release bằng API thật.
7. Bổ sung Pricing/Payment/Subscription, Organization Registration/Management và Skill Management pages.
8. Map toàn bộ AI actions có trong scope; bỏ numeric actor ID nhập tay.
9. Viết automated integration/authorization/contract tests trước khi mời business UAT.
10. Chỉ chuyển status sang `READY FOR UAT` khi entry criteria trong master plan đạt.

## 11. Definition of “button mapped”

Một button chỉ được đánh dấu mapped/pass khi đồng thời thỏa tất cả:

1. Gọi đúng API method/path/schema từ OpenAPI.
2. Gửi Bearer token và organization context hợp lệ khi cần.
3. Backend kiểm tra role/ownership/quota, không tin actor ID từ client.
4. UI có loading, disable double-submit, success theo response thật, validation/error/401/403/409/500.
5. Mutation persist sau refresh/logout-login.
6. Có integration/contract test hoặc evidence network cho happy path và negative path.
7. Không còn fallback sang seed/local state tạo cảm giác thành công giả.

Theo định nghĩa này, tại thời điểm audit chưa có button nghiệp vụ nào đủ điều kiện `PASS UAT`.
