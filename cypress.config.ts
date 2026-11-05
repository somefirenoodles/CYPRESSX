import { defineConfig } from "cypress";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export default defineConfig({
  video: false,
  e2e: {
    baseUrl: "http://127.0.0.1:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: false,
    defaultCommandTimeout: 8000,
    setupNodeEvents(on, config) {
      let startedAt = new Date().toISOString();
      on("before:run", () => { startedAt = new Date().toISOString(); });
      on("after:run", (result) => {
        if (!("runs" in result)) return;
        const directory = join(config.projectRoot, "reports");
        mkdirSync(directory, { recursive: true });
        writeFileSync(join(directory, "cypress.json"), JSON.stringify({
          startedAt,
          browser: result.browserName,
          tests: result.runs.flatMap((run) => (run.tests ?? []).map((test) => ({
            runner: "cypress", path: run.spec.relative.replaceAll("\\", "/"),
            title: test.title.join(" "), status: test.state === "passed" ? "passed" : test.state === "failed" ? "failed" : "skipped",
          }))),
        }, null, 2));
      });
      return config;
    },
  },
});
