import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const sections = JSON.parse(await readFile(new URL("../../demo/data/content.json", import.meta.url), "utf8"));
const amharicQuestion = sections[1].text.am;

test("Amharic answer is linked and learners can follow up on a queued tutor request", async ({ page, request }) => {
  const contentResponse = await request.post("http://127.0.0.1:8001/api/v1/content", { data: sections });
  expect(contentResponse.status()).toBe(200);
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
  await expect(answer.locator("a.course-link")).toHaveCount(1);
  await assistant.locator("#language-select").selectOption("en");

  const ticketIdPromise = assistant.evaluate((element) => new Promise((resolve) => {
    element.addEventListener("db-assistant:escalated", (event) => resolve(event.detail.ticketId), { once: true });
  }));
  await assistant.getByRole("button", { name: "Talk to a person" }).click();
  await assistant.locator("#send-escalation").click();
  const ticketId = await ticketIdPromise;
  expect(ticketId).toMatch(/^[0-9a-f-]{36}$/i);
  await expect(assistant.locator("#check-tutor-reply")).toBeVisible();
  await expect(assistant.locator("#tutor-availability")).toContainText(/response times vary/i);

  const ticketUrl = `http://127.0.0.1:8001/api/v1/escalations/${ticketId}/reply`;
  const helperHeaders = { "X-Helper-Token": "e2e-helper-token" };
  const updateResponse = await request.post(ticketUrl, {
    headers: helperHeaders,
    data: { text: "I am unavailable right now; I will follow up later.", resolve: false }
  });
  expect(updateResponse.status()).toBe(200);
  await assistant.locator("#check-tutor-reply").click();
  await expect(assistant.locator("#messages .message-assistant").last()).toContainText("I am unavailable right now");
  await expect(assistant.locator("#check-tutor-reply")).toBeVisible();

  await page.reload();
  const returnedAssistant = page.locator("db-assistant");
  await expect(returnedAssistant.locator("#launcher")).toBeEnabled();
  await returnedAssistant.evaluate((element) => element.setAttribute("api", "http://127.0.0.1:8001"));
  await returnedAssistant.evaluate((element) => element.setAttribute("lang", "en"));
  await expect(returnedAssistant.locator("#language-select")).toHaveValue("en");
  await returnedAssistant.locator("#launcher").click();
  await returnedAssistant.getByRole("button", { name: "Talk to a person" }).click();
  await expect(returnedAssistant.locator("#check-tutor-reply")).toBeVisible();

  const finalReplyResponse = await request.post(ticketUrl, {
    headers: helperHeaders,
    data: { text: "I am available now and can help.", resolve: true }
  });
  expect(finalReplyResponse.status()).toBe(200);
  await returnedAssistant.locator("#check-tutor-reply").click();
  await expect(returnedAssistant.locator("#messages .message-assistant").last()).toContainText("I am available now");
  await expect(returnedAssistant.locator("#check-tutor-reply")).toBeHidden();

  await expect(returnedAssistant.locator("#ticket-data")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await returnedAssistant.locator("#export-ticket-data").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`tutor-request-${ticketId}.json`);
  const learnerTicket = await returnedAssistant.evaluate((element) => {
    const stored = JSON.parse(localStorage.getItem(`${element._storageKey}:learner-tickets`) || "[]");
    return stored.find((ticket) => ticket.ticketId === element._pendingTutorTicketId) || stored[0];
  });
  const exportedData = await request.get(`http://127.0.0.1:8001/api/v1/escalations/${ticketId}/data`, {
    headers: { "X-Learner-Token": learnerTicket.accessToken }
  });
  expect(exportedData.status()).toBe(200);
  expect((await exportedData.json()).reply).toBe("I am available now and can help.");

  page.once("dialog", (dialog) => dialog.accept());
  await returnedAssistant.locator("#delete-ticket-data").click();
  await expect(returnedAssistant.locator("#ticket-data-status")).toContainText("deleted");
  await expect(returnedAssistant.locator("#ticket-data")).toBeHidden();
  expect((await request.get(`http://127.0.0.1:8001/api/v1/escalations/${ticketId}/data`, {
    headers: { "X-Learner-Token": learnerTicket.accessToken }
  })).status()).toBe(404);

  page.once("dialog", (dialog) => dialog.accept());
  await returnedAssistant.locator("#clear-local-data").click();
  await expect(returnedAssistant.locator("#escalation-status")).toContainText("Local assistant data cleared");
  await expect(returnedAssistant.locator("#messages .message")).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), await returnedAssistant.evaluate((element) => element._storageKey))).toBeNull();
});

test("helper can send an interim update and later close the same ticket", async ({ page, request }) => {
  const createResponse = await request.post("http://127.0.0.1:8001/api/v1/escalations", {
    data: { conversation: [], language: "en", page: "https://example.test/lesson", note: "Follow-up test" }
  });
  expect(createResponse.status()).toBe(201);
  const ticketId = (await createResponse.json()).ticketId;
  const helperHeaders = { "X-Helper-Token": "e2e-helper-token" };
  const ticketUrl = `http://127.0.0.1:8001/api/v1/escalations/${ticketId}`;
  try {
    await page.goto("http://127.0.0.1:8001/helper");
    await page.locator("#token").fill("e2e-helper-token");
    await page.getByRole("button", { name: "Load waiting requests" }).click();
    const ticket = page.locator(".ticket").filter({ hasText: ticketId });
    await expect(ticket).toBeVisible();
    await ticket.locator("textarea").fill("I am unavailable right now; I will follow up later.");
    await ticket.locator('input[type="checkbox"]').check();
    await ticket.getByRole("button", { name: "Send reply" }).click();
    await expect(ticket).toContainText("remains open for follow-up");
    await expect(ticket.getByRole("button", { name: "Send reply" })).toBeEnabled();

    await ticket.locator("textarea").fill("I am available now and can help.");
    await ticket.locator('input[type="checkbox"]').uncheck();
    await ticket.getByRole("button", { name: "Send reply" }).click();
    await expect(ticket).toHaveCount(0);
  } finally {
    await request.delete(ticketUrl, { headers: helperHeaders });
  }
});
