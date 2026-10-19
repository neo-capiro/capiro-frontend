import { test, expect, type Page } from "@playwright/test";
import { operationFixtures, testIdentity } from "./fixtures";
import {
  installFixtures,
  json,
  objective,
  client,
} from "../../tests/browser/fixtures";
import {
  boundDirectory,
  savedTarget,
  targetId,
  directoryQuery,
  directoryHref,
} from "../../tests/directory-objective-fixtures";
import { clientId, taskId } from "../../tests/objective-work-fixtures";
const endpoint = "**/api/capiro/directory.objectiveDestination?*";
const origin = `/portfolio/${clientId}/objectives?objective=${objective.id}`;
async function fixture(page: Page) {
  const unexpected = await installFixtures(page);
  page.on("pageerror", (error) =>
    unexpected.push(`Page error: ${error.message}`),
  );
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/api/") &&
      request.method() !== "GET"
    )
      unexpected.push(`Unexpected write: ${request.method()} ${request.url()}`);
  });
  await operationFixtures(page, { "me.read": testIdentity });
  return unexpected;
}
async function changeLocation(page: Page, href: string) {
  await page.evaluate((url) => {
    history.pushState({}, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  }, href);
}
for (const sourceDirectory of ["congress", "state", "staff"])
  test(`${sourceDirectory} saved target opens exact Objective-bound identity and rereads on history/retry`, async ({
    page,
  }) => {
    const unexpected = await fixture(page);
    const value = {
      ...boundDirectory,
      target: { ...boundDirectory.target, sourceDirectory },
    };
    const list = { ...savedTarget, sourceDirectory };
    let reads = 0;
    const queries: Record<string, string>[] = [];
    await page.route(`**/api/backend/core/clients/${clientId}/targets`, (r) =>
      json(r, [list]),
    );
    await page.route(
      `**/api/backend/core/clients/${clientId}/targets/${targetId}/objective-destination?*`,
      (r) => {
        queries.push(
          Object.fromEntries(new URL(r.request().url()).searchParams),
        );
        return json(r, value);
      },
    );
    await page.route(endpoint, (r) => {
      reads++;
      const input = JSON.parse(
        new URL(r.request().url()).searchParams.get("input")!,
      );
      expect(input).toEqual({
        params: { clientId, targetId },
        query: directoryQuery,
      });
      return json(r, value);
    });
    await page.goto(origin);
    await page
      .getByRole("button", { name: "Choose existing resources", exact: true })
      .click();
    await page
      .getByLabel("Resource type", { exact: true })
      .selectOption("directory_target");
    await page
      .getByLabel("Existing Saved Directory target", { exact: true })
      .selectOption(targetId);
    await page
      .getByLabel("Existing Saved Directory target", { exact: true })
      .focus();
    await expect(
      page.getByLabel("Existing Saved Directory target", { exact: true }),
    ).toBeFocused();
    await page
      .getByRole("button", {
        name: "Open Objective-bound Saved Directory target",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/modules\/directory\?/);
    await expect(
      page.getByRole("heading", {
        name: "Saved Directory target",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("SYNTHETIC/member", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Synthetic stale label", { exact: true }),
    ).toHaveCount(0);
    expect(queries).toEqual([{ ...directoryQuery, objectiveVersion: "1" }]);
    expect(reads).toBe(1);
    await page
      .getByRole("button", {
        name: "Recheck current Objective destination",
        exact: true,
      })
      .click();
    await expect.poll(() => reads).toBe(2);
    await page
      .getByRole("link", { name: "Back to current Objective", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole("heading", {
        name: "Saved Directory target",
        exact: true,
      }),
    ).toBeVisible();
    await expect.poll(() => reads).toBe(3);
    expect(unexpected).toEqual([]);
  });
for (const status of [403, 404, 409, 503])
  test(`owner ${status} conceals target; explicit retry resolves again without generic fallback`, async ({
    page,
  }) => {
    const unexpected = await fixture(page);
    let reads = 0;
    await page.route(endpoint, (r) => {
      reads++;
      return reads === 1
        ? json(
            r,
            { message: "Target unavailable for current Objective" },
            status,
          )
        : json(r, boundDirectory);
    });
    await page.goto(directoryHref);
    await expect(page.getByRole("alert")).toContainText("Target unavailable");
    await expect(
      page.getByText("SYNTHETIC/member", { exact: true }),
    ).toHaveCount(0);
    expect(reads).toBe(1);
    await page
      .getByRole("button", {
        name: "Recheck current Objective destination",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("SYNTHETIC/member", { exact: true }),
    ).toBeVisible();
    expect(reads).toBe(2);
    expect(unexpected).toEqual([]);
  });
test("mismatched response and malformed locations never display target or ordinary Directory", async ({
  page,
}) => {
  const unexpected = await fixture(page);
  let reads = 0;
  await page.route(endpoint, (r) => {
    reads++;
    return json(r, {
      ...boundDirectory,
      destination: { ...boundDirectory.destination, objectiveVersion: 2 },
    });
  });
  await page.goto(directoryHref);
  await expect(page.getByRole("alert")).toContainText("does not match");
  await expect(page.getByText("SYNTHETIC/member", { exact: true })).toHaveCount(
    0,
  );
  for (const href of [
    directoryHref + "&view=state-legislators",
    directoryHref + "&targetId=" + targetId,
    "/modules/directory?targetId=" + targetId,
  ]) {
    await changeLocation(page, href);
    await expect(
      page.getByRole("heading", {
        name: "Objective destination unavailable",
        exact: true,
      }),
    ).toBeVisible();
  }
  expect(reads).toBe(1);
  expect(unexpected).toEqual([]);
});
test("reload failure removes earlier observation and exposes no generic Directory reads", async ({
  page,
}) => {
  const unexpected = await fixture(page);
  let reads = 0;
  await page.route(endpoint, (r) => {
    reads++;
    return reads === 1
      ? json(r, boundDirectory)
      : json(r, { message: "Saved target removed" }, 404);
  });
  await page.goto(directoryHref);
  await expect(
    page.getByText("SYNTHETIC/member", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Recheck current Objective destination",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("Saved target removed");
  await expect(page.getByText("SYNTHETIC/member", { exact: true })).toHaveCount(
    0,
  );
  expect(reads).toBe(2);
  expect(unexpected).toEqual([]);
});
test("held old target is rejected after selection replacement", async ({
  page,
}) => {
  const unexpected = await fixture(page);
  let release!: () => void,
    reads = 0;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let settle!: () => void;
  const settled = new Promise<void>((resolve) => {
    settle = resolve;
  });
  await page.route(endpoint, async (r) => {
    reads++;
    const input = JSON.parse(
      new URL(r.request().url()).searchParams.get("input")!,
    );
    if (input.params.targetId === targetId) {
      await held;
      await json(r, boundDirectory).catch(() => {});
      settle();
      return;
    }
    return json(r, {
      ...boundDirectory,
      destination: { ...boundDirectory.destination, resourceId: taskId },
      target: { ...boundDirectory.target, id: taskId, memberId: "NEW/member" },
    });
  });
  await page.goto(directoryHref);
  await expect.poll(() => reads).toBe(1);
  await changeLocation(page, directoryHref.replace(targetId, taskId));
  await expect(page.getByText("NEW/member", { exact: true })).toBeVisible();
  release();
  await settled;
  await expect(page.getByText("SYNTHETIC/member", { exact: true })).toHaveCount(
    0,
  );
  expect(reads).toBe(2);
  expect(unexpected).toEqual([]);
});
for (const scopeKey of ["sessionId", "userId", "orgId"])
  test(`${scopeKey} replacement starts a fresh resolution and rejects held earlier scope`, async ({
    page,
  }) => {
    const unexpected = await fixture(page);
    let release!: () => void,
      reads = 0;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let settle!: () => void;
    const settled = new Promise<void>((resolve) => {
      settle = resolve;
    });
    await page.route(endpoint, async (r) => {
      reads++;
      if (reads === 1) {
        await held;
        await json(r, boundDirectory).catch(() => {});
        settle();
        return;
      }
      return json(r, { message: "Access revoked" }, 404);
    });
    await page.goto(directoryHref);
    await expect.poll(() => reads).toBe(1);
    await page.evaluate(
      (key) =>
        dispatchEvent(
          new CustomEvent("test:session", {
            detail: { [key]: "replacement-scope" },
          }),
        ),
      scopeKey,
    );
    await expect(page.getByRole("alert")).toContainText("Access revoked");
    release();
    await settled;
    await expect(
      page.getByText("SYNTHETIC/member", { exact: true }),
    ).toHaveCount(0);
    expect(reads).toBe(2);
    expect(unexpected).toEqual([]);
  });
test("long stored Unicode identity remains readable on mobile with keyboard recheck", async ({
  page,
}, info) => {
  const unexpected = await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(endpoint, (r) =>
    json(r, {
      ...boundDirectory,
      target: { ...boundDirectory.target, memberId: "😀".repeat(128) },
    }),
  );
  await page.goto(directoryHref);
  await expect(
    page.getByRole("heading", { name: "Saved Directory target", exact: true }),
  ).toBeVisible();
  const recheck = page.getByRole("button", {
    name: "Recheck current Objective destination",
    exact: true,
  });
  await recheck.focus();
  await expect(recheck).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("directory-objective-mobile.png"),
    fullPage: true,
  });
  expect(unexpected).toEqual([]);
});

test("client replacement rejects a held previous-client observation", async ({
  page,
}) => {
  const unexpected = await fixture(page);
  await page.route(`**/api/backend/core/clients/${taskId}`, (r) =>
    json(r, { ...client, id: taskId }),
  );
  let release!: () => void,
    reads = 0;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let settle!: () => void;
  const settled = new Promise<void>((resolve) => {
    settle = resolve;
  });
  await page.route(endpoint, async (r) => {
    reads++;
    const input = JSON.parse(
      new URL(r.request().url()).searchParams.get("input")!,
    );
    if (input.query.clientId === clientId) {
      await held;
      await json(r, boundDirectory).catch(() => {});
      settle();
      return;
    }
    expect(input.params.clientId).toBe(taskId);
    return json(r, { message: "Target belongs to another client" }, 404);
  });
  await page.goto(directoryHref);
  await expect.poll(() => reads).toBe(1);
  await changeLocation(page, directoryHref.replace(clientId, taskId));
  await expect(page.getByRole("alert")).toContainText(
    "Target belongs to another client",
  );
  release();
  await settled;
  await expect(page.getByText("SYNTHETIC/member", { exact: true })).toHaveCount(
    0,
  );
  expect(reads).toBe(2);
  expect(unexpected).toEqual([]);
});
test("Directory preflight refusal stays in Objective; closing aborts held navigation", async ({
  page,
}) => {
  const unexpected = await fixture(page);
  await page.route(`**/api/backend/core/clients/${clientId}/targets`, (r) =>
    json(r, [savedTarget]),
  );
  let reads = 0,
    release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let settle!: () => void;
  const settled = new Promise<void>((resolve) => {
    settle = resolve;
  });
  await page.route(
    `**/api/backend/core/clients/${clientId}/targets/${targetId}/objective-destination?*`,
    async (r) => {
      reads++;
      if (reads === 1)
        return json(r, { message: "Saved target unavailable" }, 404);
      await held;
      await json(r, boundDirectory).catch(() => {});
      settle();
      return;
    },
  );
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Choose existing resources", exact: true })
    .click();
  await page
    .getByLabel("Resource type", { exact: true })
    .selectOption("directory_target");
  await page
    .getByLabel("Existing Saved Directory target", { exact: true })
    .selectOption(targetId);
  const open = page.getByRole("button", {
    name: "Open Objective-bound Saved Directory target",
    exact: true,
  });
  await open.click();
  await expect(page.getByRole("alert")).toContainText(
    "Saved target unavailable",
  );
  expect(new URL(page.url()).pathname).toBe(
    `/portfolio/${clientId}/objectives`,
  );
  await open.click();
  await expect.poll(() => reads).toBe(2);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  release();
  await settled;
  expect(new URL(page.url()).pathname).toBe(
    `/portfolio/${clientId}/objectives`,
  );
  expect(unexpected).toEqual([]);
});
