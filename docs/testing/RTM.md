# Requirement–Test Traceability Matrix

| Req ID | Requirement | Implementation/API | Automated tests | Evidence |
|---|---|---|---|---|
| AI-R01 | Risk score 5 factors và trọng số | `RiskScoringEngine`; POST `/api/ai-analysis/{id}/risk` | `RiskScoringEngineTests` | Round 2/3 TRX + coverage |
| AI-R02 | Risk thresholds LOW/MEDIUM/HIGH/CRITICAL | `GetRiskLevel` | 8 boundary theory cases | Round 2/3 TRX |
| AI-R03 | Persist score/factors/history | `RiskScoreHistory`, `RiskFactor`, `RiskRepository` | Handler + model tests | Migration + TRX |
| AI-R04 | Provider failure không tạo AI giả | `TextGenerationService`; fallback mode | Provider failure handler test | Round 2/3 TRX |
| AI-R05 | Project risk dùng kết quả mới | `AnalyzeProjectRisksCommandHandler` | Covered through task handler regression/manual demo | Demo evidence |
| AI-A01 | Assignment score 40/25/20/15 | `AssignmentScoringEngine` | Formula and weight tests | Round 2/3 TRX + coverage |
| AI-A02 | Top 3 kèm breakdown/reason | POST `/api/task-assignment/recommend` | Recommendation handler test | Round 2/3 TRX |
| AI-A03 | Accept/Reject và lưu feedback | accept/reject endpoints | `RecommendationDecisionTests` | Round 3 TRX |
| AI-A04 | Task phải thuộc project | Recommendation handler guard | Wrong-project handler test | Round 2/3 TRX |
| DB-01 | Attachment/file metadata | `attachments` | EF model mapping test | Migration |
| DB-02 | URL evidence | `task_evidences`; `/api/tasks/{id}/evidence` | domain, validator, handler tests | Round 2/3 TRX |
| DB-03 | Risk rules/factors/history | 3 tables + seed | EF model and seed tests | Migration + TRX |
| DB-04 | AI logs/recommendations | `ai_execution_logs`, extended `ai_recommendations` | handler audit assertions | Round 2/3 TRX |
| QA-01 | Test Plan/RTM/Actual/Defect/Evidence | `docs/testing` + `artifacts` | N/A | Repository files |
| DEMO-01 | Demo risk/recommendation chạy backend thật | Web `AI Core Demo` panel | Vite production build | Round 3 build log |
