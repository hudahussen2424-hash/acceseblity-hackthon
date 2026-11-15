import { defineConfig } from "@playwright/test";

const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://127.0.0.1:8000",
    browserName: "chromium",
    headless: true
  },
  webServer: [
    {
      command: `${python} -m http.server 8000 --bind 127.0.0.1`,
      url: "http://127.0.0.1:8000/demo/blank.html",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    },
    {
      command: `${python} -m uvicorn api.main:app --host 127.0.0.1 --port 8001`,
      url: "http://127.0.0.1:8001/openapi.json",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        AI_PROVIDER: "none",
        HELPER_TOKEN: "e2e-helper-token",
        ESCALATIONS_DB: "tests/e2e/playwright-escalations.sqlite3"
      }
    }
  ]
});
