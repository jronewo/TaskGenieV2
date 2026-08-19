# AI Core Demo Runbook

## Setup

```bash
dotnet restore src/TaskGenie.API/TaskGenie.API.csproj
dotnet tool restore
dotnet ef database update --project src/TaskGenie.Infrastructure --startup-project src/TaskGenie.API
dotnet run --project src/TaskGenie.API
```

API: `http://localhost:5258`  
Swagger: `http://localhost:5258/swagger`

Trên macOS chưa có SQL Server, có thể chạy demo tạm thời bằng database InMemory:

```bash
Database__UseInMemory=true dotnet run --project src/TaskGenie.API
```

Chế độ này tự seed dữ liệu và không lưu qua lần restart; production vẫn phải dùng SQL Server và apply migration.

Web:

```bash
cd FE-WEB-V2
npm install
npm run dev
```

Nếu API URL khác, đặt `VITE_API_BASE_URL`, ví dụ `http://localhost:5258/api`.

## Demo data prerequisites

- Một project có team và ít nhất 3 active members.
- Members có skills, availability và evaluation khác nhau.
- Một task thuộc project, có required skills, deadline, estimated time và progress log.
- Ghi lại `projectId`, `taskId`, `leaderId`.

## Demo flow

1. Mở menu **AI Core Demo** và nhập ba ID.
2. Thêm một URL evidence, refresh và chứng minh evidence đã lưu.
3. Bấm **Analyze risk**; trình bày total score, 5 factors, contribution, version và mitigation.
4. Mở Swagger hoặc database để chỉ `risk_score_history`, `risk_factors`, `ai_execution_logs`.
5. Bấm **Recommend Top 3**; so sánh bốn component scores.
6. Accept ứng viên hạng 1; kiểm tra assignment/notification và recommendation status.
7. Cập nhật progress/blocker, chạy risk lần hai và so sánh Risk History.
8. Trình bày RTM, Round 1 defect, Round 2/3 retest và coverage evidence.

## Expected fallback demo

Tắt/misconfigure Hugging Face key trong môi trường test:

- Risk vẫn có score, mode `RULES_ONLY_FALLBACK`.
- Recommendation dùng semantic baseline và trả `SEMANTIC_FALLBACK`.
- `ai_execution_logs` ghi status/error, không hiển thị nội dung AI giả.

## Release gate

- Migration applied và không còn pending migration.
- API + FE build pass.
- Full automated suite pass.
- Không có Critical/High AI-core defect mở.
- Rotate/remove secrets và xử lý advisory trước production deployment.
