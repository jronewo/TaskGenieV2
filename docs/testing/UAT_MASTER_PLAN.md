# Kế hoạch UAT tổng thể – TaskGenie V2

UAT Plan ID: `UAT-TG-V2-01`  
Phiên bản: 1.0  
Ngày lập: 2026-08-01  
Phạm vi: Web, API và kiểm tra smoke trên mobile  
Trạng thái ban đầu: `NOT READY FOR UAT EXECUTION`

## 1. Mục tiêu

Xác nhận TaskGenie V2 đáp ứng đúng nghiệp vụ thực tế cho người dùng cá nhân, quản trị hệ thống và tổ chức, đặc biệt là:

- Đăng ký, đăng nhập thường và đăng nhập Google.
- Giới hạn số project theo subscription plan.
- Thanh toán, nâng cấp, hạ cấp và hiển thị plan cá nhân/tổ chức.
- Phân quyền System Admin, Organization Owner/Admin, Project Leader và Member.
- Đăng ký tổ chức, quản lý member, tạo project tổ chức và chỉ định Project Leader.
- Tự động cấp Premium cho member hợp lệ của tổ chức.
- Quản trị user, organization, skill và số liệu/charts toàn hệ thống.
- CRUD project, team, task, user skill và các nghiệp vụ liên quan.
- Các chức năng AI, API mapping và toàn bộ nút/thao tác trên UI.
- Bảo mật tenant/ownership: người dùng hoặc tổ chức không được đọc/sửa dữ liệu ngoài phạm vi.

## 2. Kết luận readiness từ static audit

Tại thời điểm lập kế hoạch, hệ thống chưa đủ điều kiện bắt đầu UAT nghiệp vụ đầy đủ.

| Hạng mục | Hiện trạng quan sát được | Đánh giá |
|---|---|---|
| Authentication API | Có register, login, Google login, logout và JWT | Có nền tảng backend |
| Authentication web | Form chỉ delay giả lập; không gọi API; chưa có Google button/SDK/token persistence | Blocker |
| Authorization | API có fallback yêu cầu JWT, nhưng chưa thấy policy role/ownership theo action | Blocker bảo mật |
| Project CRUD web | Dùng seed data và React state cục bộ | Blocker |
| Project plan limit | Không có subscription/entitlement hoặc kiểm tra giới hạn ở backend | Chưa triển khai |
| Admin | Backend chỉ có platform stats; web user/org CRUD dùng dữ liệu mẫu | Chưa đủ |
| Organization | Backend chỉ có các API đọc/evaluate; không có register/update/delete/member CRUD | Chưa đủ |
| Organization membership | Chưa có entity/table/API membership riêng cho tổ chức | Chưa triển khai |
| Premium tự động | User chỉ có chuỗi `Role`; không có plan/entitlement/subscription | Chưa triển khai |
| Payment/subscription | Không thấy model, controller, service hay trang web tương ứng | Chưa triển khai |
| Skill | Backend có skill và user-skill; chưa có trang web quản lý | Backend-only |
| AI | Backend có nhiều API; web mới nối risk, risk history, recommendation accept/reject và evidence URL | Một phần |
| Mobile | Các màn hình hiện dùng dữ liệu tĩnh, chưa thấy network layer | Chưa sẵn sàng UAT E2E |

Chi tiết bằng chứng và mapping nằm trong `UAT_UI_API_AUDIT.md`.

## 3. Quy tắc nghiệp vụ dùng làm UAT oracle

Các quy tắc sau phải được Product Owner xác nhận trước khi thực thi. Nếu chưa chốt, test case liên quan mang trạng thái `BLOCKED-BR` thay vì tự suy đoán.

### BR-01 – Giới hạn project cá nhân

- Tạm diễn giải yêu cầu: user Free được giữ tối đa 2 project chưa xóa; thao tác tạo project thứ 3 bị chặn.
- User đã nâng cấp plan được tạo từ 3 project trở lên theo hạn mức plan.
- Khi Free đã đạt hạn mức, UI phải đưa ra lựa chọn xóa project cũ hoặc nâng cấp; backend vẫn phải chặn nếu gọi API trực tiếp.
- Cần PO xác nhận project `Archived/Closed/Soft-deleted` có tính vào quota hay không và quota là tổng số hay số project active.

### BR-02 – Premium do tổ chức cấp

- Member chỉ nhận quyền Premium sau khi lời mời được chấp nhận hoặc admin tổ chức thêm thành công, không phải ngay lúc gửi invitation.
- Premium dạng organization entitlement phải có `sourceOrganizationId`, thời hạn và trạng thái membership.
- Khi member rời/bị xóa khỏi tổ chức, entitlement do tổ chức cấp phải bị thu hồi, trừ khi user còn subscription cá nhân hoặc membership Premium ở tổ chức khác.
- Cần PO xác nhận một user có thể thuộc nhiều tổ chức hay không.

### BR-03 – Vai trò

- `SYSTEM_ADMIN`: quản trị platform, user, organization, plan, payment và master skill.
- `ORG_OWNER`: chủ tổ chức, quản lý profile tổ chức, subscription, member và project tổ chức.
- `ORG_ADMIN`: quyền được owner ủy quyền; không được xóa/giáng cấp owner cuối cùng.
- `PROJECT_LEADER`: quản lý project/team/task trong project được gán, không có quyền platform hoặc tổ chức ngoài project.
- `MEMBER`: chỉ xem/thao tác trên project/task được phân công.
- `PREMIUM` là entitlement/plan, không nên dùng thay cho authorization role.

### BR-04 – Đăng nhập với tổ chức

- User vẫn đăng nhập bằng tài khoản cá nhân/Google.
- Sau đăng nhập, hệ thống tải danh sách organization memberships và cho chọn organization context nếu có nhiều hơn một.
- Token hoặc server-side authorization phải xác thực cả `userId`, `organizationId`, membership status và org role; không tin `organizationId`, `createdBy`, `evaluatorId` do client tự gửi.

### BR-05 – Chỉ định Project Leader

- Chỉ Organization Owner/Admin được chỉ định hoặc thay Project Leader cho project của chính tổ chức đó.
- Người được chọn phải là active member của tổ chức.
- Quyền Leader chỉ áp dụng cho project được gán.
- Cần PO xác nhận một project có đúng một Leader hay được có nhiều Leader.

## 4. Phạm vi UAT

### Trong phạm vi

1. Identity: register/login/logout/Google login, session, account lock, first login.
2. Subscription và payment: catalog plan cá nhân/tổ chức, checkout, callback/webhook, entitlement, retry, downgrade/cancel.
3. Project quota và CRUD.
4. System Admin dashboard, charts, user CRUD/status/role, organization overview và counts.
5. Organization registration, profile, context switching, role và member lifecycle.
6. Organization project, assignment và Project Leader lifecycle.
7. Skill master và user skill CRUD.
8. Team, invitation, task và các thao tác chính liên quan project.
9. AI risk, classification, summary, workload, recommendation, decision history, evidence và fallback.
10. UI–API contract, nút/thao tác, error/loading/empty state, refresh persistence.
11. Authorization, tenant isolation, IDOR, token expiration/revocation.
12. Responsive web và smoke mobile cho các luồng được công bố hỗ trợ.

### Ngoài phạm vi nếu chưa có yêu cầu riêng

- Kiểm thử tải quy mô production và penetration test đầy đủ.
- Đối soát tài chính/kế toán ngoài giao dịch test/sandbox.
- Chất lượng ngôn ngữ tự do của mô hình AI như một cam kết tuyệt đối; UAT tập trung tính hữu dụng, giải thích, guardrail và fallback.

## 5. Đối tượng và trách nhiệm

| Vai trò tham gia | Trách nhiệm |
|---|---|
| Product Owner | Chốt BR-01 đến BR-05, plan catalog, acceptance và quyết định Go/No-Go |
| QA/UAT Lead | Quản lý test cycle, dữ liệu, evidence, defect và báo cáo |
| Business UAT users | Chạy happy path và xác nhận trải nghiệm nghiệp vụ |
| Backend team | API, authorization, data integrity, payment webhook, AI fallback |
| Frontend team | UI state, route guard, API mapping, loading/error/empty state |
| DevOps | UAT environment, secrets, OAuth redirect, payment sandbox, log/monitoring |
| Security reviewer | Role/tenant matrix, IDOR, token/session và audit log |

## 6. Môi trường UAT

- Một URL web UAT cố định dùng HTTPS.
- Một API UAT cố định; Swagger/OpenAPI phải khớp build được deploy.
- Database riêng, có khả năng reset theo cycle và tuyệt đối không dùng production data.
- Google OAuth client dành cho UAT, redirect URI đúng domain UAT.
- Payment sandbox với webhook secret riêng, cho phép mô phỏng success/fail/pending/refund.
- AI provider test key hoặc stub có thể ép success, timeout, invalid response và rate limit.
- Email/invitation sandbox hoặc inbox dùng cho QA.
- Log correlation ID xuyên frontend → API → external provider.
- Trình duyệt tối thiểu: Chrome, Edge, Safari bản hiện hành; viewport desktop và mobile web.

## 7. Bộ dữ liệu UAT tối thiểu

| Mã | Persona/dữ liệu | Thiết lập |
|---|---|---|
| U01 | Free personal | 0 project, local login |
| U02 | Free at quota | 2 active project |
| U03 | Paid personal | Active personal subscription, ít nhất 3 project |
| U04 | Google new user | Email Google chưa tồn tại |
| U05 | Google existing user | Email trùng user local đang active |
| U06 | Locked user | Status inactive/locked |
| U07 | System Admin | Có quyền platform admin |
| U08 | Org Owner A | Sở hữu Org A, active org plan |
| U09 | Org Admin A | Active member Org A, role admin |
| U10 | Project Leader A | Active member, leader đúng một project Org A |
| U11 | Member A | Active member Org A, nhận Premium từ Org A |
| U12 | Invited user | Invitation pending, chưa có Premium |
| U13 | External user | Không thuộc Org A |
| U14 | Org Owner B | Dùng kiểm tra tenant isolation |
| O01 | Org A | Active plan, còn member/project quota |
| O02 | Org B | Active plan, dữ liệu độc lập với Org A |
| O03 | Org expired | Subscription hết hạn |
| P01 | Project personal | Có task ở đủ trạng thái/risk |
| P02 | Project Org A | Có Leader, Member, skill và evidence |
| P03 | Project Org B | Dùng kiểm tra truy cập chéo tenant |

Mỗi account phải có credential riêng; không dùng chung token giữa tester. Dữ liệu payment chỉ dùng thẻ/test token sandbox.

## 8. Cách thực thi

### Cycle 0 – Readiness và contract

- Chốt business rule và role/plan matrix.
- Xác nhận tất cả màn hình/route/API tồn tại.
- Đối chiếu OpenAPI với frontend service.
- Build, automated test, migration và seed smoke phải pass.
- Không bắt đầu business UAT nếu còn blocker nền tảng trong mục 2.

### Cycle 1 – Happy path

- Google/local login → plan/quota → project.
- Organization registration → subscription → invite/accept member → assign Leader → task/AI.
- Admin dashboard → user/org/skill management.
- Payment success và entitlement propagation.

### Cycle 2 – Boundary, negative và security

- Project thứ 3 đối với Free, concurrent creation và gọi API trực tiếp.
- Payment fail/pending/duplicate webhook/downgrade.
- Cross-user/cross-org IDOR, forged IDs/roles, revoked/expired token.
- AI timeout, provider failure, invalid output và wrong-project request.

### Cycle 3 – Retest và regression

- Retest toàn bộ Critical/High.
- Chạy lại P0/P1 trên Chrome/Edge/Safari và mobile viewport.
- Xác minh persistence sau refresh/logout-login và audit log.

## 9. Ưu tiên

| Mức | Ý nghĩa | Ví dụ |
|---|---|---|
| P0 | Chặn go-live hoặc rủi ro bảo mật/doanh thu | Login, tenant isolation, quota backend, payment entitlement, admin authorization |
| P1 | Nghiệp vụ chính không hoàn chỉnh | Org/member/Leader, project CRUD, skill, AI decision |
| P2 | Chất lượng/khả dụng không chặn toàn bộ | Empty state, responsive, wording, chart tooltip |

## 10. Tiêu chí vào UAT

- BR-01 đến BR-05 và plan catalog đã được PO ký xác nhận.
- Không còn hạng mục `Chưa triển khai`/`Blocker` trong readiness table đối với scope release.
- FE sử dụng API thật trên UAT; không còn seed/mock cho luồng nghiệm thu.
- Authorization được enforce ở backend cho toàn bộ API protected.
- Migration, seed UAT, Google OAuth, payment sandbox, email và AI provider hoạt động.
- Automated build/unit/integration/contract suite pass.
- Có test data, account matrix, API log và cách reset dữ liệu.
- Critical/High từ SIT đã đóng hoặc có waiver được ký.

## 11. Tiêu chí thoát và quyết định release

- 100% P0 executed và pass.
- Tối thiểu 95% P1 pass; case còn lại không được ảnh hưởng bảo mật, tiền hoặc integrity.
- Không còn defect Critical/High mở.
- Không có cross-tenant data exposure, privilege escalation hoặc quota bypass.
- Payment amount/currency/plan/entitlement khớp và webhook idempotent.
- Tất cả nút nghiệp vụ trong scope có API hoặc chủ đích điều hướng được ghi nhận; không có fake-success.
- AI có explainability/fallback; lỗi provider không làm mất dữ liệu hoặc gán sai người.
- PO, QA Lead và đại diện nghiệp vụ ký UAT sign-off.

## 12. Severity defect

| Severity | Định nghĩa |
|---|---|
| Critical | Rò rỉ tenant, chiếm quyền, thanh toán sai, mất dữ liệu, toàn hệ thống không dùng được |
| High | Luồng P0/P1 không có workaround hợp lệ; quota/role/entitlement sai |
| Medium | Chức năng phụ sai hoặc có workaround chấp nhận được |
| Low | UI/text/layout nhỏ, không ảnh hưởng quyết định nghiệp vụ |

Mỗi defect phải có: environment/build, persona/role, precondition, steps, expected/actual, request/response đã che secret, correlation ID, ảnh/video và dữ liệu cleanup.

## 13. Deliverables

- `UAT_MASTER_PLAN.md`: kế hoạch và tiêu chí Go/No-Go.
- `UAT_TEST_CASES.md`: test case nghiệp vụ và bảo mật chi tiết.
- `UAT_UI_API_AUDIT.md`: current-state gap và UI–API traceability.
- Khi chạy UAT: test execution report, defect log, evidence folder và sign-off biên bản.

## 14. Lịch gợi ý

Lịch chỉ bắt đầu khi Cycle 0 đạt entry criteria.

| Ngày làm việc | Hoạt động |
|---|---|
| D1–D2 | Readiness, business rule, environment, account/data |
| D3–D5 | Cycle 1 happy path |
| D6–D8 | Cycle 2 boundary/security/AI/payment |
| D9–D10 | Fix verification và regression |
| D11 | PO demo, residual risk và sign-off |

Nếu payment/subscription, org membership hoặc authorization chưa được triển khai, lịch phải được tính lại sau khi hoàn thành SIT; không dùng UAT để thay thế SIT.
