---
name: taskgenie-continue
description: Continue the TaskGenie V2 production-completion work as a senior software engineer. Use at the START of any session that continues building TaskGenie toward production — picks up the correct next slice from the plan, enforces the project's non-negotiable rules, and verifies before claiming done. Triggers: "tiếp tục hoàn thiện dự án", "continue the project", "làm tiếp slice", "what's next on TaskGenie", or any request to implement a slice/PROD-xxxx item.
---

# TaskGenie V2 — Continue Production Work

You are the senior engineer on this codebase. Your job each session: advance **one scoped slice**,
verify it for real, and leave the tracking docs accurate.

## Step 1 — Orient before touching code (mandatory)

Read, in this order:

1. `docs/production/EXECUTION_PLAN_SLICE_0_TO_11.md` — the approved execution plan (Slice 0→11).
2. `docs/production/IMPLEMENTATION_PROGRESS_CHECKLIST.md` — what is actually done; the
   "Đang làm ngay bây giờ" section names the next task.
3. `CLAUDE.md` — architecture, build commands, Production Completion Protocol.

Then **verify reality, don't trust status docs**:

```bash
dotnet test tests/TaskGenie.Tests --artifacts-path /tmp/taskgenie-claude-tests
```

> ⚠️ `docs/production/WEB_PRODUCTION_COMPLETION_AND_UAT_PLAN.md` contains a "Đã hoàn thành" section
> that is **factually wrong** (claims subscription/payment/organization-member/admin backends exist —
> they do not). Use it for *requirements and UAT cases*, never as a progress report. Before believing
> any "already built" claim, grep for the entity/endpoint. This has already caused one wasted cycle.

## Step 2 — Announce the plan before executing

The user has explicitly asked for this (memory: `feedback-plan-visibility`). Open every session with:

- what's already done,
- what you're doing **now**,
- what's queued next.

Keep narrating at each phase transition — not one silent block of tool calls followed by a final
report. Use TodoWrite *in addition to*, not instead of, prose updates.

## Step 3 — Non-negotiable rules

From `WEB_PRODUCTION_COMPLETION_AND_UAT_PLAN.md` §2 and `CLAUDE.md`:

1. **Desktop web only.** Never modify `mobile-FE/`.
2. **No runtime seed/demo data.** `DataSeeder` must not run at startup.
3. **No direct SQL inserts** to make a test or UAT case pass. Business data goes through the real API.
4. **Payment gateway is simulated, the database is not** — `subscriptions`/`payment_transactions`
   must persist real rows.
5. **Backend before frontend.** A missing endpoint gets its API + authorization + validation +
   automated test *before* any UI is wired to it.
6. **Every button** maps to a real API/action or is removed. No placeholder, no mock success, no
   `console.log` standing in for behaviour.
7. **Actor identity always comes from JWT** (`ICurrentUser`) — never from request body
   (`CreatedBy`, `UserId`, `EvaluatorId`, `OrganizedBy`, `SubmittedBy`) and never from `X-User-Id`.
8. **UI role guards are not authorization.** Every resource read/mutation enforces permission +
   ownership + tenant membership server-side.
9. **Never** `git reset --hard`, `git checkout --`, `git clean`, or bulk-delete/reformat unrelated
   files. The repo has substantial uncommitted user work.
10. **No commit/push/merge/PR** unless explicitly asked.
11. Never edit tracked `bin/`, `obj/`, `dist/`, `node_modules/`.
12. Never print or commit secrets (SA password, JWT secret, Google/Cloudinary/HuggingFace keys).

## Step 4 — Work one slice at a time

Do not start Slice N+1 while Slice N is red. Within a slice, prefer this order:
domain → repository/EF mapping + migration → application handler + validator → controller →
tests → frontend wiring.

**Reuse what exists — do not rebuild:**

| Need | Use this, it already exists |
|---|---|
| Actor identity | `ICurrentUser` (`src/TaskGenie.Application/Interfaces/ICurrentUser.cs`) |
| Ownership/tenant checks | `IResourceAuthorizationService` (`.../Interfaces/IResourceAuthorizationService.cs`) |
| Admin gating | `[Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]` (`src/TaskGenie.API/Authorization/`) |
| Error → HTTP mapping | `ExceptionHandlingMiddleware` — throw `NotFoundException` / `ForbiddenException` / `ValidationException`, don't hand-roll status codes |
| Opaque token generation/hashing | `OpaqueTokenGenerator` (`.../Common/Security/`) |
| Atomic project+team creation | `IProjectLifecycleService` |
| Frontend HTTP + Bearer token | `FE-WEB-V2/src/app/services/apiClient.ts` (`apiRequest`) — do **not** write a second client |
| Frontend session | `FE-WEB-V2/src/app/auth/AuthContext.tsx` |

**Domain conventions:** entities use `internal set` + `protected Ctor()` + static `Create(...)`.
`Task` collides with `System.Threading.Tasks.Task` — alias with
`using TaskEntity = TaskGenie.Domain.Entities.Task;`. Task status: `"Todo"`/`"InProgress"`/`"Done"`.
Risk: `"LOW"`/`"MEDIUM"`/`"HIGH"`.

## Step 5 — Verify before claiming done

Build artifacts go to `/tmp` so tracked `bin/obj` stay clean:

```bash
dotnet build src/TaskGenie.Domain/TaskGenie.Domain.csproj --artifacts-path /tmp/taskgenie-claude-build
dotnet build src/TaskGenie.Application/TaskGenie.Application.csproj --artifacts-path /tmp/taskgenie-claude-build
dotnet build src/TaskGenie.Infrastructure/TaskGenie.Infrastructure.csproj --artifacts-path /tmp/taskgenie-claude-build
dotnet build src/TaskGenie.API/TaskGenie.API.csproj --artifacts-path /tmp/taskgenie-claude-build
dotnet test tests/TaskGenie.Tests --artifacts-path /tmp/taskgenie-claude-tests
```

Frontend (no `node`/`pnpm` on PATH — use the vendored runtime):

```bash
cd FE-WEB-V2 && /Users/jronehuynh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build
```

EF migrations (generate only; **never apply** before the Slice 9 review gate):

```bash
dotnet ef migrations add <Name> --project src/TaskGenie.Infrastructure --startup-project src/TaskGenie.API
```

## Step 6 — Update tracking, then report honestly

Tick the item in `docs/production/IMPLEMENTATION_PROGRESS_CHECKLIST.md` **with evidence**
(test counts), and rewrite its "Đang làm ngay bây giờ" line to name the next task.

Only tick `[x]` for something you built *and verified*. Use `[~]` for partial, `⚠️` for
"audited, found a problem". A checklist that overstates progress is how the previous planning
document became untrustworthy — do not repeat that.

Final report must state: files changed + why, API/DB contract changes, exact tests run with
pass/fail counts, remaining risks, migrations not yet applied, and
`git diff --stat` limited to source/test files.

If tests fail, say so and show the output. Never describe unverified work as complete.
