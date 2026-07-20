# AI Core Test Cases

| TC ID | Use case | Input/Condition | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| RISK-001 | Analyze completed task | Done, progress 100 | Score 0, LOW, all factors 0 | Đúng expected | Pass |
| RISK-002 | Analyze overdue task | Deadline -3 days, progress 20 | Deadline factor 100 | Đúng expected | Pass |
| RISK-003 | Analyze reported blocker | Task log có risk text | Dependency factor >=80 và mitigation | Đúng expected | Pass |
| RISK-004 | Missing deadline | Deadline null | Uncertainty score 20 | Đúng expected | Pass |
| RISK-005 | No assignee | Không có assignee | Workload penalty >=60 | Đúng expected | Pass |
| RISK-006 | Poor delivery history | Deadline evaluation 1/10 | Historical factor 90 | Đúng expected | Pass |
| RISK-007 | Missing history | Không có evaluation | Baseline 25, không crash | Đúng expected | Pass |
| RISK-008 | Stale progress | Update cách 14 ngày | Progress risk cao hơn recent update | Đúng expected | Pass |
| RISK-009 | Rule weights invalid total | Weights 30/25/20/15/10 | Normalize về tổng 1 | Đúng expected | Pass |
| RISK-010 | Threshold boundaries | 29.99/30/59.99/60/79.99/80 | LOW/MEDIUM/HIGH/CRITICAL đúng biên | 8/8 đúng | Pass |
| RISK-011 | Text provider unavailable | Provider throw | Rules-only result vẫn lưu, status FALLBACK | Đúng expected | Pass |
| RISK-012 | Task not found | Task ID 404 | Không gọi provider, API mapping 404 | Handler trả null; controller 404 | Pass |
| REC-001 | Weighted candidate score | 1/0.8/0.6/0.4 | Total 0.78 | 0.78 | Pass |
| REC-002 | Provider score out of range | 2/-1/1.5/0.5 | Clamp từng component 0..1 | Đúng expected | Pass |
| REC-003 | Skill has strongest weight | Chỉ từng component =1 | Skill impact 0.40 > semantic 0.25 | Đúng expected | Pass |
| REC-004 | Workload tie-break | Skill/semantic/performance bằng nhau | Candidate rảnh xếp cao hơn | Đúng expected | Pass |
| REC-005 | Rank and audit | 2 candidates, HF success | Rank đúng, breakdown và execution log cùng run ID | Đúng expected | Pass |
| REC-006 | Project isolation | Task project 20, request 99 | Reject trước khi gọi provider | Đúng expected | Pass |
| REC-007 | Accept current assignee | User đã assigned | Idempotent, không unassign | Đúng expected | Pass |
| REC-008 | Accept outside latest run | User không thuộc latest run | Reject, assignment không đổi | Đúng expected | Pass |
| EVD-001 | Valid HTTPS evidence | HTTPS URL | Persist và trả DTO | Đúng expected | Pass |
| EVD-002 | Invalid scheme | relative/ftp/javascript URL | Reject validation/domain | 3/3 reject | Pass |
| EVD-003 | Oversized attachment | 26 MB | Reject, không persist attachment | Đúng expected | Pass |
| EVD-004 | Disallowed MIME | executable | Reject | Đúng expected | Pass |
| EVD-005 | Missing user/source | User ID 0, không URL/file | Validator trả lỗi | Đúng expected | Pass |
| DB-001 | Table mapping | 6 entity types mới | Đúng table names | 6/6 đúng | Pass |
| DB-002 | Default risk rules | EnsureCreated | 5 active rules, weights sum 1 | Đúng expected | Pass |
| INT-001 | Risk persistence integration | Real EF repositories + InMemory DB | Task level, history, 5 factors, execution log cùng được lưu | Đúng expected | Pass |
| INT-002 | Evidence persistence integration | Real evidence/task repositories | POST và query trả cùng evidence | Đúng expected | Pass |
| INT-003 | Recommendation persistence integration | Real user/task/recommendation/risk repositories | Run breakdown và execution audit được lưu | Đúng expected | Pass |
| HTTP-001 | Risk API pipeline | POST risk qua TestServer | HTTP 200, 5 factors, history/factors persisted | Đúng expected | Pass |
| HTTP-002 | Recommendation API pipeline | POST recommend qua TestServer | HTTP 200, Top 3 ranks và audit persisted | Đúng expected | Pass |
| HTTP-003 | Evidence API pipeline | POST/GET evidence qua TestServer | HTTP 201 và GET trả evidence vừa tạo | Đúng expected | Pass |
| BUILD-001 | Backend Release build | 4 projects | 0 compile errors | 0 errors | Pass |
| BUILD-002 | Migration consistency | EF pending-model check | No pending model changes | No pending changes | Pass |
| BUILD-003 | Web production build | Vite build | Bundle generated | Build pass; chunk-size warning | Pass with warning |
| LIVE-001 | Live Kestrel demo flow | Seed task 6, provider key empty | Risk/recommend/evidence/accept/history vẫn chạy và log fallback | 8 HTTP steps pass | Pass |

Chi tiết từng assertion và stack trace khi fail nằm trong test source và TRX evidence.
