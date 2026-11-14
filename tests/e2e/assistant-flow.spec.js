import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const sections = JSON.parse(await readFile(new URL("../../demo/data/content.json", import.meta.url), "utf8"));
const amharicQuestion = sections[1].text.am;

test("Amharic question gets a source and a person request returns a ticket ID", async ({ page }) => {
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.evaluate((element) => element.setAttribute("api", "http://127.0.0.1:8001"));
  await assistant.locator("#launcher").click();
  await assistant.locator("#question").fill(amharicQuestion);
  await assistant.locator("#send").click();

  const answer = assistant.locator("#messages .message-assistant").last();
  await expect(answer).toContainText(amharicQuestion.slice(0, 24));
  await expect(answer.locator("a.course-link")).toHaveAttribute("href", /concept-with-navigation\.html#/);

  const ticketIdPromise = assistant.evaluate((element) => new Promise((resolve) => {
    element.addEventListener("db-assistant:escalated", (event) => resolve(event.detail.ticketId), { once: true });
  }));
  await assistant.getByRole("button", { name: "Talk to a person" }).click();
  await assistant.locator("#send-escalation").click();
  const ticketId = await ticketIdPromise;
  expect(ticketId).toMatch(/^[0-9a-f-]{36}$/i);
});
