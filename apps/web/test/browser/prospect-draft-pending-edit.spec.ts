import { test, expect, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  draft,
  prospectId,
  otherId,
} from "../../tests/prospect-resources-fixtures";
import {
  prospectStateFixture,
  prospectReceiptFixture,
} from "../../tests/prospect-atomic-fixture";
const detail = `/modules/workspace?prospectId=${prospectId}&draftId=${draft.id}`;
const submitted = {
  title: "Submitted prospect title",
  body: "Submitted prospect body",
  summary: "Submitted prospect summary",
};
async function heldSave(page: Page, outcome = "success") {
  await onlyLocalRequests(page);
  let current = {
    ...structuredClone(draft),
    config: {
      sections: ["Body", "Summary"],
      sectionContent: { Body: "", Summary: "" },
    },
  };
  const writes: string[] = [],
    bodies: unknown[] = [],
    versions = new Map<
      string,
      Awaited<ReturnType<typeof prospectReceiptFixture>>
    >();
  let entered = false,
    release!: () => void,
    revision = 0;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "workspace.prospect.drafts": { drafts: [] },
    "workspace.draft": () => current,
    "workspace.draft.versions": [],
    "workspace.prospect.state": () =>
      prospectStateFixture(current, revision ? "b".repeat(64) : "a".repeat(64)),
  });
  await page.route("**/api/capiro/workspace.prospect.save", async (route) => {
    const { body } = route.request().postDataJSON();
    writes.push("save");
    bodies.push(body);
    const first = !entered;
    if (first) {
      entered = true;
      await held;
    }
    if (first && outcome === "failure")
      return route.fulfill({
        status: 503,
        json: { message: "Synthetic failure before commit" },
      });
    if (!versions.has(body.requestId)) {
      if (outcome === "conflict" && first) {
        current = {
          ...current,
          docTitle: "Newer editor",
          updatedAt: "2026-10-29T12:00:00Z",
        };
        revision++;
        return route.fulfill({
          status: 409,
          json: { code: "WORKSPACE_SAVE_STATE_CONFLICT", message: "Changed" },
        });
      }
      current = {
        ...current,
        docTitle: body.title,
        config: { sections: body.names, sectionContent: body.sections },
        updatedAt: "2026-10-29T12:00:01Z",
      };
      revision++;
      versions.set(body.requestId, await prospectReceiptFixture(current, body));
    }
    if (first && outcome === "lost receipt")
      return route.fulfill({
        status: 503,
        json: { message: "Synthetic lost acknowledgement after commit" },
      });
    return route.fulfill({
      json: { ...versions.get(body.requestId), replayed: !first },
    });
  });
  return { writes, bodies, versions, release, started: () => entered };
}
function fields(page: Page) {
  return [
    page.getByLabel("Document title", { exact: true }),
    page.getByLabel("Body content"),
    page.getByLabel("Summary content"),
  ] as const;
}
async function beginSave(page: Page) {
  await page.goto(detail);
  const [title, body, summary] = fields(page);
  await title.fill(submitted.title);
  await body.fill(submitted.body);
  await summary.fill(submitted.summary);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
}
async function expectSubmitted(page: Page) {
  const [title, body, summary] = fields(page);
  await expect(title).toHaveValue(submitted.title);
  await expect(body).toHaveValue(submitted.body);
  await expect(summary).toHaveValue(submitted.summary);
}
for (const outcome of ["success", "failure", "lost receipt"])
  test(`atomic prospect save freezes fields and recovers ${outcome} with one version`, async ({
    page,
  }) => {
    const control = await heldSave(page, outcome);
    await beginSave(page);
    await expect.poll(control.started).toBe(true);
    for (const field of fields(page)) await expect(field).toBeDisabled();
    await expectSubmitted(page);
    control.release();
    const save = page.getByRole("button", { name: "Save draft", exact: true });
    if (outcome !== "success") {
      await expect(
        page.getByRole("button", { name: "Recover original save" }),
      ).toBeEnabled();
      await page.reload();
      await expectSubmitted(page);
      await expect(save).toBeDisabled();
      expect(control.writes).toHaveLength(1);
      await page.getByRole("button", { name: "Read current document" }).click();
      await expect(save).toBeDisabled();
      await page.getByRole("button", { name: "Recover original save" }).click();
    }
    await expect(save).toBeEnabled();
    await expectSubmitted(page);
    expect(control.versions.size).toBe(1);
    if (outcome !== "success")
      expect(control.bodies[0]).toEqual(control.bodies[1]);
    await page.reload();
    await expectSubmitted(page);
  });
test("a definite version conflict requires current-content review and a new request", async ({
  page,
}) => {
  const control = await heldSave(page, "conflict");
  await beginSave(page);
  await expect.poll(control.started).toBe(true);
  control.release();
  await expect(page.getByRole("alert")).toContainText("document changed");
  const save = page.getByRole("button", { name: "Save draft", exact: true });
  await expect(save).toBeDisabled();
  await page.getByRole("button", { name: "Read current document" }).click();
  await expect(page.getByRole("status")).toContainText("Compare");
  await expect(save).toBeEnabled();
  await expectSubmitted(page);
  await save.click();
  await expect(save).toBeEnabled();
  expect(control.versions.size).toBe(1);
  expect(control.bodies[0]).not.toEqual(control.bodies[1]);
});
test("leaving during an atomic save retains the original request without continuing the old editor", async ({
  page,
}) => {
  const control = await heldSave(page);
  await beginSave(page);
  await expect.poll(control.started).toBe(true);
  await page.getByRole("button", { name: "← Workspace", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Prospect Workspace", exact: true }),
  ).toBeVisible();
  control.release();
  await page.goBack();
  await expectSubmitted(page);
  await expect(
    page.getByRole("button", { name: "Recover original save" }),
  ).toBeEnabled();
  expect(control.writes).toEqual(["save"]);
});
for (const replacement of ["user", "tenant", "prospect", "client"] as const)
  test(`a ${replacement} replacement during atomic save cannot restore or finish the former editor`, async ({
    page,
  }) => {
    const control = await heldSave(page);
    await beginSave(page);
    await expect.poll(control.started).toBe(true);
    for (const field of fields(page)) await expect(field).toBeDisabled();
    if (replacement === "client") {
      await page.route(`**/api/backend/core/clients/${otherId}`, (route) =>
        route.fulfill({
          status: 403,
          json: { error: "Replacement client denied" },
        }),
      );
      await page.evaluate((path) => {
        history.pushState({}, "", path);
        dispatchEvent(new PopStateEvent("popstate"));
      }, `${detail}&clientId=${otherId}`);
      await expect(
        page.getByRole("heading", { name: "Selected client unavailable" }),
      ).toBeVisible();
    } else if (replacement === "prospect") {
      await page.evaluate(
        (path) => {
          history.pushState({}, "", path);
          dispatchEvent(new PopStateEvent("popstate"));
        },
        detail.replace(prospectId, otherId),
      );
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "does not match",
      );
    } else {
      await page.route("**/api/capiro/me.read?*", (route) =>
        route.fulfill({
          json: {
            ...testIdentity,
            ...(replacement === "user"
              ? {
                  user: {
                    ...testIdentity.user,
                    id: otherId,
                    clerkUserId: "replacement-user",
                  },
                }
              : { tenant: { ...testIdentity.tenant, id: otherId } }),
          },
        }),
      );
      await page.route("**/api/capiro/workspace.draft?*", (route) =>
        route.fulfill({
          status: 403,
          json: { message: "Replacement cannot read former draft" },
        }),
      );
      await page.evaluate(
        (kind) =>
          window.dispatchEvent(
            new CustomEvent("test:session", {
              detail:
                kind === "user"
                  ? {
                      userId: "replacement-user",
                      sessionId: "replacement-session",
                    }
                  : {
                      orgId: "replacement-org",
                      sessionId: "replacement-session",
                    },
            }),
          ),
        replacement,
      );
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "Replacement cannot read former draft",
      );
    }
    control.release();
    await expect(page.getByLabel("Body content")).toHaveCount(0);
    await expect(page.getByText(submitted.body, { exact: true })).toHaveCount(
      0,
    );
    expect(control.writes).toEqual(["save"]);
  });
