import { expect, test } from "@playwright/test";
import { clientId, installFixtures, json, person } from "./fixtures";
import {
  governmentTarget,
  installGovernmentFixtures,
  staffDetail,
} from "./government-fixtures";
import {
  controlledRead,
  governmentPath,
  readError,
  refreshRelationships,
  relationshipsPath,
  contactCreationReceipt,
  installContactCreateIdentity,
} from "./acceptance-relationships-fixtures";

for (const status of [200, 503])
  test(`contact create ${status} cannot repeat after read loss and its late completion cannot close a replacement drawer`, async ({
    page,
  }) => {
    const unexpected = await installFixtures(page);
    await installContactCreateIdentity(page);
    const read = await controlledRead(page, `**/clients/${clientId}/people`, [
      person,
    ]);
    let writes = 0;
    let release: (() => void) | undefined;
    await page.route(`**/clients/${clientId}/people`, async (route) => {
      if (route.request().method() === "GET") return route.fallback();
      expect(route.request().method()).toBe("POST");
      writes++;
      const body = route.request().postDataJSON();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await json(
        route,
        status === 200
          ? contactCreationReceipt(body, "20000000-0000-4000-8000-000000000002")
          : { message: "Synthetic unknown create" },
        status,
      );
    });
    await page.goto(relationshipsPath);
    await page
      .getByRole("button", { name: "Add contact", exact: true })
      .click();
    const draft = page.getByRole("dialog", {
      name: "Add contact",
      exact: true,
    });
    await draft
      .getByLabel("Name *", { exact: true })
      .fill("Synthetic pending contact");
    await draft
      .getByRole("button", { name: "Save contact", exact: true })
      .click();
    await expect.poll(() => Boolean(release)).toBe(true);
    read.fail(403);
    await refreshRelationships(page, ["client-people", clientId]);
    await expect(
      page
        .getByRole("alert", { includeHidden: true })
        .filter({ hasText: readError(403) }),
    ).toContainText(readError(403));
    await expect(draft).toHaveCount(0);
    read.hold([person]);
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(() => read.waiting).toBe(1);
    read.release();
    const existing = page.getByRole("button", {
      name: `${person.name} · ${person.title}`,
      exact: true,
    });
    await expect(existing).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add contact", exact: true }),
    ).toBeDisabled();
    await existing.click();
    const replacement = page.getByRole("dialog", {
      name: person.name,
      exact: true,
    });
    await expect(replacement).toBeVisible();
    const readsBeforeSettlement = read.reads;
    release!();
    await expect.poll(() => read.reads).toBeGreaterThan(readsBeforeSettlement);
    await expect(
      replacement.getByRole("button", { name: "Save contact", exact: true }),
    ).toBeEnabled();
    await expect(replacement).toBeVisible();
    await replacement
      .getByRole("button", { name: "Close", exact: true })
      .click();
    const add = page.getByRole("button", { name: "Add contact", exact: true });
    if (status === 503) {
      await expect(add).toBeDisabled();
      await expect(page.getByRole("status")).toContainText(
        "needs confirmation",
      );
      await refreshRelationships(page, ["client-people", clientId]);
      await expect
        .poll(() => read.reads)
        .toBeGreaterThan(readsBeforeSettlement + 1);
      await expect(add).toBeDisabled();
    } else await expect(add).toBeEnabled();
    expect(writes).toBe(1);
    expect(read.writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });

test("held target removal stays scoped to its target and cannot close a replacement drawer after read loss", async ({
  page,
}) => {
  const unexpected = await installGovernmentFixtures(page);
  const replacement = {
    ...governmentTarget,
    id: "30000000-0000-4000-8000-000000000009",
    memberId: "staff-replacement",
    memberName: "Replacement synthetic target",
  };
  const read = await controlledRead(page, `**/clients/${clientId}/targets`, [
    governmentTarget,
    replacement,
  ]);
  await page.route(`**/directory/staffers/${replacement.memberId}`, (route) =>
    json(route, { ...staffDetail, id: replacement.memberId }),
  );
  let removals = 0;
  let release: (() => void) | undefined;
  await page.route(`**/clients/${clientId}/targets?**`, async (route) => {
    expect(route.request().method()).toBe("DELETE");
    expect(new URL(route.request().url()).searchParams.get("memberId")).toBe(
      governmentTarget.memberId,
    );
    removals++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await json(route, { deleted: true });
  });
  await page.goto(`${governmentPath}&target=${governmentTarget.memberId}`);
  await page
    .getByRole("button", { name: "Remove target", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm removal", exact: true })
    .click();
  await expect.poll(() => Boolean(release)).toBe(true);
  read.fail(403);
  await refreshRelationships(page, ["client-targets", clientId]);
  await expect(
    page
      .getByRole("alert", { includeHidden: true })
      .filter({ hasText: readError(403) }),
  ).toContainText(readError(403));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  read.hold([governmentTarget, replacement]);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => read.waiting).toBe(1);
  read.release();
  const table = page.getByRole("region", {
    name: "Committee staff targets",
    exact: true,
  });
  await table
    .getByRole("button", { name: governmentTarget.memberName, exact: true })
    .click();
  const previous = page.getByRole("dialog", {
    name: governmentTarget.memberName,
    exact: true,
  });
  await expect(
    previous.getByRole("button", { name: "Remove target", exact: true }),
  ).toBeDisabled();
  await page.evaluate((destination) => {
    history.replaceState({}, "", destination);
    dispatchEvent(new PopStateEvent("popstate"));
  }, `${governmentPath}&target=${replacement.memberId}`);
  const current = page.getByRole("dialog", {
    name: replacement.memberName,
    exact: true,
  });
  await expect(
    current.getByRole("button", { name: "Remove target", exact: true }),
  ).toBeEnabled();
  const before = read.reads;
  release!();
  await expect.poll(() => read.reads).toBeGreaterThan(before);
  await expect(current).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`target=${replacement.memberId}`));
  expect(removals).toBe(1);
  expect(unexpected).toEqual([]);
});
