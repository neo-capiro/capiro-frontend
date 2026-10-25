import { expect, test } from "@playwright/test";
import { json } from "./fixtures";
import {
  changeDocumentView,
  holdResponse,
  settleDocumentRequests,
} from "./capability-documents-fixtures";
import {
  setup,
  file,
  receipt,
  openDelete,
  recover,
  goto,
  dialog,
  holdDeletionReceipt,
} from "./files-delete-fixtures";

test("lost acknowledgement survives close and hard reload after target disappears; exact receipt alone acknowledges", async ({
  page,
  baseURL,
}, info) => {
  const f = await setup(page, baseURL);
  await goto(page);
  const view = await openDelete(page);
  await view.getByRole("button", { name: "Confirm delete" }).click();
  await expect(view).toContainText("Deletion is not confirmed");
  expect(f.deletes).toHaveLength(1);
  await page.keyboard.press("Escape");
  await expect(view).toHaveCount(0);
  f.state.files = [];
  await page.reload();
  await recover(page);
  await expect(dialog(page)).toContainText(file.fileName);
  expect(f.deletes).toHaveLength(1);
  f.onRead((route) => json(route, receipt(f.state.saved!)));
  await dialog(page)
    .getByRole("button", { name: "Check original deletion" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toContainText("were deleted");
  expect(f.deletes).toHaveLength(1);
  await page.screenshot({
    path: info.outputPath("delete-recovered-desktop.png"),
  });
  await dialog(page)
    .getByRole("button", { name: "Acknowledge deletion result" })
    .click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Recover saved file deletion" }),
  ).toHaveCount(0);
  f.clean();
});
test("missing file and GET404 never confirm deletion; private details hide while encrypted command survives", async ({
  page,
  baseURL,
}, info) => {
  const f = await setup(page, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await goto(page);
  const view = await openDelete(page);
  await view.getByRole("button", { name: "Confirm delete" }).click();
  await expect(view).toContainText("Deletion is not confirmed");
  f.state.files = [];
  await changeDocumentView(page, "files");
  await view.getByRole("button", { name: "Check original deletion" }).click();
  await expect(view.getByRole("alert")).toBeVisible();
  await expect(view.getByText(file.fileName, { exact: true })).toHaveCount(0);
  await expect(view.getByText(/were deleted/)).toHaveCount(0);
  await expect(
    view.getByRole("button", { name: "Confirm delete" }),
  ).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("delete-held-mobile.png") });
  await page.reload();
  await recover(page);
  await expect(dialog(page)).toContainText(file.fileName);
  expect(f.deletes).toHaveLength(1);
  f.clean();
});
test("pending receipt requires deliberate same-command retry with identical reviewed revision", async ({
  page,
  baseURL,
}) => {
  const f = await setup(page, baseURL);
  f.onDelete((route, command) => json(route, receipt(command, "pending")));
  f.onRead((route) => json(route, receipt(f.state.saved!, "pending")));
  await goto(page);
  const view = await openDelete(page);
  await view.getByRole("button", { name: "Confirm delete" }).click();
  await expect(view).toContainText("Deletion is pending");
  const original = f.state.saved;
  f.state.files = [];
  await view.getByRole("button", { name: "Check original deletion" }).click();
  await expect(
    view.getByRole("button", { name: "Retry the same reviewed deletion" }),
  ).toBeEnabled();
  expect(f.deletes).toHaveLength(1);
  f.onDelete((route, command) => json(route, receipt(command)));
  await view
    .getByRole("button", { name: "Retry the same reviewed deletion" })
    .click();
  await expect(view).toContainText("were deleted");
  expect(f.deletes).toEqual([original, original]);
  f.clean();
});
test("generic400 is not durable refusal and cannot admit a fresh deletion command", async ({
  page,
  baseURL,
}) => {
  const f = await setup(page, baseURL);
  f.onDelete((route) =>
    json(route, { message: "Synthetic rejected request" }, 400),
  );
  await goto(page);
  const view = await openDelete(page);
  await view.getByRole("button", { name: "Confirm delete" }).click();
  await expect(view).toContainText("Deletion is not confirmed");
  await expect(
    view.getByRole("button", { name: "Confirm delete" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await recover(page);
  await expect(
    dialog(page).getByRole("button", { name: "Confirm delete" }),
  ).toHaveCount(0);
  expect(f.deletes).toHaveLength(1);
  f.clean();
});
for (const status of [403, 503])
  test(`receipt${status} never releases held deletion or offers a new request`, async ({
    page,
    baseURL,
  }) => {
    const f = await setup(page, baseURL);
    await goto(page);
    const view = await openDelete(page);
    await view.getByRole("button", { name: "Confirm delete" }).click();
    await expect(view).toContainText("Deletion is not confirmed");
    f.onRead((route) =>
      json(route, { message: "Receipt unavailable" }, status),
    );
    await view.getByRole("button", { name: "Check original deletion" }).click();
    await expect(view.getByRole("alert")).toBeVisible();
    await expect(
      view.getByRole("button", { name: "Confirm delete" }),
    ).toHaveCount(0);
    await expect(view.getByText(/were deleted/)).toHaveCount(0);
    await page.reload();
    await recover(page);
    expect(f.deletes).toHaveLength(1);
    f.clean();
  });
for (const boundary of ["actor", "client", "unmount"] as const)
  test(`late DELETE after ${boundary} replacement cannot publish completion into the new view`, async ({
    page,
    baseURL,
  }) => {
    const f = await setup(page, baseURL);
    await goto(page);
    const view = await openDelete(page);
    let release!: () => void, started!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
      }),
      entered = new Promise<void>((resolve) => {
        started = resolve;
      });
    f.onDelete(async (route, command) => {
      started();
      await gate;
      await json(route, receipt(command));
    });
    try {
      await view.getByRole("button", { name: "Confirm delete" }).click();
      await entered;
      await page.keyboard.press("Escape");
      await expect(view).toBeVisible();
      await changeDocumentView(page, boundary);
      await expect(view).toHaveCount(0);
    } finally {
      release();
    }
    await settleDocumentRequests(page);
    await expect(page.getByText(/were deleted/)).toHaveCount(0);
    expect(f.deletes).toHaveLength(1);
    await page.reload();
    await recover(page);
    await expect(dialog(page)).toContainText(file.fileName);
    f.clean();
  });
test("GET completion after actor replacement cannot leak private result or release original intent", async ({
  page,
  baseURL,
}) => {
  const f = await setup(page, baseURL);
  await goto(page);
  const view = await openDelete(page);
  await view.getByRole("button", { name: "Confirm delete" }).click();
  await expect(view).toContainText("Deletion is not confirmed");
  const held = await holdResponse(
    page,
    "**/engagement/attachments/deletions/*",
    "GET",
    receipt(f.state.saved!),
  );
  try {
    await view.getByRole("button", { name: "Check original deletion" }).click();
    await held.started;
    await changeDocumentView(page, "actor");
    await expect(view).toHaveCount(0);
  } finally {
    held.release();
  }
  await held.settled;
  await settleDocumentRequests(page);
  await expect(page.getByText(/were deleted/)).toHaveCount(0);
  await page.reload();
  await recover(page);
  expect(f.deletes).toHaveLength(1);
  f.clean();
});
for (const status of [200, 403])
  test(`receipt${status} cannot replace or poison the newer visible file collection`, async ({
    page,
    baseURL,
  }) => {
    const f = await setup(page, baseURL);
    await goto(page);
    const view = await openDelete(page);
    await view.getByRole("button", { name: "Confirm delete" }).click();
    await expect(view).toContainText("Deletion is not confirmed");
    const held = await holdDeletionReceipt(
      page,
      status === 200
        ? receipt(f.state.saved!, "pending")
        : { message: "Unavailable" },
      status,
    );
    try {
      await view
        .getByRole("button", { name: "Check original deletion" })
        .click();
      await held.started;
      f.state.files = [{ ...file, fileName: "Newer current file.txt" }];
      await changeDocumentView(page, "files");
      await expect(
        page.getByLabel("Synthetic original document cache"),
      ).toContainText("Newer current file.txt");
    } finally {
      held.release();
    }
    await held.settled;
    await settleDocumentRequests(page);
    await expect(
      page.getByLabel("Synthetic original document cache"),
    ).toContainText("Newer current file.txt");
    await expect(
      view.getByRole("button", { name: "Confirm delete" }),
    ).toHaveCount(0);
    expect(f.deletes).toHaveLength(1);
    f.clean();
  });
