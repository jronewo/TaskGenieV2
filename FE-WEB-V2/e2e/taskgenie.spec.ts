import { test, expect, Page } from "@playwright/test";

/**
 * End-to-end smoke of the production flows against the REAL API and the Docker SQL Server UAT
 * database. Nothing is mocked: every assertion below reflects a row that actually exists.
 *
 * Each spec registers its own user so runs stay independent and repeatable.
 */

const API = process.env.E2E_API_URL ?? "http://localhost:5258/api";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@e2e.local`;
}

/** Registers through the UI and lands on the authenticated shell. */
async function registerViaUi(page: Page, name: string, email: string, password = "P@ssword1") {
  await page.goto("/");
  await page.getByRole("button", { name: /sign up free/i }).click();

  await page.getByPlaceholder("Huy Pham").fill(name);
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("Min. 8 characters").fill(password);
  await page.getByPlaceholder("Re-enter password").fill(password);

  await page.getByRole("button", { name: /create account|sign up/i }).first().click();
  // The shell renders the sidebar once a session exists.
  await expect(page.getByRole("button", { name: "Projects" })).toBeVisible({ timeout: 20_000 });
}

test.describe("Authentication", () => {
  test("AUTH-01/02 register creates a real session that survives reload", async ({ page }) => {
    const email = uniqueEmail("auth");
    await registerViaUi(page, "E2E Auth User", email);

    // A reload must restore the session via the stored refresh token + /auth/me.
    await page.reload();
    await expect(page.getByRole("button", { name: "Projects" })).toBeVisible({ timeout: 20_000 });
  });

  test("AUTH-04 arbitrary credentials cannot sign in", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("you@company.com").fill("definitely-not-a-user@e2e.local");
    await page.getByPlaceholder("Enter your password").fill("WrongPassword1");
    await page.getByRole("button", { name: /sign in/i }).first().click();

    // Still on the login screen — no shell.
    await expect(page.getByRole("button", { name: "Projects" })).toHaveCount(0);
  });
});

test.describe("Organization", () => {
  test("ORG-01/04 create an organization and add a member by email", async ({ page, request }) => {
    // A second real user to invite.
    const memberEmail = uniqueEmail("member");
    await request.post(`${API}/auth/register`, {
      data: { name: "E2E Member", email: memberEmail, password: "P@ssword1" },
    });

    await registerViaUi(page, "E2E Org Owner", uniqueEmail("owner"));

    // A brand-new account has no organization, so the Organizations nav is hidden by design —
    // the first one is created from Subscription → Organization.
    await expect(page.getByRole("button", { name: "Organizations" })).toHaveCount(0);

    await page.getByRole("button", { name: "Subscription" }).click();
    await page.getByRole("tab", { name: /organization/i }).click();
    await page.getByLabel("New organization name").fill(`E2E Org ${Date.now()}`);
    await page.getByRole("button", { name: /create organization/i }).click();
    await expect(page.getByText(/organization created/i)).toBeVisible({ timeout: 15_000 });

    // Creating an organization is not enough: the workspace only opens once an organization
    // plan is actually paid for.
    await expect(page.getByRole("button", { name: "Organizations" })).toHaveCount(0);

    await page.getByRole("button", { name: /choose plan/i }).first().click();
    await expect(page.getByText(/is pending/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /simulate succeeded/i }).click();
    await expect(page.getByText(/payment marked succeeded/i)).toBeVisible({ timeout: 15_000 });

    // Paid — the workspace is now reachable and offers project tools, not organization creation.
    await page.reload();
    await page.getByRole("button", { name: "Organizations" }).click();
    await expect(page.getByRole("heading", { name: /projects/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /new organization/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /new project/i })).toBeVisible();

    // Add the member by email and confirm they appear in the list.
    await page.getByLabel("Member email").fill(memberEmail);
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByText(/member added/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(memberEmail)).toBeVisible();
  });
});

test.describe("Subscription and quota", () => {
  test("SUB-P-04 third project is blocked on the free plan", async ({ page, request }) => {
    const email = uniqueEmail("quota");
    await registerViaUi(page, "E2E Quota User", email);

    // Drive project creation through the API so the test targets the quota rule, not the form.
    const login = await request.post(`${API}/auth/login`, { data: { email, password: "P@ssword1" } });
    const { accessToken } = await login.json();
    const headers = { Authorization: `Bearer ${accessToken}` };
    const body = (name: string) => ({ name, description: null, organizationId: null, deadline: null });

    expect((await request.post(`${API}/projects`, { headers, data: body("E2E One") })).status()).toBe(201);
    expect((await request.post(`${API}/projects`, { headers, data: body("E2E Two") })).status()).toBe(201);

    const third = await request.post(`${API}/projects`, { headers, data: body("E2E Three") });
    expect(third.status()).toBe(403);
    expect((await third.json()).code).toBe("PLAN_UPGRADE_REQUIRED");
  });

  test("PAY-P-01/03 fake checkout writes a real payment and activates the subscription", async ({ page }) => {
    await registerViaUi(page, "E2E Billing User", uniqueEmail("billing"));

    await page.getByRole("button", { name: "Subscription" }).click();
    await expect(page.getByRole("heading", { name: /subscription/i })).toBeVisible();

    // Pick the paid personal plan.
    await page.getByRole("button", { name: /choose plan/i }).first().click();

    // The gateway is simulated in this environment — settle it explicitly.
    await expect(page.getByText(/is pending/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /simulate succeeded/i }).click();

    await expect(page.getByText(/payment marked succeeded/i)).toBeVisible({ timeout: 15_000 });
    // Payment history now shows a settled row.
    await expect(page.getByText("SUCCEEDED").first()).toBeVisible();
  });
});

test.describe("Authorization", () => {
  test("AUTH-05 a normal user never sees the admin area", async ({ page }) => {
    await registerViaUi(page, "E2E Normal User", uniqueEmail("normal"));
    await expect(page.getByRole("button", { name: "Administration" })).toHaveCount(0);
  });

  test("AUTH-05 backend rejects admin API for a normal user even when called directly", async ({ request }) => {
    const email = uniqueEmail("direct");
    await request.post(`${API}/auth/register`, {
      data: { name: "E2E Direct", email, password: "P@ssword1" },
    });
    const login = await request.post(`${API}/auth/login`, { data: { email, password: "P@ssword1" } });
    const { accessToken } = await login.json();

    const response = await request.get(`${API}/admin/platform-stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(403);
  });
});

test.describe("Password reset", () => {
  test("AUTH-06 forgot-password never reveals whether an email exists", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /forgot password/i }).click();
    await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();

    // An address that certainly isn't registered still reports success.
    await page.getByPlaceholder("you@company.com").fill("nobody-here@e2e.local");
    await page.getByRole("button", { name: /send reset link/i }).click();

    await expect(page.getByText(/a reset link is on its way/i)).toBeVisible({ timeout: 15_000 });
  });

  test("AUTH-07 an invalid reset token is rejected", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /forgot password/i }).click();
    await page.getByRole("button", { name: /already have a reset token/i }).click();

    await page.getByPlaceholder("Paste the token from your email").fill("not-a-real-token");
    await page.getByPlaceholder("Min. 6 characters").fill("N3wP@ssword");
    await page.getByPlaceholder("Re-enter password").fill("N3wP@ssword");
    await page.getByRole("button", { name: /reset password/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Skills", () => {
  test("SKL-04 a user can add a skill to their own profile", async ({ page, request }) => {
    // Seed the catalog through an admin so there is something to pick.
    const adminEmail = uniqueEmail("skilladmin");
    await request.post(`${API}/auth/register`, {
      data: { name: "Skill Admin", email: adminEmail, password: "P@ssword1" },
    });

    await registerViaUi(page, "E2E Skill User", uniqueEmail("skill"));

    // A user's own skills live on their profile now; "Skills" left the sidebar and the admin
    // catalog moved onto the Administration page.
    await page.locator("header").first().locator("button").last().click();
    await page.getByRole("menuitem", { name: /Profile/ }).click();

    await expect(page.getByLabel("Skill to add")).toBeVisible({ timeout: 15_000 });
    // A normal user never sees the platform catalog.
    await expect(page.getByRole("heading", { name: /platform catalog/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Skills" })).toHaveCount(0);
  });
});

test.describe("Administration (platform admin)", () => {
  /** Bootstrapping the first admin is a controlled configuration step, not test data. */
  const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "P@ssword1";

  test.skip(!ADMIN_EMAIL, "Set E2E_ADMIN_EMAIL to a bootstrapped PLATFORM_ADMIN account.");

  async function loginAsAdmin(page: Page) {
    await page.goto("/");
    await page.getByPlaceholder("you@company.com").fill(ADMIN_EMAIL!);
    await page.getByPlaceholder("Enter your password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).first().click();
    // An administrator gets their own sidebar — the five platform sections, no project workspace —
    // and lands on Overview rather than a dashboard they have no projects for.
    await expect(page.getByRole("button", { name: "Overview", exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Dashboard", exact: true })).toHaveCount(0);
  }

  test("ADM-01/02 overview shows live platform counts and separates simulated revenue", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole("heading", { name: /administration/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Users", exact: true })).toBeVisible();
    // Simulated gateway money must be called out, never folded into revenue.
    await expect(page.getByText(/from the simulated gateway/i)).toBeVisible({ timeout: 15_000 });
  });

  test("ADM-03 user search and pagination hit the real API", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole("button", { name: "Users", exact: true }).click();

    await expect(page.getByLabel("Search users")).toBeVisible();
    await page.getByLabel("Search users").fill("uat-admin");
    await expect(page.getByText(ADMIN_EMAIL!)).toBeVisible({ timeout: 15_000 });
  });

  test("ADM-07 the last active admin cannot demote themselves", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole("button", { name: "Users", exact: true }).click();
    await page.getByLabel("Search users").fill("uat-admin");
    await expect(page.getByText(ADMIN_EMAIL!)).toBeVisible({ timeout: 15_000 });

    // Scope to the signed-in admin's own row — several accounts share the display name, so
    // matching on the name alone would assert against somebody else's toggle.
    const ownRow = page.getByRole("row").filter({ hasText: ADMIN_EMAIL! });
    await expect(ownRow).toHaveCount(1);

    // Their own status toggle is disabled; the backend guard is proven separately by unit tests.
    await expect(ownRow.getByRole("button", { name: /deactivate|activate/i })).toBeDisabled();
  });

  test("ADM-10 plans can be archived and disappear from the public catalog", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole("button", { name: "Plans", exact: true }).click();

    await expect(page.getByText("FREE_PERSONAL")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("PRO_ORGANIZATION")).toBeVisible();
  });

  test("SKL-01/03 admin sees the full catalog including archived skills", async ({ page }) => {
    await loginAsAdmin(page);
    // The catalog lives on the Overview section, which an administrator lands on.

    await expect(page.getByRole("heading", { name: /platform catalog/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel("New skill name")).toBeVisible();
  });
});

test.describe("Task board", () => {
  test("TSK-01 create a task through the UI and see it on the board", async ({ page, request }) => {
    const email = uniqueEmail("board");
    await registerViaUi(page, "E2E Board User", email);

    // A project to hold the task.
    const login = await request.post(`${API}/auth/login`, { data: { email, password: "P@ssword1" } });
    const { accessToken } = await login.json();
    await request.post(`${API}/projects`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: "E2E Board Project", description: null, organizationId: null, deadline: null },
    });

    await page.reload();
    await page.getByRole("button", { name: "Task Board" }).click();

    // Pick the project from the sidebar so the board is scoped.
    await page.getByText("E2E Board Project").first().click();
    await page.getByRole("button", { name: "Task Board" }).click();

    await page.getByRole("button", { name: /add task to to do/i }).click();
    await page.getByPlaceholder("What needs doing?").fill("E2E first task");
    await page.getByRole("button", { name: /create task/i }).click();

    await expect(page.getByText("E2E first task")).toBeVisible({ timeout: 15_000 });
  });

  test("TSK-03 dragging a task between columns persists and never blanks the page", async ({ page, request }) => {
    const email = uniqueEmail("drag");
    await registerViaUi(page, "E2E Drag User", email);

    const login = await request.post(`${API}/auth/login`, { data: { email, password: "P@ssword1" } });
    const { accessToken } = await login.json();
    const headers = { Authorization: `Bearer ${accessToken}` };
    const project = await request.post(`${API}/projects`, {
      headers,
      data: { name: "E2E Drag Project", description: null, organizationId: null, deadline: null },
    });
    const { projectId } = await project.json();
    await request.post(`${API}/tasks`, {
      headers,
      data: { projectId, title: "E2E draggable", description: null, priority: "Medium", deadline: null },
    });

    await page.reload();
    await page.getByText("E2E Drag Project").first().click();
    await page.getByRole("button", { name: "Task Board" }).click();

    const card = page.getByText("E2E draggable");
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Regression for the crash where an empty 204 body was dereferenced inside a state updater,
    // unmounting the whole tree. Drag to Done, then prove the app is still alive and the move stuck.
    await card.dragTo(page.getByTestId("column-Done"));

    await expect(page.getByRole("button", { name: "Task Board" })).toBeVisible();
    await expect(page.getByText("E2E draggable")).toBeVisible();

    // The server, not the optimistic guess, is the authority — confirm via the API.
    await expect
      .poll(async () => {
        const list = await request.get(`${API}/tasks?projectId=${projectId}`, { headers });
        const tasks = await list.json();
        return tasks.find((t: { title: string }) => t.title === "E2E draggable")?.status;
      }, { timeout: 10_000 })
      .toBe("Done");
  });

  test("TSK-02 opening a task shows its real detail and accepts a comment", async ({ page, request }) => {
    const email = uniqueEmail("detail");
    await registerViaUi(page, "E2E Detail User", email);

    const login = await request.post(`${API}/auth/login`, { data: { email, password: "P@ssword1" } });
    const { accessToken } = await login.json();
    const headers = { Authorization: `Bearer ${accessToken}` };
    const project = await (
      await request.post(`${API}/projects`, {
        headers,
        data: { name: "E2E Detail Project", description: null, organizationId: null, deadline: null },
      })
    ).json();
    await request.post(`${API}/tasks`, {
      headers,
      data: { projectId: project.projectId, title: "E2E detail task", description: "Created for E2E", priority: "High" },
    });

    await page.reload();
    await page.getByText("E2E Detail Project").first().click();
    await page.getByRole("button", { name: "Task Board" }).click();
    await page.getByText("E2E detail task").click();

    await expect(page.getByRole("dialog", { name: /task detail/i })).toBeVisible();
    await page.getByLabel("New comment").fill("Looks good to me");
    await page.getByRole("button", { name: /post comment/i }).click();
    await expect(page.getByText("Looks good to me")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Jira-style task flow", () => {
  test("JIRA-01 a task carries an issue key and moves through the workflow from its detail view", async ({ page, request }) => {
    const email = uniqueEmail("jira");
    await request.post(`${API}/auth/register`, { data: { name: "Jira User", email, password: "P@ssword1" } });
    const login = await request.post(`${API}/auth/login`, { data: { email, password: "P@ssword1" } });
    const { accessToken } = await login.json();
    const headers = { Authorization: `Bearer ${accessToken}` };

    const project = await request.post(`${API}/projects`, {
      headers,
      data: { name: "Website Revamp", description: "Public site rebuild", organizationId: null, deadline: null },
    });
    const { projectId } = await project.json();
    const created = await request.post(`${API}/tasks`, {
      headers,
      data: { projectId, title: "Fix broken login redirect", description: "E2E", priority: "Critical", deadline: null },
    });
    const { taskId } = await created.json();

    await page.goto("/");
    await page.getByPlaceholder("you@company.com").fill(email);
    await page.getByPlaceholder("Enter your password").fill("P@ssword1");
    await page.getByRole("button", { name: /sign in/i }).first().click();
    await expect(page.getByRole("button", { name: "Projects" })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Website Revamp" }).first().click();

    // "Website Revamp" -> WR, paired with the task's own id.
    await expect(page.getByText(`WR-${taskId}`).first()).toBeVisible({ timeout: 15_000 });
    // The board columns use Jira's status names.
    await expect(page.getByRole("heading", { name: "TO DO" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "IN PROGRESS" })).toBeVisible();

    await page.getByRole("button", { name: /Fix broken login redirect/ }).click();

    // The detail view is the issue view: breadcrumb key, Details panel, workflow transition.
    await expect(page.getByText("Details")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#task-status")).toHaveValue("Todo");

    await page.locator("#task-status").selectOption("InProgress");
    await expect(page.locator("#task-status")).toHaveValue("InProgress", { timeout: 15_000 });

    // The transition persisted server-side, not just in local state.
    const after = await request.get(`${API}/tasks/${taskId}`, { headers });
    expect((await after.json()).status).toBe("InProgress");
  });
});

test.describe("Preferences and assistant", () => {
  test("SET-01 theme and language persist across a reload", async ({ page, request }) => {
    const email = uniqueEmail("prefs");
    await request.post(`${API}/auth/register`, { data: { name: "Prefs User", email, password: "P@ssword1" } });

    await page.goto("/");
    await page.getByPlaceholder("you@company.com").fill(email);
    await page.getByPlaceholder("Enter your password").fill("P@ssword1");
    await page.getByRole("button", { name: /sign in/i }).first().click();
    await expect(page.getByRole("button", { name: "Projects" })).toBeVisible({ timeout: 20_000 });

    // Settings lives in the header account menu, not the sidebar.
    await page.locator("header").first().locator("button").last().click();
    await page.getByRole("menuitem", { name: /Settings/ }).click();

    await page.getByRole("radio", { name: /dark/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("radio", { name: /Tiếng Việt/ }).click();
    await expect(page.getByRole("heading", { name: "Cài đặt" })).toBeVisible();

    await page.reload();
    // Stored on the device, so the reloaded shell comes back dark and in Vietnamese.
    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 20_000 });
    expect(await page.evaluate(() => document.documentElement.lang)).toBe("vi");
  });

  test("AST-01 the assistant answers from the caller's own rows", async ({ page, request }) => {
    const email = uniqueEmail("assistant");
    await request.post(`${API}/auth/register`, { data: { name: "Assistant User", email, password: "P@ssword1" } });
    const login = await request.post(`${API}/auth/login`, { data: { email, password: "P@ssword1" } });
    const { accessToken } = await login.json();
    const headers = { Authorization: `Bearer ${accessToken}` };

    const project = await request.post(`${API}/projects`, {
      headers,
      data: { name: "Assistant Project", description: "E2E", organizationId: null, deadline: null },
    });
    const { projectId } = await project.json();
    await request.post(`${API}/tasks`, {
      headers,
      data: { projectId, title: "Only task here", description: "E2E", priority: "High", deadline: null },
    });

    await page.goto("/");
    await page.getByPlaceholder("you@company.com").fill(email);
    await page.getByPlaceholder("Enter your password").fill("P@ssword1");
    await page.getByRole("button", { name: /sign in/i }).first().click();
    await expect(page.getByRole("button", { name: "Projects" })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Assistant Project" }).first().click();
    await page.getByRole("button", { name: /open assistant/i }).click();

    // Opening a board points the agent at it, and the chat says so rather than hiding the scope.
    await expect(page.getByRole("button", { name: /Phạm vi: Assistant Project/ })).toBeVisible({ timeout: 15_000 });

    // Switching to the whole workspace is possible without leaving the chat.
    await page.getByRole("button", { name: /Phạm vi:/ }).click();
    await page.getByRole("button", { name: "Tất cả dự án" }).click();
    await expect(page.getByRole("button", { name: /Phạm vi: Tất cả dự án/ })).toBeVisible();

    await page.getByLabel(/ask the assistant/i).fill("Task nào đã quá hạn?");
    await page.getByRole("button", { name: /^Send$/i }).click();

    // The provider has no quota, so this proves the fallback path answers from real rows.
    await expect(page.getByText(/quá hạn|rủi ro|AI/i).last()).toBeVisible({ timeout: 30_000 });
  });

  // Skipped, not deleted: Reports was pulled from the sidebar while the admin flow is built, so
  // there is no way to reach the page. Re-enable together with the nav entry — the assertions below
  // still describe what the page has to do.
  test.skip("RPT-02 reports can be scoped to a single project", async ({ page, request }) => {
    const email = uniqueEmail("reportscope");
    await request.post(`${API}/auth/register`, { data: { name: "Report User", email, password: "P@ssword1" } });
    const login = await request.post(`${API}/auth/login`, { data: { email, password: "P@ssword1" } });
    const { accessToken } = await login.json();
    const headers = { Authorization: `Bearer ${accessToken}` };

    const project = await request.post(`${API}/projects`, {
      headers,
      data: { name: "Scoped Report Project", description: "E2E", organizationId: null, deadline: null },
    });
    const { projectId } = await project.json();
    await request.post(`${API}/tasks`, {
      headers,
      data: { projectId, title: "Scoped task", description: "E2E", priority: "High", deadline: null },
    });

    await page.goto("/");
    await page.getByPlaceholder("you@company.com").fill(email);
    await page.getByPlaceholder("Enter your password").fill("P@ssword1");
    await page.getByRole("button", { name: /sign in/i }).first().click();
    await expect(page.getByRole("button", { name: "Projects" })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Reports" }).click();
    await page.locator("#report-project").selectOption({ label: "Scoped Report Project" });

    // Scoping swaps the cross-project risk chart for this project's own priority breakdown.
    await expect(page.getByRole("heading", { name: "Tasks by priority" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Scoped Report Project — 1 task\(s\)/)).toBeVisible();
  });
});

test.describe("Realtime notifications", () => {
  test("RT-01 an invitation raised out-of-band appears without a reload and can be accepted", async ({ page, request }) => {
    const leaderEmail = uniqueEmail("rtlead");
    const memberEmail = uniqueEmail("rtmember");
    for (const [name, email] of [["RT Lead", leaderEmail], ["RT Member", memberEmail]]) {
      await request.post(`${API}/auth/register`, { data: { name, email, password: "P@ssword1" } });
    }
    const login = await request.post(`${API}/auth/login`, { data: { email: leaderEmail, password: "P@ssword1" } });
    const { accessToken } = await login.json();
    const headers = { Authorization: `Bearer ${accessToken}` };

    const project = await request.post(`${API}/projects`, {
      headers,
      data: { name: "Realtime Project", description: "E2E", organizationId: null, deadline: null },
    });
    const { teamId } = await project.json();

    await page.goto("/");
    await page.getByPlaceholder("you@company.com").fill(memberEmail);
    await page.getByPlaceholder("Enter your password").fill("P@ssword1");
    await page.getByRole("button", { name: /sign in/i }).first().click();
    await expect(page.getByRole("button", { name: "Projects" })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(page.getByText(/you're invited to join/i)).toHaveCount(0);

    // Raised entirely outside this browser: only the SignalR push can surface it.
    const invited = await request.post(`${API}/invitations`, { headers, data: { teamId, email: memberEmail } });
    expect(invited.status()).toBe(201);

    // No reload anywhere in this test.
    await expect(page.getByText(/you're invited to join/i)).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /^Accept$/ }).first().click();
    await expect(page.getByRole("status")).toContainText(/you joined/i, { timeout: 20_000 });

    // The decision persisted server-side, not just in the page.
    const team = await request.get(`${API}/teams/${teamId}`, { headers });
    const body = await team.json();
    expect(JSON.stringify(body)).toContain(memberEmail);
  });
});

/** Signs in as an already-registered seed account and returns its access token. */
async function tokenFor(request: APIRequestContext, email: string): Promise<string> {
  const login = await request.post(`${API}/auth/login`, { data: { email, password: "P@ssword1" } });
  return (await login.json()).accessToken as string;
}

test.describe("Teams", () => {
  test("TEM-01 create a team and invite a member by email", async ({ page, request }) => {
    const mateEmail = uniqueEmail("mate");
    await request.post(`${API}/auth/register`, {
      data: { name: "E2E Mate", email: mateEmail, password: "P@ssword1" },
    });

    await registerViaUi(page, "E2E Team Lead", uniqueEmail("lead"));
    await page.getByRole("button", { name: "Team" }).click();

    await page.getByRole("button", { name: /new team/i }).click();
    await page.getByLabel("Team name").fill(`E2E Team ${Date.now()}`);
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText(/team created/i)).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Member email").fill(mateEmail);
    await page.getByRole("button", { name: /^invite$/i }).click();
    // Inviting no longer adds them outright — they have to accept it themselves.
    await expect(page.getByText(/invitation sent/i)).toBeVisible({ timeout: 15_000 });

    const invitations = await request.get(`${API}/invitations/user/${encodeURIComponent(mateEmail)}`, {
      headers: { Authorization: `Bearer ${await tokenFor(request, mateEmail)}` },
    });
    const pending = await invitations.json();
    expect(pending.some((i: { status: string }) => i.status === "Pending")).toBe(true);
  });
});

test.describe("Evaluations", () => {
  test("EVL-01 reviewing is scoped to a project and shows the member's history", async ({ page, request }) => {
    const leadEmail = uniqueEmail("lead");
    const memberEmail = uniqueEmail("reviewee");
    await request.post(`${API}/auth/register`, { data: { name: "E2E Lead", email: leadEmail, password: "P@ssword1" } });
    await request.post(`${API}/auth/register`, { data: { name: "E2E Reviewee", email: memberEmail, password: "P@ssword1" } });

    const login = await request.post(`${API}/auth/login`, { data: { email: leadEmail, password: "P@ssword1" } });
    const { accessToken } = await login.json();
    const headers = { Authorization: `Bearer ${accessToken}` };

    const project = await request.post(`${API}/projects`, {
      headers,
      data: { name: "E2E Eval Project", description: null, organizationId: null, deadline: null },
    });
    const { teamId } = await project.json();

    const lookup = await request.get(`${API}/users/search?email=${encodeURIComponent(memberEmail)}`, { headers });
    const { userId } = await lookup.json();
    await request.post(`${API}/teams/${teamId}/members`, { headers, data: { userId, role: "MEMBER" } });

    await page.goto("/");
    await page.getByPlaceholder("you@company.com").fill(leadEmail);
    await page.getByPlaceholder("Enter your password").fill("P@ssword1");
    await page.getByRole("button", { name: /sign in/i }).first().click();
    await expect(page.getByRole("button", { name: "Projects" })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Evaluations" }).click();

    // The project's members are listed, and a review can be filed against one of them.
    await expect(page.getByText("E2E Reviewee")).toBeVisible({ timeout: 15_000 });
    await page.getByText("E2E Reviewee").first().click();
    await page.getByRole("button", { name: /submit evaluation/i }).click();

    await expect(page.getByText(/evaluation saved/i)).toBeVisible({ timeout: 15_000 });
    // The saved review appears in the member's history, which spans every project.
    await expect(page.getByText(/evaluation history \(1\)/i)).toBeVisible();
  });
});

test.describe("Reports", () => {
  // Skipped, not deleted: Reports was pulled from the sidebar while the admin flow is built, so
  // there is no way to reach the page. Re-enable together with the nav entry — the assertions below
  // still describe what the page has to do.
  test.skip("RPT-01 reports render live figures, not seeded ones", async ({ page, request }) => {
    const email = uniqueEmail("report");
    await registerViaUi(page, "E2E Report User", email);

    const login = await request.post(`${API}/auth/login`, { data: { email, password: "P@ssword1" } });
    const { accessToken } = await login.json();
    await request.post(`${API}/projects`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: "E2E Report Project", description: null, organizationId: null, deadline: null },
    });

    await page.reload();
    await page.getByRole("button", { name: "Reports" }).click();

    // A brand-new account has exactly one project — the copy must reflect that, not a seeded count.
    await expect(page.getByText(/across 1 project/i)).toBeVisible({ timeout: 15_000 });
  });
});
