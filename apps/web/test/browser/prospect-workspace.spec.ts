import {
  prospectStateFixture,
  prospectReceiptFixture,
} from "../../tests/prospect-atomic-fixture";
import { test, expect, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  draft,
  prospectId,
  otherId,
} from "../../tests/prospect-resources-fixtures";
const base = `/modules/workspace?prospectId=${prospectId}`;
const detail = `${base}&draftId=${draft.id}`;
const version = {
  id: otherId,
  draftId: draft.id,
  label: "Manual save",
  authorId: "test-user",
  authorKind: "human",
  createdAt: "2026-10-12T12:01:00Z",
  snapshot: {
    docTitle: draft.docTitle,
    config: draft.config,
    prospectId: draft.prospectId,
    clientId: null,
    documents: [],
  },
};
async function setup(page: Page) {
  await onlyLocalRequests(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "workspace.prospect.drafts": { drafts: [] },
    "workspace.draft": draft,
    "workspace.prospect.state": prospectStateFixture(draft),
    "workspace.draft.versions": [version],
  });
  const writes: { key: string; body: unknown }[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/capiro/") && request.method() !== "GET")
      writes.push({
        key: decodeURIComponent(
          new URL(request.url()).pathname.split("/").pop()!,
        ),
        body: request.postDataJSON(),
      });
  });
  return { writes, errors };
}
test("prospect creation recovers its original seed and key after a lost receipt", async ({
  page,
}) => {
  const { writes, errors } = await setup(page);
  let attempts = 0;
  await page.route("**/api/capiro/workspace.prospect.create", (route) =>
    ++attempts === 1
      ? route.abort("connectionreset")
      : route.fulfill({ json: draft }),
  );
  await page.goto(base);
  await page.getByLabel("New prospect document title").fill(draft.docTitle);
  await page.getByRole("button", { name: "Create manual draft" }).click();
  await expect(
    page.getByRole("button", { name: "Recover original draft" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Refresh documents" }).click();
  await expect(
    page.getByRole("button", { name: "Recover original draft" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Recover original draft" }).click();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    draft.docTitle,
  );
  expect(writes).toHaveLength(2);
  expect(writes[0]!.body).toEqual(writes[1]!.body);
  expect(writes[0]!.body).toEqual({
    body: {
      prospectId,
      docTitle: draft.docTitle,
      requestId: expect.stringMatching(/^[a-f0-9-]{36}$/),
    },
  });
  expect(errors).toEqual([]);
});
test("manual content, version history and exports use only reviewed draft operations", async ({
  page,
}) => {
  const { writes, errors } = await setup(page);
  let current = structuredClone(draft);
  await page.route("**/api/capiro/workspace.prospect.state?*", (route) =>
    route.fulfill({ json: prospectStateFixture(current) }),
  );
  await page.route("**/api/capiro/workspace.draft?*", (route) =>
    route.fulfill({ json: current }),
  );
  await page.route("**/api/capiro/workspace.prospect.save", async (route) => {
    const { body } = route.request().postDataJSON();
    current = {
      ...current,
      docTitle: body.title,
      config: { sections: body.names, sectionContent: body.sections },
      updatedAt: "2026-10-12T12:01:00Z",
    };
    return route.fulfill({ json: await prospectReceiptFixture(current, body) });
  });
  await page.route("**/api/capiro/workspace.draft.pdf?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: Buffer.from("%PDF-1.4\nsynthetic fixture"),
    }),
  );
  await page.goto(detail);
  await page.getByLabel("Body content").fill("Manually written prospect text.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(page.getByLabel("Body content")).toHaveValue(
    "Manually written prospect text.",
  );
  expect(writes.map((write) => write.key)).toEqual(["workspace.prospect.save"]);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Manual save");
  await page.keyboard.press("Escape");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export saved PDF" }).click();
  expect((await download).suggestedFilename()).toBe("workspace-document.pdf");
  expect(errors).toEqual([]);
  expect(writes).toHaveLength(1);
});
test("an uncertain save retains edits across navigation and requires read-back before explicit save", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.route("**/api/capiro/workspace.prospect.save", (route) =>
    route.abort("connectionreset"),
  );
  await page.goto(detail);
  await page.getByLabel("Body content").fill("Keep this draft");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/previous save is not confirmed/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "← Workspace", exact: true }).click();
  await page.goBack();
  await expect(page.getByLabel("Body content")).toHaveValue("Keep this draft");
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  expect(writes).toHaveLength(1);
  await page.getByRole("button", { name: "Read current document" }).click();
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  expect(writes).toHaveLength(1);
});
for (const field of ["prospectId", "tenantId"] as const)
  test(`a wrong ${field} never exposes the document or writes`, async ({
    page,
  }) => {
    const { writes } = await setup(page);
    await page.route("**/api/capiro/workspace.draft?*", (route) =>
      route.fulfill({ json: { ...draft, [field]: otherId } }),
    );
    await page.goto(detail);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "does not match",
    );
    await expect(
      page.getByLabel("Document title", { exact: true }),
    ).toHaveCount(0);
    expect(writes).toEqual([]);
  });
test("prospect Newsletter origin cannot open its sending workflow", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.route("**/api/capiro/workspace.draft?*", (route) =>
    route.fulfill({ json: { ...draft, product: "Newsletter" } }),
  );
  await page.goto(`/modules/workspace?draftId=${draft.id}`);
  await expect(page.getByText(/Immutable prospect origin/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /send|generat|share/i }),
  ).toHaveCount(0);
  expect(writes).toEqual([]);
});
test("a changed document is refused by the atomic owner and retains edits for review", async ({
  page,
}) => {
  const { writes } = await setup(page);
  let conflicted = false;
  await page.route("**/api/capiro/workspace.prospect.state?*", (route) =>
    route.fulfill({
      json: prospectStateFixture(
        conflicted
          ? {
              ...draft,
              updatedAt: "2026-10-29T12:00:00Z",
              config: {
                sections: ["Body"],
                sectionContent: { Body: "Another editor's text" },
              },
            }
          : draft,
        conflicted ? "b".repeat(64) : "a".repeat(64),
      ),
    }),
  );
  await page.route("**/api/capiro/workspace.prospect.save", (route) => {
    conflicted = true;
    return route.fulfill({
      status: 409,
      json: { code: "WORKSPACE_SAVE_STATE_CONFLICT", message: "Changed" },
    });
  });
  await page.goto(detail);
  await page.getByLabel("Body content").fill("My text");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("document changed");
  expect(writes).toHaveLength(1);
  await page.getByRole("button", { name: "Read current document" }).click();
  await page.getByText("Current saved content", { exact: true }).click();
  await expect(
    page.getByText("Another editor's text", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Body content")).toHaveValue("My text");
});

test("mobile prospect manual editor preserves keyboard fields and stays in the viewport", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(detail);
  await page.getByLabel("Document title", { exact: true }).focus();
  await expect(
    page.getByLabel("Document title", { exact: true }),
  ).toBeFocused();
  await page.getByLabel("Body content").fill("Manual only");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/prospect-workspace-mobile.png",
    fullPage: true,
  });
});

test("leaving during save preflight aborts the write and retains the uncertain editor", async ({
  page,
}) => {
  const { writes } = await setup(page);
  let saving = false,
    started = false;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/capiro/workspace.prospect.state?*",
    async (route) => {
      if (saving && !started) {
        started = true;
        await held;
      }
      await route
        .fulfill({ json: prospectStateFixture(draft) })
        .catch(() => {});
    },
  );
  await page.goto(detail);
  await page.getByLabel("Body content").fill("Interrupted manual text");
  saving = true;
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => started).toBe(true);
  await page.getByRole("button", { name: "← Workspace", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Prospect Workspace", exact: true }),
  ).toBeVisible();
  release();
  await page.goBack();
  await expect(page.getByLabel("Body content")).toHaveValue(
    "Interrupted manual text",
  );
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  expect(writes).toEqual([]);
});

test("expired creation sends one original request and clears the authenticated editor", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.route("**/api/capiro/workspace.prospect.create", (route) =>
    route.fulfill({ status: 401, json: { message: "Expired" } }),
  );
  await page.goto(base);
  await page
    .getByLabel("New prospect document title")
    .fill("Private unsaved text");
  await page.getByRole("button", { name: "Create manual draft" }).click();
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toBeVisible();
  await expect(page.getByLabel("New prospect document title")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Recover original draft" }),
  ).toHaveCount(0);
  expect(writes).toHaveLength(1);
});

test("reload preserves the original prospect creation seed and request key", async ({
  page,
}) => {
  const { writes, errors } = await setup(page);
  let attempts = 0;
  await page.route("**/api/capiro/workspace.prospect.create", (route) =>
    ++attempts === 1
      ? route.abort("connectionreset")
      : route.fulfill({ json: draft }),
  );
  await page.goto(base);
  await page.getByLabel("New prospect document title").fill(draft.docTitle);
  await page.getByRole("button", { name: "Create manual draft" }).click();
  await expect(
    page.getByRole("button", { name: "Recover original draft" }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Recover original draft" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Recover original draft" }).click();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    draft.docTitle,
  );
  expect(writes).toHaveLength(2);
  expect(writes[0]!.body).toEqual(writes[1]!.body);
  expect(writes[0]!.body).toEqual({
    body: {
      prospectId,
      docTitle: draft.docTitle,
      requestId: expect.stringMatching(/^[a-f0-9-]{36}$/),
    },
  });
  expect(errors).toEqual([]);
});
test("reload preserves uncertain manual edits and the read-back requirement", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.route("**/api/capiro/workspace.prospect.save", (route) =>
    route.abort("connectionreset"),
  );
  await page.goto(detail);
  await page.getByLabel("Body content").fill("Keep this draft");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/previous save is not confirmed/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("Body content")).toHaveValue("Keep this draft");
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  expect(writes).toHaveLength(1);
  await page.getByRole("button", { name: "Read current document" }).click();
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  expect(writes).toHaveLength(1);
});

for (const kind of ["creation", "manual-save"] as const) {
  test(`replacement Core actor cannot restore the former ${kind} input after reload`, async ({
    page,
  }) => {
    const { writes } = await setup(page);
    await page.route("**/api/capiro/workspace.prospect.create", (route) =>
      route.abort("connectionreset"),
    );
    await page.route("**/api/capiro/workspace.prospect.save", (route) =>
      route.abort("connectionreset"),
    );
    await page.goto(kind === "creation" ? base : detail);
    if (kind === "creation") {
      await page
        .getByLabel("New prospect document title")
        .fill("Former actor private seed");
      await page
        .getByRole("button", { name: "Create manual draft", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Recover original draft",
          exact: true,
        }),
      ).toBeEnabled();
    } else {
      await page.getByLabel("Body content").fill("Former actor private edits");
      await page
        .getByRole("button", { name: "Save draft", exact: true })
        .click();
      await expect(
        page.getByText(/previous save is not confirmed/),
      ).toBeVisible();
      await expect.poll(() => writes.length).toBe(1);
    }
    await page.route("**/api/capiro/me.read?*", (route) =>
      route.fulfill({
        json: {
          ...testIdentity,
          user: {
            ...testIdentity.user,
            id: otherId,
            clerkUserId: "replacement-user",
          },
        },
      }),
    );
    await page.reload();
    if (kind === "creation") {
      await expect(page.getByLabel("New prospect document title")).toHaveValue(
        "",
      );
      await expect(
        page.getByRole("button", {
          name: "Recover original draft",
          exact: true,
        }),
      ).toHaveCount(0);
    } else {
      await expect(page.getByLabel("Body content")).toHaveValue("");
      await expect(
        page.getByText(/previous save is not confirmed/),
      ).toHaveCount(0);
    }
    expect(writes).toHaveLength(1);
  });
}

for (const kind of ["creation", "manual-save"] as const) {
  test(`unavailable browser journal blocks ${kind} without a backend write`, async ({
    page,
  }) => {
    const { writes } = await setup(page);
    await page.addInitScript(() =>
      Object.defineProperty(window, "indexedDB", {
        get() {
          throw new DOMException("Synthetic blocked storage", "SecurityError");
        },
      }),
    );
    await page.goto(kind === "creation" ? base : detail);
    await expect(
      page.getByRole("button", {
        name:
          kind === "creation"
            ? "Retry saved draft recovery"
            : "Retry saved document recovery",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: kind === "creation" ? "Create manual draft" : "Save draft",
        exact: true,
      }),
    ).toHaveCount(0);
    expect(writes).toEqual([]);
  });
}
