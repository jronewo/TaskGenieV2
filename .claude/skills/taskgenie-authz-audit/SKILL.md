---
name: taskgenie-authz-audit
description: Audit a TaskGenie V2 controller for the two recurring security defect classes — missing authorization/ownership checks (IDOR) and actor identity taken from the client request body instead of the JWT — then fix and prove the fix with negative tests. Use when auditing any controller, reviewing a new endpoint's security, or working Slice 0 / PROD-0202. Triggers: "audit controller", "kiểm tra bảo mật", "authorization", "IDOR", "403 test", "security review of endpoint".
---

# TaskGenie V2 — Authorization Audit

This recipe has found real, exploitable defects in **2 of 2** controllers audited. Treat every
un-audited controller as vulnerable until the checklist below says otherwise.

## The two defect classes

**(A) Missing authorization.** The endpoint only benefits from the global fallback policy
(`RequireAuthenticatedUser`), so *any logged-in user* can read or mutate *anyone's* resource by
guessing an integer ID.

> Found in `OrganizationsController`: every endpoint — org detail, project list, project detail,
> evaluation read, and `admin/all` — had no check whatsoever.
> Found in `SkillsController`: `PUT/DELETE /api/skills/user/{userSkillId}` let any user edit or
> delete another user's skill row; `POST /api/skills` let any user create master catalog entries.

**(B) Actor from client.** The command DTO accepts the acting user's ID from the request body, so a
caller can attribute their action to someone else.

> Found in `OrganizationsController`: `EvaluateProjectRequest.EvaluatorId`.
> Found in `SkillsController`: `AddUserSkillRequest.UserId`.

## Audit procedure

For the target controller:

1. **Read the controller.** For each action note: route, HTTP verb, `[Authorize(Policy=...)]`
   presence, and every field of its request DTO.
2. **Flag any DTO field** named `UserId`, `CreatedBy`, `EvaluatorId`, `OrganizedBy`, `SubmittedBy`,
   `LeaderId`, `InvitedBy`, `DecidedBy`, or anything else that identifies *who is acting*. Also flag
   any `X-User-Id` header usage.
3. **Read the MediatR handler** behind each action (`src/TaskGenie.Application/Features/<Domain>/`).
   Ask: does it call `IResourceAuthorizationService`, or does it load by ID and act blindly?
4. **Trace ID-mixing risk.** If the route has two IDs (`/organizations/{orgId}/projects/{projectId}`),
   does the handler verify the child actually belongs to the parent? If not, an owner of org A can
   reach org B's project.
5. **Classify each action**: `OK` / `MISSING-AUTHZ` / `CLIENT-ACTOR` / `ID-MIXING`.

Report the findings **before** fixing if the user asked for an audit; fix directly if they asked for
a fix.

## Fix patterns

**Actor from client** → delete the field from the DTO and the command record entirely (don't just
ignore it), inject `ICurrentUser`, use `currentUser.UserId`. Removing the field keeps the API
contract honest and makes the forged-field test meaningful.

**Missing ownership check** → call the matching method on `IResourceAuthorizationService`
(`src/TaskGenie.Application/Interfaces/IResourceAuthorizationService.cs`). Existing methods:

```
EnsureCanAccessProjectAsync / EnsureCanManageProjectAsync
EnsureCanAccessTeamAsync    / EnsureCanManageTeamAsync
EnsureCanAccessTaskAsync    / EnsureCanManageTaskAsync
EnsureCanManageTasksInProjectAsync
EnsureCanAccessOrganizationAsync
EnsureCanManageUserSkillAsync
```

Each resolves the entity, throws `NotFoundException` if absent and `ForbiddenException` if the actor
isn't allowed, and **returns the entity** — use the return value instead of re-fetching.

Only add a new `EnsureCanXxx` method when no existing one fits. Put the rule in the interface's XML
doc comment so the policy is readable in one place.

**Platform-admin-only endpoints** → `[Authorize(Policy = AuthorizationPolicies.PlatformAdmin)]`
(`src/TaskGenie.API/Authorization/AuthorizationPolicies.cs`).

**ID mixing** → after the parent authorization check, load the child and verify its foreign key
matches the route parent; throw `NotFoundException` (not `Forbidden`) so existence isn't leaked:

```csharp
await authorization.EnsureCanAccessOrganizationAsync(cmd.OrganizationId, ct);
var project = await projectRepo.GetByIdAsync(cmd.ProjectId, ct);
if (project is null || project.OrganizationId != cmd.OrganizationId)
    throw new NotFoundException("Project", cmd.ProjectId);
```

Do **not** hand-roll status codes in controllers — `ExceptionHandlingMiddleware` maps
`ValidationException`→400, `ForbiddenException`→403, `NotFoundException`→404,
`UnauthorizedAccessException`→401.

## Status code contract

| Code | Meaning |
|---|---|
| 401 | Not authenticated / bad token |
| 403 | Authenticated but lacks permission on a resource it may know exists |
| 404 | Doesn't exist **or** must be hidden from a cross-tenant actor |
| 409 | Conflict / dependency / quota race |

## Prove the fix

No authorization fix is complete without negative tests. Follow
`tests/TaskGenie.Tests/Integration/SkillAuthorizationApiTests.cs`. Minimum per fixed endpoint:

- anonymous → 401
- wrong role → 403
- authenticated non-owner → 403, **plus a DB assertion that nothing changed**
- owner → success
- platform admin → success
- cross-tenant ID mixing → 404
- forged actor field in body → row persists the **JWT** actor

Then run the full suite (not just the new file) and record the count:

```bash
dotnet test tests/TaskGenie.Tests --artifacts-path /tmp/taskgenie-claude-tests
```

## Close the loop

Tick the controller in `docs/production/IMPLEMENTATION_PROGRESS_CHECKLIST.md` under PROD-0202 with a
⚠️ note describing each defect found and how it was fixed, plus the new test count. The value of this
audit trail is that it records *what was actually wrong* — keep it specific, not "hardened security".
