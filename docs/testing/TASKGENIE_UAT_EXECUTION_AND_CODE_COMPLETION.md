# TaskGenie V2 – UAT Execution Report và Code Completion Blueprint

Report ID: `UAT-TG-V2-EXEC-01`  
Ngày thực thi: 2026-08-01  
Revision: `R2-WEB-AUTH-FOUNDATION` lúc 2026-08-01  
Môi trường: macOS + Docker SQL Server 2022 + .NET 10 + Vite 6.3.5  
Database: `ai_task_management_uat` trên container `sqlserver2022`, port `1433`  
Quyết định release: **NO-GO**

## 1. Kết luận điều hành

Web authentication cơ bản đã được thay từ giả lập sang API thật và đã UAT qua trình duyệt với SQL Server Docker thật. Backend đã có policy riêng cho `PLATFORM_ADMIN`, đồng thời Project Create không còn tin `CreatedBy` từ client. Hệ thống vẫn **NO-GO** vì refresh/forgot-reset password chưa tồn tại, Google chưa được xác nhận bằng tài khoản Google thật, resource/tenant authorization còn thiếu, phần lớn màn hình CRUD/Admin vẫn dùng dữ liệu local, và subscription/payment/organization membership chưa tồn tại.

### Cập nhật UAT vòng 2 – Web authentication foundation

| Hạng mục | Evidence thực tế | Kết quả |
|---|---|---|
| Automated backend tests | 63 passed, 0 failed | PASS |
| Web production build | 2,704 modules; JS 1,021.20 kB, gzip 285.09 kB | PASS có cảnh báo bundle lớn |
| Register API + DB | User `1002` được tạo thật trong `Users` | PASS |
| Register từ browser + DB | Users tăng 6 → 7; user `1003`, role `NORMAL_USER`, status 1 | PASS |
| Login browser với DB thật | Dashboard hiển thị đúng `UAT Web UI / NORMAL_USER` | PASS |
| Login sai password | HTTP 401; UI hiển thị `Email hoặc mật khẩu không đúng.` | PASS |
| Duplicate register | HTTP 400 | PASS |
| Logout/revocation | UI gọi API; token cũ bị 401 | PASS |
| Google button | Google Identity Services button render thật | PARTIAL — chưa xác nhận account thật |
| Forgot password | UI nói rõ backend chưa hỗ trợ, không fake success | BLOCKER |
| Normal user thấy Administration | Menu bị ẩn | PASS UI guard |
| Normal user gọi Admin API | HTTP 403 sau rebuild đúng source | PASS backend policy |
| Platform admin gọi Admin API | Nâng role tạm trong DB; HTTP 200; trả 7 users, 1 org, 2 projects, 13 tasks, 5 done | PASS; role đã hoàn tác |
| Administration user list | Vẫn hiển thị `an.le@tmai.com` và dữ liệu mẫu, không phải 7 users trong DB | FAIL-MOCK |
| Dashboard/project data | Vẫn hiển thị 4 project mẫu trong khi DB có 2 | FAIL-MOCK |

Hai user UAT thật được giữ trong database để phục vụ các vòng test tiếp theo:

- `1002 / uat.web.auth.20260801171015@taskgenie.test / NORMAL_USER`
- `1003 / uat.web.ui.20260801172000@taskgenie.test / NORMAL_USER`

Không có payment giả hoặc subscription giả nào được tạo trong vòng này. Quy tắc vẫn là chỉ gateway payment được fake; transaction, subscription, entitlement và quota phải ghi thật vào SQL Server.

Các con số dưới đây là baseline vòng 1 trước khi áp dụng Web Auth foundation; phần cập nhật vòng 2 phía trên là kết quả mới hơn:

| Chỉ số | Kết quả |
|---|---:|
| Backend HTTP actions trong OpenAPI | 109 |
| Authenticated GET actions smoke-tested | 53/53 trả 2xx với input hợp lệ |
| Automated tests | 59/59 pass (vòng 1); hiện tại 63/63 |
| Web production build | Pass |
| EF migrations đã áp dụng | 5/5 |
| Pending model changes | Không có |
| Button declarations đã inventory/trace handler | 92/92 |
| Form submit flows đã inventory/trace handler | 13/13 |
| Structural FE → API mappings | 7/109 |
| Operational FE → API mappings với auth hiện tại | 0/109 |
| Negative authorization attempts trả 2xx trái mong đợi | 28 |
| Critical/High release blockers | 18 |

Điểm đáng lưu ý: `53/53 GET trả 2xx` chỉ chứng minh route, DI và database hoạt động. Nhiều request đáng lẽ phải trả `403`, vì vậy con số này không được hiểu là 53 nghiệp vụ pass.

## 2. Phạm vi và phương pháp đã thực thi

- Build backend từ source và chạy xUnit suite.
- Build production bundle của web vào thư mục tạm.
- Tạo database SQL Server thật trong Docker, áp migrations và seed.
- Chạy API local bằng Docker database và JWT UAT secret tạm thời.
- Kiểm thử Auth API: login, register, duplicate, validation, logout/revocation và Google invalid token.
- Smoke toàn bộ 53 GET actions được công bố trong Swagger.
- Chạy representative CRUD cho project, task, team, invitation, evaluation, meeting, user skill, master skill, score, evidence và AI.
- Chạy negative authorization bằng hai account `NORMAL_USER` thuộc các team/project khác nhau.
- Dùng browser thực tế kiểm tra fake login, refresh session, admin access và AI button.
- Static trace toàn bộ button/form handler để phát hiện local-only action, dead button và missing API.
- Cleanup dữ liệu UAT do test tạo; giữ AI run history làm evidence.

Không dùng production credential hoặc production database.

## 3. Thiết lập database UAT đã hoàn thành

### Trạng thái sau cleanup vòng 1

| Entity | Số lượng sau cleanup |
|---|---:|
| Users | 5 |
| Organizations | 1 |
| Projects | 2 |
| Teams | 2 |
| Tasks | 13 |
| Skills | 8 |
| EF migrations | 5 |
| Orphan test teams | 0 |
| Risk history evidence | 1 |
| Recommendation evidence | 3 |
| AI execution logs | 2 |

Trạng thái DB sau UAT Web Auth vòng 2: Users 7, Organizations 1, Projects 2, Teams 2, Tasks 13, Skills 8. Hai user tăng thêm là fixture UAT thật được ghi rõ ở phần cập nhật; không phải dữ liệu giả trong frontend.

### Cách chạy API với Docker database

Không commit SA password vào repository. Lấy password từ Docker secret/environment và truyền connection string bằng environment variable:

```text
ConnectionStrings__DefaultConnection=
Server=127.0.0.1,1433;
Database=ai_task_management_uat;
User Id=sa;
Password=<DOCKER_SA_PASSWORD>;
TrustServerCertificate=True;
Encrypt=False;
MultipleActiveResultSets=true
```

Development `appsettings` hiện dùng `(localdb)\MSSQLLocalDB`, không chạy trên macOS. Cần bổ sung `appsettings.UAT.json`, Docker Compose hoặc documented environment setup; secret phải nằm ngoài Git.

## 4. Build, test và migration result

| Check | Actual result | Status |
|---|---|---|
| `dotnet test` build từ source | 59 passed, 0 failed, 0 skipped | PASS |
| Backend compiler | Build thành công | PASS |
| `OrganizationRepository.cs:43` | CS8602 possible null dereference | WARNING |
| `dotnet ef migrations has-pending-model-changes` | No changes | PASS |
| Vite production build | 2,699 modules transformed | PASS |
| Web JS bundle | 1,024.68 kB, gzip 285.43 kB | WARNING |
| SQL migrations | Initial + score + completedAt + meeting + explainable AI | PASS |
| Development startup với LocalDB trên macOS | PlatformNotSupportedException | FAIL-ENV |
| Development startup với Docker SQL | Seed và startup thành công | PASS |

Automated suite hiện tập trung vào AI Core; chưa có integration tests cho role, tenant, auth lifecycle, project quota, subscription hoặc payment.

## 5. Authentication execution result

| Test | Expected | Actual | Status |
|---|---|---|---|
| API login seeded user đúng password | 200 + JWT | 200 + JWT | PASS |
| API login sai password | 401 | 401 | PASS |
| API login invalid email/password format | 400 validation | 400 | PASS |
| API register user mới | Tạo một user | 200, role `NORMAL_USER`, firstLogin=true | PASS |
| API register duplicate email | Bị chặn | 400 | PASS |
| API logout | Revoke token | 200; token cũ gọi Project trả 401 | PASS trong single process |
| Google invalid ID token | 401 | 401 | PASS |
| Google login thực tế trên web | Có Google SDK/button | Không có button/flow | FAIL |
| Web login với email không tồn tại | Bị từ chối | Vào dashboard sau delay | CRITICAL FAIL |
| Web login với arbitrary valid-format credentials | Bị từ chối | Hiển thị user cố định `Huy Pham` | CRITICAL FAIL |
| Refresh sau web login | Giữ session hợp lệ hoặc refresh-token flow | Quay lại login vì React state mất | FAIL |
| Web logout | Gọi `/api/auth/logout` | Chỉ đổi React state | FAIL |
| Forgot/OTP/reset web | API thực, token/code có hạn | Delay và screen state giả lập; backend endpoints không tồn tại | FAIL |

## 6. Authorization, ownership và tenant execution result

Hai seeded users có role `NORMAL_USER` được dùng để gửi request trái quyền. Tất cả trường hợp dưới đây đáng lẽ phải `403/404` nhưng backend trả 2xx.

| Scenario | Actual |
|---|---|
| Normal user gọi `Admin/platform-stats` | 200 |
| Normal user gọi `Organizations/admin/all` | 200 |
| User 5 đọc Project 1 không thuộc team | 200 |
| User 5 đọc profile User 2 | 200 |
| User 5 đổi tên User 2 | 200; tên đã được cleanup/restore |
| User Free có sẵn 2 project tạo project thứ 3 | 201 |
| User 5 tạo project nhưng body khai `CreatedBy=1`, `OrganizationId=1` | 201; response lưu creator/org giả |
| User 5 xóa project do actor khác sở hữu | 204 |
| User 5 tạo task trong project không thuộc quyền | 201 |
| User 5 update task đó | 204 |
| User 5 update progress | 200 |
| User 5 thay required skills | 200 |
| User 5 tạo comment nhưng body khai `UserId=1` | 200 |
| User 5 tạo Team nhưng body khai `CreatedBy=1` | 201 |
| User 5 tạo invitation cho Team 1 | 201 |
| User 5 cập nhật invitation status | 204 |
| User 5 đánh giá user/leader bất kỳ | 201 |
| User 5 tạo meeting nhưng body khai `OrganizedBy=1` | 201 |
| Normal user cộng 99 điểm thủ công cho User 1 | 200 |
| User 5 add/update/remove skill của User 2 | 200/204/204 |
| Normal user tạo master skill | 201 |
| Normal user đánh giá Organization Project 1 | 200 |
| User 5 chạy risk trên task Project 1 | 200 |
| User 5 đọc risk history Project 1 | 200 |
| User 5 chạy recommendation Project 1 | 200 |
| User 5 đọc workload Project 1 | 200 |
| User 5 thêm evidence vào task Project 1 | 201 |
| User 5 chạy summary/classification task Project 1 | 200/200 |

Root cause chính:

- Fallback policy chỉ yêu cầu “đã đăng nhập”, không yêu cầu role.
- Controller/handler không nhận current actor cho nhiều action GET/PUT/DELETE.
- Actor và tenant IDs được lấy từ body: `CreatedBy`, `UserId`, `OrganizedBy`, `EvaluatorId`, `OrganizationId`.
- Không có resource-based authorization service kiểm tra membership/project assignment.
- `PREMIUM`/plan chưa tồn tại nên quota không thể enforce.

## 7. Project quota và data integrity

| Test | Actual | Status |
|---|---|---|
| Free/normal user tạo project thứ ba | 201 | FAIL |
| Gọi trực tiếp API để bypass UI | 201 | FAIL |
| Forged creator/org | 201 và lưu theo body | CRITICAL FAIL |
| Delete test project | 204 | Transport PASS |
| Kiểm tra team sau project delete | Team và TeamMember vẫn tồn tại orphan | HIGH FAIL |
| Cleanup orphan test teams | Đã cleanup bằng SQL transaction | DONE |
| Team delete sau create | API trả 500 do TeamMember FK | HIGH FAIL |

`CreateProjectCommandHandler` tạo Team và TeamMember trước Project nhưng không dùng transaction. Khi create project lỗi hoặc project bị xóa, có thể để lại team/member rác.

Database migration hiện tạo cả `projects.CreatedBy` và `projects.CreatedByNavigationUserId` thay vì mapping chuẩn `created_by` + một FK. Trong `AppDbContext`, Project không cấu hình property/FK cho `CreatedBy`/`CreatedByNavigation`. Đây là schema defect cần migration sửa.

## 8. AI execution result

### Backend với JWT thật

| AI action | Actual | Status kỹ thuật |
|---|---|---|
| Risk task 4 | 200; score 49.7, MEDIUM, 5 factors | PASS |
| Risk history | 200; history persisted | PASS |
| Recommendation task 4/project 1 | 200; 3 suggestions, provider SUCCEEDED | PASS |
| Workload suggestions | 200 | PASS |
| Add URL evidence | 201, persisted | PASS kỹ thuật; FAIL authorization |
| Generate task summary | 200 | PASS kỹ thuật; response quá chung |
| Classify task | 200 | PASS kỹ thuật; response quá chung |
| AI execution logs | Persisted 2 records | PASS |

### Frontend

Browser bấm `Analyze risk` trên màn hình ghi “REAL BACKEND DATA” nhưng nhận toast `API request failed (401).` và UI vẫn rỗng.

Nguyên nhân: `coreAiApi.ts` gửi `X-User-Id` nhưng không gửi `Authorization: Bearer`. Backend đọc user từ JWT claim và không đọc header này.

Các AI actions chưa map UI:

- Analyze all project.
- Generate/get summary.
- Classify/get analyses.
- Workload suggestions.
- Execution logs.
- Recommendation decision history.
- File evidence.

## 9. API contract smoke result

- Swagger tải thành công: HTTP 200.
- 53 GET actions đã gọi bằng seeded authenticated user.
- Sau khi điền đúng required `teamId` và `email`, 53/53 trả 2xx.
- Không authentication: Projects, Admin stats và AI risk đều trả 401, xác nhận fallback policy hoạt động.
- Vấn đề nằm ở authorization sau authentication, không phải authentication middleware.

Các mutation đại diện đã hoạt động ở transport level: Project, Task, TaskProgress, TaskRequiredSkills, Comment, Team, Invitation, Evaluation, Meeting, UserSkill, MasterSkill, UserScore, Organization Evaluation, Risk, Recommendation và Evidence.

Transport success không được xem là business pass khi actor trái quyền vẫn được phép thao tác.

## 10. Toàn bộ button/form coverage matrix

Source có 92 button declarations và 13 forms. Các nút render theo collection có thể tạo nhiều button runtime từ một declaration. Tất cả declarations đã được trace đến handler/API; các luồng trọng yếu được click trực tiếp trong browser.

Legend:

- `UI PASS`: nút thay đổi màn hình/local state đúng với code hiện tại.
- `FAIL-LOCAL`: UI báo thành công nhưng không gọi/persist backend.
- `FAIL-AUTH`: có gọi API nhưng credential contract sai.
- `DEAD`: không có handler/action.
- `MISSING`: chức năng yêu cầu nhưng không có button/page.

| Component/khu vực | Button/form đã kiểm tra | Kết quả | Đề xuất |
|---|---|---|---|
| Auth – Login | Sign In, Remember me, show/hide password | Sign In `FAIL-LOCAL`; arbitrary credentials vào được app; Remember/eye chỉ local | Gọi Auth API, AuthProvider, token/session và error mapping |
| Auth – Navigation | Sign up free, Forgot password, Back | UI PASS chuyển screen; không có route/backend state | Thêm route và server-side flow |
| Auth – Register | Create Account, show/hide password/confirm | `FAIL-LOCAL`; chỉ delay rồi sang OTP | Map `/auth/register`; bỏ fake verification hoặc triển khai OTP thật |
| Auth – OTP | Verify, Resend | `FAIL-LOCAL`; timer/toast giả | Verification token table, expiry, attempts, resend limit |
| Auth – Reset | Send Reset Code, Reset Password, Continue | `FAIL-LOCAL`; backend endpoints thiếu | Forgot/reset endpoints + one-time token |
| Auth – Google | — | `MISSING` | Google button/SDK; gửi ID token `/auth/google` |
| Sidebar nav | Dashboard, Task Board, Projects, Reports, AI, Team, Evaluations, Admin, Notifications, Settings | UI navigation hoạt động; role guard thiếu | Route config + permission metadata + lazy loading |
| Sidebar projects | Project rows/select | UI PASS với seed | Tải `/Projects`, giữ project context thật |
| Sidebar logout | Logout icons + confirm/cancel | `FAIL-LOCAL` | Gọi `/auth/logout`, clear session, handle failure |
| Header | Collapse, clear search, AI Active, Kanban/List, New, notifications, profile | Chủ yếu UI/local | Map search/query; task create API; notification API; profile API |
| Header `View all` notifications | View all | `DEAD` | Navigate Notifications page và mark/read behavior |
| Dashboard project cards/table | Expand/select project | UI PASS với seed | Dùng project/task/risk response thật |
| Settings toggles | 6 toggles | `FAIL-LOCAL`; refresh mất | User settings model/API hoặc loại khỏi release |
| Project Management | Create/open/cancel/select/edit/remove/save | `FAIL-LOCAL`; 4 seed projects; không quota/API | Map 8 Project APIs, quota response, confirm delete, optimistic rollback |
| Kanban | Collapse columns, task cards, Add task | UI PASS/local | Tasks API, progress API, drag authorization và concurrency |
| Create Task Modal | Close, cancel, create form | `FAIL-LOCAL` | POST Task, server validation, loading/idempotency |
| Task Detail | Close, tabs, checklist toggle | `FAIL-LOCAL` | Task/comment/evidence/progress/dependency APIs |
| Team Management | Create/cancel/select/invite/close/remove | `FAIL-LOCAL` | Team + Invitation APIs, permission checks, handle Leader removal |
| Evaluation Center | Team/Project tabs, select subject, 2 submit forms | `FAIL-LOCAL` | Evaluation/Organization Evaluation APIs + actor from JWT |
| Administration | Users/Organizations/Stats tabs | UI PASS nhưng mọi user thấy được | Admin route guard + backend Admin policy |
| Administration users | Edit role, role select, activate/deactivate | `FAIL-LOCAL` | Admin Users CRUD/status/role APIs, audit log, last-admin guard |
| Administration org | Add/close/cancel/create/edit/delete | `FAIL-LOCAL` | Organization CRUD APIs; member/plan data từ DB |
| Administration charts | Tab/filter/tooltip | Seed-only | Admin aggregation/subscription endpoints |
| AI Core | Analyze, Recommend, Refresh Evidence, Save | `FAIL-AUTH` (401 trên browser) | Shared Bearer API client; actor từ session |
| AI decisions | Accept/Reject | `FAIL-AUTH`; chỉ xuất hiện sau recommendation | Permission/idempotency/decision history |
| Reports | Chart display | Seed-only, không action/API | Report query/filter/export API |
| Notifications page | List | Seed-only | Map 5 Notification APIs |
| AI chat drawer | Close | UI PASS | Giữ |
| AI chat quick questions | Dynamic question buttons | `DEAD` | Gắn submit handler và AI conversation endpoint hoặc remove |
| AI chat Send | Send | `DEAD` | Form submit, loading, streaming/error state |
| Profile panel | Open/close | UI PASS/local | Map profile/avatar/password APIs |
| MobileDashboard View all | View all buttons | `DEAD` | Navigation handler hoặc remove |
| Mobile tabs | Bottom tabs | UI navigation local | API client/auth/navigation guards |

### Button definition of done

Một button chỉ được tính hoàn thiện khi:

1. Có accessible name duy nhất; icon-only button phải có `aria-label`.
2. Role/tenant visibility đúng trên UI nhưng không thay thế backend authorization.
3. Gọi đúng method/path/body từ generated OpenAPI client.
4. Gửi Bearer token và organization context hợp lệ.
5. Có loading/disabled double-submit.
6. Xử lý 400/401/403/404/409/422/500/offline.
7. Chỉ báo success sau response thật.
8. Refresh/logout-login vẫn thấy mutation.
9. Có component/integration/E2E test cho success và negative path.

## 11. Subscription, payment và organization gap

Các nhóm này không thể chạy UAT vì code chưa tồn tại:

- Personal/Organization plan catalog.
- Pricing/Payment page.
- Checkout/order/payment transaction.
- Provider callback và idempotent webhook.
- Subscription lifecycle: pending/active/canceled/expired.
- Entitlement/quota service.
- Organization registration/update/delete.
- OrganizationMember entity và org-scoped roles.
- Organization member management page/API.
- Auto Premium grant/revoke theo membership.
- Organization context switch sau login.
- Assign/change Project Leader có kiểm tra active org member.
- Admin subscription chart/payment history.

Không nên dùng `User.Role = PREMIUM`. Premium là entitlement; authorization role và commercial plan là hai khái niệm khác nhau.

## 12. Defect backlog để hoàn thiện code

### Critical – phải sửa trước mọi UAT business

| ID | Defect | Hướng sửa bắt buộc |
|---|---|---|
| DEF-C01 | Web fake login/register/logout | AuthProvider + real API + JWT/refresh lifecycle; bỏ toàn bộ delays/fake-success |
| DEF-C02 | Không có role/resource authorization | Policies cho SystemAdmin/OrgOwner/OrgAdmin/Leader/Member + resource authorization handlers |
| DEF-C03 | IDOR trên User/Project/Task/Org/AI | Mọi query/command nhận actor từ JWT và verify ownership/membership |
| DEF-C04 | Tin actor IDs từ client | Loại `CreatedBy`, `OrganizedBy`, `EvaluatorId`, comment `UserId` khỏi request hoặc đối chiếu bắt buộc |
| DEF-C05 | Có thể giả OrganizationId | Derive org từ authenticated context/membership và validate project ownership |
| DEF-C06 | Project quota chưa tồn tại | Subscription/Entitlement + atomic quota check ở backend |
| DEF-C07 | Payment/subscription missing | Thêm domain, API, webhook, pages và sandbox tests |
| DEF-C08 | Organization membership/Premium missing | `OrganizationMember` + entitlement source/revoke rules |
| DEF-C09 | 85+ buttons/forms không persist | Thay seed/local mutation bằng API client |
| DEF-C10 | AI web không gửi Bearer | Shared API client/interceptor; bỏ `X-User-Id` và numeric actor input |

### High

| ID | Defect | Hướng sửa |
|---|---|---|
| DEF-H01 | Delete Project để lại orphan Team/TeamMember | Transaction + aggregate delete/soft delete + FK/cascade policy |
| DEF-H02 | Delete Team trả 500 khi còn TeamMember | Business guard hoặc cascade explicit; trả 409 thay vì 500 |
| DEF-H03 | Create Project không transaction | EF execution strategy + DB transaction cho Team/Leader/Project |
| DEF-H04 | Project CreatedBy schema sai | Map `CreatedBy` → `created_by`, FK tới User; migration data repair/drop shadow column |
| DEF-H05 | Admin API chỉ có stats | Admin user/org/subscription/payment/skill APIs |
| DEF-H06 | Organization API không có CRUD/member | Bổ sung create/update/delete/member/role/invite acceptance |
| DEF-H07 | Skill master thiếu update/archive/delete và UI | Hoàn thiện lifecycle; không hard-delete skill đang referenced |
| DEF-H08 | `/Organizations/my` chỉ tìm owner | Query memberships, không chỉ owner |
| DEF-H09 | Command trả success khi handler có thể false | Controller map `false` thành 404/409, không luôn 200 |
| DEF-H10 | In-memory token revocation | Dùng Redis/DB hoặc short access token + rotating refresh token cho multi-instance |
| DEF-H11 | CORS AllowAll | Restrict origins/methods/headers theo environment |
| DEF-H12 | Secrets/config trong appsettings | Chuyển secret sang user-secrets/env/vault và rotate các key đã commit |

### Medium

| ID | Defect | Hướng sửa |
|---|---|---|
| DEF-M01 | Nhiều icon button không có accessible name | `aria-label`, tooltip, keyboard/focus tests |
| DEF-M02 | Dead buttons | Implement handler hoặc remove khỏi release UI |
| DEF-M03 | Reports/charts/notifications/settings dùng seed | API query + loading/error/empty states |
| DEF-M04 | Bundle JS > 1 MB | Route lazy load, manual chunks, tree-shake MUI/Recharts |
| DEF-M05 | Nullable warning OrganizationRepository | Guard null navigation/property ở line 43 |
| DEF-M06 | Generic AI success response | Trả DTO/runId/result/status; UI tải kết quả thật |
| DEF-M07 | Không có refresh-safe routing/session | React Router routes + protected route + bootstrap `/me` |

## 13. Domain/database cần bổ sung

### Bảng tối thiểu

| Table | Trường chính |
|---|---|
| `plans` | id, code, audience PERSONAL/ORGANIZATION, billing interval, price, currency, project/member quota, active |
| `subscriptions` | id, user_id/org_id, plan_id, status, provider refs, period dates, cancel_at_period_end |
| `payment_transactions` | id, subscription_id, amount, currency, status, provider event/order/payment IDs, idempotency key |
| `organization_members` | id, organization_id, user_id, role, status, joined_at, invited_by |
| `entitlements` | id, user_id, source_type, source_id, feature, limit/value, starts_at, expires_at, status |
| `refresh_tokens` | hashed token, user, family, expires, revoked/replaced |
| `audit_logs` | actor, tenant, action, target, result, correlation_id, timestamp |

Ràng buộc cần có:

- Unique active membership `(organization_id, user_id)`.
- Unique provider webhook/event ID.
- Subscription owner XOR: personal user hoặc organization.
- Unique active project leader theo business rule.
- Unique normalized skill name.
- Project quota check trong transaction để chống concurrent create.

## 14. API cần bổ sung/chỉnh sửa

### Identity

- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- Google login UI dùng endpoint hiện có.

### Plans/payment

- `GET /api/plans?audience=personal|organization`
- `POST /api/checkout-sessions`
- `POST /api/payments/webhook`
- `GET /api/subscriptions/me`
- `GET /api/organizations/{id}/subscription`
- `POST /api/subscriptions/{id}/cancel`
- `GET /api/payments/history`

### Organization

- `POST /api/organizations`
- `PUT /api/organizations/{id}`
- `DELETE /api/organizations/{id}`
- `GET /api/organizations/{id}/members`
- `POST /api/organizations/{id}/invitations`
- `POST /api/organization-invitations/{token}/accept|reject`
- `PUT /api/organizations/{id}/members/{userId}/role`
- `DELETE /api/organizations/{id}/members/{userId}`
- `PUT /api/organizations/{id}/projects/{projectId}/leader`

### Admin

- Paginated user CRUD/status/role.
- Paginated organizations + detail.
- Subscription/payment aggregates by date/plan/status.
- Master skill update/archive.

## 15. Frontend completion architecture

1. Tạo một `apiClient` duy nhất:
   - base URL từ environment;
   - Bearer token;
   - correlation ID;
   - chuẩn hóa Problem Details/validation;
   - xử lý refresh/401 một lần;
   - không gửi actor ID có thể lấy từ session.
2. `AuthProvider` bootstrap `/auth/me`, protected routes và role/permission hooks.
3. `OrganizationProvider` giữ current org membership/context; đổi org phải invalidate queries.
4. Dùng server-state library hoặc thống nhất fetch hooks; seed chỉ được phép trong Storybook/demo fixture.
5. Các page bắt buộc: Pricing, Checkout/Payment Result, Subscription, Organization Registration, Organization Members, Organization Projects, Skill Management.
6. Mỗi mutation có loading, disable, retry/idempotency và invalidate/refetch.
7. Generate TypeScript client/types từ OpenAPI để tránh body/route mismatch.

## 16. Automated tests phải viết trước UAT vòng kế tiếp

### P0 integration/security

- Anonymous → 401 cho protected endpoints.
- Normal user → 403 Admin APIs.
- Cross-user profile read/update/delete → 403/404.
- Cross-org project/task/team/AI/evidence → 403/404.
- Forged actor/org body không thay đổi effective actor/tenant.
- Free quota boundary và concurrent create.
- Paid entitlement activates only after verified payment.
- Duplicate webhook idempotency.
- Membership accept grants Premium; removal revokes đúng source.
- Project Leader only active member; role project-scoped.
- Delete aggregate không orphan.

### FE component/E2E

- Real login success/failure/locked/Google/error.
- Refresh session, logout, expired token.
- Button mapping contract cho 92 declarations.
- Free create third project blocked; upgrade then create succeeds.
- Organization register → invite → accept → leader → AI.
- Admin user/org/skill/subscription charts.
- 401/403/409/422/500/offline/double-click states.

## 17. Thứ tự triển khai đề xuất

### Phase 1 – Security foundation

1. Fix Project CreatedBy mapping/migration.
2. Current actor abstraction + role/membership policies.
3. Resource authorization cho 109 actions.
4. Transaction/cascade/orphan fixes.
5. Automated negative authorization suite.

### Phase 2 – Commercial và organization domain

1. Plans/subscriptions/payments/entitlements.
2. Organization membership/roles/invitations.
3. Atomic project/member quotas.
4. Project Leader assignment.
5. Payment sandbox/webhook tests.

### Phase 3 – Frontend real integration

1. Auth/API client/routes.
2. Project/task/team.
3. Organization/member/leader.
4. Admin/skill/payment.
5. AI complete mapping.
6. Remove seed/fake-success/dead buttons.

### Phase 4 – UAT regression

- Chạy lại 126 planned cases.
- 100% P0 pass, không còn Critical/High.
- Browser matrix và mobile smoke.
- PO/QA sign-off.

## 18. Exit criteria cho lần test tiếp theo

- Không còn fake authentication/local CRUD trong release routes.
- Normal user nhận 403 cho Admin và mọi cross-resource test.
- Có plan/payment/org/member/Premium/Leader flow chạy end-to-end.
- 109 API actions có owner/role matrix và automated authorization test.
- 92 button declarations có API/navigation chủ đích, không dead/fake-success.
- Project/team delete không orphan/500.
- AI UI gửi Bearer và không cho nhập actor ID tùy ý.
- Không còn Critical/High defect mở.

## 19. Residual limitations của vòng thực thi này

- Google GIS button/SDK đã render trên web local; chưa hoàn tất consent thật vì cần một Google credential được phép dùng trong môi trường UAT. Console hiện cảnh báo `google.accounts.id.initialize()` bị gọi nhiều lần và click trong browser automation chưa mở account chooser.
- Không thể test payment/subscription/org membership vì chưa có code.
- Chưa test concurrency/load/payment webhook vì domain tương ứng chưa tồn tại.
- Chưa chạy mobile E2E vì mobile hiện không có network/auth layer.
- Token revocation chỉ được xác minh trong một API process; chưa kiểm tra multi-instance.

Các case này phải giữ trạng thái `BLOCKED-MISSING-FEATURE`, không được tính Pass.

## 20. Kết quả thực thi R3 — Project/Team atomic lifecycle

Ngày chạy: 2026-08-01. Scope: web/API trên workspace chính, SQL Server 2022 container `sqlserver2022`, database `ai_task_management_uat`. Mọi dữ liệu trong vòng này được ghi/đọc từ SQL Server thật; không dùng InMemory cho UAT Docker.

### Thay đổi đã xác minh

- Thêm migration `20260801120000_AddTeamIsProjectManaged`; cột `teams.is_project_managed` là `bit NOT NULL`, default `0`, và migration đã có trong `__EFMigrationsHistory`.
- Tạo Project tạo đồng thời Team chuyên dụng (`is_project_managed=1`) và membership `LEADER` của actor JWT trong một transaction.
- Xóa Project dọn Team/TeamMember/Invitation chuyên dụng khi không còn Project tham chiếu.
- Đổi Team dọn Team chuyên dụng cũ khi orphan; không xóa Team độc lập hoặc Team vẫn được Project khác dùng chung.

### Automated regression

| Suite | Kết quả |
|---|---:|
| Toàn bộ `TaskGenie.Tests` | PASS — 95/95 |
| Lifecycle cases mới | PASS — 6/6 |
| Build warning còn lại | 1 cảnh báo CS8602 có sẵn trong `OrganizationRepository.cs`; không phát sinh từ thay đổi này |

### Đối chiếu SQL Server Docker

Baseline trước mỗi flow: `Projects=2`, `Teams=2`, `TeamMembers=7`, `Users=7`, `Organizations=1`, `Tasks=13`, `Skills=8`.

| Case | API/DB thực thi | Kết quả DB thực tế | Status |
|---|---|---|---|
| R3-LIFE-001 | Login user 1002, `POST /api/projects` | `2/2/7 → 3/3/8`; Project 1005 trỏ Team 1005; `is_project_managed=1`; user 1002 role `LEADER` | PASS |
| R3-LIFE-002 | `DELETE /api/projects/1005` | HTTP 204; Project/Team/Member liên quan đều 0 row; tổng trở lại `2/2/7` | PASS |
| R3-LIFE-003 | Tạo Project A/B, đổi A sang Team của B | HTTP 204; Team cũ của A còn 0 row; hai Project cùng trỏ Team B; tổng `Projects=4, Teams=3, TeamMembers=8` | PASS |
| R3-LIFE-004 | Xóa A khi B còn dùng Team chung | Team chung và Project B vẫn còn đúng 1 row | PASS |
| R3-LIFE-005 | Xóa B là Project tham chiếu cuối | HTTP 204; Team chung bị dọn; tổng trở lại chính xác `2/2/7` | PASS |

Kết luận R3: defect orphan Project–Team đã đóng ở tầng code, automated test và SQL Server Docker. Baseline UAT không bị thay đổi sau cleanup. Các scope Team/Task/AI authorization, organization, subscription/quota/payment fake-gateway, admin và toàn bộ button mapping vẫn phải tiếp tục theo các phase kế tiếp; chưa đủ điều kiện production sign-off.

## 21. Kết quả thực thi R4 — Web live audit đối chiếu SQL Server Docker

Ngày chạy: 2026-08-01. Web local `http://127.0.0.1:5173`, API local `http://127.0.0.1:5258`, SQL Server container `sqlserver2022`, database `ai_task_management_uat`.

### Auth chạy thật

| Case | Thao tác browser | Đối chiếu DB/API | Kết quả |
|---|---|---|---|
| R4-AUTH-001 | Login user 1002 qua form email/password | Session nhận user `UAT Web Auth`, role `NORMAL_USER` từ API | PASS |
| R4-AUTH-002 | Đăng ký `uat.web.registration.20260801181600@taskgenie.test` | DB tạo đúng user 1004, role `NORMAL_USER`, `users: 7 → 8` | PASS |
| R4-AUTH-003 | Logout tài khoản vừa đăng ký | Dialog xác nhận và quay lại login | PASS |
| R4-AUTH-004 | Cleanup đúng user 1004 sau UAT | Delete theo cả `user_id` và email; `users: 8 → 7` | PASS |
| R4-AUTH-005 | Bootstrap user 1003 thành `PLATFORM_ADMIN`, login lại | Menu Administration xuất hiện theo JWT role thật | PASS cho route visibility; chưa chứng minh Admin CRUD |
| R4-AUTH-006 | Render/click Google GIS | Button render; click chưa mở chooser; console cảnh báo initialize nhiều lần | BLOCKED/PARTIAL |
| R4-AUTH-007 | Forgot password | UI công khai báo chức năng chưa có; backend không có reset flow | BLOCKED-MISSING-FEATURE |

### Bằng chứng UI không khớp DB thật

Baseline Docker sau cleanup: `Users=7`, `Projects=2`, `Tasks=13`, `Teams=2`, `TeamMembers=7`, `Organizations=1`, `Evaluations=0`, `ProjectEvaluations=0`, `Notifications=1`.

| Màn hình/nút | UI hiển thị hoặc phản hồi | DB thật | Kết luận |
|---|---|---|---|
| Dashboard | 4 project, 112 task | 2 project, 13 task | CRITICAL — dùng seed/mock |
| Projects | `TMAI Platform`, `Mobile App`, `Analytics Dashboard`, `Security Audit` | `E-Commerce Platform`, `Mobile App Redesign` | CRITICAL — list/detail không gọi API |
| Create/Edit/Remove Project | Handler chỉ đổi React state | Không có row thay đổi | CRITICAL — fake success/local CRUD |
| Task Board | Task demo như `Define AI Model Architecture`, `API Integration` | 13 task seed khác hoàn toàn | CRITICAL — không đọc DB |
| Team | `Platform Core`, `Mobile Experience` | `Alpha Team`, `Beta Team` | CRITICAL — không đọc DB |
| Create Team/Invite/Remove member | Form/action local | Không có row thay đổi | CRITICAL — fake CRUD |
| Submit Evaluation | UI thêm bản ghi ngày 2026-08-01 và đổi average | `evaluations=0`, `project_evaluations=0` | CRITICAL — fake submit |
| Admin Users | 4 user demo | 7 user thật | CRITICAL — không gọi Admin API |
| Admin Organizations | 3 org demo | 1 org `TaskGenie Corp` | CRITICAL — fake CRUD |
| Platform Stats | 4 users, 11 tasks, 4 projects | 7 users, 13 tasks, 2 projects | CRITICAL — chart/stat giả |
| Notifications | 5 notification demo | 1 row DB | HIGH — không gọi API |
| Reports | Velocity/risk/workload hardcoded | Không tổng hợp từ DB | CRITICAL — chart giả |
| AI Analyze risk | Click thật trên task 1 | HTTP 401 | CRITICAL — `coreAiApi` chỉ gửi `X-User-Id`, không gửi Bearer |
| AI Recommend Top 3 | Click thật trên task/project 1 | HTTP 401 | CRITICAL — cùng lỗi auth client |
| AI Refresh evidence | Click thật trên task 1 | HTTP 401 | CRITICAL — cùng lỗi auth client |

### Module chưa tồn tại trên web/API/domain

- Không có Pricing/Payment/Subscription page, bảng plans/subscriptions/payments/entitlements hay API quota.
- Không có Organization Registration, organization membership/role/invitation/Premium entitlement page.
- Không có Skill Management page cho platform admin.
- Administration hiện chỉ có Users/Organizations/Platform Stats và toàn bộ dữ liệu bên trong là seed local.
- Nhiều icon button ở sidebar/header không có accessible name; Filter không có handler, search chỉ giữ local string, project sidebar `+` không có handler rõ ràng.

Kết luận R4: Auth email/register/logout đã chạy thật với SQL Server Docker và cleanup sạch. Toàn bộ workspace nghiệp vụ web còn là prototype dữ liệu giả, ngoại trừ AI Core có gọi route nhưng sai auth header. Trạng thái production vẫn `NO-GO`; ưu tiên tiếp theo là hoàn tất authorization Team/Task/AI ở backend rồi thay từng web slice bằng API thật, bắt đầu Project → Task → Team.

## 22. Kết quả thực thi R5 — Team/Task authorization và Docker SQL lifecycle

Ngày chạy: 2026-08-01. Code chính được build/test độc lập sau khi review thay đổi từ Claude; UAT gọi API thật tại `http://127.0.0.1:5258` và đọc/ghi database `ai_task_management_uat` trong container `sqlserver2022`.

### Automated regression

| Suite | Kết quả |
|---|---:|
| Toàn bộ `TaskGenie.Tests` trên code chính | PASS — 140/140 |
| Test mới/được mở rộng cho Team/Task authorization | PASS |
| Build warning còn lại | 1 cảnh báo CS8602 có sẵn trong `OrganizationRepository.cs` |

### Team — API và DB thật

| Case | Kết quả xác minh | Status |
|---|---|---|
| Member đọc Team của mình | HTTP 200 | PASS |
| Outsider đọc Team | HTTP 403 | PASS |
| Platform Admin đọc Team | HTTP 200 | PASS |
| Outsider list Team | HTTP 200 và mảng rỗng lấy theo membership DB | PASS |
| Tạo Team độc lập | HTTP 201; SQL tạo Team 1008 và membership LEADER 1009 cho actor 1002 trong cùng lifecycle transaction | PASS |
| Thêm member role `member` | SQL lưu role chuẩn hóa `MEMBER` | PASS |
| Xóa LEADER cuối cùng | HTTP 400, DB không đổi | PASS |
| Xóa Team đang được Project tham chiếu | HTTP 400, tránh FK/orphan | PASS |
| Xóa Team độc lập | HTTP 204; Team và toàn bộ membership liên quan về 0 row | PASS |

### Task — API và DB thật

| Case | Kết quả xác minh | Status |
|---|---|---|
| Project member đọc Task | HTTP 200 | PASS |
| Outsider đọc Task | HTTP 403 | PASS |
| Member thường sửa Task | HTTP 403; title SQL giữ nguyên | PASS |
| Project owner sửa Task | HTTP 204; SQL cập nhật thật rồi được restore | PASS |
| Gán user 1002 làm Team `LEADER` | Membership được ghi SQL; user có quyền tạo Task của Project | PASS |
| Leader tạo Task | HTTP 201; `created_by=1002` lấy từ JWT, không nhận actor giả từ body | PASS |
| Progress ngoài 0..100 | `101` và `-1` đều HTTP 400 | PASS |
| Dependency cùng Project | HTTP 200; có row thật trong `task_dependencies` | PASS |
| Dependency trùng / self / cross-project | Cả ba HTTP 400 | PASS |
| Xóa dependency bằng route Task sai | HTTP 404, không còn fake-success | PASS |
| Xóa dependency đúng | HTTP 200; row SQL bị xóa | PASS |

### Cleanup và tính toàn vẹn dữ liệu

Sau khi xóa Task/Team/membership UAT và restore title seed, baseline được đối chiếu trực tiếp bằng SQL: `Teams=2`, `TeamMembers=7`, `Tasks=13`, `TaskDependencies=0`. Không còn dữ liệu test tạm. User 1003 giữ role `PLATFORM_ADMIN` có chủ đích để phục vụ các vòng Admin UAT tiếp theo.

Kết luận R5: Team/Task authorization và lifecycle đạt PASS ở unit/integration lẫn Docker SQL UAT. Scope kế tiếp là AI analysis, evidence, comments và assignment authorization; tiếp sau đó mới nối các màn Project/Task/Team web với API thật.

## 23. Kết quả thực thi R6 — AI authorization và atomic Task deletion

Ngày chạy: 2026-08-01. API thật chạy tại `http://127.0.0.1:5258`; mọi dữ liệu UAT được ghi/đọc từ SQL Server container `sqlserver2022`, database `ai_task_management_uat`. Không dùng mock/InMemory cho các bằng chứng UAT Docker.

### AI, evidence, comment và assignment

| Case | Kết quả xác minh | Status |
|---|---|---|
| Comment không đăng nhập | HTTP 401 | PASS |
| Project member đọc comment | HTTP 200 | PASS |
| Outsider đọc comment | HTTP 403 | PASS |
| Body giả `userId=1003` khi user 2 tạo comment | API/SQL vẫn lưu actor JWT `user_id=2` | PASS |
| Member khác xóa comment | HTTP 403 | PASS |
| Author/Project owner xóa comment | HTTP 204; SQL không còn row | PASS |
| Member thường tạo evidence | HTTP 403 | PASS |
| Project owner tạo evidence | HTTP 201; SQL lưu `submitted_by=1` | PASS |
| Member đọc evidence | HTTP 200 | PASS |
| Outsider đọc evidence | HTTP 403 | PASS |
| Member/outsider chạy risk analysis | HTTP 403 | PASS |
| Project owner chạy risk analysis | HTTP 200; có execution, history và 5 factor trong SQL | PASS |
| Member/outsider tạo assignment recommendation | HTTP 403 | PASS |
| Task/Project không khớp | HTTP 400 | PASS |
| Project owner tạo và accept recommendation | HTTP 200; candidate rank 1 `ACCEPTED`, hai candidate còn lại `REJECTED`, `decided_by=1` | PASS |
| Web AI client | Dùng shared `apiRequest` với Bearer token; đã bỏ `X-User-Id` và ô nhập Leader ID | PASS code/build |

Các run UAT đã được xác minh trong SQL trước cleanup: risk run `f934912a-815a-4530-adf0-f71e3815636d`, assignment run `e2d05773-1f7f-4635-b4c4-0b73303423c3`, đều chạy `RULES_ONLY_FALLBACK`. Đây là fallback có chủ đích khi provider AI ngoài không được cấu hình; persistence và authorization vẫn là dữ liệu thật.

### Defect phát hiện bằng dữ liệu thật: xóa Task có AI data trả 500

Task tạm `1004` có comment/evidence/risk/recommendation/assignee thật. Lần xóa đầu tiên trả HTTP 500 do các FK `NO ACTION`, bắt đầu từ `ai_recommendations.task_id`. Fix thêm `TaskLifecycleService`: dọn toàn bộ recommendation, execution log, assignee, comment, hai chiều dependency, embedding, required skill, task log, AI analysis, risk history/factor, evidence/attachment trong một transaction; `UserScore` lịch sử được giữ lại và chỉ null hóa `TaskId`.

| Kiểm tra sau fix | Kết quả |
|---|---:|
| Targeted task-deletion integration tests | PASS — 3/3 |
| Toàn bộ `TaskGenie.Tests` trên workspace chính | PASS — 156/156 |
| `DELETE /api/tasks/1004` trên SQL Server Docker | HTTP 204 |
| Row còn tham chiếu task 1004 trong 14 nhóm bảng | 0 |
| Baseline sau cleanup | `Tasks=13`, `Comments=0`, `Evidence=0`, `Attachments=0`, `Recommendations=3`, `Analyses=2`, `Executions=2`, `RiskHistory=1`, `RiskFactors=5`, `Assignees=19` |

Web Vite production build cũng PASS (2.704 module); còn cảnh báo bundle JavaScript khoảng 1,02 MB cần tối ưu code-splitting trước production. Backend còn một cảnh báo CS8602 có sẵn tại `OrganizationRepository.cs`.

Kết luận R6: authorization của AI/evidence/comment/assignment và atomic Task deletion đã đạt automated regression + Docker SQL UAT. Bước tiếp theo theo ưu tiên web là thay Project → Task/Kanban → Team local state bằng API thật, sau đó test tất cả button CRUD và đối chiếu lại SQL sau từng thao tác.
