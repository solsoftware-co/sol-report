import type { ReportParams } from "../workflows/report.js";

export interface Env {
  ENVIRONMENT: string;
  SOL_API: Fetcher;
  REPORT_WORKFLOW: Workflow<ReportParams>;
  /** Released package.json version, injected at deploy time by CI (release.yml). Unset locally. */
  APP_VERSION?: string;
}

export type AppEnv = {
  Bindings: Env;
};
