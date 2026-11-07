import { expect, test } from "@playwright/test";
import { clientId, json } from "./fixtures";
import {
  buildSyntheticProfile,
  expectOneResearchStart,
  installCreationRecovery,
  membershipChanged,
} from "./profile-creation-recovery-fixtures";

function heldResponse() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

test("opening a newly created profile waits for initial research through roster, profile and setup reads", async ({
  page,
}) => {
  const fixture = await installCreationRecovery(page);
  const roster = heldResponse(),
    profile = heldResponse(),
    setup = heldResponse(),
    run = heldResponse();
  const reads = { roster: 0, profile: 0, setup: 0, runs: 0 };
  await page.route("**/api/backend/core/clients", async (route) => {
    if (route.request().method() === "GET" && fixture.creation.created) {
      reads.roster++;
      await roster.promise;
    }
    return route.fallback();
  });
  await page.route(
    `**/clients/${clientId}/profile-build/profile`,
    async (route) => {
      reads.profile++;
      await profile.promise;
      return route.fallback();
    },
  );
  await page.route(
    `**/clients/${clientId}/profile-build/setup`,
    async (route) => {
      reads.setup++;
      await setup.promise;
      return route.fallback();
    },
  );
  await page.route(
    `**/clients/${clientId}/profile-build/runs`,
    async (route) => {
      reads.runs++;
      await run.promise;
      return route.fallback();
    },
  );
  try {
    const dialog = await buildSyntheticProfile(page);
    const opening = dialog.getByRole("button", {
      name: "Open profile",
      exact: true,
    });
    const link = dialog.getByRole("link", {
      name: "Open profile",
      exact: true,
    });
    await expect.poll(() => reads.roster).toBe(1);
    await expect.poll(() => reads.profile).toBe(1);
    await expect(opening).toBeDisabled();
    await expect(link).toHaveCount(0);
    expect(reads.runs).toBe(0);
    roster.release();
    await expect(opening).toBeDisabled();
    profile.release();
    await expect.poll(() => reads.setup).toBeGreaterThanOrEqual(1);
    await expect(opening).toBeDisabled();
    await expect(link).toHaveCount(0);
    expect(reads.runs).toBe(0);
    setup.release();
    await expect.poll(() => reads.runs).toBe(1);
    await expect(opening).toBeDisabled();
    await expect(link).toHaveCount(0);
    await expect(page).toHaveURL(/\/portfolio$/);
    run.release();
    await expectOneResearchStart(fixture);
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}$`));
    await expect(
      page.getByRole("heading", { name: "Test Aerospace", exact: true }),
    ).toBeVisible();
    expect(reads.runs).toBe(1);
    expect(fixture.creation.creates).toHaveLength(1);
  } finally {
    for (const hold of [roster, profile, setup, run]) hold.release();
  }
});

test("confirmed creation survives native membership refresh and updates the real saved-order catalog", async ({
  page,
}) => {
  const fixture = await installCreationRecovery(page);
  fixture.creation.identityConflicts = 2;
  fixture.creation.rosterConflicts = 1;
  let release!: () => void;
  fixture.creation.identityGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const dialog = await buildSyntheticProfile(page);
  await expect.poll(() => fixture.creation.identityReadsAfterCreate).toBe(3);
  expect(fixture.creation.creates).toHaveLength(1);
  expect(fixture.state.posts).toEqual([]);
  await expect(dialog).not.toContainText(
    "Your current session cannot access this profile review",
  );
  await expect(
    dialog.getByRole("button", { name: "Build profile", exact: true }),
  ).toHaveCount(0);
  release();
  await expect(
    dialog.getByRole("link", { name: "Open profile", exact: true }),
  ).toHaveAttribute("href", `/portfolio/${clientId}`);
  await expectOneResearchStart(fixture);
  await expect
    .poll(() => fixture.creation.rosterReadsAfterCreate)
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(() =>
      fixture.creation.layoutOrders.some((order) =>
        order.includes(`client:${clientId}`),
      ),
    )
    .toBe(true);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByText("Synthetic Recovery Company", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/does not match the current profile catalog/),
  ).toHaveCount(0);
});

test("exhausted membership refresh retains the confirmed profile and continues only after a fresh session", async ({
  page,
}) => {
  const fixture = await installCreationRecovery(page);
  fixture.creation.identityConflicts = 3;
  const dialog = await buildSyntheticProfile(page);
  await expect(
    dialog.getByText(membershipChanged, { exact: true }),
  ).toBeVisible();
  expect(fixture.creation.identityReadsAfterCreate).toBe(3);
  expect(fixture.creation.creates).toHaveLength(1);
  expect(fixture.state.posts).toEqual([]);
  await dialog.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Continue saved profile", exact: true }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "Build profile", exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Continue saved profile", exact: true })
    .click();
  await expectOneResearchStart(fixture);
});

for (const boundary of ["revoked", "changed-actor"] as const) {
  test(`confirmed creation does not continue after ${boundary} authority`, async ({
    page,
  }) => {
    const fixture = await installCreationRecovery(page);
    if (boundary === "revoked") fixture.creation.identityStatus = 403;
    // The initial identity must stay original; replace it when POST succeeds.
    if (boundary === "changed-actor") {
      await page.route("**/api/backend/core/clients", async (route) => {
        if (route.request().method() === "POST")
          fixture.creation.userId = "20000000-0000-4000-8000-000000000099";
        return route.fallback();
      });
    }
    const dialog = await buildSyntheticProfile(page);
    await expect.poll(() => fixture.creation.identityReadsAfterCreate).toBe(1);
    if (boundary === "revoked")
      await expect(dialog).toContainText("You do not have permission");
    else
      await expect(
        dialog.getByLabel("Company name", { exact: true }),
      ).toHaveValue("");
    await expect(
      dialog.getByRole("link", { name: "Open profile", exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole("heading", { name: "Research and review", exact: true }),
    ).toHaveCount(0);
    expect(fixture.creation.creates).toHaveLength(1);
    expect(fixture.state.posts).toEqual([]);
  });
}

test("an unknown creation response cannot replay creation or start research", async ({
  page,
}) => {
  const fixture = await installCreationRecovery(page);
  fixture.creation.createStatus = 503;
  const dialog = await buildSyntheticProfile(page);
  await expect(dialog).toContainText("Creation could not be confirmed");
  await expect(
    dialog.getByRole("button", { name: "Build profile", exact: true }),
  ).toBeDisabled();
  expect(fixture.creation.creates).toHaveLength(1);
  expect(fixture.creation.identityReadsAfterCreate).toBe(0);
  expect(fixture.state.posts).toEqual([]);
});

test("a direct profile conflict preserves the creation link but needs an explicit successful read before research", async ({
  page,
}) => {
  const fixture = await installCreationRecovery(page);
  let blocked = true;
  let reads = 0;
  await page.route(`**/clients/${clientId}/profile-build/profile`, (route) => {
    reads++;
    return blocked
      ? json(route, { message: "Synthetic profile revision conflict" }, 409)
      : route.fallback();
  });
  const dialog = await buildSyntheticProfile(page);
  await expect(dialog).toContainText("Synthetic profile revision conflict");
  await expect(
    dialog.getByRole("link", { name: "Open profile", exact: true }),
  ).toBeVisible();
  expect(reads).toBe(1);
  expect(fixture.state.posts).toEqual([]);
  blocked = false;
  await dialog.getByRole("button", { name: "Retry", exact: true }).click();
  await expectOneResearchStart(fixture);
});

test("a denied created profile hides its receipt and never starts research", async ({
  page,
}) => {
  const fixture = await installCreationRecovery(page);
  await page.route(`**/clients/${clientId}/profile-build/profile`, (route) =>
    json(route, { message: "Synthetic wall denial" }, 403),
  );
  const dialog = await buildSyntheticProfile(page);
  await expect(dialog).toContainText("You do not have permission");
  await expect(
    dialog.getByRole("link", { name: "Open profile", exact: true }),
  ).toHaveCount(0);
  expect(fixture.creation.creates).toHaveLength(1);
  expect(fixture.state.posts).toEqual([]);
});

test("research setup conflicts require an explicit fresh read and never retry the create", async ({
  page,
}) => {
  const fixture = await installCreationRecovery(page);
  let blocked = true;
  let reads = 0;
  await page.route(`**/clients/${clientId}/profile-build/setup`, (route) => {
    reads++;
    return blocked
      ? json(route, { message: "Synthetic setup revision conflict" }, 409)
      : route.fallback();
  });
  const dialog = await buildSyntheticProfile(page);
  await expect(
    dialog.getByRole("button", {
      name: "Check research recovery",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  // One source read and the retained-intent authority read; neither retries 409.
  expect(reads).toBe(2);
  expect(fixture.state.posts).toEqual([]);
  blocked = false;
  await dialog.getByRole("button", { name: "Retry", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Check research recovery", exact: true })
    .click();
  await expectOneResearchStart(fixture);
});
