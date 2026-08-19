# TaskGenie AI Core Specification

Version: `risk-v1` / `assignment-v1`  
Status: Implemented  
Last updated: 2026-07-20

## 1. Vị trí AI trong kiến trúc

```text
API Controllers
    -> MediatR Commands/Queries (Application)
        -> Explainable scoring engines (Application)
        -> External AI interfaces (Application)
            -> Hugging Face providers (Infrastructure)
        -> Repositories (Domain interfaces)
            -> SQL Server / EF Core (Infrastructure)
```

- `RiskScoringEngine` quyết định risk score bằng rule có thể kiểm chứng.
- Text-generation model chỉ diễn giải kết quả; model không được thay đổi score hoặc level.
- `AssignmentScoringEngine` kết hợp skill, semantic similarity, workload và performance.
- Mỗi lần chạy tạo một `run_id`, lưu input/output snapshot, model/rule version, latency, trạng thái và lỗi provider.
- Khi provider lỗi, API trả kết quả deterministic với trạng thái `FALLBACK`; không tạo phản hồi AI giả.

## 2. Task risk analysis

### Input

| Nhóm | Dữ liệu |
|---|---|
| Task | status, progress, created_at, deadline, estimated/actual hours |
| Dependency | tổng dependency, số dependency chưa Done |
| Task log | lần cập nhật gần nhất, blocker/risk do thành viên báo cáo |
| Workload | số active task trung bình, available hours của assignee |
| History | deadline score trung bình từ evaluation |

### Công thức

```text
Risk Score =
  Deadline   × 30%
+ Progress   × 25%
+ Dependency × 20%
+ Workload   × 15%
+ Historical × 10%
```

Mỗi factor được chuẩn hóa về `0..100`. Trọng số lấy từ `risk_rules`; engine tự chuẩn hóa lại nếu tổng trọng số cấu hình khác 1.

| Score | Level |
|---:|---|
| 0–29.99 | LOW |
| 30–59.99 | MEDIUM |
| 60–79.99 | HIGH |
| 80–100 | CRITICAL |

### Output

- `runId`, `taskId`, `projectId`.
- `totalScore`, `riskLevel`, `ruleVersion`, `calculationMode`.
- Breakdown gồm raw value, normalized score, weight, contribution và evidence cho từng factor.
- Explanation và mitigation actions.
- Timestamp và risk history.

## 3. Personnel recommendation

### Input

- Task title, description, priority, difficulty và estimated hours.
- Required skills/levels.
- Các thành viên active thuộc project team.
- User skills/levels, active workload, availability và evaluations.
- Semantic similarity giữa mô tả task và profile ứng viên.

### Công thức

```text
Candidate Score =
  Skill Match         × 40%
+ Semantic Similarity × 25%
+ Workload            × 20%
+ Performance         × 15%
```

Engine trả Top 3 ứng viên. Mỗi recommendation lưu rank, bốn component scores, total score, reason, version và trạng thái `GENERATED/ACCEPTED/REJECTED`. Accept chỉ hợp lệ với ứng viên thuộc run mới nhất.

## 4. Đánh giá AI

### Risk model

- Dataset đánh giá phải có task snapshot và risk label do leader/giảng viên xác nhận.
- Classification: Accuracy, Macro-F1 và confusion matrix theo 4 level.
- Numeric score: MAE giữa predicted risk score và expert score.
- Theo dõi tỷ lệ fallback và latency từ `ai_execution_logs`.

### Recommendation model

- Top-1 Accuracy: ứng viên đúng có đứng hạng 1 hay không.
- HitRate/Recall@3: ứng viên đúng có trong Top 3 hay không.
- NDCG@3: chất lượng thứ tự xếp hạng.
- Acceptance Rate: số recommendation được leader accept trên số recommendation đã quyết định.
- Outcome Rate: tỷ lệ assignment được accept và hoàn thành đúng hạn.

Không công bố accuracy nếu chưa có ground-truth dataset đủ lớn. Feedback Accept/Reject và outcome được lưu để xây dataset đánh giá tiếp theo.

## 5. Failure modes

| Tình huống | Hành vi |
|---|---|
| Text generation lỗi | Risk score vẫn trả về; mode `RULES_ONLY_FALLBACK` |
| Semantic provider lỗi | Dùng semantic baseline 0.5; provider status `SEMANTIC_FALLBACK` |
| Không có ứng viên | Trả danh sách rỗng và log `NO_CANDIDATES` |
| Task sai project | HTTP 400, không chạy scoring |
| Task không tồn tại | HTTP 404 |
| Input không hợp lệ | HTTP 400 qua FluentValidation |
