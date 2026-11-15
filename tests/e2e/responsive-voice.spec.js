import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.use({ serviceWorkers: "block" });

const sections = JSON.parse(await readFile(new URL("../../demo/data/content.json", import.meta.url), "utf8"));
const amStrings = JSON.parse(await readFile(new URL("../../module/i18n/am.json", import.meta.url), "utf8")).strings;
const englishQuestion = sections[1].text.en;
const amharicQuestion = sections[1].text.am;

async function stubAssistantApi(page) {
  const languages = [];
  await page.route("**/api/v1/config", (route) => route.fulfill({ json: { externalAiConsentRequired: false } }));
  await page.route("**/api/v1/ask", async (route) => {
    const { language } = route.request().postDataJSON();
    languages.push(language);
    await route.fulfill({
      json: {
        answer: language === "am" ? sections[1].text.am : sections[1].text.en,
        sources: [{ url: "https://example.test/course#section", title: "Course section" }]
      }
    });
  });
  return languages;
}

test("assistant stays within narrow viewports and page controls remain keyboard reachable", async ({ page }) => {
  for (const viewport of [{ width: 640, height: 800 }, { width: 320, height: 720 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/demo/blank.html");
    const assistant = page.locator("db-assistant");
    await expect(assistant.locator("#launcher")).toBeEnabled();
    await assistant.evaluate((element) => {
      const control = document.createElement("button");
      control.id = "page-control";
      control.textContent = "Page control";
      control.style.cssText = "position:fixed;inset:8px auto auto 8px;z-index:2147483647;min-height:44px";
      control.addEventListener("click", () => control.dataset.activated = "true");
      element.after(control);
    });
    await assistant.locator("#launcher").click();

    const panelBox = await assistant.locator("#panel").boundingBox();
    const controlBox = await page.locator("#page-control").boundingBox();
    expect(panelBox.width).toBe(viewport.width);
    expect(panelBox.height).toBeLessThanOrEqual(Math.ceil(viewport.height * 0.7));
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height);
    expect(controlBox.y + controlBox.height).toBeLessThanOrEqual(panelBox.y);

    let pageControlFocused = false;
    for (let tab = 0; tab < 24; tab++) {
      pageControlFocused = await page.evaluate(() => document.activeElement?.id === "page-control");
      if (pageControlFocused) break;
      await page.keyboard.press("Tab");
    }
    expect(pageControlFocused).toBeTruthy();
    await page.keyboard.press("Enter");
    await expect(page.locator("#page-control")).toHaveAttribute("data-activated", "true");
  }
});

test("speech recognition fills the question for review without sending it", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeSpeechRecognition {
      start() {
        window.__recognizedLanguage = this.lang;
        setTimeout(() => this.onresult?.({ results: [[{ transcript: "recognized test words" }]] }), 0);
      }
      stop() {}
    }
    Object.defineProperty(window, "SpeechRecognition", { value: FakeSpeechRecognition, configurable: true });
  });
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.evaluate((element) => element.setAttribute("lang", "en"));
  await assistant.locator("#launcher").click();
  await assistant.locator("#microphone").click();

  await expect(assistant.locator("#question")).toHaveValue("recognized test words");
  await expect(assistant.locator("#voice-status")).toContainText("Review it before sending");
  expect(await page.evaluate(() => window.__recognizedLanguage)).toBe("en-US");
  await expect(assistant.locator("#messages .message-user")).toHaveCount(0);

  await assistant.evaluate((element) => element.setAttribute("lang", "am"));
  await expect(assistant.locator("#language-select")).toHaveValue("am");
  await assistant.locator("#microphone").click();
  await expect(assistant.locator("#question")).toHaveValue("recognized test words");
  expect(await page.evaluate(() => window.__recognizedLanguage)).toBe("am-ET");
  await expect(assistant.locator("#messages .message-user")).toHaveCount(0);

  for (const [language, tag] of [["ti", "ti-ET"], ["om", "om-ET"], ["so", "so-SO"], ["ar", "ar-SA"]]) {
    await assistant.locator("#language-select").selectOption(language);
    await expect.poll(() => assistant.evaluate((element) => element._pack?.lang)).toBe(language);
    await assistant.locator("#microphone").click();
    await expect(assistant.locator("#question")).toHaveValue("recognized test words");
    expect(await page.evaluate(() => window.__recognizedLanguage)).toBe(tag);
    await expect(assistant.locator("#messages .message-user")).toHaveCount(0);
  }
});

test("unsupported voice input reports a readable limitation", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
    Object.defineProperty(window, "MediaRecorder", { value: undefined, configurable: true });
  });
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.evaluate((element) => element.setAttribute("lang", "en"));
  await expect(assistant.locator("#language-select")).toHaveValue("en");
  await assistant.locator("#launcher").click();
  await assistant.locator("#microphone").click();
  await expect(assistant.locator("#voice-status")).toContainText("unavailable");
  await expect(assistant.locator("#voice-help")).toContainText("depend on your browser, device, and selected language");
});

test("Listen speaks English and Amharic replies only after an explicit click", async ({ page }) => {
  const requestedLanguages = await stubAssistantApi(page);
  await page.addInitScript(() => {
    class FakeUtterance {
      constructor(text) { this.text = text; }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [{ lang: "en-US" }, { lang: "am-ET" }],
        cancel: () => {},
        speak: (utterance) => {
          window.__spoken ||= [];
          window.__spoken.push({ text: utterance.text, lang: utterance.lang });
        }
      }
    });
  });
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.evaluate((element) => element.setAttribute("lang", "en"));
  await expect.poll(() => assistant.evaluate((element) => element._sections.length)).toBeGreaterThan(0);
  await assistant.locator("#launcher").click();
  await assistant.locator("#question").fill(englishQuestion);
  await assistant.locator("#send").click();
  const answer = assistant.locator("#messages .message-assistant").last();
  await expect(answer.locator(".message-body")).not.toBeEmpty();
  await expect(answer.locator("a.course-link")).toHaveAttribute("href", "https://example.test/course#section");
  expect(await page.evaluate(() => window.__spoken || [])).toHaveLength(0);
  await answer.locator(".listen-button").click();
  let spoken = await page.evaluate(() => window.__spoken);
  expect(spoken[0].text).toBe(await answer.locator(".message-body").textContent());
  expect(spoken[0].lang).toBe("en-US");

  await assistant.locator("#language-select").selectOption("am");
  await expect(assistant).toHaveAttribute("lang", "am");
  await expect(assistant.locator("#send")).toHaveText("ላክ");
  await assistant.locator("#question").fill(amharicQuestion);
  const previousAnswerCount = await assistant.locator("#messages .message-assistant").count();
  await assistant.locator("#send").click();
  await expect(assistant.locator("#messages .message-assistant")).toHaveCount(previousAnswerCount + 1);
  expect(requestedLanguages).toEqual(["en", "am"]);
  const amharicAnswer = assistant.locator("#messages .message-assistant").last();
  await expect(amharicAnswer.locator(".message-body")).not.toBeEmpty();
  expect(await page.evaluate(() => window.__spoken)).toHaveLength(1);
  await amharicAnswer.locator(".listen-button").click();
  spoken = await page.evaluate(() => window.__spoken);
  expect(spoken[1].text).toBe(await amharicAnswer.locator(".message-body").textContent());
  expect(spoken[1].lang).toBe("am-ET");
});

test("missing Amharic speech voice leaves the reply readable and reports the limitation", async ({ page }) => {
  await stubAssistantApi(page);
  await page.addInitScript(() => {
    class FakeUtterance {
      constructor(text) { this.text = text; }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [{ lang: "en-US" }],
        cancel: () => {},
        speak: () => { window.__speechStarted = true; }
      }
    });
    window.__audioConstructed = false;
    window.Audio = class {
      constructor() { window.__audioConstructed = true; }
    };
  });
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.evaluate((element) => element.setAttribute("lang", "am"));
  await assistant.locator("#launcher").click();
  await assistant.locator("#question").fill(amharicQuestion);
  await assistant.locator("#send").click();

  const answer = assistant.locator("#messages .message-assistant").last();
  await expect(answer.locator(".message-body")).not.toBeEmpty();
  expect(await page.evaluate(() => window.__speechStarted || false)).toBe(false);
  await answer.locator(".listen-button").click();
  await expect(answer.locator(".voice-status")).toContainText(amStrings.noSpeechVoice);
  await expect(answer.locator(".message-body")).not.toBeEmpty();
  expect(await page.evaluate(() => window.__speechStarted || false)).toBe(false);
  expect(await page.evaluate(() => window.__audioConstructed)).toBe(false);
});

test("Listen requests the selected locale voice only after learner activation", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeUtterance {
      constructor(text) { this.text = text; }
    }
    const voices = ["en-US", "am-ET", "ti-ET", "om-ET", "so-SO", "ar-SA"].map((lang) => ({ lang }));
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => voices,
        cancel: () => {},
        speak: (utterance) => {
          window.__spoken ||= [];
          window.__spoken.push({ text: utterance.text, lang: utterance.lang });
        }
      }
    });
  });
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.evaluate((element) => element.setAttribute("lang", "en"));
  await expect.poll(() => assistant.evaluate((element) => element._pack?.lang)).toBe("en");
  await assistant.locator("#launcher").click();

  const expected = [["en", "en-US"], ["am", "am-ET"], ["ti", "ti-ET"], ["om", "om-ET"], ["so", "so-SO"], ["ar", "ar-SA"]];
  for (const [language, tag] of expected) {
    await assistant.evaluate((element, lang) => {
      element._appendMessage({ role: "assistant", text: `Reply in ${lang}`, lang });
    }, language);
    await expect.poll(() => assistant.evaluate((element) => element._pack?.lang)).toBe("en");
    const reply = assistant.locator("#messages .message-assistant").last();
    await expect(reply.locator(".message-body")).toContainText(`Reply in ${language}`);
    expect(await page.evaluate(() => window.__spoken || [])).toHaveLength(expected.indexOf(expected.find((entry) => entry[0] === language)));
    await reply.locator(".listen-button").click();
    const spoken = await page.evaluate(() => window.__spoken.at(-1));
    expect(spoken.lang).toBe(tag);
  }
});

test("escalation and accommodation forms fit within narrow viewports and RTL layout does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/demo/blank.html");
  const assistant = page.locator("db-assistant");
  await expect(assistant.locator("#launcher")).toBeEnabled();
  await assistant.locator("#launcher").click();
  await assistant.evaluate((element) => element.setAttribute("lang", "en"));
  await expect(assistant.locator("#language-select")).toHaveValue("en");

  // Test escalation form at 320px
  await assistant.getByRole("button", { name: "Talk to a person" }).click();
  await expect(assistant.locator("#escalation")).toBeVisible();
  const escalationBox = await assistant.locator("#escalation").boundingBox();
  expect(escalationBox.width).toBeLessThanOrEqual(320);

  // Test accommodation form at 320px
  await assistant.locator("#accommodation-open").click();
  await expect(assistant.locator("#accommodation-form")).toBeVisible();
  const accommodationBox = await assistant.locator("#accommodation-form").boundingBox();
  expect(accommodationBox.width).toBeLessThanOrEqual(320);

  // Test Arabic RTL
  await assistant.evaluate((element) => element.setAttribute("lang", "ar"));
  await expect(assistant.locator("#panel")).toHaveAttribute("dir", "rtl");
  const panelBox = await assistant.locator("#panel").boundingBox();
  expect(panelBox.x).toBeGreaterThanOrEqual(0);
  expect(panelBox.width).toBeLessThanOrEqual(320);
});
