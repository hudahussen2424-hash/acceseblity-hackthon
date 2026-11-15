import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const sections = JSON.parse(await readFile(new URL("../../demo/data/content.json", import.meta.url), "utf8"));
const question = sections[1].text.en;

test("offline questions can be edited, retried after failure, and removed", async ({ page, context }) => {
  let acceptAsk = false;
  const sentQuestions = [];
  await page.route("**/api/v1/ask", async (route) => {
    sentQuestions.push(route.request().postDataJSON().question);
    if (!acceptAsk) {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        answer: "The queued question was answered.",
        answerStatus: "answered",
        sources: [{ title: "Course section", url: "/lesson#course-section" }]
      })
    });
  });

  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.evaluate((element) => element.setAttribute("lang", "en"));
  await page.waitForFunction(() => {
    const element = document.querySelector("db-assistant");
    return element?._sections?.length && element?._searchModule?.search;
  });
  await assistant.locator("#launcher").click();

  await context.setOffline(true);
  try {
    await assistant.locator("#question").fill(question);
    await assistant.locator("#send").click();
    const queued = assistant.locator("#offline-queue .queue-item").first();
    await expect(queued).toContainText(question.slice(0, 40));
    await expect(assistant.locator(".message-assistant .evidence-label").first()).toContainText("available offline");

    await queued.getByRole("button", { name: "Edit" }).click();
    const editor = queued.locator(".queue-editor");
    const revisedQuestion = `${question} Please explain.`;
    await editor.getByRole("textbox").fill(revisedQuestion);
    await editor.getByRole("button", { name: "Save" }).click();
    await expect(queued.locator(".queue-question")).toHaveText(revisedQuestion);

    await context.setOffline(false);
    await expect(queued.locator(".queue-status")).toContainText("still queued");
    await expect.poll(() => sentQuestions.length).toBe(1);

    acceptAsk = true;
    await queued.getByRole("button", { name: "Retry" }).click();
    await expect(assistant.locator("#offline-queue")).toBeHidden();
    await expect(assistant.locator("#offline-queue-status")).toContainText("Queued question sent");
    await expect(assistant.locator("#messages")).toContainText("The queued question was answered.");
    expect(sentQuestions[1]).toBe(revisedQuestion);

    await context.setOffline(true);
    await assistant.locator("#question").fill(question);
    await assistant.locator("#send").click();
    const secondQueued = assistant.locator("#offline-queue .queue-item").first();
    await expect(secondQueued).toBeVisible();
    await secondQueued.getByRole("button", { name: "Remove" }).click();
    await expect(assistant.locator("#offline-queue")).toBeHidden();
  } finally {
    await context.setOffline(false);
  }
});

test("duplicate form submissions send one question", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/api/v1/ask", async (route) => {
    requestCount++;
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        answer: "One answer.",
        answerStatus: "answered",
        sources: [{ title: "Course section", url: "/lesson#course-section" }]
      })
    });
  });
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.evaluate((element) => element.setAttribute("lang", "en"));
  await assistant.locator("#launcher").click();
  await assistant.locator("#question").fill(question);
  await assistant.locator("#form").evaluate((form) => {
    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await expect(assistant.locator("#messages")).toContainText("One answer.");
  expect(requestCount).toBe(1);
});

test("not-found API answers explicitly identify missing course evidence", async ({ page }) => {
  await page.route("**/api/v1/ask", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      answer: "I could not find this in the course.",
      answerStatus: "not_found",
      sources: []
    })
  }));
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.evaluate((element) => element.setAttribute("lang", "en"));
  await assistant.locator("#launcher").click();
  await assistant.locator("#question").fill("A question with no matching course content.");
  await assistant.locator("#send").click();
  await expect(assistant.locator(".message-assistant .evidence-label")).toContainText("No matching answer");
  await expect(assistant.locator(".message-assistant a.course-link")).toHaveCount(0);
});
