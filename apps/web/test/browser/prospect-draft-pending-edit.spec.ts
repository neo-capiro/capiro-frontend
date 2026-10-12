import { test, expect, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  draft,
  prospectId,
  otherId,
} from "../../tests/prospect-resources-fixtures";

const detail = `/modules/workspace?prospectId=${prospectId}&draftId=${draft.id}`;
const submitted = {
  title: "Submitted prospect title",
  body: "Submitted prospect body",
  summary: "Submitted prospect summary",
};
const version = {
  id: otherId,
  draftId: draft.id,
  label: "Manual save",
  authorId: "test-user",
  authorKind: "human",
  createdAt: "2026-10-12T12:01:00Z",
};
type Phase = "update" | "snapshot";
type Outcome = "success" | "failure" | "lost receipt";

async function heldSave(
  page: Page,
  phase: Phase,
  outcome: Outcome = "success",
) {
  await onlyLocalRequests(page);
  let current = {
    ...structuredClone(draft),
    config: {
      sections: ["Body", "Summary"],
      sectionContent: { Body: "", Summary: "" },
    },
  };
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "workspace.prospect.drafts": { drafts: [] },
    "workspace.draft": current,
    "workspace.draft.versions": [version],
  });
  const writes: string[] = [];
  let entered = false;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/capiro/workspace.draft?*", (route) =>
    route.fulfill({ json: current }),
  );
  for (const operation of ["update", "snapshot"] as const)
    await page.route(
      `**/api/capiro/workspace.draft.${operation}`,
      async (route) => {
        writes.push(operation);
        if (operation === phase && !entered) {
          entered = true;
          await held;
          if (outcome === "failure")
            return route.fulfill({
              status: 500,
              json: { message: "Save failed" },
            });
          if (outcome === "lost receipt") return route.abort("connectionreset");
        }
        if (operation === "update") {
          const { body } = route.request().postDataJSON();
          current = {
            ...current,
            docTitle: body.docTitle,
            config: body.config,
            updatedAt: "2026-10-12T12:01:00Z",
          };
        }
        await route.fulfill({
          json: operation === "update" ? current : version,
        });
      },
    );
  return { writes, release, started: () => entered };
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

for (const phase of ["update", "snapshot"] as const) {
  for (const outcome of ["success", "failure", "lost receipt"] as const) {
    test(`prospect fields freeze during held ${phase}; ${outcome} preserves submitted text`, async ({
      page,
    }) => {
      const control = await heldSave(page, phase, outcome);
      await beginSave(page);
      await expect.poll(control.started).toBe(true);
      for (const field of fields(page)) await expect(field).toBeDisabled();
      await expectSubmitted(page);
      control.release();
      const save = page.getByRole("button", {
        name: "Save draft",
        exact: true,
      });
      if (outcome === "success") {
        await expect(save).toBeEnabled();
        await expectSubmitted(page);
        expect(control.writes).toEqual(["update", "snapshot"]);
        await page.reload();
        await expectSubmitted(page);
        await expect(
          page.getByText(/previous save is not confirmed/),
        ).toHaveCount(0);
      } else {
        await expect(
          page.getByText(/previous save is not confirmed/),
        ).toBeVisible();
        await expect(save).toBeDisabled();
        const originalWrites =
          phase === "update" ? ["update"] : ["update", "snapshot"];
        expect(control.writes).toEqual(originalWrites);
        await page.reload();
        await expectSubmitted(page);
        await expect(save).toBeDisabled();
        await page
          .getByRole("button", { name: "Read current document" })
          .click();
        await expect(save).toBeEnabled();
        await expectSubmitted(page);
        expect(control.writes).toEqual(originalWrites);
        await save.click();
        await expect(save).toBeEnabled();
        expect(control.writes).toEqual([
          ...originalWrites,
          "update",
          "snapshot",
        ]);
      }
      for (const field of fields(page)) await expect(field).toBeEditable();
      await page.getByLabel("Body content").fill("Next deliberate edit");
      await expect(page.getByLabel("Body content")).toHaveValue(
        "Next deliberate edit",
      );
    });
  }

  test(`leaving during held ${phase} retains the original intent without continuing the old save`, async ({
    page,
  }) => {
    const control = await heldSave(page, phase);
    await beginSave(page);
    await expect.poll(control.started).toBe(true);
    for (const field of fields(page)) await expect(field).toBeDisabled();
    await page
      .getByRole("button", { name: "← Workspace", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Prospect Workspace", exact: true }),
    ).toBeVisible();
    control.release();
    await page.goBack();
    await expectSubmitted(page);
    await expect(
      page.getByText(/previous save is not confirmed/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Read current document" }).click();
    await expect(
      page.getByRole("button", { name: "Save draft", exact: true }),
    ).toBeEnabled();
    expect(control.writes).toEqual(
      phase === "update" ? ["update"] : ["update", "snapshot"],
    );
  });
}

for (const replacement of ["user", "tenant", "prospect", "client"] as const)
  test(`a ${replacement} replacement during PATCH cannot restore or finish the former editor`, async ({
    page,
  }) => {
    const control = await heldSave(page, "update");
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
    expect(control.writes).toEqual(["update"]);
  });
