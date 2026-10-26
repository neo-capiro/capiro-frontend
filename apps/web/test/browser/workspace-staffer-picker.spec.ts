import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  deferred,
  directoryPage,
  office,
  openStafferDialog,
  staffer,
  stafferFixture,
  staffLabel,
} from "./workspace-staffer-picker-fixture";
import { documentId } from "./workspace-hillday-resume-fixture";
import { navigate, otherClientId } from "./next-modules-fixtures";

test("selected roster staff ID and captured target are sent only on Confirm", async ({
  page,
}) => {
  const state = await stafferFixture(page);
  const dialog = await openStafferDialog(page);
  const choice = dialog.getByRole("button", { name: staffLabel, exact: true });
  await choice.focus();
  await page.keyboard.press("Enter");
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  await expect(
    dialog.getByText(`Directory selection: ${staffLabel}`, { exact: true }),
  ).toBeVisible();
  expect(state.writes).toEqual([]);
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes).toEqual([
    {
      params: { id: documentId, meetingId: "meeting-1" },
      body: {
        kind: "assign_staffer",
        attendeeId: "attendee-1",
        stafferId: "staff-101",
      },
    },
  ]);
});

test("query and contact paging clear prior choice and preserve contact totals", async ({
  page,
}) => {
  const state = await stafferFixture(page, {
    read: (query) => ({
      json: directoryPage(
        query.page,
        query.page === 2
          ? [
              {
                ...office,
                id: "member-502",
                fullName: "Rep. Other",
                memberName: "Rep. Other",
                staff: [{ ...staffer, id: "staff-202" }],
              },
            ]
          : [office],
      ),
    }),
  });
  const dialog = await openStafferDialog(page);
  await expect(
    dialog.getByText("Contacts 1–10 of 11", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: staffLabel, exact: true }).click();
  await dialog.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    dialog.getByText("Contacts 11–11 of 11", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Confirm", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: /Priya Raman.*Rep. Other/ }),
  ).toBeVisible();
  await dialog
    .getByLabel("Search the Directory", { exact: true })
    .fill("New search");
  await expect
    .poll(() => state.queries.at(-1))
    .toEqual({ q: "New search", page: 1, pageSize: 10 });
  await expect(
    dialog.getByText("Contacts 1–10 of 11", { exact: true }),
  ).toBeVisible();
  expect(state.writes).toEqual([]);
});

test("manual input stays an explicit separate correction after a Directory choice", async ({
  page,
}) => {
  const state = await stafferFixture(page);
  const dialog = await openStafferDialog(page);
  await dialog.getByLabel("Full name", { exact: true }).fill("Entered by hand");
  await dialog.getByRole("button", { name: staffLabel, exact: true }).click();
  await expect(dialog.getByLabel("Full name", { exact: true })).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Use manual input", exact: true })
    .click();
  await expect(dialog.getByLabel("Full name", { exact: true })).toHaveValue(
    "Entered by hand",
  );
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes[0]!.body).toEqual({
    kind: "manual_attendee",
    attendeeId: "attendee-1",
    name: "Entered by hand",
    role: "Invite role",
  });
});

test("loading, unavailable and empty contact pages stay distinct", async ({
  page,
}) => {
  const gate = deferred();
  let unavailable = true;
  await stafferFixture(page, {
    read: async () => {
      await gate.promise;
      return unavailable
        ? { status: 503, json: { message: "Directory unavailable" } }
        : { json: directoryPage(1, [], 11) };
    },
  });
  const dialog = await openStafferDialog(page);
  await expect(dialog.getByText("Loading…", { exact: true })).toBeVisible();
  gate.release();
  await expect(dialog.getByRole("alert")).toContainText(
    "Directory unavailable",
  );
  unavailable = false;
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    dialog.getByText("No staff listed on this contact page.", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Next", exact: true }),
  ).toBeEnabled();
});

test("old query results cannot replace a newer search or carry into another attendee", async ({
  page,
}) => {
  const gate = deferred();
  const state = await stafferFixture(page, {
    read: async (query) => {
      if (query.q === "Old") await gate.promise;
      return {
        json: directoryPage(1, [
          {
            ...office,
            staff: [
              {
                ...staffer,
                fullName: query.q === "Old" ? "Old result" : "Current result",
              },
            ],
          },
        ]),
      };
    },
  });
  let dialog = await openStafferDialog(page);
  await dialog.getByLabel("Search the Directory", { exact: true }).fill("Old");
  await expect.poll(() => state.queries.at(-1)?.q).toBe("Old");
  await dialog
    .getByLabel("Search the Directory", { exact: true })
    .fill("Current");
  await expect(
    dialog.getByRole("button", { name: /Current result/ }),
  ).toBeVisible();
  await expect
    .poll(() =>
      state.aborted.some((path) => path.endsWith("directory.contacts")),
    )
    .toBe(true);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Resolve", exact: true })
    .nth(1)
    .click();
  dialog = page.getByRole("dialog", { name: "Resolve attendee" });
  await expect(dialog.getByLabel("Full name", { exact: true })).toHaveValue(
    "Invite attendee 2",
  );
  await expect(
    dialog.getByLabel("Search the Directory", { exact: true }),
  ).toHaveValue("");
  gate.release();
  await expect(
    dialog.getByRole("button", { name: /Current result/ }),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Old result/ })).toHaveCount(
    0,
  );
  expect(state.writes).toEqual([]);
});

test("adding a new Directory attendee omits attendeeId instead of inventing a target", async ({
  page,
}) => {
  const state = await stafferFixture(page);
  let dialog = await openStafferDialog(page);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Add attendee manually", exact: true })
    .first()
    .click();
  dialog = page.getByRole("dialog", { name: "Resolve attendee", exact: true });
  await dialog.getByRole("button", { name: staffLabel, exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes[0]).toEqual({
    params: { id: documentId, meetingId: "meeting-1" },
    body: { kind: "assign_staffer", stafferId: "staff-101" },
  });
});

test("pending confirmation freezes its selection and stale-target refusal retains it", async ({
  page,
}) => {
  const gate = deferred();
  const state = await stafferFixture(page, {
    writeGate: gate.promise,
    writeStatus: 404,
  });
  const dialog = await openStafferDialog(page);
  await dialog.getByRole("button", { name: staffLabel, exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await expect(
    dialog.getByLabel("Search the Directory", { exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: staffLabel, exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Use manual input", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Close dialog", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  gate.release();
  await expect(dialog.getByRole("alert")).toContainText(
    "Attendee not found on this meeting",
  );
  await expect(
    dialog.getByRole("button", { name: staffLabel, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0]!.body.attendeeId).toBe("attendee-1");
});

for (const scope of ["client", "identity"] as const) {
  test(`a held correction is disposed on ${scope} replacement`, async ({
    page,
  }) => {
    const gate = deferred();
    const state = await stafferFixture(page, { writeGate: gate.promise });
    const dialog = await openStafferDialog(page);
    await dialog.getByRole("button", { name: staffLabel, exact: true }).click();
    await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect.poll(() => state.writes.length).toBe(1);
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
