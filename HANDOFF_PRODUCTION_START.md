# Bàn giao — Bắt đầu triển khai Production (TaskGenie V2)

> Ghi chú cho phiên **"On your computer"** kế tiếp. Phiên cloud trước không build được .NET
> (proxy chặn NuGet + host tải SDK), nên đã chuyển sang chạy trên máy để build/verify thật.
> File này tóm tắt khảo sát code để không phải làm lại từ đầu.

## Môi trường
- Backend: .NET 10 (`net10.0`), EF Core 10.0.5, SQL Server provider + EF InMemory (dùng cho test).
- Có sẵn project test: `tests/TaskGenie.Tests`.
- Frontend web: `FE-WEB-V2` (React/Vite), Node v22.
- Branch hiện tại: `Develope`. Git đang có nhiều thay đổi chưa commit (dist/, FE/ bị xóa...) — nên
  tạo branch mới trước khi làm: `git switch -c feature/prod-auth-foundation`.
- Có thư mục `_to_delete/tg-backend.tgz` (file tạm phiên trước tạo) — bạn xóa thủ công được.

## Lệnh build/test (từ repo root)
```bash
dotnet build src/TaskGenie.Domain/TaskGenie.Domain.csproj
dotnet build src/TaskGenie.Application/TaskGenie.Application.csproj
dotnet build src/TaskGenie.Infrastructure/TaskGenie.Infrastructure.csproj
dotnet build src/TaskGenie.API/TaskGenie.API.csproj
dotnet test tests/TaskGenie.Tests
dotnet run --project src/TaskGenie.API   # http://localhost:5258, swagger ở /swagger
```

## Trạng thái thực tế so với plan (đã đọc code, không chỉ đọc plan)
Code đi xa hơn "baseline NO-GO" mà plan mô tả — JWT đã có thật, không còn `X-User-Id`:
- `AuthController`: đã có `register`, `login`, `google`, `logout` (logout revoke theo `jti`).
- `AuthenticationExtensions`: JWT bearer validation đầy đủ + `OnTokenValidated` check revocation +
  fallback policy `RequireAuthenticatedUser`.
- `HttpContextExtensions.GetCurrentUserId()` lấy từ claim `NameIdentifier` (JWT), tốt.

### Lỗ hổng ưu tiên cao (bắt đầu từ đây — đúng thứ tự Mục 19 của plan)
1. **Actor lấy từ client** — `ProjectsController.Create` nhận `CreatedBy` VÀ `OrganizationId` từ body
   (`CreateProjectRequest`). Vi phạm rule 15. Phải bỏ, lấy từ `HttpContext.GetCurrentUserId()`.
   → Rà toàn bộ command DTO khác còn nhận `CreatedBy/OrganizedBy/EvaluatorId/UserId` từ client.
2. **Không có authorization policy nào** — mọi controller chỉ rơi vào fallback "authenticated".
   `AdminController` (`/api/admin/platform-stats`) KHÔNG có `[Authorize(Policy=...)]` → bất kỳ user
   đăng nhập nào cũng gọi được. Cần policy `PlatformAdmin`, `OrganizationAdmin`, `ProjectRead/Manage`...
   (PROD-0202) + `ICurrentUser`/`IPermissionService`/`IResourceAuthorizationService` (PROD-0201).
3. **Token revocation in-memory** (`InMemoryTokenRevocationService`) — mất khi restart. Cần
   refresh-token persistence trong DB/Redis (PROD-0101): bảng `refresh_tokens`, rotate + reuse-detect.
4. **Thiếu endpoint**: `/auth/refresh`, `/auth/me`, `/auth/forgot-password`, `/auth/reset-password`.
5. **Chưa có** entitlement/quota service, domain plan/subscription/payment (Phase 5).

## Thứ tự đề xuất cho phiên On-your-computer
Theo Mục 19 của plan (10 ngày đầu = security gate), làm và VERIFY từng bước:
1. **PROD-0201/0202** current-actor abstraction + bỏ actor-ID khỏi client DTO + authorization policies
   (Admin trước, rồi Project/Task/Tenant). → build + viết negative test (401/403/404).
2. **PROD-0101** refresh-token persistence + `/auth/refresh` + `/auth/me` + forgot/reset.
3. Chạy `dotnet test`, đảm bảo 28 negative authorization case trả đúng 403/404.
4. Chỉ sang Phase 3 (CRUD) / Phase 5 (payment) sau khi security gate pass.

## Prompt gợi ý để dán vào task "On your computer"
```
Đây là dự án TaskGenie V2 (.NET 10 + React). Đọc PRODUCTION_COMPLETION_IMPLEMENTATION_PLAN.md
và HANDOFF_PRODUCTION_START.md ở repo root. Mục tiêu: hoàn thiện project theo plan, làm THẬT và
build/test sau mỗi bước bằng dotnet (máy đã cài .NET 10). Bắt đầu từ security foundation:
current-actor abstraction, bỏ actor-ID khỏi client DTO (ProjectsController.Create...), và
authorization policies (PROD-0201/0202), rồi refresh-token persistence + /auth/me (PROD-0101).
Tạo branch feature/prod-auth-foundation. Dùng tiếng Việt.
```
