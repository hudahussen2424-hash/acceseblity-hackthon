import { test, expect } from "@playwright/test";

test("cloud AI asks are explicitly consented to before external processing", async ({ page }) => {
  const askPayloads = [];
  await page.route("**/api/v1/config", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ externalAiConsentRequired: true })
  }));
  await page.route("**/api/v1/ask", async (route) => {
    askPayloads.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        answer: "A course excerpt.",
        sources: [{ title: "Course section", url: "/savanna/pages/concept-with-navigation.html#section" }]
      })
    });
  });

  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.locator("#launcher").click();
  const consent = assistant.locator("#cloud-consent");
  await expect(consent).toBeVisible();

  await assistant.locator("#question").fill("First question");
  await assistant.locator("#send").click();
  await expect.poll(() => askPayloads.length).toBe(1);
  expect(askPayloads[0].externalAiConsent).toBe(false);

  await consent.check();
  await assistant.locator("#question").fill("Second question");
  await assistant.locator("#send").click();
  await expect.poll(() => askPayloads.length).toBe(2);
  expect(askPayloads[1].externalAiConsent).toBe(true);
});

test("job posting JSON-LD stays synchronized with the rendered listing data", async ({ page }) => {
  await page.goto("/savanna/pages/jobs.html");
  await expect(page.locator("#job-status")).toContainText("8 TEST jobs loaded.");

  const result = await page.evaluate(async () => {
    const jobs = await fetch("../../demo/data/jobs.json").then((response) => response.json());
    const script = document.querySelector('script[type="application/ld+json"]');
    const graph = JSON.parse(script.textContent)["@graph"];
    return {
      jobs: jobs.map((job) => ({
        title: job.title,
        url: new URL(job.url, window.location.href).href
      })),
      postings: graph.map((posting) => ({ title: posting.title, url: posting.url }))
    };
  });

  expect(result.postings).toEqual(result.jobs);
});
