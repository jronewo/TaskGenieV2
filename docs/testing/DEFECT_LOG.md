# Defect Log

| ID | Round | Severity | Vấn đề | Root cause | Fix/Retest | Status |
|---|---:|---|---|---|---|---|
| DEF-AI-001 | Review | High | Risk analysis chỉ lưu text, không cập nhật score/level/history | Chưa có scoring domain và persistence | Thêm risk-v1, factor/history/log; handler test | Closed |
| DEF-AI-002 | Review | High | Project risk đếm `RiskLevel` cũ sau khi analyze | Bỏ qua result của command con | Tổng hợp trực tiếp `RiskAssessmentDto` mới | Closed |
| DEF-AI-003 | Review | High | Text provider lỗi trả nội dung “AI phản hồi giả lập” | Service che giấu lỗi provider | Throw + explicit fallback/audit status | Closed |
| DEF-AI-004 | Review | High | Accept cùng user lần hai lại unassign task | Logic toggle trong accept command | Accept idempotent, không clear cùng assignee | Closed – Round 3 test |
| DEF-AI-005 | Review | Medium | Recommendation xóa run cũ nên không đánh giá AI được | `DeleteByTaskIdAsync` trước mỗi run | Giữ history theo run_id và trạng thái decision | Closed |
| DEF-QA-001 | Round 1 | Low | Expected score trong test là 0.77 thay vì 0.78 | Tính nhầm test oracle | Sửa expected; Round 2 46/46 pass | Closed |
| DEF-QA-002 | Round 2 | Medium | Global legacy coverage thấp dù AI core đạt gate | Repository trước đó không có test | Ghi rõ baseline; tạo backlog test theo use case | Open – non-core backlog |
| DEF-QA-003 | Round 3 HTTP | Low | API test factory đăng ký đồng thời SQL Server và InMemory | Callback DbContext cũ chưa bị remove | Remove `IDbContextOptionsConfiguration`; retest 58/58 pass | Closed |
| DEF-SEC-001 | Build | High | NuGet cảnh báo `Microsoft.OpenApi 2.4.1` có advisory severity cao | Dependency gián tiếp/phiên bản hiện tại | Cần nâng Swashbuckle/OpenAPI sau core demo và chạy regression | Open – dependency backlog |

Không còn defect Critical/High mở trong logic AI core. `DEF-SEC-001` không bị che giấu và phải xử lý trước production release.
