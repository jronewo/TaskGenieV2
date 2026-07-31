# Mock API tracker

Screens added in this pass render against **mock data only** (in-memory + `localStorage`,
via `src/core/api/mock.ts`). None of them call the real backend yet — this is intentional
per team agreement while BE/FE sources are being merged.

Every mock `api/*Api.ts` function has a `// TODO: <METHOD> <route>` comment next to it
pointing at the real endpoint it should call. To wire a module for real:

1. Open the feature's `api/xxxApi.ts`.
2. Replace the mock body with `apiClient.get/post/put/delete(...)` calls (see
   `src/features/tasks/api/tasksApi.ts` or `src/features/projects/api/projectsApi.ts` for
   the established pattern — already fully wired to the real JWT-authenticated backend).
3. Delete the mock seed data / `loadMockState`/`saveMockState` calls in that file.
4. Hooks (`hooks/useXxx.ts`) and pages/components should not need any changes — they only
   depend on the api module's exported function signatures, which already match the real
   routes.

## Status by module

| Feature folder | Real base route | Wired to real API? |
|---|---|---|
| `features/auth` | `/api/auth` | ✅ yes |
| `features/users` (profile) | `/api/users` | ✅ yes |
| `features/projects` (core CRUD) | `/api/projects` | ✅ yes |
| `features/tasks` (core CRUD) | `/api/tasks` | ✅ yes |
| `features/teams` (core CRUD) | `/api/teams` | ✅ yes |
| `features/notifications` | `/api/notifications` | ✅ yes |
| `features/organizations` | `/api/organizations` | ✅ yes |
| `features/invitations` | `/api/invitations` | ✅ yes |
| `features/skills` | `/api/skills` | ✅ yes |
| `features/meetings` | `/api/meetings` | ✅ yes |
| `features/evaluations` | `/api/evaluations` | ✅ yes |
| `features/rewards` | `/api/user-scores` | ✅ yes |
| `features/activitylogs` | `/api/activitylogs` | ✅ yes |
| `features/projects/api/exportApi.ts` | `/api/projects/{id}/export/{xlsx,pdf}` | ✅ yes |
| `features/admin` | `/api/admin/platform-stats` | ✅ yes |
| `features/ai/api/aiApi.ts` | `/api/ai-analysis`, `/api/task-assignment`, `/api/tasks/{id}/evidence` | ✅ yes |
| `features/tasks/api/taskCommentsApi.ts` | `/api/taskcomments` | ❌ mock |
| `features/tasks/api/taskRequiredSkillsApi.ts` | `/api/taskrequiredskills` | ❌ mock |
| `features/tasks/api/taskProgressApi.ts` | `/api/task-progress/{taskId}/logs` | ❌ mock (the PUT that updates % is already real — see note) |

## Notes / gotchas for whoever wires these next

- **Export (now real)**: the real endpoints return a binary file stream (`FileContentResult`),
  not JSON, so `core/api/client.ts` gained a new `apiClient.getBlob(path)` method (separate
  from `get/post/put/delete`, which always assume JSON) — it skips the JSON parsing/204
  handling, reads the response as a `Blob`, and pulls the filename out of the
  `Content-Disposition` header if present. `exportApi.ts` uses it and falls back to
  `${projectName}.xlsx`/`.pdf` if the header is missing. Note the route is
  `/api/projects/{id}/export/...` (lowercase `projects`, hardcoded in `[Route(...)]` on
  `ExportController` rather than using the `[controller]` token like most other controllers).
- **Task progress**: there are *two* separate BE progress mechanisms. `tasksApi.updateProgress`
  (`PUT /api/tasks/{id}/progress`) is already real and wired to the progress slider in
  `TaskDetailModal`. The dedicated `TaskProgressController` (`PUT/GET /api/task-progress/{taskId}` +
  `/logs`) is a separate feature for progress **log history** with notes/risk — only the mock
  side of that is implemented (the "History" tab in `TaskDetailModal`).
- **Invitations vs direct add**: `TeamsPage` still has two live flows — "Add Member" (adds
  immediately) and "Send Invitation" (pending → accept/reject, now real too). Nobody has
  decided whether "Add Member" should be retired in favor of always going through invitations.
- **Meetings (now real)**: `addAttendeeByEmail` calls `usersApi.searchByEmail` first, then
  `POST /meetings/{id}/attendees` with the resolved `userId` — the UI still just asks for an
  email, same pattern as `TeamsPage`'s invite flow, so `MeetingsPanel.tsx` didn't need to
  change. `GetMeetingByIdQuery` returns `MeetingDto?` wrapped in a plain `Ok(...)` — ASP.NET's
  default `HttpNoContentOutputFormatter` turns a null `Ok()` body into 204, so fetching a
  meeting that was deleted (or never existed) returns 204, not 404. Pre-existing backend gap
  (previously logged as "Bug #7"), not fixed here.
- **Evaluations "Given by me"**: evaluatee picker reuses the real `useMyTeams()` team-member
  list (already real data) rather than adding a second mock user directory.
- **Rewards (now real)**: manual adjust still takes a raw numeric User ID typed by hand —
  consider swapping for the same email-search pattern used elsewhere. The backend also awards
  score automatically on task completion (`TaskCompletedScoreHandler`), so history/leaderboard
  won't be empty even without ever using manual adjust. `amount` is sent as a positive number
  regardless of REWARD/PENALTY — the backend negates it internally for penalties, so the FE
  no longer needs to flip the sign itself like the mock did.
- **AI Insights**: `aiApi.ts` was already present before this pass (types + function
  signatures for risk/assignment/evidence) but had zero pages using it — it's been converted
  to mock and extended with the missing endpoints (`analyze-all`, `summary`, `classify`,
  workload, executions, assignment history) so `AiInsightsPage` has full coverage.
- **Organizations (now real, with a real design constraint)**: there is no create-organization
  endpoint anywhere in the backend — organizations only exist via `DataSeeder.cs` (exactly one,
  "TaskGenie Corp", owned by the seeded `an@taskgenie.dev`). `GET /organizations/my` 404s for
  every other user with "You do not own any organization." — this isn't a bug, it's the only
  state most accounts will ever be in, so the page now distinguishes a 404 (friendly empty
  state) from a real failure (error banner) instead of treating both the same. Fixed the same
  0–5-float-vs-0–10-int score mismatch as the Team Evaluations page (backend's
  `EvaluateProjectRequest` scores are `int?`). A real backend bug was found and fixed while
  testing this: `OrganizationRepository.GetProjectsByOrganizationIdAsync` combined
  `.Include(p => p.Team).ThenInclude(...TeamMembers)`, `.Include(p => p.Tasks)` and
  `.Include(p => p.ProjectEvaluations)` in one query — three sibling collections joined
  together multiply rows against each other (cartesian product), which was slow enough to
  time out `GET /organizations/my` entirely even with a modest amount of seeded data. Fixed
  with `.AsSplitQuery()` (now several simpler queries instead of one exploding join);
  confirmed the endpoint went from hanging indefinitely to a consistent <100ms.
  `GetProjectEvaluationQuery` returns a nullable
  DTO wrapped in `Ok(...)`, so "no evaluation yet" comes back as 204 (same
  `HttpNoContentOutputFormatter` pattern as Meetings) — `apiClient` already treats 204 as
  `undefined`, which the page's truthiness checks handle fine. `GET /organizations/admin/all`
  has no role-based authorization either, same gap as `/admin/platform-stats`.
- **Admin**: `GET /api/admin/platform-stats` has no role-based authorization on the backend —
  any authenticated user can call it if they hit the URL directly, not just admins
  (pre-existing backend gap, not something this pass touched or fixed). The FE sidebar does
  gate the nav item client-side (`user.role === "Admin" || user.isOrgOwner`), so a normal user
  won't see the link, but that's not a real security boundary on its own.
- **AI risk + assignment recommender (now real)**: `analyzeRisk`, `getRiskHistory`,
  `analyzeAllProject`, `getTaskExecutions`, `recommend`, `acceptRecommendation`,
  `rejectRecommendation`, `getAssignmentHistory` call the real backend. Two real-DTO quirks
  worth knowing: (1) `accept`/`reject` send `{ taskId, userId }`, not `candidateId` — the FE
  function param is still named `candidateId` for hook-signature stability, just mapped to
  `userId` in the request body; the backend also requires `userId` to be part of the *latest*
  recommendation run for that task, so a stale `recommend` result will get rejected. (2) Risk
  level thresholds and factor codes (`DEADLINE`/`PROGRESS`/`DEPENDENCY`/`WORKLOAD`/`HISTORICAL`)
  come straight from the backend now — don't recompute them client-side.
- **Summarize/classify/workload/evidence (now real too)**: `summarizeTask`/`classifyTask`
  only return `{ message }`, not the created analysis — call `getTaskAnalyses` separately to
  see the result (neither is wired into any page yet, same as before this pass).
  `getProjectWorkload`'s real handler always returns a single synthetic
  `{ userId: 0, userName: "AI Workload Analysis" }` item with the raw LLM text in `reason`
  and an empty `suggestedTasks` — it's not a real per-user breakdown despite the DTO shape;
  the UI renders `reason` as free text and just won't show any task chips. Evidence's real
  `EvidenceDto` has more fields than the old mock shape (`taskId`, `taskLogId`, `attachment`,
  `submittedBy`) — added to the FE type; `addUrlEvidence` now sends `evidenceType: "URL"`
  explicitly since the backend requires it.
