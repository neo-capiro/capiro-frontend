import { expect, type Page, type Route } from "@playwright/test";
import { fileURLToPath } from "node:url";
import {
  createNewsletterLayout,
  defaultNewsletterConfig,
  type NewsletterCampaign,
} from "@capiro/shared/newsletter";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { client, otherClient, clientId } from "./next-modules-fixtures";

export { clientId, otherClientId, navigate } from "./next-modules-fixtures";
export const documentId = "b2222222-2222-7222-8222-222222222222";
export const stageId = "a1111111-1111-4111-8111-111111111111";
export const editorUrl = "/modules/workspace?view=rich-newsletter";
export const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
export function savedDocument(): NewsletterCampaign {
  return {
    id: documentId,
    revision: 4,
    name: "Synthetic saved newsletter",
    status: "draft",
    ownerId: "user_synthetic",
    updatedAt: "2026-10-13T02:00:00.000Z",
    config: {
      ...defaultNewsletterConfig(),
      clientId,
      subject: "Saved subject",
    },
    design: createNewsletterLayout(1),
  };
}
export type DocumentOperation =
  | "list"
  | "create"
  | "detail"
  | "save"
  | "preview"
  | "stagedRevision"
  | "stage";
type Interception = (route: Route) => Promise<void>;
type Observed = {
  operation: DocumentOperation;
  method: string;
  input: unknown;
};

/** Synthetic owner responses only; production parsers and lifecycle remain mounted. */
export async function documentFixture(page: Page) {
  await onlyLocalRequests(page);
  // Reused runtime junctions sit outside Vite's development allow-list.
  // The fixture serves the same bundled font without changing the shared server.
  if (process.env.CAPIRO_BROWSER_TEST_DEV === "1")
    await page.route("**/Geist-Variable.woff2*", (route) =>
      route.fulfill({
        path: fileURLToPath(
          new URL(
            "../../../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
            import.meta.url,
          ),
        ),
        contentType: "font/woff2",
      }),
    );
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "clients.list": [client, otherClient],
  });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: route.request().url().endsWith(clientId) ? client : otherClient,
    }),
  );
  const control = {
    current: savedDocument(),
    items: undefined as NewsletterCampaign[] | undefined,
    requests: [] as Observed[],
    operations: [] as string[],
    errors: [] as string[],
    remote: [] as string[],
    dialogs: [] as string[],
  };
  const queued = new Map<DocumentOperation, Interception[]>();
  page.on("pageerror", (error) => control.errors.push(error.message));
  page.on("dialog", async (dialog) => {
    control.dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") control.remote.push(request.url());
    if (url.pathname.startsWith("/api/capiro/"))
      control.operations.push(
        decodeURIComponent(url.pathname.split("/").pop()!),
      );
  });
  await page.route(
    "**/api/capiro/workspace.richNewsletter.*",
    async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      const operation = url.pathname.split(".").pop() as DocumentOperation;
      const input =
        request.method() === "GET"
          ? JSON.parse(url.searchParams.get("input") ?? "{}")
          : request.postDataJSON();
      control.requests.push({ operation, method: request.method(), input });
      const override = queued.get(operation)?.shift();
      if (override) return override(route);
      if (operation === "list")
        return route.fulfill({
          json: { items: control.items ?? [control.current] },
        });
      if (operation === "detail" || operation === "create")
        return route.fulfill({ json: control.current });
      if (operation === "save") {
        control.current = {
          ...control.current,
          ...input.body,
          revision: input.body.revision + 1,
        };
        return route.fulfill({ json: control.current });
      }
      if (operation === "stage")
        return route.fulfill({
          json: {
            id: stageId,
            documentId: control.current.id,
            revision: input.body.revision,
            name: "Synthetic stage",
            createdAt: "2026-10-13T02:00:00.000Z",
            route: `/engagement/outreach?newsletterStage=${stageId}`,
          },
        });
      return route.fulfill({
        status: 500,
        json: { message: "Explicit preview fixture required" },
      });
    },
  );
  return {
    ...control,
    control,
    queue(operation: DocumentOperation, handler: Interception) {
      queued.set(operation, [...(queued.get(operation) ?? []), handler]);
    },
    calls: (operation: DocumentOperation) =>
      control.requests.filter((entry) => entry.operation === operation),
  };
}

export async function enterEditor(page: Page, url = editorUrl) {
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Rich newsletter editor preview" }),
  ).toBeVisible();
}
export async function reviewDocument(
  page: Page,
  name = "Synthetic saved newsletter",
) {
  await button(page, "Load saved newsletters").click();
  await button(page, `Review ${name}`).click();
  await expect(
    page.getByRole("region", { name: "Review current saved newsletter" }),
  ).toBeVisible();
}
export async function adoptDocument(page: Page) {
  await reviewDocument(page);
  await button(page, "Adopt saved document and replace local draft").click();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Synthetic saved newsletter",
  );
}
export async function closeAndReopen(page: Page) {
  await button(page, "Close preview").click();
  await button(page, "Discard and leave").click();
  await expect(
    page.getByRole("heading", { name: "Workspace", exact: true }),
  ).toBeVisible();
  await button(page, "Rich newsletter preview").click();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Untitled newsletter",
  );
}
export function heldResponse() {
  let release!: () => void;
  let finished!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  const settled = new Promise<void>((resolve) => {
    finished = resolve;
  });
  return { wait, release, settled, finished };
}
export function expectIsolated(
  control: Awaited<ReturnType<typeof documentFixture>>,
) {
  expect(control.errors).toEqual([]);
  expect(control.remote).toEqual([]);
  expect(control.dialogs).toEqual([]);
  expect(
    control.operations.filter((key) =>
      /engagement\.|workspace\.newsletter|workspace\.draft\./.test(key),
    ),
  ).toEqual([]);
}
