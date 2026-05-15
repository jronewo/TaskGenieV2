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
- **API** (`src/TaskGenie.API/`): Thin controllers (only `IMediator` injected), `CurrentUserMiddleware`, `ExceptionHandlingMiddleware`, `Program.cs`.

## Key Patterns

**Authentication**: No JWT. User identity is passed via `X-User-Id` HTTP header. `CurrentUserMiddleware` reads it into `HttpContext.Items["CurrentUserId"]`. Controllers use `HttpContext.GetCurrentUserId()` extension.

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
