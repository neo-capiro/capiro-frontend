import { expect, type Page, type Route } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  adoptedDraft,
  blueprint,
  blueprintId,
  catalog,
  comparison,
  versions,
} from "../../tests/document-blueprint-fixtures";
import { state } from "../../tests/workspace-ordinary-save-fixtures";
import { client, clientId } from "./next-modules-fixtures";

export const blueprintUrl = "/modules/workspace?view=document-templates";
export async function blueprintFixture(page: Page) {
  const control = {
    catalog: catalog() as unknown,
    detail: structuredClone(blueprint) as unknown,
    comparison: comparison() as unknown,
    currentVersions: structuredClone(versions),
    wrongVersion: undefined as unknown,
    denied: false,
    loseCreate: false,
    wrongPin: false,
    wrongClient: false,
    row: adoptedDraft(),
    writes: [] as Array<Record<string, unknown>>,
    reads: [] as string[],
    queued: [] as Array<(route: Route, value: unknown) => Promise<void>>,
  };
  let identity = structuredClone(testIdentity);
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "me.read": () => identity,
    "clients.list": [client],
    "workspace.draft": () => control.row,
    "workspace.draft.state": () => state(control.row),
    "workspace.draft.versions": [],
    "workspace.invitations": [],
  });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({ json: client }),
  );
  await page.route("**/api/capiro/workspace.blueprints.*", async (route) => {
    const url = new URL(route.request().url());
    const key = url.pathname.split(".").at(-1)!;
    control.reads.push(key);
    if (control.denied)
      return route.fulfill({ status: 404, json: { message: "Unavailable" } });
    const params = JSON.parse(url.searchParams.get("input") ?? "{}").params as
      | { blueprintId: string; versionId: string }
      | undefined;
    const row =
      key === "list"
        ? control.catalog
        : key === "detail"
          ? control.detail
          : key === "compare"
            ? control.comparison
            : (control.wrongVersion ??
              control.currentVersions.find((v) => v.id === params?.versionId));
    const value = structuredClone(row);
    if (key === "version" && control.queued.length)
      return control.queued.shift()!(route, value);
    return route.fulfill({ json: value });
  });
  await page.route("**/api/capiro/workspace.draft.create", async (route) => {
    const input = route.request().postDataJSON() as {
      body: Record<string, unknown>;
    };
    control.writes.push(input.body);
    control.row.docTitle = String(input.body.docTitle);
    control.row.clientId = input.body.clientId === clientId ? clientId : null;
    control.row.config.clientId = control.row.clientId;
    if (control.wrongPin)
      control.row.config.documentAgent.blueprintPin.version = 99;
    if (control.wrongClient) control.row.clientId = blueprintId;
    if (control.loseCreate) return route.abort("failed");
    return route.fulfill({ json: control.row });
  });
  return {
    ...control,
    control,
    async switchActor() {
      identity = {
        ...testIdentity,
        user: {
          ...testIdentity.user,
          id: blueprintId,
          clerkUserId: "other-synthetic-user",
        },
      };
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent("test:session", {
            detail: {
              userId: "other-synthetic-user",
              sessionId: "other-synthetic-session",
            },
          }),
        ),
      );
    },
  };
}
export async function openBlueprint(page: Page, url = blueprintUrl) {
  await page.goto(url);
  await page
    .getByRole("button", { name: /Synthetic policy brief.*Latest v3/ })
    .click();
  await expect(page.getByLabel("Saved version")).toBeVisible();
}
export async function chooseVersion(page: Page, version = 2) {
  await page.getByLabel("Saved version").click();
  await page
    .getByRole("option", {
      name: `v${version} · ${versions[version - 1]!.status}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", {
      name: `Selected version ${version}`,
      exact: true,
    }),
  ).toBeVisible();
}
export async function createDialog(page: Page) {
  await page
    .getByRole("button", { name: "Use version 2", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Create from blueprint",
    exact: true,
  });
  await expect(
    dialog.getByRole("button", { name: "Close dialog", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByLabel("Document title")).toBeFocused();
  return dialog;
}
