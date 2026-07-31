# Test Plan – Explainable AI Core

Test plan ID: `TP-AI-CORE-01`  
Version: 1.0  
Environment: .NET 10.0.302, xUnit, Moq, EF Core InMemory, Vite 6.3.5

## Scope

- Risk scoring formula, boundaries, missing data, blocker, workload, history và fallback.
- Recommendation formula, ranking, semantic fallback, project isolation và decision flow.
- Evidence URL/file validation.
- EF model/migration mapping cho các bảng mới.
- API contract được kiểm tra bằng build và Swagger controller signatures.
- Web AI Core Demo được kiểm tra bằng production build.

Ngoài scope của đợt này: toàn bộ legacy controller/use case không liên quan AI core, mobile và visual regression của các màn hình mock.

## Entry criteria

- Migration tạo được.
- API/Application/Domain/Infrastructure compile.
- Test data không phụ thuộc Hugging Face thật.

## Exit criteria

- 100% automated test của suite AI core pass.
- Risk and assignment scoring engines đạt line coverage tối thiểu 80%.
- Không còn defect Critical/High mở trong phạm vi AI core.
- API và FE production build thành công.
- TRX và Cobertura evidence được lưu trong `artifacts/test-results`.

## Test levels

| Level | Nội dung |
|---|---|
| Unit | Công thức, threshold, normalization, domain invariants, validators |
| Handler | Fallback, persistence calls, ranking, project isolation, Accept/Reject |
| Persistence model | Table mappings, seeded rules |
| Build smoke | 4 backend projects, tests và Vite production bundle |
| Manual demo | Risk → evidence → Top 3 → Accept → history |

## Test rounds

- Round 1: functional + initial regression; ghi nhận actual result và defect.
- Round 2: retest defect, boundary/negative/fallback và coverage.
- Round 3: full regression, Release build, migration pending check và FE build.

## Test data strategy

- Ngày kiểm thử được cố định trong unit test để tránh flaky deadline tests.
- External AI được mock cho cả success và failure.
- Không dùng production credentials hoặc production database.
- EF InMemory chỉ dùng kiểm tra model/seed; migration SQL Server được tạo từ provider thật.

## Coverage interpretation

Coverage gate 80% áp dụng cho hai scoring engines là phần code mới quyết định kết quả AI. Global repository coverage được báo cáo riêng vì codebase legacy có hơn 100 handlers chưa có test trước đợt này; không dùng global percentage để che giấu khoảng trống legacy.
