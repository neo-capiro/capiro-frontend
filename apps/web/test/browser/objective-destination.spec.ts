import { test, expect } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { session, sessionId } from "../../tests/newsletter-staging-fixtures";
const clientId = "30000000-0000-4000-8000-000000000001",
  objectiveId = "40000000-0000-4000-8000-000000000001";
const binding = {
  clientId,
  objectiveId,
  objectiveVersion: 7,
  kind: "outreach_session",
  resourceId: sessionId,
  objectiveRevisionId: "50000000-0000-4000-8000-000000000001",
  destinationStateVersion: 3,
};
const bound = {
  ...session,
  spec: {
    ...session.spec,
    sponsor: {
      kind: "client",
      label: "Synthetic client",
      clientRefs: [{ clientId }],
    },
  },
  destination: binding,
};

test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    route.fulfill({
      json: {
        id: clientId,
        name: "Synthetic client",
        status: "ACTIVE",
        profileStatus: "ACTIVE",
      },
    }),
  );
});

const path = `/modules/engagement?view=outreach&session=${sessionId}&clientId=${clientId}&objectiveId=${objectiveId}&objectiveVersion=7`;
test("each Objective-bound open/reload calls the canonical owner without an unbound session fallback", async ({
  page,
}, info) => {
  let reads = 0;
  const keys: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/capiro/"))
      keys.push(new URL(r.url()).pathname.split("/").pop()!);
  });
  await operationFixtures(page, {
    "me.read": testIdentity,
    "engagement.objectiveDestination": () => {
      reads++;
      return bound;
    },
  });
  await page.goto(path);
  await expect(page.getByText(/immutable revision/)).toContainText(
    binding.objectiveRevisionId,
  );
  await expect(
    page.getByRole("button", { name: "Save campaign decisions" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(/immutable revision/)).toBeVisible();
  expect(reads).toBe(2);
  await page.screenshot({
    path: info.outputPath("objective-destination-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Recheck current Objective destination" })
    .focus();
  await expect(
    page.getByRole("button", { name: "Recheck current Objective destination" }),
  ).toBeFocused();
  await page.screenshot({
    path: info.outputPath("objective-destination-mobile.png"),
    fullPage: true,
  });
  expect(keys).not.toContain("engagement.session");
  await page
    .getByRole("button", { name: "Recheck current Objective destination" })
    .click();
  await expect.poll(() => reads).toBe(3);
});
for (const status of [404, 409])
  test(`owner refusal${status} clears bound content and never falls back`, async ({
    page,
  }) => {
    await operationFixtures(page, {
      "me.read": testIdentity,
      "engagement.objectiveDestination": bound,
    });
    await page.goto(path);
    await expect(page.getByText(/immutable revision/)).toBeVisible();
    await page.route("**/api/capiro/engagement.objectiveDestination?*", (r) =>
      r.fulfill({
        status,
        json: {
          message:
            status === 409
              ? "OBJECTIVE_VERSION_CONFLICT"
              : "Objective destination unavailable",
        },
      }),
    );
    await page
      .getByRole("button", { name: "Recheck current Objective destination" })
      .click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/immutable revision/)).toHaveCount(0);
  });
test("mismatched binding and malformed Objective query never expose session content", async ({
  page,
}) => {
  let reads = 0;
  await operationFixtures(page, {
    "me.read": testIdentity,
    "engagement.objectiveDestination": () => {
      reads++;
      return { ...bound, destination: { ...binding, objectiveVersion: 8 } };
    },
  });
  await page.goto(path);
  await expect(page.getByRole("alert")).toContainText("does not match");
  await expect(page.getByText(/immutable revision/)).toHaveCount(0);
  await page.goto(path.replace("objectiveVersion=7", "objectiveVersion=1e0"));
  await expect(page.getByRole("alert")).toContainText("exact client");
  expect(reads).toBe(1);
});

test("a replaced Objective query hides the old observation and ignores its late response", async ({
  page,
}) => {
  let release!: () => void;
  let held = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await operationFixtures(page, { "me.read": testIdentity });
  await page.route(
    "**/api/capiro/engagement.objectiveDestination?*",
    async (route) => {
      const input = JSON.parse(
        new URL(route.request().url()).searchParams.get("input")!,
      );
      if (input.query.objectiveVersion === 7) {
        held = true;
        await gate;
      }
      await route
        .fulfill({
          json: {
            ...bound,
            destination: {
              ...binding,
              objectiveVersion: input.query.objectiveVersion,
            },
          },
        })
        .catch(() => {});
    },
  );
  await page.goto(path);
  await expect.poll(() => held).toBe(true);
  await expect(page.getByText(/immutable revision/)).toHaveCount(0);
  await page.evaluate(
    (next) => {
      history.pushState({}, "", next);
      dispatchEvent(new PopStateEvent("popstate"));
    },
    path.replace("objectiveVersion=7", "objectiveVersion=8"),
  );
  await expect(page.getByText(/immutable revision/)).toContainText(
    "Objective version 8",
  );
  release();
  await expect(page.getByText(/immutable revision/)).toContainText(
    "Objective version 8",
  );
  await expect(
    page.getByRole("button", { name: "Save campaign decisions" }),
  ).toHaveCount(0);
});
