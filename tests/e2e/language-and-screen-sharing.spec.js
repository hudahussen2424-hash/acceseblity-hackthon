import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.use({ serviceWorkers: "block" });

const sections = JSON.parse(await readFile(new URL("../../demo/data/content.json", import.meta.url), "utf8"));

async function installScreenStubs(page, { android = false, denied = false } = {}) {
  await page.addInitScript(({ android, denied }) => {
    if (android) {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36"
      });
    }
    const track = {
      stopped: false,
      stop() { this.stopped = true; },
      addEventListener() {}
    };
    window.__screenTrack = track;
    window.__displayRequests = 0;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getDisplayMedia: async () => {
          window.__displayRequests++;
          if (denied) throw new DOMException("Permission denied", "NotAllowedError");
          return { getTracks: () => [track] };
        }
      }
    });
    class FakePeerConnection {
      constructor() {
        this.iceGatheringState = "complete";
        this.connectionState = "new";
        this.localDescription = null;
      }
      addTrack() {}
      async createOffer() { return { type: "offer", sdp: "test-offer" }; }
      async createAnswer() { return { type: "answer", sdp: "test-answer" }; }
      async setLocalDescription(description) { this.localDescription = description; }
      async setRemoteDescription() {
        this.connectionState = "connected";
        this.onconnectionstatechange?.();
      }
      close() { this.connectionState = "closed"; }
      addEventListener() {}
      removeEventListener() {}
    }
    window.RTCPeerConnection = FakePeerConnection;
  }, { android, denied });
}

async function stubScreenTicketApi(page, onTicket, { signalPostStatus = 200 } = {}) {
  let ticketNumber = 0;
  await page.route("**/api/v1/config", (route) => route.fulfill({ json: { externalAiConsentRequired: false } }));
  await page.route("**/api/v1/escalations", async (route) => {
    if (route.request().method() !== "POST") return route.fulfill({ status: 404 });
    const payload = route.request().postDataJSON();
    onTicket?.(payload);
    ticketNumber++;
    await route.fulfill({ status: 201, json: { ticketId: `screen-ticket-${ticketNumber}`, accessToken: "learner-secret" } });
  });
  await page.route(/\/api\/v1\/escalations\/[^/]+\/(?:signal|data)(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/signal") && request.method() === "POST") {
      return route.fulfill({ status: signalPostStatus, json: { stored: signalPostStatus < 300 } });
    }
    if (url.pathname.endsWith("/signal") && request.method() === "GET") {
      return route.fulfill({ json: { sdp: "test-answer" } });
    }
    if (url.pathname.endsWith("/signal") && request.method() === "DELETE") {
      return route.fulfill({ json: { deleted: true } });
    }
    if (url.pathname.endsWith("/data") && request.method() === "DELETE") {
      return route.fulfill({ json: { message: "Ticket data deleted." } });
    }
    return route.fulfill({ status: 404 });
  });
}

async function openEnglishPanel(assistant) {
  await assistant.evaluate((element) => element.setAttribute("lang", "en"));
  await expect.poll(() => assistant.evaluate((element) => element._pack?.lang)).toBe("en");
  await assistant.locator("#launcher").click();
}

test("locale selection returns localized course text and its stable source link", async ({ page }) => {
  await page.route("**/api/v1/config", (route) => route.fulfill({ json: { externalAiConsentRequired: false } }));
  await page.route("**/api/v1/ask", async (route) => {
    const { language } = route.request().postDataJSON();
    const section = sections[1];
    await route.fulfill({
      json: {
        answer: section.text[language],
        sources: [{ title: section.titles[language], url: section.url }]
      }
    });
  });
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.evaluate((element) => element.setAttribute("lang", "en"));
  await expect.poll(() => assistant.evaluate((element) => element._pack?.lang)).toBe("en");
  await assistant.locator("#launcher").click();
  await assistant.locator("#language-select").selectOption("ti");
  await expect.poll(() => assistant.evaluate((element) => element._pack?.lang)).toBe("ti");
  await assistant.locator("#question").fill(sections[1].titles.ti);
  await assistant.locator("#send").click();

  const reply = assistant.locator("#messages .message-assistant").last();
  await expect(reply.locator(".message-body")).toContainText(sections[1].text.ti.slice(0, 60));
  await expect(reply.locator("a.course-link")).toContainText(sections[1].titles.ti);
  await expect(reply.locator("a.course-link")).toHaveAttribute("href", sections[1].url);
  await expect(assistant.locator("#language-select")).toHaveValue("ti");
});

test("Arabic's incomplete translation and English fallbacks are disclosed", async ({ page }) => {
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.evaluate((element) => element.setAttribute("lang", "ar"));
  await expect.poll(() => assistant.evaluate((element) => element._pack?.lang)).toBe("ar");
  await assistant.locator("#launcher").click();

  await expect(assistant.locator("#locale-status")).toBeVisible();
  await expect(assistant.locator("#locale-status")).toContainText("غير مكتملة");
});

test("screen sharing requires consent and an explicit click, then exposes stop and cleans up", async ({ page }) => {
  await installScreenStubs(page);
  await stubScreenTicketApi(page);
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await openEnglishPanel(assistant);
  await assistant.getByRole("button", { name: "Talk to a person" }).click();
  await assistant.locator("#screen-share-start").click();
  await expect(assistant.locator("#screen-share-status")).toContainText("consent");
  expect(await page.evaluate(() => window.__displayRequests)).toBe(0);

  await assistant.locator("#screen-share-consent").check();
  await assistant.locator("#screen-share-start").click();
  await expect(assistant.locator("#screen-share-bar")).toBeVisible();
  await expect(assistant.locator("#screen-share-bar")).toContainText("You are sharing your screen");
  await expect(assistant.locator("#screen-share-stop")).toBeEnabled();
  expect(await page.evaluate(() => window.__displayRequests)).toBe(1);

  await assistant.locator("#screen-share-stop").click();
  await expect(assistant.locator("#screen-share-bar")).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__screenTrack.stopped)).toBe(true);
  await expect.poll(() => assistant.evaluate((element) => element._learnerTickets.length)).toBe(0);
});

test("denied screen permission produces an understandable status without creating a ticket", async ({ page }) => {
  await installScreenStubs(page, { denied: true });
  let ticketCreated = false;
  await stubScreenTicketApi(page, () => { ticketCreated = true; });
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await openEnglishPanel(assistant);
  await assistant.getByRole("button", { name: "Talk to a person" }).click();
  await assistant.locator("#screen-share-consent").check();
  await assistant.locator("#screen-share-start").click();
  await expect(assistant.locator("#screen-share-status")).toContainText("Screen access was not allowed");
  expect(ticketCreated).toBe(false);
  expect(await page.evaluate(() => window.__displayRequests)).toBe(1);
});

test("screen signaling network errors stop capture and show a readable error", async ({ page }) => {
  await installScreenStubs(page);
  await stubScreenTicketApi(page, null, { signalPostStatus: 503 });
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await openEnglishPanel(assistant);
  await assistant.getByRole("button", { name: "Talk to a person" }).click();
  await assistant.locator("#screen-share-consent").check();
  await assistant.locator("#screen-share-start").click();
  await expect(assistant.locator("#screen-share-status")).toContainText("Screen sharing could not start");
  await expect.poll(() => page.evaluate(() => window.__screenTrack.stopped)).toBe(true);
});

test("Android Chrome uses consented page context and never starts display capture", async ({ page }) => {
  let ticketPayload;
  await installScreenStubs(page, { android: true });
  await stubScreenTicketApi(page, (payload) => { ticketPayload = payload; });
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await openEnglishPanel(assistant);
  await assistant.getByRole("button", { name: "Talk to a person" }).click();
  await expect(assistant.locator("#screen-share-start")).toBeHidden();
  await expect(assistant.locator("#screen-context-start")).toBeVisible();
  await assistant.locator("#screen-screenshot").setInputFiles({
    name: "learner-selected.png",
    mimeType: "image/png",
    buffer: Buffer.from("learner-selected-image")
  });
  await assistant.locator("#screen-context-start").click();
  await expect(assistant.locator("#screen-share-status")).toContainText("consent");
  await assistant.locator("#screen-share-consent").check();
  await assistant.locator("#screen-context-start").click();
  await expect(assistant.locator("#screen-share-status")).toContainText("Page details were sent");

  expect(ticketPayload.type).toBe("screen-context");
  expect(ticketPayload.screenContext.pageUrl).toContain("/demo/blank.html");
  expect(ticketPayload.screenContext).toHaveProperty("focusedAccessibleName");
  expect(ticketPayload.screenContext).toHaveProperty("focusedOuterHTML");
  expect(ticketPayload.screenContext).toHaveProperty("headings");
  expect(ticketPayload.screenContext.screenshot.dataUrl).toMatch(/^data:image\/png;base64,/);
  expect(await page.evaluate(() => window.__displayRequests)).toBe(0);
});

test("helper inbox receives localized conversation metadata and submits a WebRTC answer", async ({ page, request }) => {
  await installScreenStubs(page);
  const create = await request.post("/api/v1/escalations", {
    data: { type: "screen-share", conversation: [{ text: "Tigrinya request", lang: "ti" }], language: "ti", page: "https://example.test/lesson", note: "" }
  });
  expect(create.status()).toBe(201);
  const ticketId = (await create.json()).ticketId;
  const signalUrl = `/api/v1/escalations/${ticketId}/signal`;
  const helperHeaders = { "X-Helper-Token": "e2e-helper-token" };
  await request.post(signalUrl, { data: { type: "offer", sdp: "test-offer" } });
  try {
    await page.goto("/helper");
    await page.locator("#token").fill("e2e-helper-token");
    await page.getByRole("button", { name: "Load waiting requests" }).click();
    const ticket = page.locator(".ticket").filter({ hasText: ticketId });
    await expect(ticket).toBeVisible();
    await expect(ticket.locator(".conversation li").first()).toHaveAttribute("lang", "ti");
    await ticket.getByRole("button", { name: "Connect to learner screen" }).click();
    await expect(ticket.locator(".screen-demo")).toContainText("Answer sent");
    const answer = await request.get(`${signalUrl}?type=answer`);
    expect((await answer.json()).sdp).toBe("test-answer");
    await page.evaluate(() => {
      const peer = [...screenPeers.values()][0];
      peer.connectionState = "disconnected";
      peer.onconnectionstatechange();
    });
    await expect(ticket.locator(".screen-demo")).toContainText("Connection interrupted");
  } finally {
    await request.delete(`/api/v1/escalations/${ticketId}`, { headers: helperHeaders });
  }
});
