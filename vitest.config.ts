import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

// Like sol-gate, this doesn't load wrangler.toml: this pool version (0.5.x,
// matching wrangler 3) can't run Workflows, and refuses to start with
// wrangler.toml's REPORT_WORKFLOW binding. Nothing needs it — every test
// passes its own env (fake bindings, fake workflow). Keep these in sync with
// wrangler.toml.
export default defineWorkersConfig({
  test: {
    exclude: ["tests/e2e/**", "node_modules/**"],
    poolOptions: {
      workers: {
        miniflare: {
          compatibilityDate: "2024-09-23",
          compatibilityFlags: ["nodejs_compat"],
        },
      },
    },
  },
});
