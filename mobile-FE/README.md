# TaskGenie — Android (React Native / Expo)

Ứng dụng mobile cho TaskGenie. Mọi màn hình đọc/ghi **cùng API và cùng database SQL Server** với
bản web — không còn dữ liệu mẫu ở đâu cả.

## Có gì trên mobile, và cố tình không có gì

App điện thoại để *làm việc*, không phải để vận hành hệ thống:

| Có trên mobile | Chỉ có trên web |
|---|---|
| Việc của tôi (cần làm hôm nay) | Analytics / Báo cáo |
| Dự án → task của dự án đó | Team & Đánh giá |
| Chi tiết task: trạng thái, bình luận, ước tính AI, giao việc | Quản lý tổ chức |
| Thông báo | Quản trị hệ thống |
| Trợ lý AI | Danh mục kỹ năng |
| Gói dịch vụ & thanh toán | Billing của admin |

Phần quản trị **không tồn tại** trong app — không phải bị ẩn sau kiểm tra quyền, mà là không có màn
hình nào cả.

## Chạy

API phải chạy trước (`dotnet run --project src/TaskGenie.API` từ thư mục gốc repo).

```bash
# Chạy qua Expo Go
npx expo start --android

# Build app độc lập, cài với tên "TaskGenie" và icon riêng
export JAVA_HOME=/opt/homebrew/opt/openjdk@17   # Gradle ở đây KHÔNG dùng được JDK 25 của Android Studio
npx expo run:android
```

### Kết nối API từ thiết bị

Máy ảo Android có loopback riêng, nên `localhost` trong đó là **chính máy ảo**, không phải máy bạn.
`10.0.2.2` là địa chỉ Android ánh xạ về host — đó là giá trị mặc định trong `.env`.

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:5258
```

Với **điện thoại thật** thì cả hai đều sai: đặt thành địa chỉ LAN của máy (ví dụ
`http://192.168.1.76:5258`) và hai thiết bị phải cùng mạng.

Nếu chạy Metro với `--localhost`, máy ảo cũng không tải được bundle. Hoặc bỏ cờ đó, hoặc ánh xạ cổng:

```bash
adb reverse tcp:8081 tcp:8081   # Metro
adb reverse tcp:5258 tcp:5258   # API
```

## Đăng nhập Google

Dùng Google Sign-In **native** (`@react-native-google-signin/google-signin`), không dùng
`expo-auth-session`. Hai cách kia đều bị Google chặn và đã thử qua:

- Web client + custom scheme → *"Custom scheme URIs are not allowed for 'WEB' client type"*
- Android client + luồng id_token qua trình duyệt → *"Lỗi 400: invalid_request"*

Cần **cả hai** OAuth client, mỗi cái một việc:

| Client | Vai trò |
|---|---|
| **Android** (package `com.taskgenie.app` + SHA-1) | Google xác minh app là thật |
| **Web** (`EXPO_PUBLIC_GOOGLE_CLIENT_ID`) | Là **audience** của id token trả về — đúng thứ backend kiểm tra |

Backend nhận nhiều audience qua `GoogleAuth:ClientIds` (phân tách bằng dấu phẩy); `GoogleAuth:ClientId`
cũ vẫn dùng được cho web.

SHA-1 của bản debug hiện tại:

```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

Build release ký bằng keystore khác → phải thêm SHA-1 thứ hai vào cùng Android client đó.

## Thanh toán

Checkout chạy trên đúng mô hình billing thật — `plans`, `subscriptions`, `payment_transactions` và
entitlement đều ghi xuống SQL Server. Khi còn dùng `FakePaymentProvider`, app tự settle ngay để gói
kích hoạt trọn vòng.

Nối cổng thanh toán thật **không cần sửa app hay sửa code billing**. Cổng chỉ cần gọi:

```
POST /api/payment-webhook/settle
X-Payment-Signature: <Payments:WebhookSecret>

{ "paymentId": 123, "status": "SUCCEEDED" }
```

Endpoint đó trả 404 cho tới khi cấu hình `Payments:WebhookSecret`, nên một bản triển khai chưa cấu
hình không bao giờ hở ra đường đánh dấu "đã thanh toán".

## Thông báo

**Realtime dùng chung hub với web**: cả hai kết nối `/hubs/notifications` và nghe sự kiện
`notification`. Mọi thông báo đều đi qua `CreateNotificationCommandHandler`, nên bình luận, giao
việc, chờ duyệt, cảnh báo rủi ro và lời mời đều đẩy tức thì sang cả hai phía. Bình luận viết trên
web hiện trên điện thoại ngay, và ngược lại.

Poll 15 giây vẫn giữ làm lớp dự phòng cho trường hợp không mở được socket (mạng chặn websocket).

**Thông báo hệ thống trên điện thoại**: app đẩy notification thật của Android (banner, âm thanh,
ngăn thông báo) khi có tin mới, kể cả lúc đang ở tab khác. Bấm vào sẽ mở đúng task hoặc dự án.

Đây là **local notification**. Đẩy từ server khi app đã tắt hẳn thì cần FCM (`google-services.json`)
— một bước riêng, phải tạo project Firebase trước.

## Công nghệ

Expo ~52 · React Native 0.76 · React 18 · React Navigation · TypeScript · lucide-react-native
