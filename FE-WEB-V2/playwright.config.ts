import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against the real API (http://localhost:5258) backed by the Docker SQL Server UAT
 * database — no mocks. Start the API before running:
 *   dotnet run --project src/TaskGenie.API/TaskGenie.API.csproj --launch-profile http
 *
 * Uses the installed Microsoft Edge (channel: msedge) rather than downloading a browser.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shared UAT database — keep runs deterministic
  retries: 0,
  reporter: [["list"]],
  timeout: 45_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
  ],
  webServer: {
    command:
      "/Users/jronehuynh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
