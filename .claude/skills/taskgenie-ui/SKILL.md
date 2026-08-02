---
name: taskgenie-ui
description: Build and test TaskGenie V2 desktop web UI (FE-WEB-V2, React + Vite + Tailwind + shadcn) to production standard — real API wiring, loading/error/empty/disabled states, accessibility, and Vitest component tests. Use when creating or changing any page/component, wiring a screen to an API, removing mock data, or writing component tests. Triggers: "làm giao diện", "build UI", "trang mới", "component test", "gỡ mock", "nối API vào UI", "accessibility".
---

# TaskGenie V2 — Frontend

React 18 + Vite + TypeScript + Tailwind + shadcn/ui, in `FE-WEB-V2/`. Desktop web only —
**never touch `mobile-FE/`**.

## Non-negotiables

1. **No mock data.** `src/app/data/tmaiData.ts` has been deleted. Never reintroduce a fixture module
   to make a screen render — fetch from the API or show a real empty state.
2. **Every button does something real.** A control either calls the API or is removed. No
   placeholder, no `console.log`, no fake success toast.
3. **UI guards are not security.** Hiding an admin button is UX; the backend already returns 403.
   Do both, and never assume the hidden control is protection.
4. **Money arrives as integer minor units.** Use `formatMoney` from `services/billingApi.ts`;
   never divide by 100 by hand or do currency arithmetic in the client.

## Reuse what exists — do not rebuild

| Need | Use |
|---|---|
| HTTP + Bearer token + 401 handling | `services/apiClient.ts` → `apiRequest<T>()` |
| Session, role, `refreshUser()` | `auth/AuthContext.tsx` → `useAuth()` |
| Is the user a platform admin | `isPlatformAdmin(user)` from `auth/types.ts` |
| Organization / billing / admin / skill calls | `services/organizationApi.ts`, `billingApi.ts`, `adminApi.ts` |
| Projects, tasks, AI | `services/projectApi.ts`, `coreAiApi.ts` |

Add new endpoints to the matching `services/*.ts` module — never call `fetch` from a component.

## The shape every page follows

Copy `components/OrganizationCenter.tsx` or `SubscriptionCenter.tsx`; both are complete examples.

```tsx
function errorMessage(err: unknown): string {   // every page has this
  if (err instanceof ApiError) {
    if (err.message) return err.message;         // server messages are user-facing
    if (err.status === 403) return "You don't have permission to perform this action.";
    return `Request failed (${err.status}).`;
  }
  return "Something went wrong. Please try again.";
}
```

- A single `run(key, action, successMessage?)` helper wraps every mutation: sets `busy`, clears
  previous error/notice, catches, always clears `busy` in `finally`.
- `busy` is a **string key**, not a boolean, so one row's spinner never disables the whole page —
  and an in-flight action blocks double submits (`if (busy) return`).
- Four states, always: **loading** (spinner + label), **error** (`role="alert"`), **empty**
  (explains what to do next), **success** (`role="status"`).
- Destructive actions confirm first (`window.confirm`) and re-fetch after mutating.

## Accessibility — this is graded

- Query-able names on everything interactive: visible text, or `aria-label` when icon-only.
- Icons are decorative: `aria-hidden`.
- Selected tab/nav item: `aria-selected` / `aria-current`.
- Dialogs: `role="dialog"`, `aria-modal="true"`, `aria-label`, and a labelled close button.
- Inputs get a real `<label>` or `aria-label` — tests and screen readers both depend on it.

## Component tests (Vitest + Testing Library)

Live beside the component: `src/app/components/__tests__/Foo.test.tsx`.

```bash
cd FE-WEB-V2
node_modules/.bin/vitest run          # CI
node_modules/.bin/vitest              # watch
```

Rules that keep these tests worth having:

- **Query by role first**: `getByRole('button', { name: /save/i })`, then `getByLabelText`, then
  text. `data-testid` is a last resort — if a role query is impossible, the markup usually has an
  accessibility bug worth fixing instead.
- **Test behaviour, not implementation.** If a refactor breaks a test without changing what the
  user sees, the test was wrong.
- **Mock at the service boundary** (`vi.mock("../../services/xxxApi")`), never `fetch`. The service
  modules are the seam; that keeps tests fast and honest about the contract.
- Cover the states the release gate demands: loading, error, empty, disabled/double-submit,
  and permission-based visibility.
- `userEvent` over `fireEvent` for anything a human does.

## Verify before claiming done

```bash
cd FE-WEB-V2
node_modules/.bin/vitest run                                                    # component
/Users/jronehuynh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  node_modules/vite/bin/vite.js build                                           # production build
node_modules/@playwright/test/cli.js test                                       # E2E on Edge
```

E2E needs the API running against Docker SQL (`dotnet run --project src/TaskGenie.API`) — see
`taskgenie-qa` for the full UAT procedure. `node`/`pnpm` are not on PATH; use the vendored runtime
path above.
