import { test, expect, type Locator } from "@playwright/test";
import {
  richWorkspaceFixture,
  richBody,
  richDetail,
} from "./prospect-rich-workspace-fixture";

// Read the actual editor state; do not substitute a selection or content command.
const selection = (body: Locator) =>
  body.evaluate((node) => {
    const editor = (
      node as HTMLElement & {
        editor: {
          state: {
            selection: {
              empty: boolean;
              constructor: { name: string };
              from: number;
              to: number;
            };
            doc: { content: { size: number } };
          };
        };
      }
    ).editor;
    return {
      empty: editor.state.selection.empty,
      type: editor.state.selection.constructor.name,
      to: editor.state.selection.to,
      end: editor.state.doc.content.size - 1,
    };
  });

test("document-end collapses AllSelection before table insertion and preserves preview/save/reload", async ({
  page,
}) => {
  const fixture = await richWorkspaceFixture(
    page,
    "<p>Deliberate rich text</p>",
  );
  await page.goto(richDetail);
  const body = await richBody(page);
  const toolbar = page.getByRole("group", { name: "Body formatting" });
  await body.press("ControlOrMeta+a");
  await expect
    .poll(async () => (await selection(body)).type)
    .toBe("AllSelection");
  await body.press("ControlOrMeta+End");
  await expect
    .poll(async () => {
      const s = await selection(body);
      return s.empty && s.to === s.end;
    })
    .toBe(true);
  await expect(body).toContainText("Deliberate rich text");
  await toolbar.getByText("Table", { exact: true }).click();
  await toolbar
    .getByRole("button", { name: "Insert table", exact: true })
    .click();
  await expect(body.locator("tr")).toHaveCount(3);
  await expect(body).toContainText("Deliberate rich text");
  await toolbar.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(body.locator("table")).toHaveCount(0);
  await expect(body).toContainText("Deliberate rich text");
  await toolbar.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(body.locator("tr")).toHaveCount(3);
  await toolbar.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Deliberate rich text");
  await expect(page.getByRole("dialog").locator("table")).toHaveCount(1);
  expect(fixture.writes).toHaveLength(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(1);
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeEnabled();
  expect(fixture.current().config.sectionContent.Body).toContain(
    "Deliberate rich text",
  );
  expect(fixture.current().config.sectionContent.Body).toContain("<table>");
  await page.reload();
  await expect(await richBody(page)).toContainText("Deliberate rich text");
  await expect((await richBody(page)).locator("table")).toHaveCount(1);
  expect(fixture.errors).toEqual([]);
});

test("table insertion still replaces an intentional selection and undo restores it", async ({
  page,
}) => {
  await richWorkspaceFixture(page, "<p>Deliberate rich text</p>");
  await page.goto(richDetail);
  const body = await richBody(page);
  const toolbar = page.getByRole("group", { name: "Body formatting" });
  await body.press("ControlOrMeta+a");
  await expect
    .poll(async () => (await selection(body)).type)
    .toBe("AllSelection");
  await toolbar.getByText("Table", { exact: true }).click();
  await toolbar
    .getByRole("button", { name: "Insert table", exact: true })
    .click();
  await expect(body.locator("tr")).toHaveCount(3);
  await expect(body).not.toContainText("Deliberate rich text");
  await toolbar.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(body.locator("table")).toHaveCount(0);
  await expect(body).toContainText("Deliberate rich text");
});

test("document-end reaches the trailing paragraph after a nested list", async ({
  page,
}) => {
  await richWorkspaceFixture(
    page,
    "<p>Opening</p><ul><li><p>Last nested text</p></li></ul>",
  );
  await page.goto(richDetail);
  const body = await richBody(page);
  await body.press("ControlOrMeta+a");
  await body.press("ControlOrMeta+End");
  await expect.poll(async () => (await selection(body)).empty).toBe(true);
  await body.press("!");
  await expect(body.locator("li")).toHaveText("Last nested text");
  await expect(body.locator("p").last()).toHaveText("!");
  await expect(body.locator("p").first()).toHaveText("Opening");
});

// Exercise the adopted keymap directly: native DOM movement cannot hide a missing
// ProseMirror handler. The separate real-keyboard case checks browser integration.
test("document-end keymap resolves AllSelection without native DOM movement", async ({
  page,
}) => {
  await richWorkspaceFixture(page, "<p>Deliberate rich text</p>");
  await page.goto(richDetail);
  const body = await richBody(page);
  await body.press("ControlOrMeta+a");
  await expect
    .poll(async () => (await selection(body)).type)
    .toBe("AllSelection");
  await body.evaluate((node) => {
    const mac = /Mac|iP/.test(navigator.platform);
    node.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "End",
        code: "End",
        ctrlKey: !mac,
        metaKey: mac,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect
    .poll(async () => {
      const s = await selection(body);
      return s.empty && s.to === s.end;
    })
    .toBe(true);
  const toolbar = page.getByRole("group", { name: "Body formatting" });
  await toolbar.getByText("Table", { exact: true }).click();
  await toolbar
    .getByRole("button", { name: "Insert table", exact: true })
    .click();
  await expect(body.locator("tr")).toHaveCount(3);
  await expect(body).toContainText("Deliberate rich text");
});
