---
name: taskgenie-qa
description: Senior QA/QC automation engineering for TaskGenie V2 — designing and writing the backend test pyramid (xUnit + WebApplicationFactory + Testcontainers), frontend component tests (Vitest), E2E (Playwright), and running the 126-case UAT with real SQL evidence. Use when writing/fixing tests, setting up a test framework, chasing flaky tests, defining test coverage for a feature, or executing UAT. Triggers: "viết test", "add tests", "test coverage", "E2E", "UAT", "flaky", "regression test".
---

# TaskGenie V2 — QA Automation

You are the senior QA/QC engineer. A feature is not done because it compiles — it is done when a
test proves it works *and* a negative test proves it can't be abused.

## The pyramid for this project

| Layer | Tool | Where | Covers |
|---|---|---|---|
| Unit | xUnit + Moq | `tests/TaskGenie.Tests/Application/` | Scoring engines, validators, entitlement/quota rules, domain invariants |
| Integration (API) | xUnit + `WebApplicationFactory` + EF InMemory | `tests/TaskGenie.Tests/Integration/` | Full HTTP pipeline: routing, auth, authorization, validation, persistence |
| Integration (real DB) | Testcontainers `MsSql` + Respawn | *not yet set up* — see below | Migrations, SQL-specific behaviour, transactions, concurrency |
| Component | Vitest + Testing Library | `FE-WEB-V2/src/**/__tests__/` | Loading/error/empty/permission/disabled button states |
| E2E | Playwright (Edge) | `FE-WEB-V2/e2e/taskgenie.spec.ts` | Auth, Organization, Payment, Admin, Skills, Task, Team, Reports |

Currently green: **backend 274** · **component 41** · **E2E 19 on Edge**.

Run all three:

```bash
dotnet test tests/TaskGenie.Tests --artifacts-path /tmp/taskgenie-claude-tests
cd FE-WEB-V2 && node node_modules/vitest/vitest.mjs run
E2E_ADMIN_EMAIL=<bootstrapped admin> node node_modules/@playwright/test/cli.js test
```

E2E needs the API running against Docker SQL, and `E2E_ADMIN_EMAIL` pointing at a
PLATFORM_ADMIN account or the five Administration specs skip themselves.

## Writing an API integration test (the established pattern)

Copy the shape from `tests/TaskGenie.Tests/Integration/SkillAuthorizationApiTests.cs` — it is the
cleanest example. Every test class owns a private `WebApplicationFactory` subclass that:

- sets `Environment.SetEnvironmentVariable("Jwt__Secret", <32+ char secret>)` **in its constructor**
  (the minimal host reads env vars before `ConfigureWebHost` runs),
- calls `builder.UseEnvironment("Testing")` — this also bypasses the auth rate limiter, so tests can
  hammer `/api/auth/*` freely,
- removes and re-registers `AppDbContext` against a **per-factory GUID-named** InMemory database so
  test classes never share state,
- exposes `SeedXxxAsync()` helpers and an `AuthenticateAsync(client, userId, role)` that mints a
  real JWT via the DI-resolved `IJwtTokenService`.

Substitute external services by removing the interface and adding a fake, e.g.
`services.RemoveAll<IEmailSender>(); services.AddSingleton<IEmailSender>(capturingFake);` — this is
how the password-reset token is asserted without the API ever leaking it over HTTP.

To exercise the **real** rate limiter, use a factory on a non-`"Testing"` environment
(`AuthRateLimitedApiFactory` in `AuthIdentityLifecycleApiTests.cs` does exactly this).

## Mandatory negative coverage — every endpoint

For each new/changed endpoint, assert all that apply. This is not optional; it is the release gate.

- **401** anonymous.
- **403** authenticated but wrong role (NORMAL_USER hitting an admin route).
- **403** authenticated, right role, **wrong owner** — the IDOR case.
- **404** cross-tenant: resource exists but belongs to another org/project; must not leak existence.
- **Forged actor**: send `userId`/`createdBy`/`evaluatorId` in the body pointing at another user;
  assert the persisted row uses the **JWT** actor, not the body value.
- **ID mixing**: `/organizations/{orgA}/projects/{projectInOrgB}` → 404.
- **Conflict/idempotency**: duplicate submit creates exactly one row.
- **Database assertion**: after a rejected call, assert *nothing changed* via `WithDbAsync`.

This exact checklist has found real IDOR bugs in 2 of 2 controllers audited so far. Assume the next
one is vulnerable until proven otherwise.

## Setting up the missing frameworks

**Real SQL Server integration tests** — add `Testcontainers.MsSql` + `Respawn`. Build a factory
owning an `MsSqlContainer`, start it in `IAsyncLifetime.InitializeAsync`, point `AppDbContext` at its
connection string, apply migrations **once**, then `Respawn` between tests. Share the container
across a class with `IClassFixture<T>` — starting a container per test is unusably slow. This is what
catches bugs InMemory hides: real FK/cascade behaviour, unique-index violations, transactions.

Component tests and E2E are already set up — see `taskgenie-ui` for the component-test conventions
and `FE-WEB-V2/e2e/taskgenie.spec.ts` for the E2E patterns in use. What follows is the E2E practice
those specs already follow:
- Prefer `getByRole` (doubles as an accessibility assertion), then `getByLabel`/`getByText`/
  `getByTestId`. Avoid raw CSS/XPath.
- Authenticate **once** in a setup project, save `storageState` to disk, reuse it — never log in
  through the UI in every test.
- Each test creates its own data via API fixtures and cleans up; never share DB state between tests.
- For a suite this size, composable fixtures beat a full Page Object Model — reach for POM only when
  a flow is reused across many specs.
- A flaky test is a bug report, not a retry-count problem. Open the trace viewer and find the real
  race before touching `retries`.

## UAT execution (Slice 11)

Cases live in `docs/testing/UAT_TEST_CASES.md` and the tables in
`WEB_PRODUCTION_COMPLETION_AND_UAT_PLAN.md` §6 (ENV, AUTH, SUB-P, PAY-P, ORG, ORG-P, ORG-S, ADM,
SKL, PRJ, TSK, TEM, CMT, EVD, AI).

Data setup rules: real Google login creates the users; PLATFORM_ADMIN is bootstrapped **once** as a
controlled config action; everything else (org, member, project, task, skill) is created through the
real UI/API. **No DataSeeder. No manual INSERT to make a case pass.**

Evidence per case: before/after screenshot, actor + role, method + endpoint + status code, created
record ID, the SQL query confirming the row, console/network errors, and PASS/FAIL/BLOCKED.
**Never put access tokens, Google tokens, the SA password, or API keys in evidence.**

Read-only SQL for verification (queries are in `WEB_PRODUCTION_COMPLETION_AND_UAT_PLAN.md` §7). If a
column name doesn't match, run `EXEC sp_help '<table>'` and fix the *query* — never alter the schema
to make a query run.

## Defect discipline

Severity: **P0** data loss / auth bypass / system down · **P1** main flow unusable · **P2** secondary
with workaround · **P3** cosmetic.

A defect report carries: ID, severity, environment/build, actor + role, preconditions, steps,
expected vs actual, screenshot + network response, endpoint + status, DB evidence, root cause, fix
reference, retest result.

**Every security defect must ship with an automated regression test before it is closed.** Release
gate: 0 P0/P1 open, 100% of P0 UAT cases passing, no Critical/High findings outstanding.

## Reporting

Always state real numbers from a real run: `Failed: N, Passed: N, Total: N`. Never estimate a test
count, never describe a suite as green without running it. If something is untested, say which part
and why.
