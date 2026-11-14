import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = [
  ["blank demo", "/demo/blank.html"],
  ["paced homepage", "/savanna/pages/homepage-v1-paced.html"],
  ["self-paced homepage", "/savanna/pages/homepage-v1-self-paced.html"],
  ["course navigation page", "/savanna/pages/concept-with-navigation.html"]
];

for (const [name, route] of pages) {
  test(`axe: ${name}, assistant panel open`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.ok(), `Could not load ${route}; check that the page exists and is served.`).toBeTruthy();
    const assistant = page.locator("db-assistant");
    await expect(assistant).toHaveCount(1);
    const launcher = assistant.locator("#launcher");
    await expect(launcher).toBeEnabled();
    await launcher.click();
    await expect(assistant.locator('[role="dialog"]')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const severe = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
    const report = severe.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary }))
    }));
    expect(severe, JSON.stringify(report, null, 2)).toEqual([]);
  });
}
