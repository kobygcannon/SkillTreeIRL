import { expect, test } from "@playwright/test";

async function register(
  page: import("@playwright/test").Page,
  email: string,
  name: string,
) {
  await page.goto("/sign-in?mode=signup");
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("SkillTree-E2E-123!");
  await page.getByRole("button", { name: "Build my SkillTree" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

test("company workspace lifecycle preserves role and personal-data boundaries", async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  test.skip(!process.env.E2E_AUTH, "Requires a reset local Supabase stack");
  const nonce = Date.now();
  const ownerEmail = `company-owner-${nonce}@skilltree.test`;
  const memberEmail = `company-member-${nonce}@skilltree.test`;
  const workspaceName = `E2E Studio ${nonce}`;
  await register(page, ownerEmail, "Company Owner");
  const origin = new URL(page.url()).origin;

  const created = await page.request.post("/api/v1/organizations", {
    headers: { origin },
    data: {
      name: workspaceName,
      slug: `e2e-studio-${nonce}`,
      jobTitle: "Owner",
    },
  });
  expect(created.status()).toBe(201);
  const organizationId = (await created.json()).data.id as string;
  const ownerView = await page.request.get(
    `/api/v1/organizations/${organizationId}`,
  );
  expect(ownerView.ok()).toBeTruthy();
  const ownerId = (await ownerView.json()).data.currentUserId as string;

  const objective = await page.request.post(
    `/api/v1/organizations/${organizationId}/objectives`,
    {
      headers: { origin },
      data: {
        title: "Improve customer onboarding",
        description: "A shared, company-only outcome",
        assignees: [ownerId],
      },
    },
  );
  expect(objective.status()).toBe(201);
  const objectiveId = (await objective.json()).data.id as string;
  const checkin = await page.request.post(
    `/api/v1/organizations/${organizationId}/objectives/${objectiveId}/checkins`,
    {
      headers: { origin },
      data: {
        progressValue: 20,
        summary: "Mapped the first-run journey",
        visibility: "managers",
      },
    },
  );
  expect(checkin.status()).toBe(201);

  const invitation = await page.request.post(
    `/api/v1/organizations/${organizationId}/invitations`,
    {
      headers: { origin },
      data: { email: memberEmail, role: "member" },
    },
  );
  expect(invitation.status()).toBe(201);
  const invitationBody = await invitation.json();
  expect(invitationBody.data.inviteUrl).toContain("/workspace/join?token=");

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await register(memberPage, memberEmail, "Company Member");
  const invitationUrl = new URL(invitationBody.data.inviteUrl);
  await memberPage.goto(`${invitationUrl.pathname}${invitationUrl.search}`);
  await memberPage.getByRole("button", { name: "Accept invitation" }).click();
  await expect(memberPage).toHaveURL(
    new RegExp(`/workspace/${organizationId}$`),
  );
  await expect(
    memberPage.getByText("Personal stays private", { exact: false }),
  ).toBeVisible();

  const refreshedOwnerView = await page.request.get(
    `/api/v1/organizations/${organizationId}`,
  );
  const member = (await refreshedOwnerView.json()).data.members.find(
    (item: { display_name: string }) => item.display_name === "Company Member",
  );
  expect(member).toBeTruthy();
  const memberEndpoint = `/api/v1/organizations/${organizationId}/members/${member.user_id}`;
  expect(
    (
      await page.request.patch(memberEndpoint, {
        headers: { origin },
        data: { action: "change_role", role: "manager" },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await page.request.patch(memberEndpoint, {
        headers: { origin },
        data: { action: "suspend" },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await memberPage.request.get(`/api/v1/organizations/${organizationId}`)
    ).ok(),
  ).toBeFalsy();
  expect(
    (
      await page.request.patch(memberEndpoint, {
        headers: { origin },
        data: { action: "reactivate" },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await memberPage.request.get(`/api/v1/organizations/${organizationId}`)
    ).ok(),
  ).toBeTruthy();

  const closed = await page.request.delete(
    `/api/v1/organizations/${organizationId}`,
    {
      headers: { origin, "x-delete-confirmation": workspaceName },
    },
  );
  expect(closed.ok(), await closed.text()).toBeTruthy();
  expect(
    (
      await memberPage.request.get(`/api/v1/organizations/${organizationId}`)
    ).ok(),
  ).toBeFalsy();

  const memberOrigin = new URL(memberPage.url()).origin;
  const memberDeleted = await memberPage.request.delete("/api/v1/account", {
    headers: {
      origin: memberOrigin,
      "x-delete-confirmation": "DELETE MY SKILLTREE",
    },
  });
  expect(memberDeleted.ok(), await memberDeleted.text()).toBeTruthy();
  await memberContext.close();
  const ownerDeleted = await page.request.delete("/api/v1/account", {
    headers: { origin, "x-delete-confirmation": "DELETE MY SKILLTREE" },
  });
  expect(ownerDeleted.ok(), await ownerDeleted.text()).toBeTruthy();
});
