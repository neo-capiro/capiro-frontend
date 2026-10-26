import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  factsFixture,
  openFactsDialog,
  storedFacts,
} from "./workspace-meeting-facts-fixture";
import { deferred } from "./workspace-staffer-picker-fixture";
import { documentId, resumeUrl } from "./workspace-hillday-resume-fixture";
import { navigate, otherClientId } from "./next-modules-fixtures";
import {
  auditPresentation,
  capturePresentation,
  contained,
} from "./ordinary-presentation-evidence";

test("fresh saved GET remains authoritative after POST resolution and text-only save is sparse", async ({
  page,
}) => {
  const state = await factsFixture(page);
  await page.goto(resumeUrl("resolution"));
  await page
    .getByRole("button", { name: "Resolve selected meetings", exact: true })
    .click();
  await expect.poll(() => state.resolves).toBe(1);
  state.facts.subject = "Fresh saved subject";
  const before = state.reads;
  await page
    .getByRole("button", { name: "Edit details", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Edit meeting details" });
  await expect(dialog.getByLabel("Subject", { exact: true })).toHaveValue(
    "Fresh saved subject",
  );
  expect(state.reads).toBeGreaterThan(before);
  await expect(dialog.getByLabel("Location", { exact: true })).toHaveValue("");
  await expect(
    dialog.getByText("No location saved", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Start time", { exact: true })).toHaveValue(
    "01:30:00.12",
  );
  await expect(
    dialog.getByText("America/New_York", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save details", exact: true }),
  ).toBeDisabled();
  expect(state.writes).toEqual([]);
  await dialog.getByLabel("Subject", { exact: true }).fill("Edited subject");
  await dialog.getByLabel("Subject", { exact: true }).press("Enter");
  await expect(dialog).toHaveCount(0);
  expect(state.writes).toEqual([
    {
      params: { id: documentId, meetingId: "meeting-1" },
      body: { kind: "edit_meeting_facts", subject: "Edited subject" },
    },
  ]);
  expect(state.facts.startsAt).toBe(storedFacts.startsAt);
  expect(state.facts.endsAt).toBe(storedFacts.endsAt);
  expect(state.facts.location).toBeNull();
});

test("DST gap is refused and a changed repeated time requires an explicit occurrence", async ({
  page,
}) => {
  const state = await factsFixture(page);
  const dialog = await openFactsDialog(page);
  await dialog.getByLabel("Start date", { exact: true }).fill("2026-03-08");
  await dialog.getByLabel("Start time", { exact: true }).fill("02:30:00.120");
  await expect(dialog.getByRole("alert")).toContainText(
    "This time does not exist in America/New_York",
  );
  await expect(
    dialog.getByRole("button", { name: "Save details", exact: true }),
  ).toBeDisabled();
  await dialog.getByLabel("Start date", { exact: true }).fill("2026-11-01");
  await dialog.getByLabel("Start time", { exact: true }).fill("01:45:00.120");
  await dialog.getByLabel("End date", { exact: true }).fill("2026-11-02");
  await expect(
    dialog.getByRole("button", { name: "Save details", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole("combobox", { name: "Start occurrence", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Second occurrence · UTC−05:00", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Save details", exact: true }),
  ).toBeEnabled();
  expect(state.writes).toEqual([]);
  await dialog
    .getByRole("button", { name: "Save details", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes[0]!.body).toEqual({
    kind: "edit_meeting_facts",
    startsAt: "2026-11-01T06:45:00.12Z",
    endsAt: "2026-11-02T07:30:00.12Z",
  });
});

test("fresh loading, stored null and access refusal never invent editable facts", async ({
  page,
}) => {
  const gate = deferred();
  let deny = false;
  const state = await factsFixture(page, {
    read: async (count, response) => {
      if (count > 1) await gate.promise;
      return deny
        ? { status: 403, json: { message: "Access removed" } }
        : {
            json: {
              ...response,
              meetingFacts: response.meetingFacts.map((row) => ({
                ...row,
                facts: null,
              })),
            },
          };
    },
  });
  const dialog = await openFactsDialog(page);
  await expect(dialog.getByRole("status")).toHaveText(
    "Loading saved meeting details…",
  );
  await expect(dialog.getByLabel("Subject", { exact: true })).toHaveCount(0);
  gate.release();
  await expect(dialog.getByRole("status")).toContainText(
    "Saved meeting details are unavailable",
  );
  await expect(
    dialog.getByRole("button", { name: "Save details", exact: true }),
  ).toBeDisabled();
  deny = true;
  await dialog
    .getByRole("button", { name: "Refresh saved details", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Access removed");
  await expect(dialog.getByLabel("Subject", { exact: true })).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test("cross-event GET is refused and dirty details require explicit discard before refresh", async ({
  page,
}) => {
  let mismatched = false;
  const state = await factsFixture(page, {
    read: (_count, response) => ({
      json: mismatched
        ? {
            ...response,
            meetingFacts: response.meetingFacts.map((row) => ({
              ...row,
              eventId: "different-event",
            })),
          }
        : response,
    }),
  });
  const dialog = await openFactsDialog(page);
  await dialog.getByLabel("Subject", { exact: true }).fill("Unsaved subject");
  state.facts.subject = "Changed on server";
  await expect(dialog.getByLabel("Subject", { exact: true })).toHaveValue(
    "Unsaved subject",
  );
  await dialog
    .getByRole("button", { name: "Discard changes and refresh", exact: true })
    .click();
  await expect(dialog.getByLabel("Subject", { exact: true })).toHaveValue(
    "Changed on server",
  );
  mismatched = true;
  await dialog
    .getByRole("button", { name: "Refresh saved details", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "do not match this document and meeting",
  );
  await expect(dialog.getByLabel("Subject", { exact: true })).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test("a wrong acknowledgement retains the draft and fences retry until a fresh read", async ({
  page,
}) => {
  const state = await factsFixture(page, { wrongReceipt: true });
  const dialog = await openFactsDialog(page);
  await dialog.getByLabel("Location", { exact: true }).fill("New meeting room");
  await dialog
    .getByRole("button", { name: "Save details", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "The save was not confirmed",
  );
  await expect(dialog.getByLabel("Location", { exact: true })).toHaveValue(
    "New meeting room",
  );
  await expect(
    dialog.getByRole("button", { name: "Save details", exact: true }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  await dialog
    .getByRole("button", { name: "Discard changes and refresh", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(dialog.getByLabel("Location", { exact: true })).toHaveValue(
    "New meeting room",
  );
  await expect(
    dialog.getByRole("button", { name: "Save details", exact: true }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(1);
});

for (const scope of ["client", "identity"] as const) {
  test(`a pending facts write freezes controls and cannot acknowledge a replaced ${scope}`, async ({
    page,
  }) => {
    const gate = deferred();
    const state = await factsFixture(page, { writeGate: gate.promise });
    const dialog = await openFactsDialog(page);
    await dialog.getByLabel("Subject", { exact: true }).fill("Pending subject");
    await dialog
      .getByRole("button", { name: "Save details", exact: true })
      .click();
    await expect.poll(() => state.writes.length).toBe(1);
    await expect(dialog.getByLabel("Subject", { exact: true })).toBeDisabled();
    await expect(
      dialog.getByLabel("Start time", { exact: true }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "Close dialog", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    if (scope === "client")
      await navigate(page, `/modules/workspace?clientId=${otherClientId}`);
    else
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent("test:session", {
            detail: { userId: null, sessionId: null, orgId: null },
          }),
        ),
      );
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(() =>
        state.aborted.some((path) =>
          path.endsWith("workspace.hillday.correction"),
        ),
      )
      .toBe(true);
    gate.release();
    await expect(dialog).toHaveCount(0);
    expect(state.writes).toHaveLength(1);
  });
}

for (const width of [1440, 390]) {
  test(`meeting details at ${width}px keep canonical controls, keyboard order and focus return`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1040 });
    const state = await factsFixture(page);
    const dialog = await openFactsDialog(page);
    const subject = dialog.getByLabel("Subject", { exact: true });
    await expect(subject).toHaveValue(storedFacts.subject);
    await subject.focus();
    await page.keyboard.press("Tab");
    await expect(dialog.getByLabel("Location", { exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByLabel("Start date", { exact: true }),
    ).toBeFocused();
    await contained(page, dialog);
    await contained(page, dialog.getByLabel("End time", { exact: true }));
    expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(
      width === 390 ? 358 : 760,
    );
    await capturePresentation(
      page,
      info,
      `ws11-meeting-facts-${width}`,
      dialog,
    );
    await auditPresentation(
      page,
      info,
      `ws11-meeting-facts-${width}`,
      '[role="dialog"]',
    );
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Edit details", exact: true }).first(),
    ).toBeFocused();
    expect(state.writes).toEqual([]);
  });
}
