import { describe, it, expect } from "vitest";

const PREVIEW_URL = process.env.PREVIEW_URL;

describe.skipIf(!PREVIEW_URL)("E2E smoke tests", () => {
  it("GET /health returns 200 in the preview environment", async () => {
    const res = await fetch(`${PREVIEW_URL}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toMatchObject({ success: true, data: { status: "ok", environment: "preview" } });
  });

  it("serves nothing but /health", async () => {
    const res = await fetch(`${PREVIEW_URL}/`);
    expect(res.status).toBe(404);
  });
});
