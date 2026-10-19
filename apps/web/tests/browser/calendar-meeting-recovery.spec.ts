import { expect, test, type Page } from "@playwright/test";
import { clientId, installFixtures, json } from "./fixtures";
import { voiceMeeting } from "./voice-meeting";

const selected = { ...voiceMeeting, status: "cancelled" };
const url = `/calendar-boundary.html?view=agenda&date=2026-10-11&zone=UTC&workspaceClient=${clientId}&meeting=${selected.id}`;

async function setup(page: Page) {
  const unexpected = await installFixtures(page);
  const state = {
    meeting: selected,
    rows: [selected],
    feedStatus: 200,
    detailStatus: 200,
    feedHold: Promise.resolve(),
    detailHold: Promise.resolve(),
    reads: 0,
    writes: [] as Record<string, unknown>[],
  };
  await page.route("**/core/engagement/meetings?**", async (route) => {
    await state.feedHold;
    return json(
      route,
      state.feedStatus === 200 ? state.rows : {},
      state.feedStatus,
    );
  });
  await page.route(
    `**/core/engagement/meetings/${selected.id}`,
    async (route) => {
      if (route.request().method() === "PUT") {
        const input = route.request().postDataJSON();
        state.writes.push(input);
        state.meeting = {
          ...state.meeting,
          ...input,
          description: input.description?.trim() || null,
          location: input.location?.trim() || null,
        };
        state.rows = [state.meeting];
        return json(route, state.meeting);
      }
      state.reads++;
      await state.detailHold;
      return json(
        route,
        state.detailStatus === 200 ? state.meeting : {},
        state.detailStatus,
      );
    },
  );
  await page.route(
    `**/core/engagement/meetings/${selected.id}/notetaker`,
    (route) => json(route, null),
  );
  return { state, unexpected };
}

async function openEditor(page: Page) {
  const workspace = page.getByRole("dialog", {
    name: selected.subject,
    exact: true,
  });
  await workspace.getByText("More actions", { exact: true }).click();
  await workspace
    .getByRole("button", { name: "Edit meeting", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Edit meeting", exact: true });
}

test("selected meeting sidebar distinguishes loading and failed reads from an empty month", async ({
  page,
}) => {
  const { state, unexpected } = await setup(page);
  let release!: () => void;
  state.feedHold = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.feedStatus = 403;
  await page.goto(url);
  const list = page.getByRole("complementary", { name: "Client meeting list" });
  await expect(list).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: /Loading meetings/ }),
  ).toBeVisible();
  await expect(list.getByText("No meetings in this month.")).toHaveCount(0);
  release();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(list.getByText("No meetings in this month.")).toHaveCount(0);
  state.feedStatus = 200;
  state.rows = [];
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(list.getByText("No meetings in this month.")).toBeVisible();
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("meeting editor retains draft and blocks save through pending and failed detail refresh", async ({
  page,
}) => {
  const { state, unexpected } = await setup(page);
  await page.goto(url);
  const editor = await openEditor(page);
  await editor
    .getByLabel("Subject", { exact: true })
    .fill("Retained local meeting draft");
  let release!: () => void;
  state.detailHold = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.detailStatus = 403;
  await editor.locator("form").evaluate((form, id) => {
    void window.__calendarBoundary?.refreshMeeting(id);
    // Submit in the same turn, before React can disable the stale form.
    (form as HTMLFormElement).requestSubmit();
  }, selected.id);
  await expect.poll(() => state.reads).toBe(2);
  await expect(
    editor.getByRole("button", { name: "Save meeting", exact: true }),
  ).toBeDisabled();
  release();
  await expect(
    editor.getByRole("button", { name: "Refresh meeting", exact: true }),
  ).toBeVisible();
  await expect(
    editor.getByRole("button", { name: "Save meeting", exact: true }),
  ).toBeDisabled();
  await expect(editor.getByLabel("Subject", { exact: true })).toHaveValue(
    "Retained local meeting draft",
  );
  await page.screenshot({
    path: test.info().outputPath("meeting-refresh-recovery.png"),
  });
  expect(state.writes).toEqual([]);
  state.detailStatus = 200;
  await editor
    .getByRole("button", { name: "Refresh meeting", exact: true })
    .click();
  await expect(
    editor.getByRole("button", { name: "Save meeting", exact: true }),
  ).toBeEnabled();
  await editor
    .getByRole("button", { name: "Save meeting", exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Retained local meeting draft",
      exact: true,
    }),
  ).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("cancel and reopen discard only the local meeting edit while confirmed saves reopen from the receipt", async ({
  page,
}) => {
  const { state, unexpected } = await setup(page);
  await page.goto(url);
  const editor = await openEditor(page);
  await editor.getByLabel("Subject", { exact: true }).fill("Cancelled draft");
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
  const workspace = page.getByRole("dialog", {
    name: selected.subject,
    exact: true,
  });
  await expect(workspace).toBeVisible();
  await workspace
    .getByRole("button", { name: "Edit meeting", exact: true })
    .click();
  await expect(editor.getByLabel("Subject", { exact: true })).toHaveValue(
    selected.subject,
  );
  expect(state.writes).toEqual([]);
  await editor.getByLabel("Location or join URL").fill("Saved meeting room");
  await editor
    .getByRole("button", { name: "Save meeting", exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  await expect(workspace).toContainText("Saved meeting room");
  await workspace
    .getByRole("button", { name: "Edit meeting", exact: true })
    .click();
  await expect(editor.getByLabel("Location or join URL")).toHaveValue(
    "Saved meeting room",
  );
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("an edit cannot restore a client association changed before the form rerenders", async ({
  page,
}) => {
  const { state, unexpected } = await setup(page);
  await page.goto(url);
  const editor = await openEditor(page);
  await editor.getByLabel("Subject", { exact: true }).fill("Stale client edit");
  await editor.locator("form").evaluate((form, meeting) => {
    window.__calendarBoundary?.replaceMeeting({ ...meeting, client: null });
    (form as HTMLFormElement).requestSubmit();
  }, selected);
  await expect(
    page.getByText("This meeting is not associated with the selected client."),
  ).toBeVisible();
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});
