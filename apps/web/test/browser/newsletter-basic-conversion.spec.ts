import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import {
  ordinarySaveFixture,
  ordinaryEditorUrl,
} from "./workspace-ordinary-save-fixture";
import { button } from "./newsletter-document-fixtures";
import { templateFixture } from "./newsletter-template-library-fixtures";
import { testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";

async function setup(page: Page, code = false) {
  const rich = await templateFixture(page);
  const basic = await ordinarySaveFixture(page, { newsletter: true });
  // Combine the existing specific service fixtures without their catch-all
  // common-operation handlers swallowing each other's service routes.
  await page.unroute("**/api/capiro/*");
  await page.unroute("**/*");
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.fallback()
      : route.abort("blockedbyclient"),
  );
  const common: Record<string, unknown> = {
    ...moduleRouteFixtures,
    "me.read": testIdentity,
    "workspace.draft.versions": [],
    "workspace.clients": { items: [], nextCursor: null, sources: [] },
  };
  await page.route(
    /\/api\/capiro\/(?!workspace\.(richNewsletter\.|draft\.(state|save)))/,
    (route) => {
      const key = new URL(route.request().url()).pathname.split("/").pop()!;
      const data = key === "workspace.draft" ? basic.current() : common[key];
      return route.fulfill({
        status: data === undefined ? 500 : 200,
        json: data ?? { message: `Unconfigured fixture operation ${key}` },
      });
    },
  );
  basic.current().documents[0]!.body.newsletter!.blocks = [
    { id: "date", kind: "paragraph", text: "Issue date: 2026-10-20" },
    { id: "heading", kind: "heading", text: "The week in policy." },
    {
      id: "paragraph",
      kind: "paragraph",
      text: "A saved briefing with <script>alert(1)</script> shown literally.",
    },
    {
      id: "image",
      kind: "image",
      text: "Policy briefing image",
      href: "https://never-fetch.example.test/image.png",
    },
    {
      id: "social",
      kind: "social",
      text: "Follow the policy desk",
      href: "https://never-fetch.example.test/social",
    },
    ...(code
      ? [
          {
            id: "code",
            kind: "code" as const,
            text: "<script>alert('literal only')</script>",
          },
        ]
      : []),
  ];
  // Exact pre-WS14 generic projection, including the older social text-only row.
  basic.current().documents[0]!.body.blocks = basic
    .current()
    .documents[0]!.body.newsletter!.blocks.map((block) => ({
      id: block.id,
      type: "section",
      title: block.kind === "heading" ? block.text : "",
      content: block.kind === "heading" ? "" : block.text,
    }));
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
  await page.goto(ordinaryEditorUrl);
  await expect(page.getByLabel("Subject", { exact: true })).toBeEditable();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check("14px TestGeist")),
  ).toBe(true);
  return { basic, rich };
}

for (const width of [1440, 390])
  test(`basic preview and conversion review are inert and usable at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1100 });
    const { basic, rich } = await setup(page, true);
    const paper = page
      .locator("article")
      .filter({ hasText: "Issue date: 2026-10-20" });
    await expect(
      paper.getByText("Policy briefing image", { exact: true }),
    ).toBeVisible();
    await expect(
      paper.getByText("https://never-fetch.example.test/social", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(paper.locator("img, a[href]")).toHaveCount(0);
    await expect(
      paper.getByText("Literal code · HTML is not executed"),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`basic-preview-${width}.png`),
      fullPage: true,
    });
    await button(page, "Convert to rich newsletter").click();
    const dialog = page.getByRole("dialog", { name: "Review rich conversion" });
    await expect(
      dialog.getByText(/Block 6 \(code\): literal code/),
    ).toBeVisible();
    await expect(button(page, "Open rich editor")).toBeDisabled();
    await page.screenshot({
      path: info.outputPath(`conversion-refusal-${width}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(button(page, "Convert to rich newsletter")).toBeFocused();
    expect(basic.saves).toEqual([]);
    expect(rich.control.requests).toEqual([]);
    expect(rich.control.remote).toEqual([]);
    expect(rich.control.errors).toEqual([]);
  });

test("explicit conversion applies locally, preserves undo and original basic edits, and never saves on navigation", async ({
  page,
}, info) => {
  const { basic, rich } = await setup(page);
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Current local subject — café");
  await button(page, "Convert to rich newsletter").click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(/Social links become ordinary link buttons/),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("conversion-review.png"),
    fullPage: true,
  });
  await button(page, "Open rich editor").click();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Untitled newsletter",
  );
  await expect(button(page, "Apply converted draft")).toBeEnabled();
  expect(rich.control.requests.filter((r) => r.method !== "GET")).toEqual([]);
  await button(page, "Apply converted draft").click();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Saved newsletter name",
  );
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Current local subject — café",
  );
  await expect(button(page, "Apply converted draft")).toBeDisabled();
  await button(page, "Undo").click();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Untitled newsletter",
  );
  await button(page, "Redo").click();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Saved newsletter name",
  );
  await page.screenshot({
    path: info.outputPath("conversion-applied.png"),
    fullPage: true,
  });
  await button(page, "Close preview").click();
  await button(page, "Discard and leave").click();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Current local subject — café",
  );
  expect(basic.saves).toEqual([]);
  expect(rich.control.requests.filter((r) => r.method !== "GET")).toEqual([]);
  expect(rich.control.remote).toEqual([]);
  expect(rich.control.errors).toEqual([]);
});

test("explicit issue date is saved once and survives reopen without changing existing newsletter fields", async ({
  page,
}) => {
  const { basic, rich } = await setup(page);
  await button(page, "Issue date").click();
  await button(page, "Save draft").click();
  await expect(
    page.getByText(
      "Saved. The immutable version and current saved content are confirmed.",
      { exact: true },
    ),
  ).toBeVisible();
  const savedBody = structuredClone(
    basic.current().documents[0]!.body.newsletter!,
  );
  expect(savedBody.blocks.at(-1)!.text).toMatch(
    /^Issue date: \d{4}-\d{2}-\d{2}$/,
  );
  expect(savedBody.subject).toBe("Saved email subject");
  expect(savedBody.blocks.find((b) => b.id === "social")!.href).toBe(
    "https://never-fetch.example.test/social",
  );
  await page.reload();
  await expect(page.getByLabel("Subject", { exact: true })).toBeEditable();
  await expect(
    page
      .locator("article")
      .getByText(savedBody.blocks.at(-1)!.text, { exact: true }),
  ).toBeVisible();
  expect(basic.current().documents[0]!.body.newsletter).toEqual(savedBody);
  expect(basic.saves).toHaveLength(1);
  expect(rich.control.remote).toEqual([]);
});

test("converted content reaches the existing explicit saved-document and rich template library owners", async ({
  page,
}) => {
  const { basic, rich } = await setup(page);
  await button(page, "Convert to rich newsletter").click();
  await button(page, "Open rich editor").click();
  await button(page, "Apply converted draft").click();
  await expect(
    button(page, "Save current server newsletter as template"),
  ).toBeDisabled();
  expect(rich.calls("create")).toEqual([]);
  await button(page, "Create saved document").click();
  await expect(
    page.getByRole("heading", { name: "This request saved revision 1" }),
  ).toBeVisible();
  await button(page, "Read current saved document").click();
  await button(page, "Rebase local draft onto reviewed revision").click();
  await expect(button(page, "Save newsletter")).toBeEnabled();
  await button(page, "Save newsletter").click();
  await expect(
    page.getByRole("heading", { name: "This request saved revision 2" }),
  ).toBeVisible();
  await button(page, "Read current saved document").click();
  await button(page, "Rebase local draft onto reviewed revision").click();
  await expect(
    button(page, "Save current server newsletter as template"),
  ).toBeEnabled();
  expect(rich.calls("create")).toHaveLength(1);
  expect(rich.calls("save")).toHaveLength(1);
  expect(rich.control.current.config.subject).toBe("Saved email subject");
  expect(rich.control.current.config.company).toBe("Synthetic firm");
  expect(
    rich.control.current.design.sections[0]!.blocks.find(
      (b) => b.kind === "button",
    )!.url,
  ).toBe("https://never-fetch.example.test/social");
  await button(page, "Save current server newsletter as template").click();
  const dialog = page.getByRole("dialog", {
    name: "Save template",
    exact: true,
  });
  await dialog
    .getByLabel("Name", { exact: true })
    .fill("Converted policy template");
  await dialog.getByLabel("Folder", { exact: true }).fill("Updates");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText(
      "Template added to your saved templates. The newsletter draft is unchanged.",
    ),
  ).toBeVisible();
  expect(rich.templates.writes).toEqual([
    {
      operation: "templates.save",
      input: {
        params: { id: rich.control.current.id },
        body: { name: "Converted policy template", folder: "Updates" },
      },
    },
  ]);
  expect(basic.saves).toEqual([]);
  expect(rich.control.remote).toEqual([]);
  expect(rich.control.dialogs).toEqual([]);
});

test("conversion cannot replace a separately adopted saved document or survive session replacement", async ({
  page,
}) => {
  const { basic, rich } = await setup(page);
  rich.control.current.config.clientId = null;
  await button(page, "Convert to rich newsletter").click();
  await button(page, "Open rich editor").click();
  await button(page, "Load saved newsletters").click();
  await button(page, "Review Synthetic saved newsletter").click();
  await expect(button(page, "Apply converted draft")).toBeDisabled();
  await button(page, "Adopt saved document and replace local draft").click();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Synthetic saved newsletter",
  );
  await expect(button(page, "Apply converted draft")).toBeDisabled();
  await basic.switchActor();
  await expect(
    page.getByRole("region", { name: "Converted basic newsletter" }),
  ).toHaveCount(0);
  expect(rich.control.requests.filter((r) => r.method !== "GET")).toEqual([]);
});
