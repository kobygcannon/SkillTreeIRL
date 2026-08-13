import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("registration through deletion preserves the authoritative daily loop", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!process.env.E2E_AUTH, "Requires a reset local Supabase stack");
  const email = `e2e-${Date.now()}@skilltree.test`;
  const password = "SkillTree-E2E-123!";

  await page.goto("/sign-in?mode=signup");
  await page.getByLabel("Display name").fill("E2E Adventurer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Build my SkillTree" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole("button", { name: "Health & Fitness" }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByLabel("Or describe your own goal").fill("Walk 100 kilometres");
  await page.getByRole("button", { name: /Set up progress/ }).click();
  await page.getByLabel("Measurement").selectOption("numeric");
  await page.getByRole("spinbutton", { name: "Target", exact: true }).fill("100");
  await page.getByRole("textbox", { name: "Unit", exact: true }).fill("km");
  await page.getByRole("button", { name: /Build my SkillTree/ }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("dialog", { name: "Quick add" }).getByRole("button", { name: /Create skill/ }).click();
  await page.getByLabel("Skill name").fill("Intentional walking");
  const skillReload = page.waitForEvent("load");
  await page.getByRole("button", { name: /Save/ }).click();
  await expect(page.getByText("A new branch appeared")).toBeVisible();
  await skillReload;

  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("dialog", { name: "Quick add" }).getByRole("button", { name: /Log activity/ }).click();
  await page.getByLabel("What did you do?").fill("Completed an intentional lunchtime walk");
  await page.getByLabel("Duration (minutes)").fill("30");
  await page.getByLabel("Quantity").fill("4.2");
  await page.getByLabel("Unit").fill("km");
  await page.getByLabel("Related goals").selectOption({ label: "Walk 100 kilometres" });
  await page.getByLabel("Skills earning XP").selectOption({ label: "Intentional walking" });
  await page.getByText("Private evidence (optional)").click();
  await page.getByLabel("Evidence note").fill("Route and distance checked after the walk");
  const activityReload = page.waitForEvent("load");
  await page.getByRole("button", { name: /Save/ }).click();
  await activityReload;

  const goals = await page.request.get("/api/v1/goals");
  expect(goals.ok()).toBeTruthy();
  const goal = (await goals.json()).data.find((item: { title: string }) => item.title === "Walk 100 kilometres");
  expect(goal).toBeTruthy();
  const origin = new URL(page.url()).origin;
  const activities = await page.request.get("/api/v1/activities");
  const activity = (await activities.json()).data.find((item: { description: string }) => item.description === "Completed an intentional lunchtime walk");
  expect(activity.quantity).toBe(4.2);
  expect(activity.unit).toBe("km");
  const evidence = await page.request.get(`/api/v1/activities/${activity.id}/evidence`);
  expect((await evidence.json()).data.some((item: { text_note: string | null }) => item.text_note === "Route and distance checked after the walk")).toBeTruthy();
  const skillsResponse = await page.request.get("/api/v1/skills");
  const walkingSkill = (await skillsResponse.json()).data.find((item: { name: string }) => item.name === "Intentional walking");

  const questCreated = await page.request.post("/api/v1/quests", {
    headers: { origin },
    data: { title: "Walk the riverside loop", goalId: goal.id, skillIds: [walkingSkill.id], xpReward: 25, evidenceRequired: true, priority: "high", estimatedMinutes: 45 },
  });
  expect(questCreated.status()).toBe(201);
  const questId = (await questCreated.json()).data.id;
  const questKey = crypto.randomUUID();
  const questCompletion = await page.request.post(`/api/v1/quests/${questId}/complete`, { headers: { origin, "idempotency-key": questKey }, data: { evidenceType: "text", textNote: "Riverside loop completion recorded" } });
  const duplicateQuestCompletion = await page.request.post(`/api/v1/quests/${questId}/complete`, { headers: { origin, "idempotency-key": questKey }, data: { evidenceType: "text", textNote: "Riverside loop completion recorded" } });
  expect(questCompletion.ok()).toBeTruthy();
  expect((await duplicateQuestCompletion.json()).data.completionId).toBe((await questCompletion.json()).data.completionId);

  const habitCreated = await page.request.post("/api/v1/habits", {
    headers: { origin },
    data: { name: "Take an intentional walk", goalId: goal.id, skillIds: [walkingSkill.id], timezone: "Europe/London", xpReward: 10, minimumTarget: 20, minimumUnit: "minutes", startDate: new Date().toISOString().slice(0, 10), reminderNextRun: new Date(Date.now() + 86400000).toISOString(), frequency: { kind: "weekly", days: [1, 3, 5] } },
  });
  expect(habitCreated.status()).toBe(201);
  const habitId = (await habitCreated.json()).data.id;
  const configuredHabits = await page.request.get("/api/v1/habits");
  const configuredHabit = (await configuredHabits.json()).data.find((item: { id: string }) => item.id === habitId);
  expect(configuredHabit.minimum_target).toBe(20);
  expect(configuredHabit.minimum_unit).toBe("minutes");
  expect(configuredHabit.frequency.days).toEqual([1, 3, 5]);
  const reminders = await page.request.get("/api/v1/reminders");
  expect((await reminders.json()).data.some((item: { entity_id: string; reminder_type: string }) => item.entity_id === habitId && item.reminder_type === "habit")).toBeTruthy();
  const habitKey = crypto.randomUUID();
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const habitCompletion = await page.request.post(`/api/v1/habits/${habitId}/occurrences`, { headers: { origin, "idempotency-key": habitKey }, data: { localDate, status: "complete" } });
  const duplicateHabitCompletion = await page.request.post(`/api/v1/habits/${habitId}/occurrences`, { headers: { origin, "idempotency-key": habitKey }, data: { localDate, status: "complete" } });
  expect(habitCompletion.status()).toBe(201);
  expect((await duplicateHabitCompletion.json()).data.occurrenceId).toBe((await habitCompletion.json()).data.occurrenceId);

  const progress = await page.request.post(`/api/v1/goals/${goal.id}/progress`, {
    headers: { origin, "idempotency-key": crypto.randomUUID() },
    data: { value: 12, note: "E2E progress" },
  });
  expect(progress.ok()).toBeTruthy();
  const edited = await page.request.patch(`/api/v1/goals/${goal.id}`, { headers: { origin }, data: { title: "Walk 100 km with ease", reason: "Clearer outcome" } });
  expect(edited.ok()).toBeTruthy();
  for (const status of ["paused", "active", "completed"]) {
    const state = await page.request.post(`/api/v1/goals/${goal.id}/state`, { headers: { origin }, data: { status, reason: `E2E ${status}` } });
    expect(state.ok()).toBeTruthy();
  }

  const history = await page.request.get("/api/v1/history");
  expect(history.ok()).toBeTruthy();
  expect((await history.json()).data.length).toBeGreaterThan(0);
  const exportResponse = await page.request.post("/api/v1/account/export", { headers: { origin } });
  expect(exportResponse.ok(), await exportResponse.text()).toBeTruthy();
  expect(exportResponse.headers()["content-disposition"]).toContain("skilltree-export");

  await page.goto("/app");
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(accessibility.violations.filter((item) => ["serious", "critical"].includes(item.impact || ""))).toEqual([]);

  const deleted = await page.request.delete("/api/v1/account", { headers: { origin, "x-delete-confirmation": "DELETE MY SKILLTREE" } });
  expect(deleted.ok()).toBeTruthy();
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in/);
});
