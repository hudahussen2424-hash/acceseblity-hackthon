import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const sections = JSON.parse(await readFile(new URL("../../demo/data/content.json", import.meta.url), "utf8"));

test("learner feedback is visible to helpers without storing the question", async ({ page, request }) => {
  const feedbackSection = {
    ...sections[1],
    id: `feedback-e2e-${Date.now()}`,
    url: "/lesson#feedback-e2e"
  };
  const contentResponse = await request.post("http://127.0.0.1:8001/api/v1/content", { data: [feedbackSection] });
  expect(contentResponse.status()).toBe(200);

  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.evaluate((element) => element.setAttribute("api", "http://127.0.0.1:8001"));
  await assistant.locator("#launcher").click();
  await assistant.locator("#question").fill(feedbackSection.text.en);
  await assistant.locator("#send").click();
  const answer = assistant.locator("#messages .message-assistant").last();
  await expect(answer.locator("a.course-link")).toHaveAttribute("href", "/lesson#feedback-e2e");
  await answer.getByRole("button", { name: "Flag as incorrect" }).click();
  await expect(answer.locator('[role="status"]')).toContainText("without your question text");

  await page.goto("/helper");
  await page.locator("#token").fill("e2e-helper-token");
  await page.getByRole("button", { name: "Review answer feedback" }).click();
  const feedback = page.locator("#feedback-list li").filter({ hasText: "/lesson#feedback-e2e" });
  await expect(feedback).toContainText("incorrect (source)");
  await feedback.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.locator("#status")).toContainText("0 unreviewed feedback");
  await expect(feedback).toContainText("Reviewed");
});
