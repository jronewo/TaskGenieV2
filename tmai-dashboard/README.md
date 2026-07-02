# TMAI Dashboard – React

Kanban Board UI được convert từ Figma sang React.

## Cách chạy

```bash
npm install
npm start
```

Mở trình duyệt tại http://localhost:3000

## Cấu trúc

```
src/
├── App.jsx              # Root component
├── App.css              # Toàn bộ styles
├── data.js              # Mock data (nav, stats, columns, tasks)
└── components/
    ├── Sidebar.jsx      # Sidebar trái
    ├── Topbar.jsx       # Thanh điều hướng trên
    ├── StatsBar.jsx     # 5 thẻ thống kê
    ├── KanbanColumn.jsx # Mỗi cột Kanban
    └── TaskCard.jsx     # Mỗi task card
```
