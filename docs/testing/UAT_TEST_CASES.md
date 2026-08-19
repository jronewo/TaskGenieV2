# UAT Test Cases – TaskGenie V2

Test suite ID: `UAT-TG-V2-SUITE-01`  
Phiên bản: 1.0  
Trạng thái: Planning – chưa phải execution result

Quy ước:

- `P0`: bắt buộc pass trước release.
- `P1`: luồng nghiệp vụ chính.
- `P2`: chất lượng và khả dụng.
- `BLOCKED`: chưa đủ chức năng/current-state để chạy end-to-end.
- Với mọi case mutate dữ liệu: refresh trang và đăng nhập lại để xác nhận dữ liệu được lưu ở backend, không chỉ thay đổi state trên trình duyệt.

## A. Authentication và Google login

| ID | Pri | Tiền điều kiện | Thao tác chính | Kết quả mong đợi | Readiness |
|---|---|---|---|---|---|
| AUTH-001 | P0 | U01 | Login đúng email/password | Vào dashboard; JWT/session hợp lệ; tải đúng user/role/plan | BLOCKED-FE |
| AUTH-002 | P0 | U01 | Login sai password | Không tạo session; thông báo chung, không lộ user tồn tại | BLOCKED-FE |
| AUTH-003 | P0 | U06 | Login tài khoản khóa | Bị từ chối; không vào được route protected | BLOCKED-FE |
| AUTH-004 | P1 | Email mới | Register với dữ liệu hợp lệ | Tạo một user; login/session hợp lệ; role mặc định an toàn | BLOCKED-FE |
| AUTH-005 | P1 | Email đã có | Register lại cùng email/case variant | Bị chặn, không tạo duplicate | BLOCKED-FE |
| AUTH-006 | P1 | — | Register dữ liệu rỗng/email sai/password yếu | Validation nhất quán FE/BE; không gửi hoặc không ghi DB | BLOCKED-FE |
| AUTH-007 | P0 | U04, Google UAT | Bấm Sign in with Google, consent thành công | Backend verify Google ID token; tạo user một lần; vào dashboard | BLOCKED-FE |
| AUTH-008 | P0 | U05 | Google login với email đã tồn tại | Liên kết/đăng nhập đúng account theo rule; không tạo duplicate | BLOCKED-FE |
| AUTH-009 | P0 | Google token sai audience/hết hạn | Gọi Google login | HTTP 401; không tạo user/session | API-READY |
| AUTH-010 | P1 | User hủy popup Google | Hủy consent | Ở lại login; thông báo không gây hiểu nhầm | BLOCKED-FE |
| AUTH-011 | P0 | User đã login | Logout rồi gọi API bằng token cũ | Token cũ bị từ chối; route protected quay về login | BLOCKED-FE |
| AUTH-012 | P0 | Token hết hạn | Giữ màn hình đến khi token expire rồi thao tác | API 401 được xử lý; không fake-success; yêu cầu login lại | BLOCKED-FE |
| AUTH-013 | P1 | U04 first login | Login lần đầu | Onboarding/skill setup hiển thị đúng; sau khi có skill không lặp lại | PARTIAL-BE |
| AUTH-014 | P0 | Không login | Mở trực tiếp dashboard/admin/org URL và gọi API | UI route guard + API 401; không lộ dữ liệu | BLOCKED-FE |

## B. Subscription, plan và payment

| ID | Pri | Tiền điều kiện | Thao tác chính | Kết quả mong đợi | Readiness |
|---|---|---|---|---|---|
| SUB-001 | P0 | Anonymous/user | Mở trang Pricing/Payment | Có đầy đủ plan cá nhân và tổ chức, giá, chu kỳ, currency, quota, feature | BLOCKED |
| SUB-002 | P1 | — | Chuyển monthly/annual | Giá và tổng tiền đổi đúng; plan ID gửi backend đúng | BLOCKED |
| SUB-003 | P0 | U01 | Checkout personal plan thành công | Payment success; subscription active; entitlement cập nhật một lần | BLOCKED |
| SUB-004 | P0 | U08 | Checkout organization plan thành công | Subscription gắn đúng organization, không gắn nhầm owner cá nhân | BLOCKED |
| SUB-005 | P0 | Sandbox decline | Thanh toán thất bại | Không cấp Premium/quota; cho retry; lưu trạng thái fail an toàn | BLOCKED |
| SUB-006 | P0 | Payment pending | Callback pending rồi webhook success | Chỉ cấp entitlement khi điều kiện xác nhận đạt; UI tự đồng bộ đúng | BLOCKED |
| SUB-007 | P0 | Một payment event | Gửi webhook trùng nhiều lần | Idempotent; không tạo duplicate subscription/invoice/entitlement | BLOCKED |
| SUB-008 | P0 | U03 active plan | Refresh/logout-login | Plan/quota vẫn đúng từ backend | BLOCKED |
| SUB-009 | P1 | U03 | Upgrade plan giữa kỳ | Amount/proration và quota mới đúng theo rule | BLOCKED |
| SUB-010 | P1 | U03 | Downgrade khi usage vượt quota mới | Không mất dữ liệu; downgrade scheduled hoặc bị chặn rõ ràng | BLOCKED |
| SUB-011 | P0 | Active subscription | Cancel subscription | Trạng thái/cancel-at đúng; quyền còn đến thời điểm quy định rồi thu hồi | BLOCKED |
| SUB-012 | P0 | O03 expired | Đăng nhập/thao tác premium | Entitlement org hết hạn; dữ liệu giữ nguyên; action vượt Free bị chặn | BLOCKED |
| SUB-013 | P0 | Payment success, callback giả | Thay planId/amount/orgId ở request client | Backend không tin amount/owner client; không cấp sai plan | BLOCKED |
| SUB-014 | P1 | U07 | Xem subscription chart/count | Tổng/series khớp DB theo plan, status và date filter | BLOCKED |
| SUB-015 | P1 | U01/U08 | Xem lịch sử hóa đơn/payment | Chỉ thấy dữ liệu sở hữu; amount/status/reference đúng; không lộ tenant | BLOCKED |

## C. Project quota và CRUD

| ID | Pri | Tiền điều kiện | Thao tác chính | Kết quả mong đợi | Readiness |
|---|---|---|---|---|---|
| PRJ-001 | P0 | U01 có 0 project | Tạo project hợp lệ | Tạo team tương ứng; creator là Leader; project xuất hiện sau refresh | BLOCKED-FE |
| PRJ-002 | P0 | U02 có 2 active project | Tạo project thứ 3 | Bị chặn ở FE và BE; hiển thị Delete old/Upgrade | BLOCKED |
| PRJ-003 | P0 | U02 | Xóa một project cũ rồi tạo lại | Tạo thành công nếu quota giải phóng theo BR-01 | BLOCKED-FE |
| PRJ-004 | P0 | U03 paid | Tạo project thứ 3 và trên 3 | Thành công đến đúng quota paid plan | BLOCKED |
| PRJ-005 | P0 | U02 | Gửi hai request create đồng thời | Transaction/quota lock ngăn vượt hạn mức | BLOCKED |
| PRJ-006 | P0 | U02 | Bỏ qua UI, gọi POST `/api/Projects` trực tiếp | Backend vẫn chặn quota và lấy creator từ token | BLOCKED-BE |
| PRJ-007 | P1 | User có project | Sửa name/description/deadline/status | Chỉ field hợp lệ đổi; audit log/persistence đúng | BLOCKED-FE |
| PRJ-008 | P1 | User có project/task | Xóa project, confirm/cancel | Cancel không đổi; confirm xử lý child data đúng policy, quota cập nhật | BLOCKED-FE |
| PRJ-009 | P0 | U13 không thuộc project | GET/PUT/DELETE project qua ID đoán được | 403/404; không lộ metadata; không mutate | BLOCKED-BE |
| PRJ-010 | P1 | Project closed/archived | Kiểm tra list, quota và action | Trạng thái hiển thị đúng; action bị hạn chế theo rule | PARTIAL-BE |
| PRJ-011 | P1 | U10/U11 | List project | Chỉ project user tạo hoặc được gán; org context đúng | PARTIAL-BE |
| PRJ-012 | P1 | Tên trùng/blank/deadline quá khứ | Create/update | Validation đúng và không tạo team/project rác | BLOCKED-FE |

## D. System Admin

| ID | Pri | Tiền điều kiện | Thao tác chính | Kết quả mong đợi | Readiness |
|---|---|---|---|---|---|
| ADM-001 | P0 | U07 | Mở Administration | Được phép; dữ liệu tải từ API | BLOCKED-FE |
| ADM-002 | P0 | U01/U08/U10/U11 | Mở/call Admin APIs | 403; menu ẩn không thay thế backend authorization | BLOCKED-BE |
| ADM-003 | P1 | U07 | Xem platform stats | Tổng users/orgs/projects/tasks/done khớp DB và định nghĩa | PARTIAL-BE |
| ADM-004 | P1 | U07 | Xem chart subscription theo date/plan | Series, legend, totals và timezone đúng | BLOCKED |
| ADM-005 | P1 | U07 | List/search/filter/paginate users | Kết quả và total đúng; không dùng seed data | BLOCKED |
| ADM-006 | P0 | U07 | Create/update user | Validation, role allow-list, uniqueness và audit đúng | BLOCKED |
| ADM-007 | P0 | U07 | Lock/unlock user đang có session | Session bị vô hiệu theo policy; UI trạng thái đúng | BLOCKED |
| ADM-008 | P0 | U07 | Delete/restore user | Soft-delete/integrity đúng; không mất ownership im lặng | BLOCKED |
| ADM-009 | P0 | U07 | Tự xóa/khóa/hạ quyền admin cuối cùng | Bị chặn | BLOCKED |
| ADM-010 | P1 | U07 | Xem organizations đã đăng ký | Count/list/owner/plan/member/project đúng; truy cập detail được audit | BLOCKED-FE |

## E. Organization, member và Project Leader

| ID | Pri | Tiền điều kiện | Thao tác chính | Kết quả mong đợi | Readiness |
|---|---|---|---|---|---|
| ORG-001 | P0 | U01 chưa có org | Mở trang đăng ký tổ chức | Form tồn tại, plan org rõ ràng | BLOCKED |
| ORG-002 | P0 | U01 | Đăng ký organization hợp lệ | Tạo org; user thành Owner; membership active; context tải sau login | BLOCKED |
| ORG-003 | P1 | Tên/slug trùng hoặc dữ liệu sai | Đăng ký org | Validation/uniqueness đúng; không tạo bản ghi dở dang | BLOCKED |
| ORG-004 | P0 | U08 | Logout-login | Tải đúng Org A và role Owner; không cần “tài khoản org” riêng | BLOCKED-FE |
| ORG-005 | P0 | User thuộc nhiều org (nếu cho phép) | Chuyển org context | Dữ liệu/menu/quyền đổi đúng, không cache tenant cũ | BLOCKED |
| ORG-006 | P0 | U08 | Mời U12 bằng email | Invitation pending; chưa cấp Premium | PARTIAL-BE |
| ORG-007 | P0 | U12 | Accept invitation | Membership active đúng org/role; cấp Premium org entitlement | BLOCKED |
| ORG-008 | P1 | U12 | Reject/expire invitation | Không tạo membership, không cấp Premium | PARTIAL-BE |
| ORG-009 | P1 | U08 | Mời member trùng/đang active | Không duplicate membership/invitation | PARTIAL-BE |
| ORG-010 | P0 | U09/U11/U13 | CRUD member Org A | Owner/Admin được phép; Member/external bị 403 | BLOCKED |
| ORG-011 | P0 | U08 | Xóa U11 khỏi Org A | Membership inactive; revoke org Premium theo BR-02; project access cập nhật | BLOCKED |
| ORG-012 | P0 | U11 có personal plan | Xóa khỏi Org A | Org entitlement mất nhưng personal Premium vẫn còn | BLOCKED |
| ORG-013 | P0 | U11 thuộc Org A và B | Rời Org A | Premium còn nếu Org B vẫn cấp; không lộ dữ liệu Org A | BLOCKED |
| ORG-014 | P0 | U08/U09 | Tạo project cho Org A | Project gắn Org A; quota org được enforce; creator/owner lấy từ context | BLOCKED |
| ORG-015 | P0 | U08 | Assign U10 làm Project Leader | U10 active member; role Leader đúng project; token/session phản ánh quyền | BLOCKED |
| ORG-016 | P0 | U08 | Assign U13 không thuộc Org A làm Leader | Bị chặn; không auto-add âm thầm | BLOCKED |
| ORG-017 | P0 | U09/U10/U11 | Thay/xóa Leader | Chỉ actor đúng quyền được làm; không để project ở trạng thái invalid | BLOCKED |
| ORG-018 | P0 | U10 | Quản lý project/team/task được gán | Được phép trong project; không có quyền org billing/member/platform | BLOCKED-BE |
| ORG-019 | P0 | U10 | Truy cập project Org A khác không được gán | 403/404 | BLOCKED-BE |
| ORG-020 | P0 | U14/Org B | Truy cập URL/API Org A | 403/404 cho list/detail/member/project/evaluation | BLOCKED-BE |
| ORG-021 | P1 | U08 | Xem member/project counts | Khớp active membership/project và định nghĩa dashboard | BLOCKED |
| ORG-022 | P1 | Org plan chạm member quota | Add/invite thêm member | Backend chặn; UI gợi ý upgrade; không cấp Premium | BLOCKED |

## F. Skill management

| ID | Pri | Tiền điều kiện | Thao tác chính | Kết quả mong đợi | Readiness |
|---|---|---|---|---|---|
| SKL-001 | P1 | U07 | Mở master skill page | List/search/pagination từ API; trang tồn tại | BLOCKED-FE |
| SKL-002 | P1 | U07 | Tạo skill mới | Tạo một record, chuẩn hóa tên, audit đúng | API-PARTIAL |
| SKL-003 | P1 | U07 | Tạo skill trùng khác hoa/thường/khoảng trắng | Không duplicate; phản hồi rõ | API-PARTIAL |
| SKL-004 | P1 | U07 | Update/archive/delete master skill | Reference user/task được bảo toàn theo policy | BLOCKED-BE |
| SKL-005 | P1 | U11 | Add skill và level vào profile | Chỉ sửa profile mình hoặc actor được ủy quyền; persist đúng | BLOCKED-FE |
| SKL-006 | P1 | U11 | Update/remove user skill | Level boundary đúng; refresh không mất | BLOCKED-FE |
| SKL-007 | P0 | U13 | Sửa skill của U11 bằng userId/userSkillId | 403/404; không mutate | BLOCKED-BE |

## G. Team, invitation và task smoke

| ID | Pri | Tiền điều kiện | Thao tác chính | Kết quả mong đợi | Readiness |
|---|---|---|---|---|---|
| TEAM-001 | P1 | Actor đúng quyền | Create team | Backend persist; creator/member/role đúng | BLOCKED-FE |
| TEAM-002 | P1 | Team tồn tại | Invite → accept → add member | Trạng thái invitation và member nhất quán | BLOCKED-FE |
| TEAM-003 | P0 | Team có Leader | Remove Leader | Bị chặn hoặc yêu cầu chuyển Leader trước | BLOCKED-FE |
| TEAM-004 | P0 | U13 | Add/remove member bằng API | 403; không đổi dữ liệu | BLOCKED-BE |
| TASK-001 | P1 | U10 | Create/update/delete task | Permission, validation, persistence và audit đúng | BLOCKED-FE |
| TASK-002 | P1 | U11 được assign | Update progress/comment/evidence | Chỉ thao tác được phép; UI phản ánh response thật | BLOCKED-FE |
| TASK-003 | P0 | U13/wrong project | CRUD task qua ID | 403/404 và isolation đúng | BLOCKED-BE |
| TASK-004 | P1 | Task dependencies | Tạo dependency cycle/self/wrong project | Backend chặn invalid graph | API-READY-TO-TEST |

## H. AI và API mapping

| ID | Pri | Tiền điều kiện | Thao tác chính | Kết quả mong đợi | Readiness |
|---|---|---|---|---|---|
| AI-001 | P1 | P02/task hợp lệ | Analyze task risk | Trả score/level/factors/explanation/actions; lưu history | MAPPED |
| AI-002 | P1 | Risk task thay đổi input | Analyze lại | Run mới; score/history hợp lý; không ghi đè history | MAPPED |
| AI-003 | P0 | Task thuộc project khác | Analyze/recommend với forged projectId | Bị chặn trước provider/persistence | API-READY-TO-TEST |
| AI-004 | P1 | P02 có nhiều task | Analyze all project | Tất cả task hợp lệ được xử lý; partial failure minh bạch | UNMAPPED-FE |
| AI-005 | P1 | Task hợp lệ | Generate summary | Nội dung gắn đúng task, hiển thị/loading/error đúng | UNMAPPED-FE |
| AI-006 | P1 | Task hợp lệ | Classify task | Category/priority theo contract; user xác nhận được | UNMAPPED-FE |
| AI-007 | P1 | P02 có workload | Xem workload suggestions | Chỉ member project; số liệu và timestamp đúng | UNMAPPED-FE |
| AI-008 | P1 | Required skills + candidates | Get assignment recommendations | Top candidates, component scores và reason hiển thị đúng | MAPPED |
| AI-009 | P0 | Candidate ngoài project/org | Recommend/accept candidate | Bị loại/chặn theo rule; không gán sai tenant | API-READY-TO-TEST |
| AI-010 | P1 | Recommendation pending | Accept | Gán đúng một lần; status/history/audit/notification đồng bộ | MAPPED |
| AI-011 | P1 | Recommendation pending | Reject kèm reason | Không gán; reason/history persist | MAPPED |
| AI-012 | P0 | Accept/reject lặp hoặc concurrent | Gửi nhiều request | Idempotent; trạng thái cuối hợp lệ | API-READY-TO-TEST |
| AI-013 | P1 | Task hợp lệ | Add/list evidence URL | Validate URL; persist; evidence gắn đúng task/user | MAPPED |
| AI-014 | P1 | File evidence nếu scope | Upload file quá loại/size hoặc file hợp lệ | Validate server-side; scan/storage/link đúng | PARTIAL |
| AI-015 | P0 | Provider timeout/5xx/rate limit | Chạy risk/recommend/summary/classify | Fallback hoặc lỗi có kiểm soát; không fake-success/mất dữ liệu | API-READY-TO-TEST |
| AI-016 | P0 | U13 | Gọi AI/history/evidence của P02 | 403/404; không lộ prompt, factors, candidates hay evidence | BLOCKED-BE |
| AI-017 | P1 | Nhiều execution | Xem execution/decision history | Đúng actor, model/provider/version/status/latency; không lộ secret | UNMAPPED-FE |
| AI-018 | P1 | AI output bất thường | Output rỗng/JSON sai/điểm ngoài range | Validate/normalize/reject an toàn; UI có retry | API-READY-TO-TEST |

## I. UI button/API contract và trạng thái trải nghiệm

| ID | Pri | Tiền điều kiện | Thao tác chính | Kết quả mong đợi | Readiness |
|---|---|---|---|---|---|
| MAP-001 | P0 | DevTools network | Thực hiện mọi nút mutate | Mỗi thao tác gọi đúng method/path/body/token; không local fake-success | BLOCKED |
| MAP-002 | P0 | Giả lập API 401/403 | Bấm action | Hiển thị auth/permission đúng; state không đổi giả | BLOCKED |
| MAP-003 | P1 | Giả lập 400/409/422 | Submit form | Validation server hiển thị cạnh field; giữ dữ liệu nhập | BLOCKED |
| MAP-004 | P1 | Giả lập 500/timeout/offline | Bấm action | Loading kết thúc; retry an toàn; không double-submit | PARTIAL-AI |
| MAP-005 | P0 | Response chậm | Double-click submit | Nút disabled/idempotency; chỉ một mutation | BLOCKED |
| MAP-006 | P1 | List rỗng | Mở project/org/member/skill/payment/history | Empty state đúng và có CTA hợp lệ | BLOCKED |
| MAP-007 | P1 | Dataset lớn | Search/filter/sort/page | Query mapping và total đúng; không filter chỉ seed page | BLOCKED |
| MAP-008 | P1 | Mutation thành công | Refresh, back/forward, login lại | State đồng bộ backend; không mất hoặc nhân đôi | BLOCKED |
| MAP-009 | P1 | Mobile viewport/Safari | Chạy P0 happy paths | Dialog/menu/form/chart không bị che/cắt; thao tác được | BLOCKED |
| MAP-010 | P2 | Keyboard/screen reader | Tab/Enter/Escape/labels | Focus, accessible name, error announcement hợp lệ | PLANNED |

## J. Security và data integrity

| ID | Pri | Tiền điều kiện | Thao tác chính | Kết quả mong đợi | Readiness |
|---|---|---|---|---|---|
| SEC-001 | P0 | JWT user thường | Sửa claim/role hoặc dùng token ký sai | 401/403 | API-READY-TO-TEST |
| SEC-002 | P0 | U11 | Gửi `CreatedBy=U07`, `EvaluatorId=U07`, userId khác | Backend bỏ qua/đối chiếu actor từ token; không mạo danh | BLOCKED-BE |
| SEC-003 | P0 | U14 | Duyệt ID Org A/project/task/member | Không lộ dữ liệu hoặc phân biệt tồn tại quá mức | BLOCKED-BE |
| SEC-004 | P0 | Token logout | Gọi lại toàn bộ API protected | 401 trên mọi instance theo kiến trúc revocation | PARTIAL-BE |
| SEC-005 | P0 | User bị lock | Dùng token đã cấp trước khi lock | Token bị từ chối theo policy gần real-time | BLOCKED |
| SEC-006 | P0 | User input | Thử XSS/SQL/meta characters ở name/comment/description | Encode/validate; không thực thi script/SQL | PLANNED |
| SEC-007 | P0 | Upload | File giả MIME, oversized, malicious filename | Validate content/size/name/storage; không public execution | PLANNED |
| SEC-008 | P0 | Concurrent mutation | Update/delete/assign cùng lúc | Concurrency/integrity hợp lệ, không orphan/duplicate | PLANNED |
| SEC-009 | P1 | Audit enabled | Thực hiện admin/payment/role/member action | Audit có actor, tenant, action, target, time, result/correlation | BLOCKED |
| SEC-010 | P0 | Browser/logs | Quan sát token/payment/AI keys | Không xuất hiện trong URL, UI error, client bundle hoặc log thường | PLANNED |

## K. Kịch bản UAT end-to-end bắt buộc

### E2E-01 – Free personal đến quota

1. U01 đăng nhập Google lần đầu.
2. Hoàn tất onboarding/skill.
3. Tạo project 1 và 2.
4. Tạo project 3 và xác nhận bị chặn ở UI lẫn API.
5. Xóa project cũ, tạo project mới.
6. Refresh/logout-login và xác nhận list/quota chính xác.

### E2E-02 – Personal upgrade

1. U02 bị chặn tại quota.
2. Mở Pricing, chọn personal plan và thanh toán sandbox thành công.
3. Nhận webhook, entitlement chuyển Active.
4. Tạo project thứ 3 và trên 3 theo quota.
5. Xem payment history; logout-login; kiểm tra quyền vẫn đúng.

### E2E-03 – Organization lifecycle

1. U01 đăng ký Org A và trở thành Owner.
2. Mua organization plan.
3. Mời U12; trước khi accept, U12 chưa Premium.
4. U12 accept; membership active và Premium được cấp.
5. Owner tạo project org, assign U12 làm Project Leader.
6. U12 login, vào Org A, quản lý project được gán nhưng không vào billing/member admin trái quyền.
7. Owner remove U12; quyền project và org Premium được thu hồi theo BR-02.

### E2E-04 – Admin governance

1. U07 login và mở dashboard.
2. Đối chiếu user/org/project/subscription totals với DB fixture.
3. CRUD/lock user, quản lý organization và master skill.
4. Kiểm tra subscription chart/date filter.
5. Login user thường, xác nhận admin UI/API đều bị chặn.

### E2E-05 – Organization project + AI

1. Org Owner tạo project, thêm member, chỉ định Leader.
2. Leader tạo task, required skills và evidence.
3. Chạy risk, summary, classify, workload và recommendations.
4. Xem explanation/component scores; accept một candidate.
5. Xác nhận assignment, history, execution log, notification và audit.
6. Dùng user Org B gọi cùng IDs và xác nhận bị chặn.

## L. Evidence phải thu

- Screenshot/video trước và sau action.
- Network request/response đã xóa token/PII/secret.
- Correlation ID và log liên quan.
- DB query hoặc admin export chứng minh persistence/count/entitlement.
- Payment sandbox event + webhook delivery/idempotency.
- Với AI: input fixture, run ID, model/rule version, factors/output và fallback status.

Actual result, tester, execution date, build version, evidence link và defect ID sẽ được thêm vào bản execution report; không ghi đè kế hoạch gốc.
