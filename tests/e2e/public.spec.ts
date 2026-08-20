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

for (const route of ["/", "/sign-in?mode=signup", "/privacy", "/support"]) {
  test(`${route} has no serious automated accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact || ""))).toEqual([]);
  });
}
