# Kế hoạch sửa giao diện — từ phản hồi chạy thật

Ngày: 2026-08-02 · Nguồn: người dùng chạy app trên trình duyệt và chụp màn hình.

## Vì sao test không bắt được

41 component test + 19 E2E đều xanh nhưng giao diện vẫn hỏng, vì cả hai tầng chỉ kiểm tra
**hành vi** (bấm nút thì gọi API nào, hiện chữ gì) chứ không kiểm tra **nhìn có đọc được không**.
Chữ xám nhạt trên nền xám đậm vẫn "visible" với Testing Library. Bài học: phải bổ sung
kiểm tra thị giác (screenshot diff) và một quy tắc theme cứng.

---

## D-00 · Kéo thả Kanban làm trắng màn hình · **P0 — sập trang**

**Triệu chứng:** kéo task sang cột khác → màn hình trắng, không kéo thả được nữa.

**Chuỗi nguyên nhân (đã truy đến gốc):**
1. `KanbanBoard.moveTask` gọi `PUT /api/tasks/{id}/progress` — route và payload **đều khớp** backend.
2. Backend `TasksController.UpdateProgress` trả **`204 NoContent`**.
3. `apiClient.apiRequest` gặp 204 thì trả `undefined` (đúng thiết kế).
4. `KanbanBoard` lại làm `updated.taskId` trên giá trị `undefined` → **TypeError ném ra bên trong
   hàm cập nhật state của React** → React gỡ cả cây component → **trắng màn hình**.

Lỗi nằm trong updater của `setTasks`, **không** nằm trong `try` của lời gọi API, nên khối
`catch`/rollback đã viết sẵn không hề chạy.

**Vì sao test không bắt được:** E2E chỉ tạo task rồi xem nó xuất hiện trên bảng (TSK-01), **chưa có
test nào thực sự kéo thả**. Đây là lỗ hổng độ phủ, không phải test sai.

**Sửa (chọn 1, khuyến nghị A):**
- **A — backend trả về task đã cập nhật** thay vì 204. Client nhận trạng thái có thẩm quyền từ
  server, không phải đoán; hợp với ý đồ "server là bên quyết định" đã ghi trong chú thích code.
  Đổi `UpdateProgress` trả `Ok(dto)`, cập nhật `taskApi.updateProgress` cho khớp.
- **B — frontend chấp nhận 204**: giữ nguyên giá trị lạc quan rồi `load()` lại để đồng bộ.
  Ít rủi ro hợp đồng hơn nhưng tốn thêm một vòng gọi API.

**Kèm theo bắt buộc:**
- Chặn phòng thủ: không bao giờ truy cập thuộc tính của phản hồi API mà chưa kiểm tra tồn tại.
- Thêm **error boundary** quanh vùng nội dung chính — một lỗi render không được phép làm trắng cả app.
- Thêm E2E **kéo thả thật** (Todo → In Progress → Done) và test kiểm tra rule phụ thuộc
  (task có dependency chưa Done thì bị API từ chối và giao diện phải revert, không được sập).

**Rà soát cùng loại:** kiểm tra mọi chỗ khác đang đọc thuộc tính từ phản hồi của endpoint trả 204
(`deleteX`, `updateX`, `removeMember`, `updateMine`…) — cùng một cái bẫy.

---

## D-01 · Hai trang mới dùng sai theme — CHỮ KHÔNG ĐỌC ĐƯỢC · P1

**Bằng chứng:** `OrganizationCenter.tsx` có 13 class nền tối (`bg-slate-900/950`), `SubscriptionCenter.tsx`
có 6 — trong khi toàn bộ app còn lại dùng nền sáng (`AdministrationCenter` 17 class sáng,
`ProjectManagement` 6, `TeamManagement` 4). Kết quả: thẻ xám đậm + chữ `text-slate-100` nằm trên
nền sáng → tiêu đề "Subscription", nhãn "Current plan", "Project quota" gần như tàng hình.

**Nguyên nhân:** tôi viết 2 trang này theo bảng màu tối mà không đối chiếu theme thật của app.

**Sửa:** viết lại toàn bộ class màu của 2 trang theo đúng hệ đang dùng:
- nền thẻ `bg-white` + `border-gray-200`, nền trang `bg-gray-50`
- chữ chính `text-gray-900`, phụ `text-gray-500`
- nhấn mạnh `#1A237E` (xanh thương hiệu), thành công `emerald-600`, lỗi `rose-600`
- `SkillManagement.tsx` đã đúng hệ sáng → dùng làm mẫu tham chiếu.

**Chống tái diễn:** thêm mục "bảng màu" vào skill `taskgenie-ui` + một test chặn class nền tối
lọt vào `src/app/components/`.

---

## D-02 · Notifications là dữ liệu bịa hoàn toàn · P1

**Bằng chứng:** `App.tsx:170` — mảng cứng 6 thông báo ("Critical Risk Detected", "An Le commented…").
Không hề có `services/notificationApi.ts`. Badge `badge: 5` trong `Sidebar.tsx:135` cũng cứng.

**Nghiêm trọng vì:** backend `/api/notifications/*` **đã có và đã được vá bảo mật ở Slice 0**
(chỉ đọc/sửa/xoá thông báo của chính mình) — nhưng frontend chưa bao giờ gọi. Đây là đúng loại
"fake success" mà release gate cấm.

**Sửa:**
1. Tạo `services/notificationApi.ts`: `list`, `unreadCount`, `markRead`, `markAllRead`, `remove`.
2. Viết `NotificationsCenter.tsx` thật: loading/error/empty, đánh dấu đã đọc, đánh dấu tất cả, xoá
   (có confirm), phân biệt đã/chưa đọc.
3. Badge lấy từ `unreadCount` thật, ẩn khi bằng 0.
4. Xoá mảng cứng khỏi `App.tsx`.

---

## D-03 · "AI Core Demo" là trang demo tách rời · P1

**Bằng chứng:** `Sidebar.tsx:128` có mục nav `ai-core`, `App.tsx:463` render `CoreAiDemoPanel`.

**Vấn đề:** AI là tính năng của sản phẩm, không phải trang trình diễn. Người dùng phải rời khỏi
dự án để "thử AI" rồi tự áp dụng bằng tay — vô nghĩa trong vận hành thật.

**Sửa:**
1. Bỏ mục nav `ai-core` và trang demo.
2. Đưa AI vào đúng nơi phát sinh nhu cầu:
   - **Trong task detail:** phân tích rủi ro, sinh tóm tắt, phân loại task.
   - **Trong project:** phân tích rủi ro toàn dự án, gợi ý phân bổ khối lượng.
3. Giữ `coreAiApi.ts` nguyên (API đã đúng), chỉ đổi chỗ gọi.

---

## D-04 · AI gợi ý người nhận việc chưa có trong giao diện · P1

**Bằng chứng:** `coreAiApi.ts` đã có `recommend` / `accept` / `reject` (dòng 66-79) và backend
`AcceptAssignmentRecommendationCommandHandler` đã chấm điểm đủ 4 yếu tố
(kỹ năng 40% + tương đồng ngữ nghĩa 25% + khối lượng 20% + hiệu suất 15%).
Nhưng `TaskDetailModal.tsx` **không tham chiếu đến chúng lần nào**.

Đây là tính năng lõi của sản phẩm ("TaskGenie" — AI giao việc) mà người dùng không chạm tới được.

**Sửa:** thêm khối "AI gợi ý người thực hiện" trong `TaskDetailModal`:
- nút "Gợi ý người phù hợp" → gọi `recommend(taskId, projectId)`
- danh sách ứng viên kèm **điểm thành phần** (kỹ năng / tương đồng / khối lượng / hiệu suất) và lý do
- nút **Chấp nhận** (gán thật, ghi audit) và **Từ chối** trên từng gợi ý
- trạng thái: đang tính, lỗi provider (timeout/hết hạn mức) có thể thử lại, rỗng khi không có ứng viên

---

## D-05 · Organization/Subscription luôn hiện với mọi người · P2

**Bằng chứng:** `Sidebar.tsx:130-131` — hai mục nav vô điều kiện.

**Rule bạn muốn:** Organization chỉ hiện khi người dùng **thuộc một tổ chức** hoặc **đã mua gói tổ chức**.

**Sửa:**
1. `App.tsx` gọi `organizationApi.mine()` + `billingApi.entitlement()` khi khởi tạo phiên.
2. Truyền `hasOrganizations` xuống `Sidebar`; hiện mục "Organizations" khi
   `hasOrganizations || entitlement.planCode` thuộc nhóm ORGANIZATION.
3. Người chưa có tổ chức vẫn phải tạo được tổ chức — đặt lối vào "Tạo tổ chức" trong
   **Subscription → tab Organization**, để hành trình là *mua gói/tạo tổ chức → mục nav xuất hiện*.
4. Nav ẩn **không phải** bảo mật — backend đã chặn 403 và có test; đây chỉ là dọn giao diện.

---

## D-06 · Chưa xác minh: "không lấy được dữ liệu" · P2

**Hiện trạng:** ảnh cho thấy "No projects yet" và Kanban 0 task. Nhưng `ProjectManagement.tsx:74`
**có** gọi `projectApi.list()` thật, và ảnh Subscription cho thấy dữ liệu thật đang chảy
(payment #2003, Pro, $9.99, SUCCEEDED, 2026-08-02).

**Nghi vấn:** tài khoản bạn đăng nhập là tài khoản mới nên thật sự chưa có project — tức
**đúng hành vi**, không phải lỗi. Nhưng cần xác minh trước khi kết luận.

**Việc phải làm:** đăng nhập bằng tài khoản đó, gọi `GET /api/projects` bằng token thật, đối chiếu
với bảng `projects` trong SQL. Nếu API trả có dữ liệu mà UI trống → lỗi render, sửa ngay.
Nếu API trả rỗng → không phải lỗi, nhưng phải làm **empty state** hướng dẫn tạo project đầu tiên.

---

## D-07 · Rà soát tổng thể độ dễ nhìn · P2

Sau khi sửa D-01, rà toàn bộ trang theo checklist:
- Tương phản chữ/nền đạt WCAG AA (4.5:1 cho chữ thường).
- Khoảng cách, cỡ chữ, chiều rộng thẻ thống nhất giữa các trang.
- Trạng thái rỗng có hướng dẫn hành động tiếp theo, không chỉ "No data".
- Nút chính/phụ/nguy hiểm phân biệt rõ bằng màu **và** chữ (không chỉ màu).

---

## Thứ tự thực hiện

| Bước | Nội dung | Vì sao trước |
|---|---|---|
| 0 | **D-00** sửa crash kéo thả + error boundary | Sập trang, chặn dùng bảng Kanban |
| 1 | **D-01** sửa theme 2 trang | Đang chặn người dùng đọc được nội dung |
| 2 | **D-02** Notifications thật | Dữ liệu bịa trong sản phẩm, vi phạm release gate |
| 3 | **D-03 + D-04** AI vào đúng chỗ + gợi ý giao việc | Tính năng lõi đang không dùng được |
| 4 | **D-05** điều kiện hiện nav | Sạch giao diện theo đúng rule |
| 5 | **D-06** xác minh tải dữ liệu | Cần dữ kiện trước khi sửa |
| 6 | **D-07** rà soát tổng thể | Sau khi cấu trúc đã đúng |

## Điều kiện nghiệm thu

- Không còn class nền tối trong `src/app/components/`; mọi trang cùng một hệ màu.
- Không còn mảng dữ liệu cứng nào trong `App.tsx` hay component.
- Nav "AI Core Demo" biến mất; AI dùng được từ trong task và project.
- Gán việc bằng AI chạy trọn vòng: gợi ý → chấp nhận → assignment đổi thật trong DB.
- Nav Organization chỉ hiện đúng đối tượng.
- Kéo thả Kanban chạy trọn vòng, có test E2E kéo thả thật; không còn màn hình trắng.
- Có error boundary: lỗi render một vùng không làm chết cả ứng dụng.
- Backend 274 · component (bổ sung mới) · E2E 19+ đều xanh; FE production build xanh.
- Bổ sung test chặn tái diễn cho theme, cho dữ liệu cứng, và cho phản hồi 204.


---

# Đợt 2 — yêu cầu bổ sung từ chạy thật (2026-08-02)

## Đã sửa xong và verify

| ID | Nội dung | Bằng chứng |
|---|---|---|
| D-00 | Crash kéo thả (204 → `undefined.taskId`) | E2E TSK-03 kéo thả thật |
| D-01 | Theme tối → sáng (Organization, Subscription) | Ảnh chụp Edge, 0 class nền tối còn lại |
| D-02 | Notifications thật (trang + header + badge) | `notificationApi`, mock đã xoá |
| D-03 | Bỏ "AI Core Demo", xoá file mồ côi | Nav sạch |
| D-04 | AI gợi ý giao việc trong task detail | 7 component test |
| D-05 | Nav Organization có điều kiện + lối tạo tổ chức đầu tiên | E2E ORG-01 |
| U-01 | Nút `+` Add project (trước đó không có `onClick`) | — |
| U-02 | Dropdown avatar: Profile/Settings/Logout, bỏ Settings khỏi sidebar | Ảnh chụp Edge |
| U-03 | Trang Profile: đổi tên, CRUD skill, lịch sử dự án | — |
| N-01 | Notification load vô hạn (inline callback đổi identity mỗi render) | Test regression riêng |
| E-01 | Leader được xem lịch sử đánh giá của member (nới rule Slice 0 đúng cách) | 274 test backend |

## Hàng đợi tiếp theo — chưa làm

| ID | Nội dung |
|---|---|
| U-04 | Dashboard: chart rõ ràng + danh sách dự án xem được |

| U-06 | Report theo từng dự án thay vì báo cáo tổng |
| U-07 | Sidebar/header responsive, kéo giãn được theo bề rộng trình duyệt |
| E-02 | Trang Evaluation theo dự án: chọn dự án → hiện member + đánh giá cũ ở dự án khác (**backend đã sẵn sàng**) |


| U-10 | Profile: bố cục 2 khung trái/phải, khung project to phía dưới, thông tin user đầy đủ |
| U-11 | Settings: nhiều khung, ưu tiên bên phải, đổi ngôn ngữ, chế độ tối/sáng |
| U-12 | Ô chatbot nhỏ phía dưới (bạn nói code sau) |

## Đợt 3 — đã xong (2026-08-02)

| ID | Nội dung | Ghi chú |
|---|---|---|
| O-01 | Organization gạt theo gói đã trả phí, bỏ "New organization", dashboard dự án + tạo dự án + assign member | E2E ORG-01 viết lại theo luồng trả phí |
| U-05 | Kanban filter/sort: risk, độ khó, đã/chưa assign, sort theo ngày tạo/deadline/risk/độ khó | Lọc phía client, server vẫn là nguồn dữ liệu |
| U-08 | Task board hiện thông tin dự án: tên, risk, trạng thái, mô tả, tiến độ, deadline, số member | |
| U-09 | Nút "Risk estimate": quét tuần tự các task chưa Done, modal xếp theo mức rủi ro kèm hành động giảm thiểu | Tuần tự có chủ đích — provider bị giới hạn tần suất |
| AI-01 | AI insights trong task: sinh tóm tắt, phân loại, phân tích rủi ro | Backend `/summary` và `/classify` nay trả task đã cập nhật thay vì message |

### Lỗi tự gây ra trong đợt này và đã sửa
- Gọi `useWorkspace()` ở top-level App → `GET /api/projects` chạy **trước khi đăng nhập** → 401 kích hoạt handler unauthorized. Chuyển việc nạp dự án vào component đã nằm trong vùng xác thực.
- Một replacement chèn nhầm khối `visibleTasks` **vào trong** hàm `load` → board kẹt "Loading" vĩnh viễn. Đã tách lại đúng cấu trúc.

## Còn lại

| ID | Nội dung |
|---|---|
| U-04 | Dashboard: chart + danh sách dự án |
| U-06 | Report theo từng dự án |
| U-07 | Header/sidebar responsive theo bề rộng trình duyệt |
| E-02 | Evaluation theo dự án (**backend đã sẵn sàng**, còn UI) |
| U-10 | Profile bố cục 2 khung trái/phải |
| U-11 | Settings nhiều khung + đổi ngôn ngữ + dark/light |
| U-12 | Chatbot (bạn nói code sau) |

### Task planning panel (2026-08-02)

| Nội dung | Ghi chú |
|---|---|
| Priority đổi được bằng nút (Low/Medium/High/Critical) | Trước đó chỉ hiển thị chữ, không sửa được |
| Estimate + nút "AI estimate" | Hiện cả estimate thủ công, AI gợi ý và thời gian thực tế |
| Blocked by — thêm/xoá task chặn (task reference) | Chọn task khác trong dự án làm blocker; cảnh báo rõ vì sao không kéo sang Done được |

**Lỗi hợp đồng API bắt được:** frontend khai báo `dependsOnTitle`/`dependsOnStatus` nhưng API trả
`dependsOnTaskTitle`/`status` → mọi blocker hiển thị "Untitled task". Đã sửa tên trường cho khớp và
gỡ khối "Dependencies" cũ bị trùng.
