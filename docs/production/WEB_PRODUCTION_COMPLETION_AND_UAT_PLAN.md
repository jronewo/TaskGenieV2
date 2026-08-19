# TaskGenie Web Production Completion & UAT Plan

**Ngày lập:** 2026-08-01  
**Phạm vi:** Desktop web `FE-WEB-V2` và backend .NET  
**Ngoài phạm vi:** `mobile-FE` và mọi application/mobile client  
**Mục tiêu:** Hoàn thiện code web, mapping toàn bộ button với API thật, kiểm thử bằng SQL Server Docker thật và chỉ mô phỏng bước thanh toán.

---

## 1. Trạng thái checkpoint

Source Claude đang làm việc tại:

```text
/Users/jronehuynh/Downloads/TaskGenieV2-main/.claude/worktrees/security-foundation-v2
```

Source chính để Codex review/import sau này:

```text
/Users/jronehuynh/Downloads/TaskGenieV2-main
```

Đã hoàn thành:

- Baseline JWT/Google authentication, resource authorization và chống IDOR.
- Project lifecycle, task/team authorization và các API AI cốt lõi.
- Backend subscription, plan, project quota và payment transaction mô phỏng.
- Backend organization/member/project assignment.
- Backend platform admin, analytics, user/organization/subscription/payment/plan management.
- Backend skill catalog và user skill ownership.
- Desktop web Project Management.
- Desktop web Subscription Center: plan cá nhân/tổ chức, quota, subscription, payment history và fake checkout.
- Backend automated test tại checkpoint: `214/214` đạt.
- `FE-WEB-V2` Vite build đạt.
- Runtime `DataSeeder` đã được xóa; API không còn tự sinh user/project/team/task/skill mẫu khi khởi động Development.

Chưa thực hiện:

- Organization desktop UI hoàn chỉnh.
- Platform Admin và Skill Management desktop UI hoàn chỉnh.
- Audit cuối toàn bộ Task/Team/AI button và API mapping.
- Codex review/import source từ Claude worktree.
- Apply migration vào Docker SQL Server.
- UAT trên trình duyệt với DB thật.
- Production readiness report cuối cùng.

## 2. Quy tắc bắt buộc từ checkpoint này

1. Chỉ làm desktop web; không sửa `mobile-FE`.
2. Không dùng runtime seed/demo data.
3. User UAT phải được tạo bởi Google login thật.
4. Organization, member, project, team, task và skill phải được tạo bằng UI/API thật.
5. Không chèn trực tiếp dữ liệu nghiệp vụ vào SQL để làm test pass.
6. Ngoại lệ duy nhất của payment: gateway được mô phỏng nhưng `subscriptions` và `payment_transactions` phải lưu thật trong SQL Server.
7. Việc bootstrap tài khoản `PLATFORM_ADMIN` đầu tiên là thao tác cấu hình có kiểm soát, không phải test data. Sau khi có admin đầu tiên, mọi quản trị tiếp theo phải qua Admin API/UI.
8. Endpoint chưa tồn tại thật sự thì được tạo backend API, authorization, validation và automated test trước khi nối frontend.
9. Mọi button phải có API/action thật hoặc bị loại khỏi UI. Không để placeholder, mock success hoặc `console.log` thay cho hành động.
10. Không apply migration/UAT trước khi Codex review hoàn tất.
11. Không commit/push cho đến khi source artifacts và lỗi build được xử lý.

---

## 3. Kế hoạch các slice tiếp theo

### Slice 6 — Organization desktop web

#### Mục tiêu

Hoàn thiện toàn bộ luồng tổ chức từ lúc đăng ký đến quản lý member, project và quyền premium kế thừa.

#### Phạm vi code

- Trang tạo/đăng ký tổ chức.
- Danh sách “Tổ chức của tôi”.
- Chọn tổ chức đang thao tác.
- Xem thông tin và project thuộc tổ chức.
- Quản lý member bằng email.
- Đổi role `OWNER`, `ADMIN`, `MEMBER` theo rule backend.
- Xóa member.
- Tạo project thuộc tổ chức.
- Assign member tổ chức vào project.
- Nâng member thành Project Leader.
- Hiển thị entitlement premium kế thừa từ subscription active của tổ chức.

#### API tối thiểu phải mapping

- `GET /api/organizations/my`
- `GET /api/organizations/mine`
- `POST /api/organizations`
- `PUT /api/organizations/{orgId}`
- `GET /api/organizations/{orgId}`
- `GET /api/organizations/{orgId}/members`
- `POST /api/organizations/{orgId}/members`
- `PUT /api/organizations/{orgId}/members/{memberId}/role`
- `DELETE /api/organizations/{orgId}/members/{memberId}`
- `GET /api/organizations/{orgId}/projects`
- `POST /api/projects` với `organizationId`
- `POST /api/organizations/{orgId}/projects/{projectId}/assign-member`
- Organization scope của `/api/subscriptions/*`.

#### Button checklist

| Button/action | Kết quả bắt buộc |
|---|---|
| Tạo tổ chức | Gọi API, lưu SQL, user tạo trở thành OWNER |
| Lưu thông tin tổ chức | Gọi PUT và reload dữ liệu |
| Thêm member | Gọi API bằng email user đã tồn tại |
| Đổi role | Chỉ OWNER/ADMIN hợp lệ được thao tác |
| Xóa member | Có confirm, chống double-submit |
| Tạo project | Project mang đúng `organizationId` |
| Assign member | Chỉ nhận member thuộc đúng tổ chức |
| Promote Project Leader | Quyền project thay đổi thật trong DB |
| Chọn plan tổ chức | Chỉ OWNER/ADMIN được mua/cancel |

#### Negative/security cases phải có automated test

- User ngoài tổ chức không xem được member/project/payment của tổ chức.
- MEMBER không quản lý member hoặc subscription.
- Không assign user không thuộc tổ chức vào project.
- Không thao tác project của tổ chức khác bằng cách đổi ID.
- Không làm tổ chức mất OWNER cuối cùng nếu business rule yêu cầu giữ owner.
- Premium của member được tính động; không sửa vĩnh viễn role/plan cá nhân của user.

#### Definition of Done

- Tất cả button có loading/error/empty/disabled state.
- Không có mock organization data.
- Frontend build đạt.
- Backend full test đạt nếu có thay đổi backend.
- Không chạm Docker/mobile/docs/commit trong slice này.

#### Prompt cho Claude

```text
Tiếp tục Slice 6 — CHỈ desktop web Organization.

Không mobile/application, Docker, migration apply, UAT, commit/push.
Không runtime seed/demo data. Dùng API thật và DB contract thật.
Payment vẫn chỉ mô phỏng; không tích hợp gateway thật.

Hoàn thiện create/register organization, my organizations, chọn organization,
member list/add by email/update role/remove, organization projects, create project
thuộc organization, assign member vào project và promote Project Leader.
Hiển thị premium entitlement kế thừa từ active organization subscription nhưng
không mutate permanent personal plan của member.

Gắn mọi button vào API thật, có loading/error/empty/disabled, confirm hành động
nguy hiểm, chống double-submit và reload sau mutation. Endpoint thật sự thiếu thì
tạo backend authorization/validation/test trước khi mapping frontend.

Chạy FE build; nếu sửa backend chạy focused tests và full tests. Báo cáo file,
endpoint/button mapping, kết quả verify và dừng.
```

### Slice 7 — Platform Admin và Skill Management desktop web

#### Mục tiêu

Tạo khu vực quản trị production-ready, chỉ tài khoản `PLATFORM_ADMIN` truy cập được.

#### Platform Admin UI

- Dashboard tổng số user, active user, project, organization, active subscription và revenue payment mô phỏng thành công.
- Chart đăng ký subscription theo tháng, plan và scope.
- Danh sách/search/pagination user.
- Xem chi tiết user.
- Tạo user quản trị khi cần.
- Activate/deactivate user.
- Đổi platform role.
- Soft-delete user.
- Chặn xóa hoặc hạ quyền platform admin active cuối cùng.
- Danh sách và chi tiết organization đã đăng ký.
- Danh sách/filter subscription và payment transaction.
- CRUD plan; deactivate thay vì hard-delete plan đã được sử dụng.

#### Skill Management UI

- Admin list có pagination/search/active filter.
- Tạo skill.
- Sửa tên skill.
- Activate/deactivate skill.
- User thường chỉ xem skill active.
- User tự add/update/remove skill của chính mình.
- Platform admin được view skill user khác nhưng không sửa skill cá nhân thay họ.

#### API tối thiểu phải mapping

- `/api/admin/platform-stats`
- `/api/admin/subscription-analytics`
- `/api/admin/users*`
- `/api/admin/organizations*`
- `/api/admin/subscriptions`
- `/api/admin/payments`
- `/api/admin/plans*`
- `/api/skills/admin`
- `/api/skills`
- `/api/skills/{id}`
- `/api/skills/{id}/active`
- `/api/skills/me`
- `/api/skills/user*`

#### Definition of Done

- Sidebar/page bị ẩn với user thường và backend vẫn trả `403` nếu gọi trực tiếp.
- Chart dùng dữ liệu API thật, không hard-code.
- Mọi CRUD có validation, confirm, loading và error message.
- Build/test đạt.

### Slice 8 — Audit toàn bộ button/API Task, Team và AI

#### Cách audit

Lập inventory tất cả phần tử tương tác trong `FE-WEB-V2`:

- Button.
- Link/navigation item.
- Form submit.
- Dropdown action.
- Dialog confirm/cancel.
- Upload/download/export.
- AI generate/analyze/recommend/accept.

Với từng phần tử, ghi nhận:

| Trường | Nội dung |
|---|---|
| Page/component | Vị trí button |
| Label | Text hiển thị |
| Handler | Hàm được gọi |
| Endpoint | Method và URL |
| Auth | Role/resource requirement |
| Success | UI refresh/navigation/toast |
| Failure | Error được hiển thị |
| DB evidence | Bảng/record thay đổi |
| Status | PASS/FAIL/MISSING |

#### Các luồng phải hoàn thiện

- Project CRUD, close, summary, add member và quota.
- Task CRUD, progress, dependencies, estimate, required skills.
- Team CRUD và member lifecycle.
- Comments, evidence và assignment.
- AI task classification, summary, risk analysis, project risk, workload suggestion, assignment recommendation và accept recommendation.
- Lịch sử AI/risk/recommendation phải lấy dữ liệu backend.
- CSV/template/download nếu UI có button.

#### Quy tắc AI

- Không mock AI response trong UAT production readiness.
- Cấu hình Hugging Face key thật bằng user-secrets/environment.
- API AI phải ghi execution log/evidence/history thật khi thiết kế yêu cầu.
- Timeout, provider error, invalid response và rate limit phải hiển thị lỗi có thể hiểu được.
- AI không được vượt quyền project/task của user.

#### Definition of Done

- Không còn button placeholder.
- Không còn fake response ngoài payment gateway.
- Không còn endpoint frontend gọi sai method/path/payload.
- Mọi mutation refresh state đúng.
- Backend test và frontend build đạt.

### Slice 9 — Codex review/import và automated verification

Codex thực hiện sau khi Claude hoàn thành một lượt:

1. Review diff theo source file, không dựa vào báo cáo của Claude.
2. Không import `bin/`, `obj/`, `dist/` hoặc cache artifacts.
3. Kiểm tra authorization, validation, transaction boundary và null handling.
4. Đối chiếu DTO/payload frontend với controller/command thật.
5. Kiểm tra không có mobile file bị sửa.
6. Kiểm tra không còn runtime `DataSeeder` hoặc lời gọi seed demo data.
7. Build solution.
8. Chạy full backend tests.
9. Build frontend production.
10. Chỉ khi tất cả đạt mới chuyển source vào worktree chính.

Lệnh verify:

```bash
cd /Users/jronehuynh/Downloads/TaskGenieV2-main/.claude/worktrees/security-foundation-v2

dotnet build src/TaskGenie.slnx
dotnet test tests/TaskGenie.Tests/TaskGenie.Tests.csproj

cd FE-WEB-V2
/Users/jronehuynh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build
```

### Slice 10 — Docker SQL Server và migration

Chỉ chạy slice này sau khi Slice 9 đạt.

Thông tin Docker đã xác nhận ngày 2026-08-01:

| Thuộc tính | Giá trị |
|---|---|
| Container | `sqlserver2022` |
| Image | `mcr.microsoft.com/mssql/server:2022-latest` |
| Host/port | `localhost,1433` |
| Database | `ai_task_management_uat` |
| Authentication | SQL Login |
| User | `sa` |
| Encrypt | `True` |
| Trust server certificate | `True` cho local UAT |
| sqlcmd trong container | `/opt/mssql-tools18/bin/sqlcmd` |

---

## 4. Hướng dẫn kết nối Docker SQL Server

### 4.1 Kiểm tra container

```bash
docker ps --filter name=sqlserver2022
docker port sqlserver2022
```

Expected:

- Container ở trạng thái `Up`.
- Port `1433/tcp` map sang host `1433`.

### 4.2 Mở SQL shell an toàn

Không ghi password trực tiếp vào command history:

```bash
docker exec -it sqlserver2022 /bin/bash -lc \
  '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C'
```

Trong `sqlcmd`:

```sql
SELECT name FROM sys.databases ORDER BY name;
GO

USE ai_task_management_uat;
GO

SELECT DB_NAME() AS current_database;
GO
```

Thoát bằng:

```text
QUIT
```

### 4.3 Kết nối bằng DBeaver/Azure Data Studio/VS Code SQL

- Server: `localhost,1433`
- Database: `ai_task_management_uat`
- Authentication: SQL Login
- Username: `sa`
- Password: mật khẩu đã dùng khi tạo container
- Encrypt: bật
- Trust server certificate: bật cho local UAT

Không lưu password vào repository hoặc screenshot UAT.

### 4.4 Cấu hình backend bằng .NET user-secrets

Chạy từ source chính sau khi Codex import:

```bash
cd /Users/jronehuynh/Downloads/TaskGenieV2-main

read -s "TASKGENIE_SQL_PASSWORD?SQL Server SA password: "

dotnet user-secrets set \
  --project src/TaskGenie.API/TaskGenie.API.csproj \
  "ConnectionStrings:DefaultConnection" \
  "Server=localhost,1433;Database=ai_task_management_uat;User Id=sa;Password=${TASKGENIE_SQL_PASSWORD};Encrypt=True;TrustServerCertificate=True"

unset TASKGENIE_SQL_PASSWORD

dotnet user-secrets set \
  --project src/TaskGenie.API/TaskGenie.API.csproj \
  "Database:UseInMemory" "false"

dotnet user-secrets set \
  --project src/TaskGenie.API/TaskGenie.API.csproj \
  "Jwt:Secret" "$(openssl rand -base64 48)"
```

Cấu hình thêm bằng user-secrets, không commit secret:

- `GoogleAuth:ClientId`
- `HuggingFace:ApiKey`
- `Cloudinary:CloudName`
- `Cloudinary:ApiKey`
- `Cloudinary:ApiSecret`

### 4.5 Kiểm tra migration trước khi apply

```bash
dotnet ef migrations list \
  --project src/TaskGenie.Infrastructure/TaskGenie.Infrastructure.csproj \
  --startup-project src/TaskGenie.API/TaskGenie.API.csproj
```

Các migration mới đang chờ gồm tối thiểu:

- `20260801124905_AddSubscriptionsPlansPayments`
- `20260801125722_AddOrganizationMembers`
- `20260801131722_AddSkillIsActive`

### 4.6 Apply migration

```bash
dotnet ef database update \
  --project src/TaskGenie.Infrastructure/TaskGenie.Infrastructure.csproj \
  --startup-project src/TaskGenie.API/TaskGenie.API.csproj
```

Không chạy `database drop`, `docker rm`, `TRUNCATE` hoặc xóa volume nếu chưa xác nhận rõ database UAT được phép reset.

### 4.7 Xác nhận migration và bảng thật

Trong `sqlcmd`:

```sql
USE ai_task_management_uat;
GO

SELECT MigrationId
FROM __EFMigrationsHistory
ORDER BY MigrationId;
GO

SELECT name
FROM sys.tables
WHERE name IN (
  'users', 'organizations', 'organization_members', 'projects',
  'plans', 'subscriptions', 'payment_transactions', 'skills'
)
ORDER BY name;
GO
```

### 4.8 Khởi động API

```bash
cd /Users/jronehuynh/Downloads/TaskGenieV2-main
dotnet run --project src/TaskGenie.API/TaskGenie.API.csproj --launch-profile http
```

Expected:

- API: `http://localhost:5258`
- Swagger: `http://localhost:5258/swagger`
- Không tạo demo data khi startup.
- Không báo lỗi JWT secret hoặc SQL connection.

### 4.9 Cấu hình và chạy frontend

Tạo `FE-WEB-V2/.env.local`, không commit:

```dotenv
VITE_API_BASE_URL=http://localhost:5258/api
VITE_GOOGLE_CLIENT_ID=<GOOGLE_WEB_CLIENT_ID>
```

Google OAuth Web Client phải cho phép origin frontend đang sử dụng, ví dụ `http://127.0.0.1:5173` hoặc `http://localhost:5173`.

Chạy web:

```bash
cd /Users/jronehuynh/Downloads/TaskGenieV2-main/FE-WEB-V2
pnpm dev --host 127.0.0.1 --port 5173
```

Nếu `pnpm` không có trong shell:

```bash
/Users/jronehuynh/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm \
  dev --host 127.0.0.1 --port 5173
```

---

## 5. Chuẩn bị dữ liệu UAT thật

Không chạy DataSeeder. Chuẩn bị theo đúng thứ tự:

1. Google login bằng `UAT_ADMIN_GOOGLE` để tạo user thật trong DB.
2. Bootstrap user này thành `PLATFORM_ADMIN` một lần có kiểm soát.
3. Logout/login lại để JWT mới chứa đúng role.
4. Tạo catalog plan bằng Admin UI/API nếu môi trường chưa có plan.
5. Google login bằng `UAT_OWNER_GOOGLE`.
6. Google login bằng `UAT_MEMBER_GOOGLE`.
7. Owner tạo organization qua UI.
8. Owner thêm member qua UI bằng email đã đăng nhập ít nhất một lần.
9. Tạo project/task/team/skill qua UI/API thật.
10. Payment success/failure được bấm qua fake checkout; không tự UPDATE subscription/payment để giả pass.

Catalog plan UAT cần có:

| Code | Scope | Giá mẫu | Project limit | Mục đích |
|---|---|---:|---:|---|
| `FREE_PERSONAL` | Personal | 0 | 2 | Kiểm tra quota dưới 3 project |
| `PRO_PERSONAL` | Personal | 999 cents | Unlimited | Kiểm tra nâng cấp cá nhân |
| `FREE_ORGANIZATION` | Organization | 0 | 2 | Quota tổ chức free |
| `PRO_ORGANIZATION` | Organization | 4999 cents | Unlimited | Premium toàn organization |

Giá trên là dữ liệu cấu hình UAT; admin phải nhìn thấy và có thể chỉnh bằng Plan Management.

---

## 6. Kế hoạch UAT chi tiết

### 6.1 Quy ước evidence

Mỗi test case phải lưu:

- Screenshot trước/sau hành động.
- User/role thực hiện.
- Request method + endpoint, status code và response chính.
- ID record được tạo.
- SQL query xác nhận record thật.
- Console/browser error nếu có.
- Kết quả `PASS`, `FAIL` hoặc `BLOCKED`.

Không đưa access token, Google token, SA password hoặc API key vào evidence.

### 6.2 Environment và authentication

| ID | Test | Expected |
|---|---|---|
| ENV-01 | API kết nối `ai_task_management_uat` | Không dùng LocalDB/InMemory |
| ENV-02 | API startup trên DB rỗng | Không tự sinh demo data |
| AUTH-01 | Google login user mới | User được tạo thật, trả JWT hợp lệ |
| AUTH-02 | Refresh/reload web | Session hợp lệ được phục hồi đúng |
| AUTH-03 | Logout | Token bị thu hồi/xóa; API protected trả 401 |
| AUTH-04 | Token sai/hết hạn | API trả 401, UI điều hướng đăng nhập |
| AUTH-05 | User thường gọi Admin API | Backend trả 403 |

### 6.3 Personal plan, payment và project quota

| ID | Test | Expected và DB evidence |
|---|---|---|
| SUB-P-01 | Mở Plans | Hiển thị plan Personal từ API/DB |
| SUB-P-02 | User free tạo project 1 | Thành công; có row `projects` |
| SUB-P-03 | User free tạo project 2 | Thành công |
| SUB-P-04 | User free tạo project 3 | Bị chặn quota; không có row thứ ba |
| SUB-P-05 | Xóa project cũ rồi tạo lại | Thành công vì usage giảm |
| PAY-P-01 | Chọn Pro Personal | Tạo subscription/payment pending thật |
| PAY-P-02 | Fake confirm failure | Payment failed; subscription không active |
| PAY-P-03 | Fake confirm success | Payment succeeded; subscription active |
| SUB-P-06 | Pro tạo hơn 2 project | Thành công nếu plan unlimited |
| SUB-P-07 | Cancel subscription | Status/end date đúng; UI refresh đúng |
| PAY-P-04 | Payment history | Khớp rows trong `payment_transactions` |
| PAY-P-05 | Double click confirm | Không tạo/confirm trùng giao dịch |

### 6.4 Organization và member authorization

| ID | Test | Expected |
|---|---|---|
| ORG-01 | Owner đăng ký organization | Có row organization và OWNER membership |
| ORG-02 | Owner sửa organization | Thành công |
| ORG-03 | Member ngoài org xem org | 403/404 theo contract, không rò dữ liệu |
| ORG-04 | Owner thêm member bằng email | Có row `organization_members` |
| ORG-05 | Thêm lại cùng member | Bị chặn duplicate |
| ORG-06 | OWNER đổi member thành ADMIN | Thành công |
| ORG-07 | MEMBER quản lý member | 403 |
| ORG-08 | Remove member | Membership bị xóa thật |
| ORG-09 | User đã bị remove truy cập org | Bị từ chối ngay |
| ORG-10 | Thao tác org khác bằng đổi ID | Bị từ chối |

### 6.5 Organization project, quota và premium inheritance

| ID | Test | Expected |
|---|---|---|
| ORG-P-01 | Owner tạo org project 1 và 2 | Thành công |
| ORG-P-02 | Free org tạo project 3 | Bị chặn quota |
| ORG-P-03 | Xóa project cũ rồi tạo lại | Thành công |
| ORG-P-04 | Assign org member vào project | Thành công |
| ORG-P-05 | Assign user ngoài org | Bị từ chối |
| ORG-P-06 | Promote member thành Project Leader | Role project thay đổi thật |
| ORG-S-01 | MEMBER mua/cancel plan org | 403 |
| ORG-S-02 | OWNER chọn Org Pro | Tạo transaction pending |
| ORG-S-03 | Fake payment org failed | Org/member không nhận premium |
| ORG-S-04 | Fake payment org succeeded | Subscription org active |
| ORG-S-05 | Member org active Pro | Entitlement trả premium động |
| ORG-S-06 | Member rời/bị remove | Mất premium kế thừa nếu không có personal Pro |
| ORG-S-07 | Cancel/expire Org Pro | Entitlement cập nhật theo rule kỳ hạn |

### 6.6 Platform Admin

| ID | Test | Expected |
|---|---|---|
| ADM-01 | Dashboard stats | Khớp count DB |
| ADM-02 | Subscription charts | Khớp dữ liệu theo tháng/plan/scope |
| ADM-03 | Search/paginate users | Kết quả và tổng số đúng |
| ADM-04 | Create/view/update user | CRUD/API hoạt động |
| ADM-05 | Deactivate user | User không tiếp tục dùng hệ thống |
| ADM-06 | Đổi platform role | JWT mới phản ánh role sau login lại |
| ADM-07 | Xóa/hạ quyền admin cuối cùng | Bị chặn |
| ADM-08 | View organizations | Tổng và detail đúng DB |
| ADM-09 | View subscriptions/payments | Filter và dữ liệu đúng |
| ADM-10 | Plan CRUD/deactivate | Catalog user chỉ thấy plan active |

### 6.7 Skill Management

| ID | Test | Expected |
|---|---|---|
| SKL-01 | Admin tạo skill | Có row thật |
| SKL-02 | Tạo/sửa trùng tên | Bị validation chặn |
| SKL-03 | Deactivate skill | User thường không thấy trong catalog |
| SKL-04 | User add skill bản thân | Thành công |
| SKL-05 | User update/remove skill bản thân | Thành công |
| SKL-06 | User sửa skill người khác bằng đổi ID | 403 |
| SKL-07 | Platform admin view skill user | Được view |
| SKL-08 | Platform admin sửa user skill thay user | Bị chặn theo contract view-only |

### 6.8 Project, Task, Team và AI

| ID | Test | Expected |
|---|---|---|
| PRJ-01 | Project CRUD/close/summary | Button/API/DB đồng bộ |
| PRJ-02 | Non-member xem/sửa project | Bị từ chối |
| TSK-01 | Task CRUD/progress | DB và UI đồng bộ |
| TSK-02 | Dependencies | Không tạo cycle/invalid dependency |
| TSK-03 | Required skills | Mapping đúng skill active |
| TEM-01 | Team CRUD/member lifecycle | Quyền leader/member đúng |
| CMT-01 | Comments CRUD | Chỉ user có quyền resource thao tác |
| EVD-01 | Evidence/upload | Metadata/file mapping đúng; lỗi provider rõ ràng |
| AI-01 | Classify task | Gọi provider thật và lưu result/log |
| AI-02 | Generate summary | Dữ liệu đúng task/project scope |
| AI-03 | Analyze task/project risk | Có score, explanation, evidence/history |
| AI-04 | Workload suggestion | Chỉ dùng member hợp lệ |
| AI-05 | Assignment recommendation | Recommendation thật, không hard-code |
| AI-06 | Accept recommendation | Assignment thay đổi thật |
| AI-07 | User ngoài project gọi AI endpoint | 403/404, không rò dữ liệu |
| AI-08 | Provider timeout/error | UI không treo, báo lỗi và cho retry an toàn |

---

## 7. SQL đối chiếu dữ liệu thật

Chỉ dùng query đọc để đối chiếu. Mutation nghiệp vụ phải qua UI/API.

```sql
USE ai_task_management_uat;
GO

SELECT user_id, email, role, status, created_at
FROM users
ORDER BY user_id DESC;
GO

SELECT organization_id, name, owner_id, created_at
FROM organizations
ORDER BY organization_id DESC;
GO

SELECT organization_member_id, organization_id, user_id, role, created_at
FROM organization_members
ORDER BY organization_member_id DESC;
GO

SELECT project_id, project_name, owner_id, organization_id, status
FROM projects
ORDER BY project_id DESC;
GO

SELECT plan_id, code, name, scope, price_cents, project_limit, is_active
FROM plans
ORDER BY plan_id;
GO

SELECT subscription_id, subscriber_user_id, subscriber_organization_id,
       plan_id, status, started_at, current_period_end, canceled_at
FROM subscriptions
ORDER BY subscription_id DESC;
GO

SELECT payment_transaction_id, subscription_id, amount_cents, currency,
       gateway_reference, status, created_at, confirmed_at
FROM payment_transactions
ORDER BY payment_transaction_id DESC;
GO
```

Nếu tên cột cũ trong project khác schema migration hiện tại, dùng:

```sql
EXEC sp_help 'projects';
GO
```

rồi cập nhật query evidence; không sửa schema trực tiếp để làm query chạy.

---

## 8. Defect workflow và production gate

### Severity

| Mức | Ý nghĩa |
|---|---|
| P0 | Mất dữ liệu, bypass auth, hệ thống không chạy |
| P1 | Luồng chính login/project/subscription/org/admin không dùng được |
| P2 | Chức năng phụ lỗi, có workaround |
| P3 | UI/copy/spacing hoặc vấn đề nhỏ |

### Một defect phải có

- ID và severity.
- Environment/build/version.
- User và role.
- Preconditions.
- Steps to reproduce.
- Expected/actual.
- Screenshot/network response.
- Endpoint/status code.
- DB evidence.
- Root cause nếu đã xác định.
- Fix commit/change list và retest result.

### Điều kiện đạt production candidate

- `0` P0/P1 đang mở.
- P2 chỉ được phép còn nếu owner chấp nhận rõ ràng.
- Full backend automated tests đạt.
- Frontend production build đạt.
- Tất cả migration apply thành công trên DB UAT sạch.
- Google login/logout và authorization đạt.
- Personal free quota đúng `2` project; project thứ ba bị chặn.
- Personal/Organization Pro hoạt động qua payment mô phỏng lưu DB.
- Organization roles và Project Leader đạt.
- Premium inheritance của organization đạt và không mutate sai user cá nhân.
- Admin dashboard/CRUD/chart/plan/skill đạt.
- Task/Team/AI button mapping đạt.
- Không runtime seed/demo data.
- Không mobile file bị thay đổi.
- Không secret trong git, log, screenshot hoặc frontend bundle.

---

## 9. Thứ tự thực thi ngắn gọn

```text
Slice 6 Organization web
  ↓
Slice 7 Admin + Skill web
  ↓
Slice 8 Task/Team/AI button & API audit
  ↓
Slice 9 Codex review/import/build/test
  ↓
Slice 10 Docker connection + migrations
  ↓
Slice 11 UAT theo test case và SQL evidence
  ↓
Fix defect → automated regression → UAT retest
  ↓
Production readiness report
```

Không bắt đầu mobile/application trước khi production gate của desktop web đạt.
