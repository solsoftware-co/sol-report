import { parseEnvironment } from "../lib/environment.js";
import { withLogScope } from "../lib/log-context.js";
import { logger } from "../lib/logger.js";
import type { Env } from "../types/index.js";

// The daily 00:00 UTC tick. Phase 2 makes it find every report due in
// [scheduledTime, scheduledTime + 24h) and start one ReportWorkflow per
// occurrence; for now it only proves the trigger fires in each environment.
export async function runTick(controller: Pick<ScheduledController, "cron" | "scheduledTime">, env: Env): Promise<void> {
  const traceId = crypto.randomUUID();
  await withLogScope({ environment: env.ENVIRONMENT, traceId }, async () => {
    // Fail fast on a misconfigured ENVIRONMENT, same as every request in the
    // other services.
    parseEnvironment(env.ENVIRONMENT);

    // The window starts at the tick's scheduled time, not "now", so a tick
    // that starts late doesn't shift it.
    logger.info("scheduler tick", {
      cron: controller.cron,
      windowStart: new Date(controller.scheduledTime).toISOString(),
    });
  });
}
