# AI Core Database Schema

Migration: `20260720041112_AddExplainableAiRiskAndEvidence`

| Table | Mục đích | Trường truy vết chính |
|---|---|---|
| `attachments` | Metadata file/evidence đã upload | task_id, storage_url, mime_type, size_bytes, uploaded_by |
| `task_evidences` | Liên kết file hoặc external URL với task/task log | attachment_id/external_url, evidence_type, submitted_by |
| `risk_rules` | Trọng số và version của rule | code, factor_type, weight, version, is_active |
| `risk_factors` | Breakdown của một lần tính risk | raw_value, normalized_score, weight, contribution, evidence |
| `risk_score_history` | Lịch sử score theo từng run | run_id, task_id, total_score, risk_level, rule_version |
| `ai_execution_logs` | Audit provider/model và fallback | run_id, feature, input/output snapshot, status, latency_ms, error |
| `ai_recommendations` | Lịch sử xếp hạng và feedback | run_id, rank, component scores, status, decided_by/at, outcome |

## Quan hệ

```text
tasks 1---* attachments
tasks 1---* task_evidences *---0..1 attachments
tasks 1---* risk_score_history 1---* risk_factors *---0..1 risk_rules
tasks 1---* ai_execution_logs
tasks 1---* ai_recommendations *---1 users
```

## Chính sách dữ liệu

- Không lưu API key, password hoặc authorization header trong input/output snapshot.
- `run_id` là unique trong risk history và AI execution log.
- Xóa task sẽ xóa attachment, evidence và risk history; log provider được giữ với `task_id = NULL` khi cần audit.
- `risk_rules` mặc định gồm 5 rule của `risk-v1` và có thể version hóa thay vì sửa lịch sử cũ.
