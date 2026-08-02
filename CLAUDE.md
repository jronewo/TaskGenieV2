# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
# Run API (from repo root or src/TaskGenie.API/)
dotnet run --project src/TaskGenie.API

# Build individual projects (solution file has a known incremental-check quirk — build per-project instead)
dotnet build src/TaskGenie.Domain/TaskGenie.Domain.csproj
dotnet build src/TaskGenie.Application/TaskGenie.Application.csproj
dotnet build src/TaskGenie.Infrastructure/TaskGenie.Infrastructure.csproj
dotnet build src/TaskGenie.API/TaskGenie.API.csproj

# EF Core migrations (run from repo root)
dotnet ef migrations add <Name> --project src/TaskGenie.Infrastructure --startup-project src/TaskGenie.API
dotnet ef database update --project src/TaskGenie.Infrastructure --startup-project src/TaskGenie.API
```

API runs on `http://localhost:5258` (see `src/TaskGenie.API/Properties/launchSettings.json`). Swagger always enabled at `/swagger`.

## Architecture

Clean Architecture monolith — 4 projects under `src/`:

```
TaskGenie.API  →  TaskGenie.Application  →  TaskGenie.Domain
                        ↑
             TaskGenie.Infrastructure
```

- **Domain** (`src/TaskGenie.Domain/`): Pure C# entities, repository interfaces, domain events. No NuGet dependencies. Entities use `internal set` + `protected Entity() {}` for EF hydration, and static `Create(...)` factory methods.
- **Application** (`src/TaskGenie.Application/`): MediatR Commands/Queries/Handlers, FluentValidation validators, pipeline behaviors (`ValidationBehavior`, `LoggingBehavior`), application-layer interfaces (`IPasswordHasher`, `IHuggingFaceService`, `IClassificationService`, `ITextGenerationService`, `ICloudinaryService`, `IGoogleAuthService`), domain event records (`INotification`).
- **Infrastructure** (`src/TaskGenie.Infrastructure/`): EF Core 10 + SQL Server, 19 repository implementations, external services (HuggingFace, Cloudinary, Google OAuth, BCrypt). `DependencyInjection.cs` has the `AddInfrastructure()` extension.
- **API** (`src/TaskGenie.API/`): Thin controllers (primarily `IMediator`), JWT authentication/authorization, `ExceptionHandlingMiddleware`, `Program.cs`.

## Key Patterns

**Authentication baseline (important)**: JWT Bearer authentication already exists. `AuthenticationExtensions.AddJwtAuthentication()` validates issuer, audience, signature and lifetime, then applies a fallback policy requiring authentication. `HttpContext.GetCurrentUserId()` reads `ClaimTypes.NameIdentifier`. Do **not** reintroduce or trust `X-User-Id`. Current gaps are persistent refresh tokens, `/auth/me`, forgot/reset password, role policies, tenant/resource authorization and removal of client-supplied actor IDs.

**CQRS**: Every use case is a `IRequest<T>` (Command or Query) + `IRequestHandler`. Handlers live in `src/TaskGenie.Application/Features/<Domain>/Commands/` or `Queries/`.

**Domain Events**: `TaskCreatedEvent`, `TaskUpdatedEvent`, `TaskCompletedEvent`, `TaskAssignedEvent` are `INotification` records in `src/TaskGenie.Application/Events/`. Handlers (`INotificationHandler<T>`) write activity logs and notifications — no direct service-to-service calls.

**Exception Handling**: `ExceptionHandlingMiddleware` maps `ValidationException` → 400, `NotFoundException` → 404, `InvalidOperationException` → 400, everything else → 500 (with full stack trace in Development).

**AI Pipeline** (in `Infrastructure/ExternalServices/`):
- `HuggingFaceService` — embeddings via `sentence-transformers/all-MiniLM-L6-v2`
- `ClassificationService` — zero-shot via `facebook/bart-large-mnli` (pure HTTP, no DB access)
- `TextGenerationService` — text generation via `HuggingFaceH4/zephyr-7b-beta` (pure HTTP, no DB access)
- AI handlers fetch data from repositories, then call these services

**Task assignment scoring**: SkillMatch 40% + SemanticSimilarity 25% + Workload 20% + Performance 15% (in `AcceptAssignmentRecommendationCommandHandler`).

## Configuration

`src/TaskGenie.API/appsettings.json` requires:
- `ConnectionStrings:DefaultConnection` — SQL Server (defaults to LocalDB `ai_task_management`)
- `HuggingFace:ApiKey` — required for AI features
- `Cloudinary:CloudName/ApiKey/ApiSecret` — for image uploads
- `GoogleAuth:ClientId` — for Google OAuth

## Domain Notes

- `Task` conflicts with `System.Threading.Tasks.Task` — use `using TaskEntity = TaskGenie.Domain.Entities.Task;` alias in handler files.
- Task status values: `"Todo"`, `"InProgress"`, `"Done"`.
- Task risk levels: `"LOW"`, `"MEDIUM"`, `"HIGH"`.
- `TaskDependency` enforces: a task cannot be `Done` if any dependency is not `Done`.
- `CreateProjectCommand` automatically creates a 1:1 `Team` for the project and adds the creator as `LEADER`.
- `UpdateInvitationStatusCommand` (Accept) checks for duplicate team membership before inserting.

## Goal & Autonomous Operation

**Goal:** drive TaskGenie V2 to the production readiness gate — every checkbox in
`docs/production/IMPLEMENTATION_PROGRESS_CHECKLIST.md` ticked with real evidence, following
`docs/production/EXECUTION_PLAN_SLICE_0_TO_11.md` in order (Slice 0 → 11).

**Definition of done:** 0 P0/P1 defects open · full backend suite green · FE production build green ·
all migrations applied cleanly to the UAT database · 100% of P0 UAT cases passing · no runtime seed
data · no `mobile-FE` files changed · no secrets in git, logs, or the frontend bundle.

### Autonomous loop

When running unattended, repeat without asking for permission between steps:

1. Read `IMPLEMENTATION_PROGRESS_CHECKLIST.md` → take the **next unticked item in slice order**.
   Never skip ahead; never start Slice N+1 while Slice N is red.
2. Implement it (backend → tests → frontend, per the plan).
3. Verify: build the 4 projects + `dotnet test` (+ Vite build if frontend changed).
4. Tick the checklist with evidence (real test counts) and update "Đang làm ngay bây giờ".
5. Report in 3–6 lines: what changed, test counts, what's next. Then continue to the next item.

State the plan up front and narrate transitions — do not run silently for long stretches.

### Decide alone (do not ask)

File/class naming and layout · test structure and helper design · refactoring within the current
slice · which existing service or interface to reuse · error messages and validation rules that
follow documented business rules · **generating** EF migrations · adding a test-only dev dependency
(Vitest, Playwright, Testcontainers, Respawn) · fixing any security defect found during an audit.

### Stop and ask

- A business rule is ambiguous or would change from what the plan documents (quota numbers, role
  matrix, premium/entitlement semantics, refund/cancel policy).
- **Applying** a migration to any real database, or any destructive DB action (`database drop`,
  `TRUNCATE`, `docker rm`, deleting a volume).
- Any destructive git action (`reset --hard`, `checkout --`, `clean`) — the repo carries substantial
  uncommitted user work.
- Committing, pushing, merging, rebasing, or opening a PR.
- A required secret or credential is missing (SQL password, Google client ID, HuggingFace key).
- Adding a runtime dependency, a paid service, or an external integration.
- The same verification fails 3 times in a row — report the failure with output instead of retrying
  blindly or working around it.

Never fabricate progress to keep the loop moving. A red test reported honestly is worth more than a
green checkbox that isn't true — that is exactly how
`WEB_PRODUCTION_COMPLETION_AND_UAT_PLAN.md` became unreliable.

## Project Skills

Invoke these before working — they carry the current plan, conventions and gates:

| Skill | Use for |
|---|---|
| `taskgenie-continue` | **Start here every session.** Picks up the correct next slice, enforces the non-negotiable rules, verification commands. |
| `taskgenie-authz-audit` | Auditing/fixing a controller's authorization + actor-from-JWT (Slice 0 / PROD-0202). |
| `taskgenie-qa` | Writing tests, setting up Vitest/Playwright/Testcontainers, running UAT with SQL evidence. |

Execution plan: `docs/production/EXECUTION_PLAN_SLICE_0_TO_11.md`
Live progress: `docs/production/IMPLEMENTATION_PROGRESS_CHECKLIST.md`

> ⚠️ `docs/production/WEB_PRODUCTION_COMPLETION_AND_UAT_PLAN.md` is authoritative for **requirements
> and UAT cases**, but its "Đã hoàn thành" section is factually wrong (claims subscription/payment/
> organization-member/admin backends exist — they do not). Verify against code, never trust it as a
> progress report.

## Production Completion Protocol

This repository is the canonical implementation workspace:

```text
/Users/jronehuynh/Downloads/TaskGenieV2-main
branch: Develope
```

Do not edit or copy implementation from `/Users/jronehuynh/TaskGenieV2`; that is an older `main` checkout with a different baseline.

Before changing code, read these files:

1. `docs/testing/PRODUCTION_COMPLETION_IMPLEMENTATION_PLAN.md`
2. `docs/testing/TASKGENIE_UAT_EXECUTION_AND_CODE_COMPLETION.md`
3. `docs/testing/UAT_TEST_CASES.md`
4. `docs/testing/UAT_UI_API_AUDIT.md`
5. `HANDOFF_PRODUCTION_START.md`

### Working rules

- Work on exactly one scoped phase/task at a time. The initial task is the Auth/Security foundation described below.
- Preserve every pre-existing user change. Never run `git reset --hard`, `git checkout --`, `git clean`, bulk deletion or formatting across unrelated files.
- Do not create commits, push, merge, rebase or open a PR unless the user/Codex explicitly requests it.
- Never edit tracked `bin/`, `obj/`, `dist/`, `node_modules/`, test reports or generated evidence.
- Do not expose or commit the Docker SA password, JWT secret, Google secret, Cloudinary secret or AI provider key.
- Actor identity always comes from validated JWT/current-user services. Never trust `CreatedBy`, `OrganizedBy`, `EvaluatorId`, comment `UserId` or `X-User-Id` from the client.
- UI role guards are not authorization. Every resource mutation/read must enforce permission, ownership and organization membership on the backend.
- Do not report an endpoint or button as complete until its mutation persists after reload and negative authorization tests pass.
- Fake payment is allowed only through `FakePaymentProvider` in Development/UAT. It must write the real payment/subscription/entitlement database model, be idempotent and be impossible to resolve in Production.
- Free personal users may own at most two active projects. Creating project three must be rejected atomically with `PLAN_UPGRADE_REQUIRED`.
- Premium is an entitlement, not `User.Role`. Organization Premium comes from an active organization subscription plus active membership.
- Stop and report if a required business decision would materially change the documented rules.

### Initial implementation scope: Security Foundation

Implement only this scope before moving to Project/Organization/Payment UI:

1. Add `ICurrentUser` (or equivalent) backed by JWT claims and remove client-supplied actor identity from commands/requests, starting with Project create and all confirmed actor-ID DTOs.
2. Add explicit Platform Admin policy and resource authorization foundations for Project/Task/Team/Organization/AI.
3. Ensure NORMAL_USER cannot call Admin or access/mutate cross-project/cross-user resources.
4. Add persistent rotating refresh-token domain/repository/service plus `/api/auth/refresh` and `/api/auth/me`.
5. Add focused integration tests for 401/403/404, token rotation/reuse/logout and the negative authorization cases.
6. Do not proceed to payment or broad frontend CRUD until this security gate builds and tests pass.

### Verification commands

Avoid polluting tracked `bin/obj` by sending build artifacts to `/tmp`:

```bash
dotnet build src/TaskGenie.Domain/TaskGenie.Domain.csproj --artifacts-path /tmp/taskgenie-claude-build
dotnet build src/TaskGenie.Application/TaskGenie.Application.csproj --artifacts-path /tmp/taskgenie-claude-build
dotnet build src/TaskGenie.Infrastructure/TaskGenie.Infrastructure.csproj --artifacts-path /tmp/taskgenie-claude-build
dotnet build src/TaskGenie.API/TaskGenie.API.csproj --artifacts-path /tmp/taskgenie-claude-build
dotnet test tests/TaskGenie.Tests --artifacts-path /tmp/taskgenie-claude-tests
```

SQL Server UAT is available in Docker at `127.0.0.1:1433`, database `ai_task_management_uat`. Obtain its password from the existing container environment without printing it, and pass the connection string via environment variables.

At the end of each task, report:

- Files changed and the reason for each.
- API/database contract changes.
- Exact tests run and pass/fail counts.
- Remaining risks, blocked decisions and migrations not yet applied.
- `git diff --stat` restricted to source/test files.
