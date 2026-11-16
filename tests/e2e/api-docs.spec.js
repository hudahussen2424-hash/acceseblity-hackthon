import { test, expect } from "@playwright/test";

test("API docs route renders the OpenAPI schema", async ({ page }) => {
  const schemaResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/openapi.json")
  );
  const pageResponse = await page.goto("/docs");
  expect(pageResponse.status()).toBe(200);

  const schemaResponse = await schemaResponsePromise;
  expect(schemaResponse.status()).toBe(200);
  await expect(page.locator(".swagger-ui")).toBeVisible();
  await expect(page.getByRole("heading", {
    name: /Learning Assistant & Course Escalations API/
  })).toBeVisible();
});
