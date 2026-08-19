/**
 * Demo data for visual testing (dark theme, organization workspace, board density).
 *
 * Everything is created through the running API, which writes to the same Docker SQL Server the app
 * uses. Nothing is inserted with raw SQL: the project rule is that business state must come from the
 * real endpoints, so this script exercises registration, billing, organizations, projects and tasks
 * exactly as a user would. That also means it fails loudly if an endpoint regresses.
 *
 * The organization plan is bought through the simulated payment provider, which only resolves in
 * Development/UAT — this cannot be pointed at Production.
 *
 * Usage:
 *   node scripts/seed-demo-data.mjs
 *   API_BASE=http://localhost:5258/api node scripts/seed-demo-data.mjs
 */

const API = process.env.API_BASE ?? "http://localhost:5258/api";
const PASSWORD = "P@ssword1";

/**
 * An existing account to drop into every project's team as LEADER, so a person who signs in with
 * Google (and therefore has no password this script could use) still lands on real data.
 * Projects are visible to their creator *or* to any member of the project's team, so team
 * membership is enough — no credential of theirs is touched.
 */
const TARGET_EMAIL = process.env.TARGET_EMAIL ?? "trongboigaren2107@gmail.com";

// Fixed accounts so the same login works on every re-run.
const OWNER = { name: "Demo Owner", email: "demo.owner@taskgenie.local" };
const TEAMMATES = [
  { name: "Linh Tran", email: "demo.linh@taskgenie.local" },
  { name: "Minh Pham", email: "demo.minh@taskgenie.local" },
  { name: "Chi Nguyen", email: "demo.chi@taskgenie.local" },
];

const PERSONAL_PROJECTS = [
  {
    name: "Website Revamp",
    description: "Rebuild the public marketing site on the new design system.",
    tasks: [
      ["Fix broken login redirect", "Critical", "Todo"],
      ["Audit the legacy CSS bundle", "High", "Todo"],
      ["Migrate the CDN configuration", "Medium", "InProgress"],
      ["As a user I want dark mode", "Low", "InProgress"],
      ["Ship the pricing page", "High", "Done"],
      ["Rewrite the footer markup", "Low", "Done"],
    ],
  },
  {
    name: "Mobile Companion",
    description: "Companion app for on-call engineers.",
    tasks: [
      ["Crash on cold start", "Critical", "Todo"],
      ["Offline task cache", "High", "InProgress"],
      ["Push notification opt-in", "Medium", "Todo"],
      ["Release 1.2 to TestFlight", "Medium", "Done"],
    ],
  },
];

const ORG_PROJECTS = [
  {
    name: "Q3 Platform Migration",
    tasks: [
      ["Bug: duplicate invoices on retry", "Critical", "Todo"],
      ["Cut over the reporting warehouse", "High", "InProgress"],
      ["Decommission the legacy queue", "Medium", "Todo"],
      ["Write the rollback runbook", "High", "Done"],
    ],
  },
  {
    name: "Customer Onboarding Revamp",
    tasks: [
      ["Story: guided first-run checklist", "High", "InProgress"],
      ["Instrument the drop-off funnel", "Medium", "Todo"],
      ["Fix the broken welcome email", "Critical", "Todo"],
    ],
  },
];

let failures = 0;

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const parsed = text ? safeJson(text) : null;

  if (!response.ok) {
    return { ok: false, status: response.status, body: parsed ?? text };
  }
  return { ok: true, status: response.status, body: parsed };
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Register is idempotent for our purposes: an existing account just logs in. */
async function ensureAccount({ name, email }) {
  await call("POST", "/auth/register", { body: { name, email, password: PASSWORD } });
  const login = await call("POST", "/auth/login", { body: { email, password: PASSWORD } });
  if (!login.ok) {
    throw new Error(`Cannot log in as ${email}: ${login.status} ${JSON.stringify(login.body)}`);
  }
  return login.body.accessToken;
}

async function createProject(token, { name, description, organizationId = null }) {
  const result = await call("POST", "/projects", {
    token,
    body: { name, description: description ?? null, organizationId, deadline: null },
  });
  if (!result.ok) {
    // A free account is capped at two active projects; that is a real rule, not a script bug.
    console.log(`  ! project "${name}" refused: ${result.status} ${JSON.stringify(result.body)}`);
    failures += 1;
    return null;
  }
  return result.body;
}

/** Resolves an existing account by email. Returns null when nobody has signed up with it yet. */
async function findUserByEmail(token, email) {
  const found = await call("GET", `/users/search?email=${encodeURIComponent(email)}`, { token });
  return found.ok && found.body?.userId ? found.body : null;
}

async function addToTeam(token, teamId, userId, role) {
  const added = await call("POST", `/teams/${teamId}/members`, { token, body: { userId, role } });
  if (!added.ok && added.status !== 400) {
    // 400 is the duplicate-membership guard, which is fine on a re-run.
    console.log(`  ! team membership refused: ${added.status} ${JSON.stringify(added.body)}`);
    failures += 1;
    return false;
  }
  return true;
}

/**
 * Assignment only exists behind the AI recommendation flow — accept refuses a user who was not in
 * the latest run — so the run has to happen first.
 */
async function assignTask(token, taskId, projectId, userId) {
  const run = await call("POST", "/task-assignment/recommend", { token, body: { taskId, projectId } });
  if (!run.ok) return false;

  const suggested = (run.body?.suggestions ?? []).some((s) => s.userId === userId);
  if (!suggested) return false;

  const accepted = await call("POST", "/task-assignment/accept", { token, body: { taskId, userId } });
  return accepted.ok;
}

async function createTask(token, projectId, [title, priority, status]) {
  const created = await call("POST", "/tasks", {
    token,
    body: { projectId, title, description: `${title} — demo data.`, priority, deadline: null },
  });
  if (!created.ok) {
    console.log(`  ! task "${title}" refused: ${created.status}`);
    failures += 1;
    return null;
  }
  if (status !== "Todo") {
    await call("PUT", `/tasks/${created.body.taskId}`, {
      token,
      body: { title, description: `${title} — demo data.`, status, priority },
    });
  }
  return created.body;
}

/** Buys an organization plan through the simulated provider so the workspace unlocks. */
async function buyOrganizationPlan(token, organizationId) {
  const plans = await call("GET", "/plans?audience=ORGANIZATION", { token });
  if (!plans.ok) throw new Error(`Cannot read the plan catalog: ${plans.status}`);

  const pro = plans.body.find((p) => p.code === "PRO_ORGANIZATION") ?? plans.body[0];
  if (!pro) throw new Error("No organization plan exists in the catalog.");

  const checkout = await call("POST", "/billing/checkout-sessions", {
    token,
    body: { planId: pro.planId, organizationId, idempotencyKey: `demo-org-${organizationId}` },
  });
  if (!checkout.ok) {
    console.log(`  ! checkout refused: ${checkout.status} ${JSON.stringify(checkout.body)}`);
    failures += 1;
    return;
  }

  const paymentId = checkout.body.paymentId ?? checkout.body.paymentTransactionId;
  if (paymentId == null) {
    console.log("  ! checkout returned no payment id; skipping the simulated settlement.");
    failures += 1;
    return;
  }

  const settled = await call("POST", `/test-payments/${paymentId}/simulate`, {
    token,
    body: { status: "SUCCEEDED" },
  });
  if (!settled.ok) {
    console.log(`  ! simulate refused: ${settled.status} ${JSON.stringify(settled.body)}`);
    failures += 1;
  }
}

async function main() {
  console.log(`Seeding demo data through ${API}`);

  const ownerToken = await ensureAccount(OWNER);
  console.log(`✓ owner ${OWNER.email}`);

  const mateIds = [];
  for (const mate of TEAMMATES) {
    await ensureAccount(mate);
    const found = await findUserByEmail(ownerToken, mate.email);
    if (found) mateIds.push({ ...mate, userId: found.userId });
  }
  console.log(`✓ ${mateIds.length} teammate account(s)`);

  // The Google-login account, if it has ever signed in. Never created here: registering it with a
  // password would shadow the identity they actually use.
  const target = await findUserByEmail(ownerToken, TARGET_EMAIL);
  if (target) {
    console.log(`✓ found ${TARGET_EMAIL} (user #${target.userId}) — will be staffed onto every project`);
  } else {
    console.log(`! ${TARGET_EMAIL} has never signed in, so it cannot be staffed. Sign in once, then re-run.`);
  }

  /** Staffs a project's team and hands the first two tasks to real people. */
  async function staff(project, createdTasks) {
    if (!project?.teamId) return;

    if (target) await addToTeam(ownerToken, project.teamId, target.userId, "LEADER");
    for (const mate of mateIds) {
      await addToTeam(ownerToken, project.teamId, mate.userId, "MEMBER");
    }

    const candidates = [target, ...mateIds].filter(Boolean);
    let assigned = 0;
    for (const [index, task] of createdTasks.filter(Boolean).slice(0, 3).entries()) {
      const who = candidates[index % candidates.length];
      if (!who) break;
      if (await assignTask(ownerToken, task.taskId, project.projectId, who.userId)) assigned += 1;
    }
    if (assigned > 0) console.log(`    ↳ ${assigned} task(s) assigned to real people`);
  }

  // Personal workspace.
  for (const spec of PERSONAL_PROJECTS) {
    const project = await createProject(ownerToken, spec);
    if (!project) continue;
    const created = [];
    for (const task of spec.tasks) {
      created.push(await createTask(ownerToken, project.projectId, task));
    }
    console.log(`✓ personal project "${spec.name}" with ${spec.tasks.length} task(s)`);
    await staff(project, created);
  }

  // Organization workspace.
  const org = await call("POST", "/organizations", {
    token: ownerToken,
    body: { name: "Acme Delivery", description: "Demo organization for UI testing." },
  });
  if (!org.ok) {
    console.log(`! organization not created: ${org.status} ${JSON.stringify(org.body)}`);
    failures += 1;
  } else {
    const organizationId = org.body.organizationId;
    console.log(`✓ organization "Acme Delivery" (#${organizationId})`);

    await buyOrganizationPlan(ownerToken, organizationId);
    console.log("✓ organization plan settled through the simulated provider");

    if (target) {
      await call("POST", `/organizations/${organizationId}/members`, {
        token: ownerToken,
        body: { email: TARGET_EMAIL, role: "ORG_ADMIN" },
      });
    }

    for (const [index, mate] of TEAMMATES.entries()) {
      const added = await call("POST", `/organizations/${organizationId}/members`, {
        token: ownerToken,
        body: { email: mate.email, role: index === 0 ? "ORG_ADMIN" : "MEMBER" },
      });
      if (!added.ok) {
        console.log(`  ! member ${mate.email} refused: ${added.status}`);
        failures += 1;
      }
    }
    console.log(`✓ ${TEAMMATES.length} organization member(s)`);

    for (const spec of ORG_PROJECTS) {
      const project = await createProject(ownerToken, { ...spec, organizationId });
      if (!project) continue;
      const created = [];
      for (const task of spec.tasks) {
        created.push(await createTask(ownerToken, project.projectId, task));
      }
      console.log(`✓ organization project "${spec.name}" with ${spec.tasks.length} task(s)`);
      await staff(project, created);
    }
  }

  console.log("");
  console.log(`Sign in as ${OWNER.email} / ${PASSWORD}`);
  if (target) console.log(`${TARGET_EMAIL} will see the same projects via team membership.`);
  console.log(failures === 0 ? "Done, no rejected calls." : `Done, but ${failures} call(s) were rejected — see above.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(String(err));
  process.exitCode = 1;
});
