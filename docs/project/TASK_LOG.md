# Core Completion Task Log

| Work item | Owner role | Deliverable | Actual result | Evidence | Status |
|---|---|---|---|---|---|
| AI architecture/spec | AI owner | Input/output/formula/fallback/metrics | `risk-v1`, `assignment-v1` documented | `docs/ai-core/AI_SPECIFICATION.md` | Done |
| Database additions | Backend owner | attachments/evidence/risk/log/history | EF entities, mappings and migration | Migration `20260720041112` | Done |
| Risk scoring E2E | AI + Backend | score/factors/history/task level | API returns explainable assessment | Handler/unit tests | Done |
| Recommendation E2E | AI + Backend | Top 3, breakdown, audit, decision | History retained by run_id | Handler/unit tests | Done |
| Evidence API | Backend owner | URL/file metadata validation | GET/POST endpoint | Handler/domain tests | Done |
| Web demo integration | Web owner | Real API demo panel | Risk/evidence/recommend/decision/history UI | Vite production build | Done |
| Automated testing | QA owner | Unit/handler/model/build tests | Multi-round suite + coverage | TRX/Cobertura | Done |
| QA documents | QA owner | Plan, RTM, actual, defect, evidence | Standard documents added | `docs/testing` | Done |
| Live demo verification | Integration lead | Risk/recommend/evidence/accept/history qua Kestrel | 8 HTTP steps pass bằng seeded InMemory mode | Test report | Done |
| Production database update | Backend owner | Apply migration on SQL Server | Requires reachable SQL Server configured | Demo runbook | Pending on deployment machine |
| Expert-labeled AI evaluation | AI + QA | Accuracy/F1/MAE/HitRate@3 | Requires human labels/outcomes | AI specification | Planned |
