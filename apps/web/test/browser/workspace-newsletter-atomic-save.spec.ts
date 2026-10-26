import { expect, test, type Page } from "@playwright/test";
import {
  ordinarySaveFixture,
  ordinaryEditorUrl,
} from "./workspace-ordinary-save-fixture";

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const subject = (page: Page) => page.getByLabel("Subject", { exact: true });
const title = (page: Page) => page.getByLabel("Document name", { exact: true });
const saved =
  "Saved. The immutable version and current saved content are confirmed.";
async function open(page: Page) {
  await page.goto(ordinaryEditorUrl);
  await expect(subject(page)).toBeEditable();
}
async function edit(page: Page, suffix = "local") {
  await title(page).fill(`Newsletter name ${suffix}`);
  await subject(page).fill(`Email subject ${suffix} — café`);
  await button(page, "Edit").click();
  await page
    .getByLabel("Content", { exact: true })
    .fill(`Newsletter body ${suffix} — résumé`);
  await button(page, "Save block").click();
}
test("existing newsletter saves title and full body in one atomic request and preserves unrelated fields", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, {
    newsletter: true,
    holdSave: true,
  });
  await open(page);
  await edit(page);
  await button(page, "Save draft").click();
  await expect
    .poll(() =>
      f.calls
        .filter((c) =>
          [
            "workspace.draft.save",
            "workspace.document.update",
            "workspace.draft.update",
            "workspace.draft.snapshot",
          ].includes(c.key),
        )
        .map((c) => c.key),
    )
    .toEqual(["workspace.draft.save"]);
  await expect(subject(page)).toBeDisabled();
  f.release();
  await expect(page.getByText(saved, { exact: true })).toBeVisible();
  expect(f.saves).toHaveLength(1);
  expect(f.versions.size).toBe(1);
  expect(f.current().docTitle).toBe("Newsletter name local");
  expect(f.current().documents[0]!.body.newsletter!.subject).toBe(
    "Email subject local — café",
  );
  expect(f.current().documents[0]!.body.newsletter!.blocks[0]!.text).toBe(
    "Newsletter body local — résumé",
  );
  expect(f.current().documents[0]!.body.unknown).toEqual({ preserved: true });
  expect(f.current().documents[0]!.body.blocks[0]!.unrelated).toBe(
    "preserve block field",
  );
  expect(f.current().config.unknown).toEqual({ preserved: true });
});
test("newsletter stale baseline requires explicit rebase while preserving title subject and body", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, { newsletter: true });
  await open(page);
  await edit(page);
  f.changeNewsletter("Other name", "Other subject", "Other body");
  await button(page, "Save draft").click();
  await expect(page.getByText(/The saved document changed/)).toBeVisible();
  expect(f.saves[0]!.expectedStateHash).toBe(f.initialStateHash);
  await expect(subject(page)).toHaveValue("Email subject local — café");
  await button(page, "Read current saved content").click();
  await expect(page.getByText("Other subject", { exact: true })).toBeVisible();
  await expect(page.getByText("Other body", { exact: true })).toBeVisible();
  await button(page, "Rebase retained edits").click();
  await button(page, "Save draft").click();
  await expect(page.getByText(saved, { exact: true })).toBeVisible();
  expect(f.versions.size).toBe(1);
  expect(f.current().documents[0]!.body.newsletter!.blocks[0]!.text).toBe(
    "Newsletter body local — résumé",
  );
});
test("newsletter lost committed response survives reload and replays the exact full body", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, {
    newsletter: true,
    loseFirstResponse: true,
  });
  await open(page);
  await edit(page);
  await button(page, "Save draft").click();
  await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
  const original = structuredClone(f.saves[0]);
  await page.reload();
  await expect(subject(page)).toHaveValue("Email subject local — café");
  await button(page, "Read current saved content").click();
  await expect(button(page, "Adopt current saved content")).toHaveCount(0);
  await expect(button(page, "Save draft")).toBeDisabled();
  await button(page, "Retry exact original save").click();
  await expect(page.getByText(saved, { exact: true })).toBeVisible();
  expect(f.saves).toEqual([original, original]);
  expect(f.versions.size).toBe(1);
});
test("newsletter tabs keep independent body edits through collision and positive settlement", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  const f = await ordinarySaveFixture([page, other], {
    newsletter: true,
    loseFirstResponse: true,
  });
  await open(page);
  await open(other);
  await edit(page, "A");
  await edit(other, "B");
  await button(page, "Save draft").click();
  await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
  await button(other, "Save draft").click();
  await button(other, "Retry document recovery").click();
  await expect(subject(other)).toHaveValue("Email subject B — café");
  await expect(
    other.getByText("Newsletter body B — résumé", { exact: true }),
  ).toBeVisible();
  await expect(button(other, "Retry exact original save")).toHaveCount(0);
  expect(f.saves).toHaveLength(1);
  await button(page, "Retry exact original save").click();
  await expect(page.getByText(saved, { exact: true })).toBeVisible();
  await button(other, "Read current saved content").click();
  await button(other, "Rebase retained edits").click();
  await button(other, "Save draft").click();
  await expect(other.getByText(saved, { exact: true })).toBeVisible();
  expect(f.current().documents[0]!.body.newsletter!.blocks[0]!.text).toBe(
    "Newsletter body B — résumé",
  );
  expect(f.versions.size).toBe(2);
  await other.close();
});
test("newsletter current access loss hides pending content and cannot resend", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, {
    newsletter: true,
    loseFirstResponse: true,
  });
  await open(page);
  await edit(page);
  await button(page, "Save draft").click();
  await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
  f.deny();
  await button(page, "Retry exact original save").click();
  await expect(subject(page)).toHaveCount(0);
  await expect(
    page.getByText("Newsletter body local — résumé", { exact: true }),
  ).toHaveCount(0);
  expect(f.saves).toHaveLength(1);
});

test("newsletter actor replacement rejects a delayed receipt and clears the old edit", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, {
    newsletter: true,
    holdSave: true,
  });
  await open(page);
  await edit(page);
  await button(page, "Save draft").click();
  await expect.poll(() => f.saves.length).toBe(1);
  f.changeNewsletter("New actor name", "New actor subject", "New actor body");
  await f.switchActor();
  await expect(subject(page)).toHaveValue("New actor subject");
  f.release();
  await expect(subject(page)).toHaveValue("New actor subject");
  await expect(page.getByText(saved, { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Newsletter body local — résumé", { exact: true }),
  ).toHaveCount(0);
  await expect(button(page, "Retry exact original save")).toHaveCount(0);
});
test("newsletter client reassignment hides retained content before replay", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, {
    newsletter: true,
    loseFirstResponse: true,
  });
  await open(page);
  await edit(page);
  await button(page, "Save draft").click();
  await expect(button(page, "Retry exact original save")).toBeEnabled();
  f.moveClient();
  await button(page, "Retry exact original save").click();
  await expect(subject(page)).toHaveCount(0);
  await expect(
    page.getByText(/no longer matches the current account or client/),
  ).toBeVisible();
  expect(f.saves).toHaveLength(1);
});
test("newsletter held-client binding carries edits made during association into explicit rebase", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, {
    newsletter: true,
    heldClient: true,
    holdAssociation: true,
  });
  await open(page);
  await edit(page);
  await expect(button(page, "Save draft")).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Client", exact: true })
    .first()
    .click();
  await page
    .getByRole("option", { name: "Current Aerospace", exact: true })
    .click();
  await button(page, "Associate client").click();
  await expect
    .poll(
      () => f.calls.filter((c) => c.key === "workspace.draft.update").length,
    )
    .toBe(1);
  await subject(page).fill("Typed during association");
  f.release();
  await expect(button(page, "Rebase retained edits")).toBeVisible();
  await expect(subject(page)).toHaveValue("Typed during association");
  await expect(button(page, "Save draft")).toBeDisabled();
  await button(page, "Rebase retained edits").click();
  await button(page, "Save draft").click();
  await expect(page.getByText(saved, { exact: true })).toBeVisible();
  expect(f.saves).toHaveLength(1);
  expect(f.saves[0]!.expectedClientId).toBe(f.current().clientId);
  expect(f.current().documents[0]!.body.newsletter!.subject).toBe(
    "Typed during association",
  );
  expect(f.current().documents[0]!.body.newsletter!.blocks[0]!.text).toBe(
    "Newsletter body local — résumé",
  );
});
test("newsletter undo and redo remain local and Save and exit waits for confirmation", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, {
    newsletter: true,
    holdSave: true,
  });
  await open(page);
  await edit(page);
  await button(page, "Undo").click();
  await expect(
    page.getByText("Saved newsletter body", { exact: true }),
  ).toBeVisible();
  await button(page, "Redo").click();
  await expect(
    page.getByText("Newsletter body local — résumé", { exact: true }),
  ).toBeVisible();
  expect(f.saves).toHaveLength(0);
  await button(page, "Save and exit").click();
  await expect.poll(() => f.saves.length).toBe(1);
  await expect(subject(page)).toBeVisible();
  f.release();
  await expect(subject(page)).toHaveCount(0);
  expect(f.versions.size).toBe(1);
});
test("newsletter adoption after a bound replay uses the separately reviewed newer body", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, {
    newsletter: true,
    loseFirstResponse: true,
  });
  await open(page);
  await edit(page);
  await button(page, "Save draft").click();
  await expect(button(page, "Retry exact original save")).toBeEnabled();
  f.changeNewsletter("Newer name", "Newer subject", "Newer body");
  await button(page, "Retry exact original save").click();
  await expect(
    page.getByText(/Current saved content has changed since that version/),
  ).toBeVisible();
  await expect(subject(page)).toHaveValue("Email subject local — café");
  await button(page, "Adopt current saved content").click();
  await expect(subject(page)).toHaveValue("Newer subject");
  await expect(title(page)).toHaveValue("Newer name");
  await expect(page.getByText("Newer body", { exact: true })).toBeVisible();
  expect(f.versions.size).toBe(1);
});
