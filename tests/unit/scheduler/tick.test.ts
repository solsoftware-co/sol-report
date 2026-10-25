import { describe, it, expect, vi, afterEach } from "vitest";
import { runTick } from "../../../src/scheduler/tick.js";
import { InvalidEnvironmentError } from "../../../src/lib/environment.js";
import { testEnv } from "../helpers.js";

const controller = { cron: "0 0 * * *", scheduledTime: Date.UTC(2026, 9, 26, 0, 0, 0) };

function logLines(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.map((args: unknown[]) => JSON.parse(String(args[0])));
}

describe("runTick", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs the window start from the tick's scheduled time, with a trace", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await runTick(controller, testEnv({ ENVIRONMENT: "staging" }));

    const [line] = logLines(log);
    expect(line).toMatchObject({
      level: "info",
      message: "scheduler tick",
      environment: "staging",
      cron: "0 0 * * *",
      windowStart: "2026-10-26T00:00:00.000Z",
    });
    expect(line.traceId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("starts a new trace on every tick", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await runTick(controller, testEnv());
    await runTick(controller, testEnv());

    const [first, second] = logLines(log);
    expect(first.traceId).not.toBe(second.traceId);
  });

  it("throws on a misconfigured ENVIRONMENT, so the cron run shows as failed", async () => {
    await expect(runTick(controller, testEnv({ ENVIRONMENT: "prod" }))).rejects.toThrow(InvalidEnvironmentError);
  });
});
