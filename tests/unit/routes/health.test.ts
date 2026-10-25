import { describe, it, expect, vi } from "vitest";
import worker from "../../../src/index.js";
import { testEnv } from "../helpers.js";

function get(path: string, env = testEnv()) {
  return worker.fetch(new Request(`http://sol-report${path}`), env, {} as ExecutionContext);
}

describe("GET /health", () => {
  it("reports status, environment and version", async () => {
    const res = await get("/health", testEnv({ ENVIRONMENT: "staging", APP_VERSION: "1.2.3" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { status: "ok", environment: "staging", version: "1.2.3" },
    });
  });

  it("reports version 'unknown' when APP_VERSION isn't set (local dev)", async () => {
    const res = await get("/health");
    const body = (await res.json()) as { data: { version: string } };
    expect(body.data.version).toBe("unknown");
  });

  it("fails on a misconfigured ENVIRONMENT, with the error envelope and a log line", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await get("/health", testEnv({ ENVIRONMENT: "prod" }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
    expect(JSON.parse(String(error.mock.calls[0][0]))).toMatchObject({ level: "error", message: "unhandled error" });
    error.mockRestore();
  });

  it("has no other routes", async () => {
    const res = await get("/");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ success: false, error: { code: "NOT_FOUND", message: "Not found" } });
  });
});
