# TaskGenie Mobile (React Native / Expo)

Ứng dụng mobile cho hệ thống TaskGenie, xây dựng bằng **React Native + Expo**, kết nối tới backend API trong repo này (`src/TaskGenie.API`).

## Đã làm được

Xây dựng phần **giao diện (UI) chính** của app, gồm 7 màn hình + điều hướng:

| Màn hình | File | Mô tả |
|---|---|---|
| Dashboard | `src/screens/DashboardScreen.tsx` | Trang chủ, tổng quan công việc |
| Kanban Board | `src/screens/KanbanBoardScreen.tsx` | Bảng công việc dạng kéo-thả theo trạng thái |
| Task Detail | `src/screens/TaskDetailScreen.tsx` | Chi tiết một task |
| Analytics | `src/screens/AnalyticsScreen.tsx` | Thống kê, biểu đồ tiến độ |
| Notifications | `src/screens/NotificationsScreen.tsx` | Danh sách thông báo |
| Team | `src/screens/TeamScreen.tsx` | Danh sách/quản lý thành viên nhóm |
| Profile | `src/screens/ProfileScreen.tsx` | Trang cá nhân người dùng |

Ngoài ra:
- **Điều hướng** (`src/navigation/RootNavigator.tsx`): bottom-tab (6 tab chính) lồng trong stack navigator (để mở `TaskDetail` dạng trượt từ phải sang), phía ngoài là auth gate.
- **Đăng nhập** (`src/screens/LoginScreen.tsx`): đăng nhập / đăng ký, lưu JWT bằng `expo-secure-store`.
- **AI Assistant** (`src/components/AIAssistantFAB.tsx` + `AIBottomSheet.tsx`): nút nổi (FAB) mở bottom sheet trợ lý AI.
- **Theme** (`src/theme.ts`): bảng màu dùng chung, giao diện tối (dark mode).

## Tầng API

```
src/api/
  config.ts              # base URL (tự dò IP máy dev từ Expo, override bằng EXPO_PUBLIC_API_URL)
  client.ts              # fetch wrapper: Bearer token, timeout, map lỗi -> ApiError
  types.ts               # TypeScript mirror của DTO backend (camelCase)
  endpoints/             # auth, tasks, projects, teams, users, notifications, comments, ai, scores
src/contexts/
  AuthContext.tsx        # session + JWT, khôi phục từ secure storage khi mở app
  ProjectContext.tsx     # dự án đang chọn (API không có khái niệm "current project")
src/hooks/useApi.ts      # useApiQuery / useApiMutation / useRefetchOnFocus
```

Backend bắt buộc JWT trên mọi route trừ `POST /api/auth/{login,register,google}`, nên toàn bộ app nằm sau
màn hình đăng nhập. Khi API trả 401, client tự xoá session và app quay lại màn hình đăng nhập.

### Trỏ app tới backend

Mặc định app dùng cổng `5258` và tự lấy IP LAN của máy dev từ Expo (`Constants.expoConfig.hostUri`),
riêng Android emulator dùng `10.0.2.2`. Nếu backend chạy ở nơi khác, tạo file `.env` trong `mobile-FE/`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.10:5258
```

## Trạng thái hiện tại

- ✅ UI cho toàn bộ 7 màn hình + điều hướng.
- ✅ Đã nối API thật cho cả 7 màn hình — không còn mock data.
- ⚠️ Backend chưa có endpoint analytics tổng hợp, nên màn hình Analytics/Team tự tính số liệu
  ở client từ `GET /api/tasks?projectId=` + `GET /api/user-scores/project/{id}/leaderboard`.

## Công nghệ sử dụng

- Expo ~52 / React Native 0.76 / React 18
- React Navigation (bottom-tabs + native-stack)
- TypeScript
- expo-secure-store (lưu JWT), expo-constants (dò host dev)
- lucide-react-native (icon), react-native-reanimated, react-native-svg

## Cách chạy thử

Chạy backend trước (cần `Jwt:Secret` ≥ 32 ký tự trong cấu hình API):

```bash
dotnet run --project src/TaskGenie.API   # http://localhost:5258
```

Rồi chạy app:

```bash
cd mobile-FE
npm install
npm start        # mở Expo Dev Tools
npm run android  # hoặc chạy trực tiếp trên Android
npm run ios      # hoặc trên iOS
npm run web      # hoặc trên trình duyệt
```

Tài khoản seed sẵn (chỉ tạo khi DB rỗng): `an@taskgenie.dev` … `duc@taskgenie.dev`, mật khẩu `password123`.
