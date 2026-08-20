import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("marketing, signup handoff, and public education are usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Know what to do next. See how far you've come." })).toBeVisible();
  await page.getByRole("link", { name: "Start with one goal" }).first().click();
  await expect(page).toHaveURL(/\/sign-in\?mode=signup$/);
  await expect(page.getByRole("heading", { name: "Create your SkillTree" })).toBeVisible();
  await page.goto("/learn/goal-tracking");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Goal");
});

test("demo is read-only and converts attempted mutations", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.getByRole("dialog", { name: "Create your SkillTree" })).toBeVisible();
  await expect(page.getByText("synthetic data and never saves changes")).toBeVisible();
  const modalA11y = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(modalA11y.violations.filter(item => ["serious","critical"].includes(item.impact || ""))).toEqual([]);
});

test("marketing detail boxes reveal useful product information", async ({ page }) => {
  await page.goto("/examples");
  const details = page.locator(".marketing-accordions details").nth(1);
  await details.getByText("Money — build a £3,000 emergency fund").click();
  await expect(details.getByText("Today: review spending and transfer £50")).toBeVisible();
  await page.goto("/pricing");
  await page.getByText("Can a company see my personal SkillTree?").click();
  await expect(page.getByText("Personal goals, journal, evidence, XP and history are not copied to an employer.")).toBeVisible();
});

test("public help is searchable and support submission requires an account", async ({page})=>{
  await page.goto("/support");
  await expect(page.getByRole("heading",{name:"Help centre"})).toBeVisible();
  await page.getByRole("textbox",{name:"Search help"}).fill("privacy");
  await expect(page.getByText("Privacy and evidence")).toBeVisible();
  await expect(page.getByText("How XP works")).toBeHidden();
  await expect(page.getByRole("link",{name:"Sign in to contact support"})).toHaveAttribute("href",/next=%2Fsupport/);
  await expect(page.getByLabel("Diagnostic ID")).not.toHaveValue("");
});

test("public pages fit a phone viewport without horizontal clipping", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/features", "/skilltree", "/goals", "/examples", "/pricing", "/demo"]) {
    await page.goto(route);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `${route} overflows the phone viewport`).toBeLessThanOrEqual(dimensions.viewport);
  }
});

test("every primary demo workspace is readable and keyboard-reachable", async ({ page }) => {
  await page.goto("/demo");
  for (const destination of ["Goals", "Skills", "Quests", "Habits", "Achievements", "History", "Insights"]) {
    const navigationButton = page.locator(".sidebar nav").getByRole("button", { name: new RegExp(`^${destination}`) });
    await navigationButton.click();
    await expect(navigationButton).toHaveClass(/active/);
    await expect(page.locator("main header h1")).not.toBeEmpty();
    const results = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact || "")), `${destination} has serious accessibility violations`).toEqual([]);
  }
});

for (const route of ["/", "/features", "/skilltree", "/goals", "/examples", "/pricing", "/demo", "/sign-in?mode=signup", "/privacy", "/support"]) {
  test(`${route} has no serious automated accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact || ""))).toEqual([]);
  });
}
