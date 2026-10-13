import { expect, test } from "@playwright/test";
import { clientId, installFixtures, json, person, personId } from "./fixtures";
import {
  committee,
  governmentTarget,
  installGovernmentFixtures,
  staffDetail,
} from "./government-fixtures";
import {
  controlledRead,
  directoryReceipt,
  directorySources,
  governmentPath,
  readError,
  recommendation,
  refreshRelationships,
  relationshipsPath,
} from "./acceptance-relationships-fixtures";

for (const status of [403, 503])
  test(`current people ${status} conceals roster and dirty drawer until an explicit successful recovery`, async ({
    page,
  }) => {
    const unexpected = await installFixtures(page);
    const control = await controlledRead(
      page,
      `**/clients/${clientId}/people`,
      [person],
    );
    await page.goto(`${relationshipsPath}?person=${personId}`);
    const drawer = page.getByRole("dialog", { name: person.name, exact: true });
    await drawer
      .getByLabel("Name *", { exact: true })
      .fill("Retire this synthetic draft");
    control.fail(status);
    await refreshRelationships(page, ["client-people", clientId]);
    await expect(
      page
        .getByRole("alert", { includeHidden: true })
        .filter({ hasText: readError(status) }),
    ).toContainText(readError(status));
    await expect(drawer).toHaveCount(0);
    await expect(page.getByLabel("Search contacts")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Add contact", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Configure hierarchy", exact: true }),
    ).toBeDisabled();
    const current = { ...person, title: "Current synthetic title" };
    control.hold([current]);
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(() => control.waiting).toBe(1);
    await expect(drawer).toHaveCount(0);
    await expect(page.getByLabel("Search contacts")).toHaveCount(0);
    control.release();
    const contact = page.getByRole("button", {
      name: `${person.name} · ${current.title}`,
      exact: true,
    });
    await expect(contact).toBeVisible();
    await expect(drawer).toHaveCount(0);
    await contact.click();
    await expect(drawer.getByLabel("Name *", { exact: true })).toHaveValue(
      person.name,
    );
    await expect(drawer.getByLabel("Title", { exact: true })).toHaveValue(
      current.title,
    );
    expect(control.writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });

test("current target-list denial closes former target detail and recovers without restoring its selection", async ({
  page,
}) => {
  const unexpected = await installGovernmentFixtures(page);
  const control = await controlledRead(page, `**/clients/${clientId}/targets`, [
    governmentTarget,
  ]);
  await page.goto(`${governmentPath}&target=${governmentTarget.memberId}`);
  const drawer = page.getByRole("dialog", {
    name: governmentTarget.memberName,
    exact: true,
  });
  await expect(drawer.getByLabel("Tier", { exact: true })).toBeVisible();
  control.fail(403);
  await refreshRelationships(page, ["client-targets", clientId]);
  await expect(
    page
      .getByRole("alert", { includeHidden: true })
      .filter({ hasText: readError(403) }),
  ).toContainText(readError(403));
  await expect(drawer).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Committee staff targets", exact: true }),
  ).toHaveCount(0);
  const current = {
    ...governmentTarget,
    memberName: "Current synthetic staff",
  };
  control.hold([current]);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => control.waiting).toBe(1);
  await expect(drawer).toHaveCount(0);
  control.release();
  const table = page.getByRole("region", {
    name: "Committee staff targets",
    exact: true,
  });
  await expect(
    table.getByRole("button", { name: current.memberName, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await table
    .getByRole("button", { name: current.memberName, exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: current.memberName, exact: true }),
  ).toBeVisible();
  expect(control.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("failed current recommendations conceal old suggestions while the independent target list remains usable", async ({
  page,
}) => {
  const unexpected = await installGovernmentFixtures(page);
  const receipt = {
    recommendations: [recommendation],
    computedAt: "2026-10-13T10:00:00Z",
  };
  const control = await controlledRead(
    page,
    `**/clients/${clientId}/target-recommendations`,
    receipt,
  );
  await page.goto(governmentPath);
  const suggestions = page.getByRole("region", {
    name: "Suggested government targets",
  });
  await expect(
    suggestions.getByRole("button", {
      name: `Add ${recommendation.office}`,
      exact: true,
    }),
  ).toBeVisible();
  control.fail(503);
  await refreshRelationships(page, ["target-recommendations", clientId]);
  await expect(suggestions.getByRole("alert")).toContainText(readError(503));
  await expect(
    suggestions.getByText(recommendation.office, { exact: true }),
  ).toHaveCount(0);
  await expect(suggestions.getByRole("button", { name: /^Add / })).toHaveCount(
    0,
  );
  await expect(
    page
      .getByRole("region", { name: "Committee staff targets", exact: true })
      .getByRole("button", { name: governmentTarget.memberName, exact: true }),
  ).toBeVisible();
  const current = { ...recommendation, office: "New synthetic recommendation" };
  control.hold({
    recommendations: [current],
    computedAt: "2026-10-13T11:00:00Z",
  });
  await suggestions.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => control.waiting).toBe(1);
  await expect(suggestions.getByRole("button", { name: /^Add / })).toHaveCount(
    0,
  );
  control.release();
  await expect(
    suggestions.getByRole("button", {
      name: `Add ${current.office}`,
      exact: true,
    }),
  ).toBeVisible();
  expect(control.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

for (const source of directorySources)
  test(`current ${source.kind} directory failure removes stale choices and retains independent feeds`, async ({
    page,
  }) => {
    const unexpected = await installGovernmentFixtures(page);
    for (const other of directorySources)
      if (other.kind !== source.kind)
        await page.route(`**/${other.path}?**`, (route) =>
          json(
            route,
            directoryReceipt(other.kind, `Independent ${other.kind}`),
          ),
        );
    const oldName = `Previous synthetic ${source.kind}`;
    const control = await controlledRead(
      page,
      `**/${source.path}?**`,
      directoryReceipt(source.kind, oldName),
    );
    await page.route("**/directory/committees?**", (route) =>
      json(route, {
        committees: [committee],
        page: 1,
        pageSize: 200,
        total: 1,
      }),
    );
    await page.goto(governmentPath);
    await page
      .getByRole("button", {
        name:
          source.kind === "committee"
            ? "Add committee staff"
            : "Add relationship",
        exact: true,
      })
      .first()
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Add relationship",
      exact: true,
    });
    if (source.kind === "committee") {
      await dialog
        .getByRole("button", { name: /^Committee \/ subcommittee/ })
        .click();
      const picker = page.getByRole("dialog", {
        name: "Choose a committee",
        exact: true,
      });
      await picker
        .getByLabel("Search committees", { exact: true })
        .fill(committee.name);
      await picker
        .getByRole("button", {
          name: `Select House / ${committee.name}`,
          exact: true,
        })
        .click();
      await picker.getByRole("button", { name: "Done", exact: true }).click();
    } else {
      await dialog.getByLabel("Search the directory").fill("Synthetic");
      await dialog.getByRole("button", { name: "Search", exact: true }).click();
    }
    const results = dialog.getByRole("region", {
      name: source.label,
      exact: true,
    });
    await expect(
      results.getByRole("button", { name: `Add ${oldName}`, exact: true }),
    ).toBeVisible();
    control.fail(403);
    await refreshRelationships(page, ["target-directory", source.kind]);
    await expect(results.getByRole("alert")).toContainText(readError(403));
    await expect(results.getByText(oldName, { exact: true })).toHaveCount(0);
    await expect(results.getByRole("button", { name: /^Add / })).toHaveCount(0);
    if (source.kind !== "committee") {
      const independent = source.kind === "congress" ? "staff" : "congress";
      await expect(
        dialog.getByRole("button", {
          name: `Add Independent ${independent}`,
          exact: true,
        }),
      ).toBeVisible();
    }
    const currentName = `Current synthetic ${source.kind}`;
    control.hold(directoryReceipt(source.kind, currentName));
    await results.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(() => control.waiting).toBe(1);
    await expect(results.getByRole("button", { name: /^Add / })).toHaveCount(0);
    control.release();
    await expect(
      results.getByRole("button", { name: `Add ${currentName}`, exact: true }),
    ).toBeEnabled();
    expect(control.writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });

test("failed current target detail removes old positions and the open mail draft until reviewed again", async ({
  page,
}) => {
  const unexpected = await installGovernmentFixtures(page);
  const control = await controlledRead(
    page,
    "**/directory/staffers/staff-12",
    staffDetail,
  );
  await page.goto(`${governmentPath}&target=${governmentTarget.memberId}`);
  const drawer = page.getByRole("dialog", {
    name: governmentTarget.memberName,
    exact: true,
  });
  await expect(
    drawer.getByText("Staff director", { exact: true }),
  ).toBeVisible();
  await drawer.getByRole("button", { name: "Mail", exact: true }).click();
  const compose = page.getByRole("dialog", { name: "New email", exact: true });
  await compose
    .getByLabel("Subject", { exact: true })
    .fill("Old directory recipient draft");
  control.fail(403);
  await refreshRelationships(page, [
    "target-contact-detail",
    "staff",
    governmentTarget.memberId,
  ]);
  await expect(
    page
      .getByRole("alert", { includeHidden: true })
      .filter({ hasText: readError(403) }),
  ).toContainText(readError(403));
  await expect(compose).toHaveCount(0);
  await expect(drawer.getByText("Staff director", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    drawer.getByRole("button", { name: "Mail", exact: true }),
  ).toHaveCount(0);
  control.hold({
    ...staffDetail,
    positions: [
      { ...staffDetail.positions[0], title: "Current synthetic position" },
    ],
  });
  await drawer.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => control.waiting).toBe(1);
  await expect(compose).toHaveCount(0);
  control.release();
  await expect(
    drawer.getByText("Current synthetic position", { exact: true }),
  ).toBeVisible();
  await expect(compose).toHaveCount(0);
  await drawer.getByRole("button", { name: "Mail", exact: true }).click();
  await expect(compose.getByLabel("Subject", { exact: true })).toHaveValue("");
  expect(control.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});
