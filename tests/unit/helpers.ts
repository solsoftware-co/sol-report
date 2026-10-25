import type { Env } from "../../src/types/index.js";

/** A test env: no real bindings — a call a test didn't fake fails loudly. */
export function testEnv(overrides: Partial<Env> = {}): Env {
  return {
    ENVIRONMENT: "development",
    SOL_API: {
      fetch: async () =>
        Response.json(
          { success: false, error: { code: "INTERNAL_ERROR", message: "SOL_API not faked in this test" } },
          { status: 503 }
        ),
    } as unknown as Fetcher,
    REPORT_WORKFLOW: {
      create: async () => {
        throw new Error("REPORT_WORKFLOW not faked in this test");
      },
    } as unknown as Env["REPORT_WORKFLOW"],
    ...overrides,
  };
}
