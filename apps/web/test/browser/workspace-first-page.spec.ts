import { expect } from "@playwright/test";
import axe from "axe-core";
import { test } from "./runtime-observed-test";
import {
  deferred,
  firstPageFixture,
  openFirstPage,
} from "./workspace-first-page-fixture";
import { firstPageDocument } from "../../tests/workspace-first-page-fixture";
import { clientId, navigate, otherClientId } from "./next-modules-fixtures";

test("one changed cell sends the full sparse replacement with the captured revision", async ({
  page,
}) => {
  const state = await firstPageFixture(page);
  const dialog = await openFirstPage(page);
  await dialog
    .getByRole("textbox", { name: "Office for meeting 1", exact: true })
    .fill("Manual office");
  const document = firstPageDocument();
  document.summary[0]!.office = "Manual office";
  state.setDocument(document);
  await dialog
    .getByRole("button", { name: "Save first page", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes).toEqual([
    {
      params: { id: document.id },
      body: {
        expectedUpdatedAt: document.updatedAt,
        firstPage: {
          ...document.firstPage,
          rows: [
            {
              meetingId: "meeting-one",
              member: "Manual member",
              room: "Manual room",
              office: "Manual office",
            },
            { meetingId: "meeting-two", minutes: "45" },
          ],
        },
      },
    },
  ]);
  await expect(
    page.getByRole("cell", { name: "Manual office", exact: true }),
  ).toBeVisible();
});

test("no-op and reverted edits cannot save; Cancel writes nothing and restores focus", async ({
  page,
}) => {
  const state = await firstPageFixture(page);
  let dialog = await openFirstPage(page);
  const save = dialog.getByRole("button", {
    name: "Save first page",
    exact: true,
  });
  await expect(save).toBeDisabled();
  const room = dialog.getByRole("textbox", {
    name: "Room for meeting 1",
    exact: true,
  });
  await room.fill("Temporary room");
  await expect(save).toBeEnabled();
  await room.fill("Manual room");
  await expect(save).toBeDisabled();
  await room.fill("Discarded room");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit first page", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Edit first page", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Edit first page" });
  await expect(
    dialog.getByRole("textbox", { name: "Room for meeting 1", exact: true }),
  ).toHaveValue("Manual room");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test("keyboard visibility retains hidden input, canonical order and one visible column", async ({
  page,
}) => {
  const state = await firstPageFixture(page);
  const dialog = await openFirstPage(page);
  await dialog
    .getByRole("textbox", { name: "Room for meeting 1", exact: true })
    .fill("Retained hidden room");
  const roomToggle = dialog.getByRole("checkbox", {
    name: "Room",
    exact: true,
  });
  await roomToggle.focus();
  await page.keyboard.press("Space");
  await expect(
    dialog.getByRole("textbox", { name: "Room for meeting 1", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Space");
  await expect(
    dialog.getByRole("textbox", { name: "Room for meeting 1", exact: true }),
  ).toHaveValue("Retained hidden room");
  for (const name of ["Time", "Member", "Office", "Minutes"])
    await dialog.getByRole("checkbox", { name, exact: true }).uncheck();
  await expect(roomToggle).toBeDisabled();
  await expect(dialog.getByRole("columnheader")).toHaveText(["Room"]);
  await dialog
    .getByRole("checkbox", { name: "Staff lead", exact: true })
    .check();
  await roomToggle.uncheck();
  await dialog.getByRole("checkbox", { name: "Time", exact: true }).check();
  await expect(dialog.getByRole("columnheader")).toHaveText([
    "Time",
    "Staff lead",
  ]);
  await dialog
    .getByRole("button", { name: "Save first page", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes[0]!.body.firstPage?.hiddenColumns).toEqual([
    "member",
    "office",
    "room",
    "minutes",
  ]);
  expect(state.writes[0]!.body.firstPage?.rows?.[0]?.room).toBe(
    "Retained hidden room",
  );
});

test("deliberate blank title, dateline and cell remain explicit overrides", async ({
  page,
}) => {
  const state = await firstPageFixture(page);
  const dialog = await openFirstPage(page);
  await dialog.getByRole("textbox", { name: "Title", exact: true }).fill("");
  await dialog.getByRole("textbox", { name: "Dateline", exact: true }).fill("");
  await dialog
    .getByRole("textbox", { name: "Room for meeting 1", exact: true })
    .fill("");
  await dialog
    .getByRole("button", { name: "Save first page", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes[0]!.body.firstPage).toMatchObject({
    title: "",
    dateline: "",
    rows: [
      { meetingId: "meeting-one", room: "" },
      { meetingId: "meeting-two", minutes: "45" },
    ],
  });
});

test("conflict retains edits and the old pin until explicit discard and reload", async ({
  page,
}) => {
  const state = await firstPageFixture(page, { status: 409 });
  let dialog = await openFirstPage(page);
  await dialog
    .getByRole("textbox", { name: "Room for meeting 1", exact: true })
    .fill("Conflicting room");
  await dialog
    .getByRole("button", { name: "Save first page", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "This document changed",
  );
  await expect(
    dialog.getByRole("textbox", { name: "Room for meeting 1", exact: true }),
  ).toHaveValue("Conflicting room");
  await expect(
    dialog.getByRole("button", { name: "Save first page", exact: true }),
  ).toBeDisabled();
  const latest = firstPageDocument();
  latest.updatedAt = "2026-10-26T10:00:00.000Z";
  latest.cover.title = "Latest title";
  state.setDocument(latest);
  expect(state.writes[0]!.body.expectedUpdatedAt).toBe(
    "2026-10-26T09:00:00.000Z",
  );
  await dialog
    .getByRole("button", { name: "Reload document", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("button", { name: "Edit first page", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Edit first page" });
  await expect(
    dialog.getByRole("textbox", { name: "Title", exact: true }),
  ).toHaveValue("Latest title");
  await expect(
    dialog.getByRole("textbox", { name: "Room for meeting 1", exact: true }),
  ).toHaveValue("Manual room");
  expect(state.writes).toHaveLength(1);
});

test("Core's removed-meeting refusal retains input without a retry or partial write", async ({
  page,
}) => {
  const state = await firstPageFixture(page, {
    status: 400,
    message: "Schedule rows must use unique meetings from this document",
  });
  const dialog = await openFirstPage(page);
  await dialog
    .getByRole("textbox", { name: "Room for meeting 1", exact: true })
    .fill("Keep my input");
  await dialog
    .getByRole("button", { name: "Save first page", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "unique meetings from this document",
  );
  await expect(
    dialog.getByRole("textbox", { name: "Room for meeting 1", exact: true }),
  ).toHaveValue("Keep my input");
  expect(state.writes).toHaveLength(1);
});

test("pending save freezes inputs, captured payload and all dismissal paths", async ({
  page,
}) => {
  const gate = deferred();
  const state = await firstPageFixture(page, { gate: gate.promise });
  const dialog = await openFirstPage(page);
  await dialog
    .getByRole("textbox", { name: "Room for meeting 1", exact: true })
    .fill("Submitted room");
  await dialog
    .getByRole("button", { name: "Save first page", exact: true })
    .click();
  await expect.poll(() => state.writes.length).toBe(1);
  for (const textbox of await dialog.getByRole("textbox").all())
    await expect(textbox).toBeDisabled();
  for (const checkbox of await dialog.getByRole("checkbox").all())
    await expect(checkbox).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Saving…", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Close dialog", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  expect(state.writes[0]!.body.firstPage?.rows?.[0]?.room).toBe(
    "Submitted room",
  );
  gate.release();
  await expect(dialog).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
});

for (const exit of ["document", "client", "identity"] as const) {
  test(`late save after ${exit} replacement cannot revive or refresh the old editor`, async ({
    page,
  }) => {
    const gate = deferred();
    const state = await firstPageFixture(page, { gate: gate.promise });
    const dialog = await openFirstPage(page);
    await dialog
      .getByRole("textbox", { name: "Room for meeting 1", exact: true })
      .fill("Old scope input");
    await dialog
      .getByRole("button", { name: "Save first page", exact: true })
      .click();
    await expect.poll(() => state.writes.length).toBe(1);
    if (exit === "identity")
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent("test:session", {
            detail: { userId: null, sessionId: null, orgId: null },
          }),
        ),
      );
    else
      await navigate(
        page,
        `/modules/workspace?clientId=${exit === "client" ? otherClientId : clientId}`,
      );
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(() =>
        state.aborted.some((path) => path.endsWith("workspace.hillday.update")),
      )
      .toBe(true);
    const reads = state.reads();
    gate.release();
    await expect(dialog).toHaveCount(0);
    expect(state.reads()).toBe(reads);
    expect(state.writes).toHaveLength(1);
  });
}

test("an 81st overridden row is rejected inline without truncation or a request", async ({
  page,
}) => {
  const state = await firstPageFixture(page);
  const document = firstPageDocument();
  document.summary = Array.from({ length: 81 }, (_, index) => ({
    ...document.summary[0]!,
    meetingId: `meeting-${index}`,
    sectionId: `meeting-${index}`,
  }));
  document.firstPage!.rows = document.summary
    .slice(0, 80)
    .map((row) => ({ meetingId: row.meetingId, room: row.room }));
  state.setDocument(document);
  const dialog = await openFirstPage(page);
  const room = dialog.getByRole("textbox", {
    name: "Room for meeting 81",
    exact: true,
  });
  await room.fill("Retain over-limit edit");
  await expect(dialog.getByRole("alert")).toContainText(
    "at most 80 edited schedule rows",
  );
  await expect(room).toHaveValue("Retain over-limit edit");
  await expect(
    dialog.getByRole("button", { name: "Save first page", exact: true }),
  ).toBeDisabled();
  expect(state.writes).toEqual([]);
});

for (const width of [1440, 390]) {
  test(`first-page controls at ${width}px match the scoped design and remain keyboard accessible`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1040 });
    await firstPageFixture(page);
    const dialog = await openFirstPage(page);
    await dialog
      .getByRole("checkbox", { name: "Staff lead", exact: true })
      .check();
    await page.evaluate(() => document.fonts.ready);
    await expect(
      dialog.getByRole("checkbox", { name: "Time", exact: true }),
    ).toBeEnabled();
    await dialog.getByRole("checkbox", { name: "Time", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByRole("checkbox", { name: "Member", exact: true }),
    ).toBeFocused();
    await info.attach(`ws11-${width}-all-columns`, {
      body: await dialog.screenshot(),
      contentType: "image/png",
    });
    if (width === 390) {
      const last = dialog.getByRole("textbox", {
        name: "Staff lead for meeting 2",
        exact: true,
      });
      await last.focus();
      await last.fill("Long staff lead name retained in the editable field");
      await expect(last).toBeFocused();
      const scroll = dialog.getByRole("table").locator("..");
      expect(
        await scroll.evaluate((el) => el.scrollWidth > el.clientWidth),
      ).toBe(true);
      await info.attach("ws11-390-scrolled", {
        body: await dialog.screenshot(),
        contentType: "image/png",
      });
      await page.keyboard.press("Shift+Tab");
      await expect(
        dialog.getByRole("textbox", {
          name: "Minutes for meeting 2",
          exact: true,
        }),
      ).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(last).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(
        dialog.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeFocused();
    } else {
      await dialog
        .getByRole("checkbox", { name: "Office", exact: true })
        .uncheck();
      await dialog
        .getByRole("checkbox", { name: "Minutes", exact: true })
        .uncheck();
      await expect(dialog.getByRole("columnheader")).toHaveText([
        "Time",
        "Member",
        "Room",
        "Staff lead",
      ]);
      const table = await dialog.getByRole("table").locator("..").boundingBox();
      expect(table!.width).toBeCloseTo(464, 0);
      await info.attach("ws11-1440-four-columns", {
        body: await dialog.screenshot(),
        contentType: "image/png",
      });
    }
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(16);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width - 16);
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    const helper = await dialog.locator("#hillday-columns-help").boundingBox();
    for (const checkbox of await dialog.getByRole("checkbox").all()) {
      const bounds = await checkbox.boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(helper!.y);
    }
    await page.addScriptTag({ content: axe.source });
    const audit = await page.evaluate(() =>
      (window as unknown as { axe: typeof axe }).axe.run('[role="dialog"]'),
    );
    await info.attach(`ws11-${width}-axe`, {
      body: JSON.stringify(audit),
      contentType: "application/json",
    });
    expect(audit.violations).toEqual([]);
  });
}
