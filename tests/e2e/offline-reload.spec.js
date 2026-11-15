import { test, expect } from "@playwright/test";

test("the Compose lesson and assistant reload from the root service-worker cache offline", async ({ page, context }) => {
  const lesson = "/savanna/pages/concept-with-navigation.html";
  await page.goto(lesson);
  await expect(page.locator("db-assistant #launcher")).toBeEnabled();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise((resolve, reject) => {
      if (navigator.serviceWorker.controller) return resolve();
      const timeout = setTimeout(() => reject(new Error("Service worker did not control the lesson page.")), 5000);
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  });

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole("heading", { name: "The Future of Virtual Assistant Work" })).toBeVisible();
    await expect(page.locator("db-assistant #launcher")).toBeEnabled();
  } finally {
    await context.setOffline(false);
  }
});
