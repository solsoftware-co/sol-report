import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { withLogScope } from "../lib/log-context.js";
import { logger } from "../lib/logger.js";
import type { Env } from "../types/index.js";

// One instance per report occurrence, created by the daily scheduler. It
// sleeps until the report's send time, then builds and sends the report
// (sol-brain/sol-report/02-architecture.md, "Workflow: steps").
//
// Scaffold only (phase 1): the binding and class exist so every environment
// deploys its workflow; the scheduler doesn't create instances until phase 2.
export interface ReportParams {
  analyticsReportId: string;
  /** The tick's trace, kept for every log line of this run. */
  traceId: string;
}

export class ReportWorkflow extends WorkflowEntrypoint<Env, ReportParams> {
  async run(event: Readonly<WorkflowEvent<ReportParams>>, _step: WorkflowStep): Promise<void> {
    const { analyticsReportId, traceId } = event.payload;
    withLogScope({ environment: this.env.ENVIRONMENT, traceId, analyticsReportId }, () => {
      logger.info("report workflow started (not implemented yet)");
    });
  }
}
