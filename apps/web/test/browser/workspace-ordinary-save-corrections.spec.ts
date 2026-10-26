import { expect, test, type Page } from "@playwright/test";
import {
  ordinarySaveFixture,
  openOrdinary,
  editOrdinary,
} from "./workspace-ordinary-save-fixture";
import { ordinary, state } from "../../tests/workspace-ordinary-save-fixtures";

const title = (page: Page) =>
  page.getByLabel("Document title", { exact: true });
const body = (page: Page) =>
  page.getByRole("textbox", { name: "Body content", exact: true });
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

// Deliberate loss of the two real browser journal records, in this isolated
// synthetic context only. Leave the mounted editor and its known request alive.
async function loseRecoveryStorage(page: Page) {
  await page.evaluate(async () => {
    for (const key of Object.keys(localStorage))
      if (key.startsWith("capiro-command-fence-v1:"))
        localStorage.removeItem(key);
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("capiro-command-recovery-v1", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("records", "readwrite");
        transaction.objectStore("records").clear();
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error);
        };
      };
    });
  });
}

for (const recoveryAction of [
  "Read current saved content",
  "Retry exact original save",
]) {
  test(`missing journal cannot release a known unknown save through ${recoveryAction} or recovery retry`, async ({
    page,
  }) => {
    const f = await ordinarySaveFixture(page, { loseFirstResponse: true });
    await openOrdinary(page);
    await editOrdinary(page);
    await button(page, "Save draft").click();
    await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
    await loseRecoveryStorage(page);
    await button(page, recoveryAction).click();
    await expect(button(page, "Retry document recovery")).toBeVisible();
    for (let attempt = 0; attempt < 2; attempt++) {
      await button(page, "Retry document recovery").click();
      await expect(button(page, "Retry document recovery")).toBeVisible();
      await expect(button(page, "Save draft")).toHaveCount(0);
      await expect(button(page, "Adopt current saved content")).toHaveCount(0);
      await expect(button(page, "Rebase retained edits")).toHaveCount(0);
    }
    expect(f.saves).toHaveLength(1);
    expect(f.versions.size).toBe(1);
  });
}

for (const settlement of ["acknowledged", "missing"]) {
  test(`two-tab collision preserves independent edits with ${settlement} disposition`, async ({
    page,
    context,
  }) => {
    const other = await context.newPage();
    const f = await ordinarySaveFixture([page, other], {
      loseFirstResponse: true,
    });
    await openOrdinary(page);
    await openOrdinary(other);
    await editOrdinary(page, "Pending request from tab A");
    await body(page).fill("Tab A submitted body");
    await editOrdinary(other, "Unsent tab B edits");
    await body(other).fill("Unsent tab B body");
    await button(page, "Save draft").click();
    await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
    const original = structuredClone(f.saves[0]);
    await button(other, "Save draft").click();
    await expect(button(other, "Retry document recovery")).toBeVisible();
    expect(f.saves).toHaveLength(1);
    await button(other, "Retry document recovery").click();
    await expect(title(other)).toHaveValue("Unsent tab B edits");
    await expect(body(other)).toHaveValue("Unsent tab B body");
    await expect(title(other)).toBeDisabled();
    await expect(button(other, "Retry exact original save")).toHaveCount(0);
    await button(other, "Read current saved content").click();
    await expect(button(other, "Rebase retained edits")).toHaveCount(0);
    await expect(button(other, "Save draft")).toBeDisabled();
    expect(f.saves).toHaveLength(1);

    if (settlement === "missing") {
      await loseRecoveryStorage(other);
      await button(other, "Read current saved content").click();
      await expect(button(other, "Retry document recovery")).toBeVisible();
      await button(other, "Retry document recovery").click();
      await expect(button(other, "Retry document recovery")).toBeVisible();
      await expect(button(other, "Save draft")).toHaveCount(0);
      await expect(button(other, "Rebase retained edits")).toHaveCount(0);
      expect(f.saves).toHaveLength(1);
      await other.close();
      return;
    }

    // A's exact replay records a real bound receipt and acknowledged disposition.
    await button(page, "Retry exact original save").click();
    await expect(
      page.getByText(
        "Saved. The immutable version and current saved content are confirmed.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(f.saves[1]).toEqual(original);
    await button(other, "Read current saved content").click();
    await expect(button(other, "Rebase retained edits")).toBeVisible();
    await expect(button(other, "Save draft")).toBeDisabled();
    await expect(title(other)).toHaveValue("Unsent tab B edits");
    await expect(body(other)).toHaveValue("Unsent tab B body");
    await button(other, "Rebase retained edits").click();
    await expect(title(other)).toBeEditable();
    await expect(body(other)).toHaveValue("Unsent tab B body");
    await button(other, "Save draft").click();
    await expect(
      other.getByText(
        "Saved. The immutable version and current saved content are confirmed.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect.poll(() => f.saves.length).toBe(3);
    expect(f.saves[2]!.requestId).not.toBe(original!.requestId);
    expect(f.saves[2]!.draft.docTitle).toBe("Unsent tab B edits");
    expect(f.saves[2]!.draft.config.sectionContent.Body).toBe(
      "Unsent tab B body",
    );
    expect(f.saves[2]!.expectedStateHash).toBe(
      f.versions.get(original!.requestId)!.response.receipt.stateHash,
    );
    expect(f.versions.size).toBe(2);
    await other.close();
  });
}

test("adopting current state renders its changed read-only document name and body", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page);
  const initial = ordinary();
  initial.config.sections = [];
  initial.config.sectionContent = {};
  const documents = (name: string, content: string) => [
    {
      ...initial.documents[0]!,
      name,
      body: { blocks: [{ id: "synthetic-block", type: "table", content }] },
    },
  ];
  const initialDraft = {
    ...initial,
    documents: documents("Old document name", "Old read-only body"),
  };
  let current = { ...state(initial), draft: initialDraft };
  await page.route("**/api/capiro/workspace.draft?*", (route) =>
    route.fulfill({ json: initialDraft }),
  );
  await page.route("**/api/capiro/workspace.draft.state?*", (route) =>
    route.fulfill({ json: current }),
  );
  await openOrdinary(page);
  await expect(
    page.getByText("Old read-only body", { exact: true }),
  ).toBeVisible();
  current = {
    ...current,
    stateHash: "e".repeat(64),
    draft: {
      ...initialDraft,
      docTitle: "Adopted current title",
      documents: documents("Current document name", "Current read-only body"),
    },
  };
  await button(page, "Read current saved content").click();
  await button(page, "Adopt current saved content").click();
  await expect(title(page)).toHaveValue("Adopted current title");
  await expect(
    page.getByText("Current document name", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Current read-only body", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Old document name", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Old read-only body", { exact: true }),
  ).toHaveCount(0);
  expect(f.saves).toHaveLength(0);
});
