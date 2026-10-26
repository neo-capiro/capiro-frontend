import { expect, test } from "@playwright/test";
import { clientId } from "../next-modules-fixtures";
import {
  capturePresentation,
  contained,
  presentationFont,
} from "../ordinary-presentation-evidence";
import { richWorkspaceFixture } from "../prospect-rich-workspace-fixture";
import { draft, prospectId } from "../../../tests/prospect-resources-fixtures";
import { scope } from "../../../tests/workspace-ordinary-save-fixtures";
import { hostFixture } from "./host-composition-fixture";

test.beforeEach(({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

for (const width of [1440, 390]) {
  test(`combined Workspace header preserves keyboard navigation at ${width}px`, async ({
    page,
  }, info) => {
    const fixture = await hostFixture(page);
    await presentationFont(page);
    await page.setViewportSize({ width, height: 1040 });
    const start = `/host.html?clientId=${clientId}`;
    await page.goto(start);
    const workspace = page.locator('[data-design-node="411:112533"]');
    const header = workspace.locator("header").first();
    await contained(page, header);
    const invitations = header.getByRole("button", {
      name: "Invitations",
      exact: true,
    });
    await expect(invitations).toHaveCount(1);
    await invitations.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("dialog", { name: "Workspace invitations" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(invitations).toBeFocused();
    await capturePresentation(page, info, `workspace-header-${width}`, header);
    const tools = header.getByRole("button", { name: "Workspace tools" });
    await tools.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem")).toHaveCount(3);
    const menu = page.getByRole("menu");
    await contained(page, menu);
    await expect(menu).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(menu).toHaveCSS("padding-top", "4px");
    await expect(page.getByRole("menuitem").first()).toHaveCSS(
      "min-height",
      "36px",
    );
    await capturePresentation(page, info, `workspace-tools-${width}`);
    await page.keyboard.press("Escape");
    await expect(tools).toBeFocused();
    for (const [label, view] of [
      ["Meri files", "files"],
      ["Rich newsletter preview", "rich-newsletter"],
      ["Template Studio", "templates"],
    ]) {
      await tools.focus();
      await page.keyboard.press("Enter");
      await page.getByRole("menuitem", { name: label, exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect
        .poll(() => new URL(page.url()).searchParams.get("clientId"))
        .toBe(clientId);
      if (view === "files")
        await expect(page).toHaveURL(
          new RegExp(`/meri/files\\?clientId=${clientId}$`),
        );
      else
        await expect
          .poll(() => new URL(page.url()).searchParams.get("view"))
          .toBe(view);
      if (view === "rich-newsletter")
        await expect(
          page.getByRole("heading", {
            name: "Rich newsletter editor preview",
            exact: true,
          }),
        ).toBeVisible();
      await page.goto(start);
      await expect(tools).toBeVisible();
    }
    await header
      .getByRole("button", { name: "+ New document", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "New document", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    expect(
      fixture.ordinary.calls.filter((call) => call.method !== "GET"),
    ).toEqual([]);
  });
}

test("saved draft mounts one people panel, retains edits on close and retires late scope reads", async ({
  page,
}, info) => {
  const fixture = await hostFixture(page);
  await presentationFont(page);
  await page.goto(`/host.html?draftId=${scope.draftId}`);
  const title = page.getByLabel("Document title", { exact: true });
  await expect(title).toBeEditable();
  await title.fill("Unsaved host composition edit");
  const people = page.getByRole("button", {
    name: "People with access",
    exact: true,
  });
  await expect(people).toHaveCount(1);
  await capturePresentation(page, info, "saved-draft-host");
  await people.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "People", exact: true }),
  ).toBeVisible();
  await expect.poll(() => fixture.state.peopleInputs.length).toBeGreaterThan(0);
  expect(
    fixture.state.peopleInputs.every(
      (input) =>
        JSON.stringify(input) ===
        JSON.stringify({ params: { draftId: scope.draftId } }),
    ),
  ).toBe(true);
  await capturePresentation(
    page,
    info,
    "saved-draft-people",
    page.getByRole("dialog"),
  );
  await page.keyboard.press("Escape");
  await expect(people).toBeFocused();
  await expect(title).toHaveValue("Unsaved host composition edit");
  const before = fixture.state.peopleInputs.length;
  fixture.state.holdPeople = true;
  await people.click();
  await expect
    .poll(() => fixture.state.peopleInputs.length)
    .toBeGreaterThan(before);
  await page
    .getByRole("button", {
      name: "Replace session scope",
      exact: true,
      includeHidden: true,
    })
    .evaluate((button: HTMLButtonElement) => button.click());
  fixture.state.release();
  await expect.poll(() => fixture.state.heldSettled).toBe(true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(people).toHaveCount(1);
  expect(
    fixture.ordinary.calls.filter((call) => call.method !== "GET"),
  ).toEqual([]);
  expect(fixture.ordinary.saves).toEqual([]);
});

test("prospect draft retains its existing host without the ordinary people action", async ({
  page,
}) => {
  const fixture = await richWorkspaceFixture(page);
  await page.goto(`/host.html?draftId=${draft.id}&prospectId=${prospectId}`);
  await expect(
    page.getByLabel("Document title", { exact: true }),
  ).toBeEditable();
  await expect(
    page.getByRole("button", { name: "People with access", exact: true }),
  ).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
});
