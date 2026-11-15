import { defineConfig } from "@playwright/test";
import e2eConfig from "./playwright.config.js";

export default defineConfig({
  ...e2eConfig,
  use: {
    ...e2eConfig.use,
    headless: false
  }
});
