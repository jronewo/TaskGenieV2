# Nhật ký quyết định tự chủ

Các quyết định Claude tự đưa ra khi chạy autonomous, thay vì dừng chờ xác nhận.
Mỗi mục ghi: quyết định, lý do, và phương án thay thế nếu bạn muốn đổi.

---

## 2026-08-02 — Slice 0 (security audit)

### D-01 · `ApplyManualScore` — ai được cấp điểm?

**Quyết định:** cấp điểm có `ProjectId` → yêu cầu quyền quản lý project đó; không có `ProjectId`
→ chỉ `PLATFORM_ADMIN`. Ngoài ra chặn tự cấp điểm cho chính mình (trừ platform admin).

**Lý do:** comment trong code ghi "Leader/Admin tự tay cộng hoặc trừ điểm" nhưng không hề enforce.
Đây là rule nghiệp vụ chưa được chốt ở tài liệu nào, nên chọn mức chặt nhất mà vẫn dùng được.

**Đổi được:** nếu muốn cho leader tự thưởng mình, bỏ khối `request.UserId == currentUser.UserId`
trong `ApplyManualScoreCommandHandler`.

### D-02 · `UserScore` chưa có cột "ai là người cấp"

**Quyết định:** hoãn, chưa thêm cột `granted_by`.

**Lý do:** cần migration + đổi entity; phạm vi Slice 0 là đóng lỗ hổng, không mở rộng schema.
Hiện đã chặn được lạm dụng, nhưng **chưa truy vết được ai đã cấp điểm**.

**Nên làm:** thêm `granted_by` khi làm Slice 6B (lúc đó đã có nhịp migration), vì hệ thống
thưởng/phạt không có audit trail là thiếu sót thật.

### D-03 · `GetEntityActivities` giới hạn về PLATFORM_ADMIN

**Quyết định:** `/api/activitylogs/entity/{entityType}/{entityId}` chỉ admin.

**Lý do:** đây là truy vấn audit generic theo cặp `(type, id)` bất kỳ — không thể suy ra quyền của
caller với entity đó mà không viết switch cho từng loại. Chọn mặc định an toàn.

**Đổi được:** nếu UI cần user thường xem lịch sử của task/project họ có quyền, viết resolver theo
`entityType` rồi gọi `EnsureCanAccessTaskAsync`/`EnsureCanAccessProjectAsync` tương ứng.

### D-04 · Accept lời mời sai người → trả 404 thay vì 403

**Quyết định:** `PUT /api/invitations/{id}/status` bởi người không phải người được mời → **404**.

**Lý do:** 403 sẽ xác nhận "lời mời này có tồn tại", cho phép dò ID. 404 giấu hoàn toàn sự tồn tại.
Đúng quy tắc response trong plan gốc (404 dùng để che existence khỏi actor cross-tenant).

### D-05 · Tạo meeting = quyền truy cập project (không phải quyền quản lý)

**Quyết định:** thành viên project bất kỳ được tạo meeting; nhưng sửa/xoá/thêm-bớt người tham dự
chỉ organiser hoặc người quản lý project.

**Lý do:** họp là hoạt động cộng tác bình thường, khoá về leader sẽ cản trở sử dụng thực tế.
Quyền sửa thì thắt chặt vì đó mới là chỗ gây hại.

### D-06 · Đổi mật khẩu → revoke toàn bộ refresh token

**Quyết định:** `PUT /api/users/me/change-password` nay huỷ mọi phiên đăng nhập.

**Lý do:** thống nhất với `reset-password` đã làm trước đó. Đổi mật khẩu mà token cũ vẫn sống là
lỗ hổng kinh điển.

**Ảnh hưởng frontend:** sau khi đổi mật khẩu, user phải đăng nhập lại. Response đã trả message
báo điều này.

---

## Thay đổi contract API (frontend phải cập nhật)

| Cũ | Mới |
|---|---|
| `PUT /api/users/{id}/profile` | `PUT /api/users/me/profile` |
| `POST /api/users/{id}/avatar` | `POST /api/users/me/avatar` |
| `PUT /api/users/{id}/change-password` | `PUT /api/users/me/change-password` |
| `POST /api/evaluations` body có `leaderId` | bỏ `leaderId` (lấy từ JWT) |
| `POST /api/meetings` body có `organizedBy` | bỏ `organizedBy` (lấy từ JWT) |
| `POST /api/skills/user` body có `userId` | bỏ `userId` (lấy từ JWT) |
| `POST /api/organizations/{orgId}/projects/{projectId}/evaluate` body có `evaluatorId` | bỏ `evaluatorId` (lấy từ JWT) |

Frontend hiện **chưa gọi** các endpoint này (13 component còn dùng mock `tmaiData.ts`), nên
không có gì vỡ ngay. Sẽ xử lý khi làm Slice 8.
