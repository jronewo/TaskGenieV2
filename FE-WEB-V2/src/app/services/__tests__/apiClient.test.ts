import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest, setAccessToken, setUnauthorizedHandler } from "../apiClient";

/**
 * The HTTP client is the single seam every screen goes through, so its contract is worth pinning:
 * the Bearer token must be attached to authenticated calls and withheld from pre-auth ones, and a
 * 401 must only trigger the session-recovery hook when a token was actually sent.
 */
describe("apiClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    setAccessToken(null);
    setUnauthorizedHandler(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const ok = (body: unknown) =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(body)),
    } as Response);

  const fail = (status: number, body: unknown) =>
    Promise.resolve({
      ok: false,
      status,
      text: () => Promise.resolve(JSON.stringify(body)),
    } as Response);

  it("attaches the Bearer token to authenticated requests", async () => {
    setAccessToken("token-123");
    fetchMock.mockReturnValue(ok({ value: 1 }));

    await apiRequest("/things");

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-123");
  });

  it("never sends the token on pre-auth calls", async () => {
    setAccessToken("token-123");
    fetchMock.mockReturnValue(ok({}));

    await apiRequest("/auth/login", { method: "POST", body: "{}", authenticated: false });

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("sets a JSON content type only when there is a body", async () => {
    fetchMock.mockReturnValue(ok({}));
    await apiRequest("/things");
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>)["Content-Type"]).toBeUndefined();

    fetchMock.mockReturnValue(ok({}));
    await apiRequest("/things", { method: "POST", body: "{}" });
    expect((fetchMock.mock.calls[1][1].headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("surfaces the server's message on an error response", async () => {
    fetchMock.mockReturnValue(fail(403, { message: "You do not have access." }));

    await expect(apiRequest("/things")).rejects.toMatchObject({
      status: 403,
      message: "You do not have access.",
    });
  });

  it("preserves a quota rejection's code and figures for the UI", async () => {
    fetchMock.mockReturnValue(
      fail(403, { code: "PLAN_UPGRADE_REQUIRED", message: "Limit reached.", limit: 2, usage: 2 })
    );

    const error = await apiRequest("/projects", { method: "POST", body: "{}" }).catch((e) => e as ApiError);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).details).toMatchObject({ code: "PLAN_UPGRADE_REQUIRED", limit: 2, usage: 2 });
  });

  it("exposes validation errors as details", async () => {
    fetchMock.mockReturnValue(fail(400, { errors: { name: ["Name is required."] } }));

    const error = await apiRequest("/things", { method: "POST", body: "{}" }).catch((e) => e as ApiError);

    expect((error as ApiError).message).toBe("Validation failed.");
    expect((error as ApiError).details).toMatchObject({ name: ["Name is required."] });
  });

  it("triggers session recovery when an authenticated call is rejected", async () => {
    const onUnauthorized = vi.fn();
    setAccessToken("token-123");
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockReturnValue(fail(401, { message: "expired" }));

    await apiRequest("/things").catch(() => {});

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does not trigger session recovery for a failed sign-in", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockReturnValue(fail(401, { message: "bad credentials" }));

    // Wrong password must read as invalid credentials, not as a dead session.
    await apiRequest("/auth/login", { method: "POST", body: "{}", authenticated: false }).catch(() => {});

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("returns undefined for a 204 rather than trying to parse a body", async () => {
    fetchMock.mockReturnValue(
      Promise.resolve({ ok: true, status: 204, text: () => Promise.resolve("") } as Response)
    );

    await expect(apiRequest("/things", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
