# Project Risk Register

Updated: 2026-07-20

| ID | Risk | Probability | Impact | Score | Owner role | Trigger | Mitigation | Status/Evidence |
|---|---|---:|---:|---:|---|---|---|---|
| PR-01 | External AI provider unavailable | 4 | 3 | 12 | AI owner | Timeout/non-2xx | Deterministic fallback, status/error/latency log | Mitigated; fallback test |
| PR-02 | Không có labeled dataset để công bố accuracy | 4 | 4 | 16 | AI + QA | Không đủ expert labels | Thu Accept/Reject/outcome; lập labeled evaluation set | Open |
| PR-03 | Database migration chưa chạy trên máy demo | 3 | 5 | 15 | Backend owner | Missing table error | Chạy `dotnet ef database update`, verify pending migration | Open until demo setup |
| PR-04 | Web cũ dùng mock data | 4 | 4 | 16 | Web owner | UI không gọi API | AI Core Demo panel gọi backend thật | Mitigated; Vite build |
| PR-05 | Thiếu automated tests legacy | 5 | 3 | 15 | QA owner | Global coverage thấp | Ưu tiên use case security/auth/project/task trong sprint sau | Open |
| PR-06 | Secrets/config không an toàn | 3 | 5 | 15 | Backend/DevOps | Secret xuất hiện trong repo/log | Rotate secret, user-secrets/env, secret scan | Open; release blocker |
| PR-07 | Dependency có security advisory | 3 | 4 | 12 | Backend owner | NU1903 | Nâng package và regression trước production | Open |

Score = Probability × Impact, thang 1–5. Risk từ 15 trở lên cần owner cập nhật mỗi ngày cho đến khi đóng.
