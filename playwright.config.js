import { defineConfig } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const port = Number(process.env.E2E_PORT || 18010);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("E2E_PORT must be a valid TCP port.");
}
const baseURL = `http://127.0.0.1:${port}`;
const database = process.env.E2E_DB_PATH || path.join(os.tmpdir(), `db-assistant-e2e-${process.pid}.sqlite3`);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL,
    browserName: "chromium",
    headless: true
  },
  webServer: {
    command: `${python} -m uvicorn api.main:app --host 127.0.0.1 --port ${port}`,
    url: `${baseURL}/openapi.json`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      AI_PROVIDER: "none",
      OFFLINE_MODE: "true",
      HELPER_TOKEN: "e2e-helper-token",
      ESCALATIONS_DB: database,
      TELEGRAM_BOT_TOKEN: "",
      WEBHOOK_URL: ""
    }
  }
});
