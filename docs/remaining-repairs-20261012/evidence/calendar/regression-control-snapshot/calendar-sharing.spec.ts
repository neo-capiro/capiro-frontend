import { test, expect, type Page } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
import {
  sharingMeeting,
  sharingFile,
  sharingTime,
  sharedMeetingFixture,
} from "../calendar-sharing-fixtures";
const url = `/calendar-sharing.html?view=agenda&date=2026-10-12&zone=UTC&clientId=${sharingMeeting.client.id}`;
const held = () => {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};
async function setup(page: Page) {
  await page.clock.install({ time: new Date(sharingTime) });
  const unexpected = await installFixtures(page);
  const state = {
    meeting: structuredClone(sharingMeeting),
    files: [structuredClone(sharingFile)],
    feed: [sharedMeetingFixture()],
    writes: [] as {
      path: string;
      body: { artifacts: { type: string; id: string }[] };
    }[],
    receipt: undefined as unknown,
    status: 200,
    feedStatus: 200,
    reads: 0,
    feedReads: 0,
    hold: undefined as Promise<void> | undefined,
    readHold: undefined as Promise<void> | undefined,
    feedHold: undefined as Promise<void> | undefined,
  };
  await page.route("**/core/engagement/attachments?**", (route) =>
    json(route, state.files),
  );
  await page.route("**/core/engagement/shared-meetings?**", async (route) => {
    state.feedReads++;
    if (state.feedHold) await state.feedHold;
    return json(
      route,
      state.feedStatus === 200
        ? state.feed
        : { message: "Synthetic shared feed unavailable" },
      state.feedStatus,
    ).catch(() => {});
  });
  await page.route("**/core/engagement/meetings**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== "GET") {
      const body = route.request().postDataJSON();
      state.writes.push({ path, body });
      if (state.hold) await state.hold;
      if (state.receipt !== undefined)
        return json(route, state.receipt, state.status).catch(() => {});
      for (const ref of body.artifacts) {
        const kind = (
          {
            prep: "preps",
            note: "notes",
            debrief: "debriefs",
            attachment: "attachments",
          } as const
        )[ref.type as "prep"];
        const item = state.meeting[kind].find((item) => item.id === ref.id);
        if (item)
          Object.assign(
            item,
            path.endsWith("/unshare")
              ? { sharedAt: null, sharedByUserId: null }
              : { sharedAt: sharingTime, sharedByUserId: "user-test" },
          );
      }
      state.meeting.visibility =
        state.meeting.notes.some((row) => row.sharedAt) ||
        state.meeting.preps.some((row) => row.sharedAt) ||
        state.meeting.attachments.some((row) => row.sharedAt)
          ? "shared"
          : "private";
      state.files = state.meeting.attachments.map((row) => ({
        ...row,
        usable: true,
      }));
      return json(route, state.meeting, state.status).catch(() => {});
    }
    if (path.endsWith("/meetings")) return json(route, [state.meeting]);
    if (path.endsWith("/notes") || path.endsWith("/debriefs"))
      return json(route, []);
    if (path.endsWith("/notetaker")) return json(route, null);
    state.reads++;
    if (state.readHold) await state.readHold;
    return json(route, state.meeting).catch(() => {});
  });
  return { state, unexpected };
}
async function openSharing(page: Page) {
  await page.goto(`${url}&meeting=${sharingMeeting.id}`);
  await page
    .getByRole("button", { name: "Share artifacts", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Share artifacts with your organization?",
    exact: true,
  });
  await expect(dialog.getByRole("checkbox").first()).toBeVisible();
  return dialog;
}
async function choosePrepAndFile(page: Page) {
  const dialog = page.getByRole("dialog", {
    name: "Share artifacts with your organization?",
    exact: true,
  });
  await dialog.getByRole("checkbox", { name: /Meeting prep/ }).check();
  await dialog.getByRole("checkbox", { name: /Synthetic questions/ }).check();
  await dialog
    .getByRole("button", { name: "Share selected artifacts", exact: true })
    .click();
  return dialog;
}
test("approved prep and attachment share and selected unshare preserve other shared notes", async ({
  page,
}) => {
  const { state, unexpected } = await setup(page);
  Object.assign(state.meeting.notes[0]!, {
    sharedAt: sharingTime,
    sharedByUserId: "user-test",
  });
  await openSharing(page);
  const dialog = await choosePrepAndFile(page);
  expect(state.writes).toHaveLength(0);
  await dialog
    .getByRole("button", { name: "Confirm: Share selected artifacts" })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes[0]!.body.artifacts).toEqual([
    { type: "prep", id: sharingMeeting.preps[0]!.id },
    { type: "attachment", id: sharingFile.id },
  ]);
  await page
    .getByRole("button", { name: "Share artifacts", exact: true })
    .click();
  const share = page.getByRole("dialog", {
    name: "Share artifacts with your organization?",
    exact: true,
  });
  await share.getByRole("button", { name: "Unshare", exact: true }).click();
  await share.getByRole("checkbox", { name: /Meeting prep/ }).check();
  await share.getByRole("checkbox", { name: /Synthetic questions/ }).check();
  await share
    .getByRole("button", { name: "Unshare selected artifacts", exact: true })
    .click();
  const confirm = page.getByRole("dialog", {
    name: "Unshare artifacts?",
    exact: true,
  });
  await confirm
    .getByRole("button", { name: "Confirm: Unshare selected artifacts" })
    .click();
  await expect(confirm).toHaveCount(0);
  expect(state.writes).toHaveLength(2);
  expect(state.meeting.visibility).toBe("shared");
  expect(state.meeting.preps[0]!.sharedAt).toBeNull();
  expect(state.meeting.notes[0]!.sharedAt).toBe(sharingTime);
  expect(unexpected).toEqual([]);
});
test("approval, confidentiality, institutional and readiness restrictions are visible and do not dispatch", async ({
  page,
}) => {
  const { state } = await setup(page);
  Object.assign(state.meeting.preps[0]!, {
    generatedFrom: { schemaVersion: "research_portfolio_institutional_v1" },
  });
  state.meeting.notes[0]!.confidential = true;
  state.meeting.debriefs[0]!.status = "generated";
  state.files[0]!.usable = false;
  const dialog = await openSharing(page);
  for (const checkbox of await dialog.getByRole("checkbox").all())
    await expect(checkbox).toBeDisabled();
  await expect(dialog).toContainText("Private Research Portfolio preparation");
  await expect(dialog).toContainText("Approval required");
  await expect(
    dialog.getByRole("button", {
      name: "Share selected artifacts",
      exact: true,
    }),
  ).toBeDisabled();
  expect(state.writes).toEqual([]);
});
for (const scenario of ["uncertain", "foreign receipt"] as const)
  test(`${scenario} remains fenced after reopening and duplicate clicks`, async ({
    page,
  }) => {
    const { state } = await setup(page);
    state.receipt =
      scenario === "uncertain"
        ? {}
        : { ...sharedMeetingFixture(), tenantId: "foreign" };
    state.status = scenario === "uncertain" ? 503 : 200;
    await openSharing(page);
    const dialog = await choosePrepAndFile(page);
    const pause = held();
    state.hold = pause.promise;
    const button = dialog.getByRole("button", {
      name: "Confirm: Share selected artifacts",
    });
    await button.evaluate((node) => {
      (node as HTMLButtonElement).click();
      (node as HTMLButtonElement).click();
    });
    await expect.poll(() => state.writes.length).toBe(1);
    pause.release();
    await expect(dialog.getByRole("alert")).toContainText("may have changed");
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Share artifacts", exact: true })
      .click();
    const reopened = page.getByRole("dialog", {
      name: "Share artifacts with your organization?",
      exact: true,
    });
    await expect(reopened.getByRole("alert")).toContainText("may have changed");
    await expect(
      reopened.getByRole("button", {
        name: "Share selected artifacts",
        exact: true,
      }),
    ).toBeDisabled();
    expect(state.writes).toHaveLength(1);
  });
test("changed selected preparation is refused before sharing", async ({
  page,
}) => {
  const { state } = await setup(page);
  await openSharing(page);
  const dialog = await choosePrepAndFile(page);
  state.meeting.preps[0]!.summary = "Changed after user review";
  await dialog
    .getByRole("button", { name: "Confirm: Share selected artifacts" })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "changed or is not eligible",
  );
  expect(state.writes).toEqual([]);
});
test("actor replacement during held preflight produces zero writes", async ({
  page,
}) => {
  const { state } = await setup(page);
  await openSharing(page);
  const dialog = await choosePrepAndFile(page);
  const pause = held();
  const before = state.reads;
  state.readHold = pause.promise;
  await dialog
    .getByRole("button", { name: "Confirm: Share selected artifacts" })
    .click();
  await expect.poll(() => state.reads).toBeGreaterThan(before);
  await page.evaluate(() =>
    (
      window as unknown as { __sharingTest: { replaceActor: () => void } }
    ).__sharingTest.replaceActor(),
  );
  pause.release();
  await expect(dialog).toHaveCount(0);
  expect(state.writes).toEqual([]);
});
test("client shared feed lists only server-shared metadata without opening owner details or invented downloads", async ({
  page,
}) => {
  const { state, unexpected } = await setup(page);
  await page.goto(url);
  await page
    .getByRole("button", { name: "Shared meetings", exact: true })
    .click();
  const feed = page.getByRole("region", { name: "Client shared meetings" });
  await expect(
    feed.getByRole("heading", { name: sharingMeeting.subject }),
  ).toBeVisible();
  await expect(feed).toContainText("Their text is not provided by this feed");
  await expect(feed).toContainText(
    "File download and readiness are not provided",
  );
  await expect(feed.getByRole("link")).toHaveCount(0);
  expect(state.reads).toBe(0);
  expect(state.feedReads).toBe(1);
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});
test("cached shared feed disappears during held and failed refresh then returns current records", async ({
  page,
}) => {
  const { state } = await setup(page);
  await page.goto(`${url}&shared=1`);
  const heading = page.getByRole("heading", { name: sharingMeeting.subject });
  await expect(heading).toBeVisible();
  const pause = held();
  state.feedHold = pause.promise;
  state.feedStatus = 403;
  await page.getByRole("button", { name: "Refresh shared meetings" }).click();
  await expect.poll(() => state.feedReads).toBe(2);
  await expect(heading).toHaveCount(0);
  pause.release();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic shared feed unavailable",
  );
  await expect(heading).toHaveCount(0);
  state.feedHold = undefined;
  state.feedStatus = 200;
  state.feed = [];
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByText("No meetings are shared with this client."),
  ).toBeVisible();
  expect(state.writes).toEqual([]);
});
test("foreign client records are rejected and actor replacement does not reuse the prior feed", async ({
  page,
}) => {
  const { state } = await setup(page);
  await page.goto(`${url}&shared=1`);
  await expect(
    page.getByRole("heading", { name: sharingMeeting.subject }),
  ).toBeVisible();
  state.feed[0]!.client.id = "foreign-client";
  const pause = held();
  state.feedHold = pause.promise;
  await page.evaluate(() =>
    (
      window as unknown as { __sharingTest: { replaceActor: () => void } }
    ).__sharingTest.replaceActor(),
  );
  await expect.poll(() => state.feedReads).toBe(2);
  await expect(
    page.getByRole("heading", { name: sharingMeeting.subject }),
  ).toHaveCount(0);
  pause.release();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(state.writes).toEqual([]);
});
test("sharing modal supports keyboard selection and fits original desktop and mobile sizes", async ({
  page,
}, testInfo) => {
  await setup(page);
  const dialog = await openSharing(page);
  await dialog.getByRole("checkbox", { name: /Meeting prep/ }).focus();
  await page.keyboard.press("Space");
  await expect(
    dialog.getByRole("checkbox", { name: /Meeting prep/ }),
  ).toBeChecked();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 980 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`sharing-${width}.png`),
      fullPage: true,
    });
  }
});

for (const draft of ["note", "meeting", "selection"] as const)
  test(`same-scope held meeting refresh preserves an open ${draft} draft`, async ({
    page,
  }) => {
    const { state } = await setup(page);
    if (draft === "selection") {
      await openSharing(page);
      await page.getByRole("checkbox", { name: /Meeting prep/ }).check();
    } else {
      await page.goto(`${url}&meeting=${sharingMeeting.id}`);
      if (draft === "note") {
        await page.getByRole("button", { name: "Notes", exact: true }).click();
        await page
          .getByRole("button", { name: "Add note", exact: true })
          .click();
        await page
          .getByLabel("Content", { exact: true })
          .fill("Retain this local synthetic note draft");
      } else {
        await page
          .getByRole("button", { name: "Edit meeting", exact: true })
          .click();
        await page
          .getByLabel("Subject", { exact: true })
          .fill("Retain this local synthetic meeting draft");
      }
    }
    const pause = held();
    state.readHold = pause.promise;
    const before = state.reads;
    await page.evaluate(() => {
      void (
        window as unknown as { __sharingTest: { refreshMeeting: () => void } }
      ).__sharingTest.refreshMeeting();
    });
    await expect.poll(() => state.reads).toBeGreaterThan(before);
    for (const finished of [false, true]) {
      if (finished) {
        state.readHold = undefined;
        pause.release();
      }
      if (draft === "selection")
        await expect(
          page.getByRole("checkbox", { name: /Meeting prep/ }),
        ).toBeChecked();
      else
        await expect(
          page.getByLabel(draft === "note" ? "Content" : "Subject", {
            exact: true,
          }),
        ).toHaveValue(
          draft === "note"
            ? "Retain this local synthetic note draft"
            : "Retain this local synthetic meeting draft",
        );
    }
    expect(state.writes).toEqual([]);
  });
