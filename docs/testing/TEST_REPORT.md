# Test Execution Report – AI Core

Executed: 2026-07-20  
Configuration: Round 1/2 Debug, Round 3 Release  
Test framework: xUnit + Moq + EF Core InMemory + Coverlet

## Summary

| Round | Scope | Passed | Failed | Result |
|---|---|---:|---:|---|
| Round 1 | Initial functional/core regression | 45 | 1 | Fail; test-oracle defect logged |
| Round 2 | Retest + negative/boundary/fallback | 46 | 0 | Pass |
| Round 3 | Full Release regression + validators/decision/persistence/HTTP | 58 | 0 | Pass after harness retest |

Round 1 failure: `Calculate_UsesDocumentedWeights` expected 0.77; actual/formula correct là 0.78. Sửa test oracle và retest thành công trong Round 2/3 (`DEF-QA-001`).

Khi mở rộng Round 3 sang HTTP pipeline, lần chạy đầu có 55 pass/3 fail do test factory còn đồng thời cấu hình SQL Server và InMemory. `DEF-QA-003` được sửa trong test harness; full retest sau đó đạt 58/58. Cả failed TRX và retest TRX đều được giữ làm evidence.

## Coverage – Round 3

| Scope | Line coverage | Branch coverage | Gate |
|---|---:|---:|---|
| `AssignmentScoringEngine` | 100% | 100% | Pass >=80% |
| `RiskScoringEngine` | 95.96% | 86.58% | Pass >=80% |
| Application assembly (bao gồm legacy) | 22.30% | 21.21% | Baseline/backlog |
| Whole repository instrumented code | 11.40% | 15.45% | Baseline/backlog |

Core AI đạt coverage gate. Global coverage thấp được ghi nhận trung thực vì hơn 100 legacy handlers trước đó không có test; xem `DEF-QA-002` và `RISK_LOG.md`.

## Build and migration verification

- Domain Release build: pass, 0 errors.
- Application Release build: pass, 0 errors.
- Infrastructure Release build: pass, 0 errors; còn một nullable warning legacy tại `OrganizationRepository.cs`.
- API Release build: pass, 0 errors; còn advisory `NU1903` cho `Microsoft.OpenApi 2.4.1`.
- EF Core: `No changes have been made to the model since the last migration.`
- Vite production build: pass; cảnh báo bundle chính lớn hơn 500 kB.

## Live demo smoke – real Kestrel HTTP server

API được chạy bằng Development seed + InMemory demo database trên `localhost:5258`, không qua TestServer.

| Step | Result |
|---|---|
| POST task 6 risk | HTTP 200; score 43.1, MEDIUM, 5 factors, run `10284d96-f7f3-483d-9b62-ea38b5ad9fb7` |
| POST task 6 recommendation | HTTP 200; Top 3, run `5ef1fc84-ee54-493b-8444-4827285c2d49` |
| POST URL evidence | HTTP 201; evidence ID 1 |
| POST accept rank 1 | HTTP 200; user 4 assigned |
| GET risk history | HTTP 200; assessment persisted |
| GET execution logs | HTTP 200; risk + recommendation fallback logs persisted |
| GET recommendation history | HTTP 200; rank 1 ACCEPTED, rank 2/3 REJECTED |
| GET evidence | HTTP 200; created URL evidence returned |

Hugging Face key trống cố ý trong smoke test nên cả hai AI provider trả 401. Hệ thống vẫn hoàn thành các luồng bằng fallback đã thiết kế và audit đúng error/status; đây là expected result, không phải phản hồi AI giả.

## Evidence

- Round 1: `artifacts/test-results/round1/round1.trx` và Cobertura cùng thư mục run.
- Round 2: `artifacts/test-results/round2/round2.trx` và Cobertura cùng thư mục run.
- Round 3 final HTTP retest: `artifacts/test-results/round3-http-retest/round3-http-retest.trx` và Cobertura cùng thư mục run.
- Source-level test cases: `tests/TaskGenie.Tests`.
- Requirement traceability: `docs/testing/RTM.md`.
- Defect and retest status: `docs/testing/DEFECT_LOG.md`.

## Exit decision

AI core đủ điều kiện demo: full core suite pass, scoring engines vượt coverage gate, migration consistent và backend/web đều build được. Chưa đủ điều kiện production release cho đến khi rotate secrets, xử lý OpenAPI advisory và mở rộng regression cho legacy auth/project/task use cases.
