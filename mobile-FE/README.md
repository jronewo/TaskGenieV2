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
- **Điều hướng** (`src/navigation/RootNavigator.tsx`): bottom-tab (6 tab chính) lồng trong stack navigator (để mở `TaskDetail` dạng trượt từ phải sang).
- **AI Assistant** (`src/components/AIAssistantFAB.tsx` + `AIBottomSheet.tsx`): nút nổi (FAB) mở bottom sheet trợ lý AI.
- **Theme** (`src/theme.ts`): bảng màu dùng chung, giao diện tối (dark mode).

## Trạng thái hiện tại

- ✅ Đã dựng xong UI cho toàn bộ 7 màn hình + điều hướng, chạy được trên Expo (Android/iOS/Web).
- ⏳ **Chưa nối API** — các màn hình đang dùng dữ liệu mẫu (mock/static), chưa gọi tới backend `TaskGenie.API`. Bước tiếp theo là tích hợp gọi API thật (đọc task, project, thông báo... từ backend).

## Công nghệ sử dụng

- Expo ~52 / React Native 0.76 / React 18
- React Navigation (bottom-tabs + native-stack)
- TypeScript
- lucide-react-native (icon), react-native-reanimated, react-native-svg

## Cách chạy thử

```bash
cd mobile-FE
npm install
npm start        # mở Expo Dev Tools
npm run android  # hoặc chạy trực tiếp trên Android
npm run ios      # hoặc trên iOS
npm run web      # hoặc trên trình duyệt
```
