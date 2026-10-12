import { test, expect, type Page } from "@playwright/test";
import { installFixtures, json } from "./fixtures";

const meeting = {
  id: "meeting-one",
  subject: "Synthetic receipt review",
  description: null,
  location: null,
  startsAt: "2026-10-10T14:00:00Z",
  endsAt: "2026-10-10T15:00:00Z",
  status: "scheduled",
  joinLink: null,
  visibility: "private",
  isVirtual: false,
  meri: null,
  client: { id: "client-one", name: "client-one" },
  attendees: [],
  preps: [],
};
const metadata = {
  id: "artifact-one",
  meetingId: meeting.id,
  clientId: "client-one",
  authorUserId: "user-test",
  confidential: false,
  status: "draft",
  sharedAt: null,
  sharedByUserId: null,
  createdAt: "2026-10-10T15:00:00Z",
  updatedAt: "2026-10-10T15:00:00Z",
};
function held() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
async function setup(page: Page, kind: string) {
  await installFixtures(page);
  const state = {
    writes: 0,
    requests: [] as { path: string; method: string; body: unknown }[],
    receipt: metadata as unknown,
    status: 200,
    hold: undefined as Promise<void> | undefined,
    readHold: undefined as Promise<void> | undefined,
    reads: 0,
    clientId: "client-one",
    items: [] as unknown[],
  };
  await page.route("**/core/engagement/meetings/**", async (route) => {
    if (route.request().method() !== "GET") {
      state.writes++;
      state.requests.push({
        path: new URL(route.request().url()).pathname,
        method: route.request().method(),
        body: route.request().postData()
          ? route.request().postDataJSON()
          : undefined,
      });
      if (state.hold) await state.hold;
      return json(route, state.receipt, state.status).catch(() => {});
    }
    if (new URL(route.request().url()).pathname.endsWith(`/${kind}`))
      return json(route, state.items);
    state.reads++;
    if (state.readHold) await state.readHold;
    return json(route, {
      ...meeting,
      client: { id: state.clientId, name: state.clientId },
    }).catch(() => {});
  });
  await page.goto(`/calendar-artifact-receipts.html?kind=${kind}`);
  await expect(page.getByText(`No ${kind} yet.`)).toBeVisible();
  return state;
}
async function draft(page: Page, singular: string) {
  await page
    .getByRole("button", { name: `Add ${singular}`, exact: true })
    .click();
  await page
    .getByLabel("Content", { exact: true })
    .fill("Retain this synthetic draft");
}
for (const kind of ["notes", "debriefs"]) {
  const singular = kind === "notes" ? "note" : "debrief";
  test(`${kind}: malformed receipt preserves draft and fences repeat creation`, async ({
    page,
  }) => {
    const state = await setup(page, kind);
    state.receipt = {};
    await draft(page, singular);
    await page.getByRole("button", { name: `Save ${singular}` }).click();
    await expect(page.getByLabel("Content", { exact: true })).toHaveValue(
      "Retain this synthetic draft",
    );
    await expect(
      page.getByRole("button", { name: `Save ${singular}` }),
    ).toBeDisabled();
    await expect(page.getByText(/may have completed/).first()).toBeVisible();
    expect(state.writes).toBe(1);
  });
  test(`${kind}: uncertain creation cannot be repeated after remount`, async ({
    page,
  }) => {
    const state = await setup(page, kind);
    state.status = 503;
    await draft(page, singular);
    await page.getByRole("button", { name: `Save ${singular}` }).click();
    await expect(
      page.getByRole("button", { name: `Save ${singular}` }),
    ).toBeDisabled();
    await expect(page.getByText(/may have completed/).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: `Refresh saved ${kind}` }).click();
    await page.getByRole("button", { name: "Toggle artifacts" }).click();
    await page.getByRole("button", { name: "Toggle artifacts" }).click();
    await expect(page.getByLabel("Content", { exact: true })).toHaveValue(
      "Retain this synthetic draft",
    );
    await expect(
      page.getByRole("button", { name: `Save ${singular}` }),
    ).toBeDisabled();
    expect(state.writes).toBe(1);
  });
  test(`${kind}: synchronous submit guard sends one creation`, async ({
    page,
  }) => {
    const state = await setup(page, kind);
    const pending = held();
    state.hold = pending.promise;
    await draft(page, singular);
    await page.locator("[role=dialog] form").evaluate((form) => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    await expect.poll(() => state.writes).toBeGreaterThan(0);
    pending.release();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(state.writes).toBe(1);
  });
}

for (const kind of ["notes", "debriefs"]) {
  const singular = kind === "notes" ? "note" : "debrief";
  test(`${kind}: a known refusal retains editable draft and permits deliberate retry`, async ({
    page,
  }) => {
    const state = await setup(page, kind);
    state.status = 409;
    state.receipt = { message: "Synthetic conflict; review and retry" };
    await draft(page, singular);
    await page.getByRole("button", { name: `Save ${singular}` }).click();
    await expect(
      page.getByText("Synthetic conflict; review and retry").first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Save ${singular}` }),
    ).toBeEnabled();
    await expect(page.getByLabel("Content", { exact: true })).toHaveValue(
      "Retain this synthetic draft",
    );
    state.status = 200;
    state.receipt = metadata;
    await page.getByRole("button", { name: `Save ${singular}` }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(state.writes).toBe(2);
  });
  test(`${kind}: replacing the client during preflight prevents dispatch`, async ({
    page,
  }) => {
    const state = await setup(page, kind);
    const pending = held();
    state.readHold = pending.promise;
    await draft(page, singular);
    await page.getByRole("button", { name: `Save ${singular}` }).click();
    await expect.poll(() => state.reads).toBe(1);
    await page
      .getByRole("button", { name: "Replace client", includeHidden: true })
      .evaluate((button) => (button as HTMLButtonElement).click());
    state.clientId = "client-two";
    pending.release();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await draft(page, singular);
    await expect(
      page.getByRole("button", { name: `Save ${singular}` }),
    ).toBeEnabled();
    expect(state.writes).toBe(0);
  });
  test(`${kind}: a late creation receipt cannot close the replacement client's draft`, async ({
    page,
  }) => {
    const state = await setup(page, kind);
    const pending = held();
    state.hold = pending.promise;
    await draft(page, singular);
    await page.getByRole("button", { name: `Save ${singular}` }).click();
    await expect.poll(() => state.writes).toBe(1);
    await page
      .getByRole("button", { name: "Replace client", includeHidden: true })
      .evaluate((button) => (button as HTMLButtonElement).click());
    state.clientId = "client-two";
    await draft(page, singular);
    await page
      .getByLabel("Content", { exact: true })
      .fill("Replacement client draft");
    pending.release();
    await expect(page.getByLabel("Content", { exact: true })).toHaveValue(
      "Replacement client draft",
    );
    await expect(
      page.getByRole("button", { name: `Save ${singular}` }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Replace client", includeHidden: true })
      .evaluate((button) => (button as HTMLButtonElement).click());
    state.clientId = "client-one";
    await expect(page.getByLabel("Content", { exact: true })).toHaveValue(
      "Retain this synthetic draft",
    );
    await expect(
      page.getByRole("button", { name: `Save ${singular}` }),
    ).toBeDisabled();
    expect(state.writes).toBe(1);
  });
  test(`${kind}: native edit, approval, share and unshare receipts succeed`, async ({
    page,
  }) => {
    const state = await setup(page, kind);
    const item = {
      ...metadata,
      body: "Saved synthetic content",
      restricted: false,
    };
    state.items = [item];
    await page.reload();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Content", { exact: true }).fill("Changed content");
    state.receipt = { ...metadata, status: "edited" };
    await page.getByRole("button", { name: `Save ${singular}` }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    state.receipt = {
      ...metadata,
      status: "approved",
      ...(kind === "notes"
        ? { approvedAt: "2026-10-10T15:00:00Z", approvedByUserId: "user-test" }
        : {}),
    };
    state.items = [{ ...item, status: "approved" }];
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Share", exact: true }),
    ).toBeVisible();
    const shared = {
      ...metadata,
      status: "approved",
      sharedAt: "2026-10-10T15:00:00Z",
      sharedByUserId: "original-sharer",
    };
    state.receipt = { ...meeting, visibility: "shared", [kind]: [shared] };
    state.items = [{ ...item, ...shared }];
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page
      .getByRole("button", { name: `Share ${singular}`, exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Another artifact can keep the meeting shared after this one is unshared.
    state.receipt = {
      ...meeting,
      visibility: "shared",
      [kind]: [{ ...metadata, status: "approved" }],
    };
    state.items = [{ ...item, status: "approved" }];
    await page.getByRole("button", { name: "Unshare", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Share", exact: true }),
    ).toBeVisible();
    expect(state.writes).toBe(4);
    const base = "/api/backend/core/engagement/meetings/meeting-one";
    expect(state.requests).toEqual([
      {
        path: `${base}/${kind}/artifact-one`,
        method: "PATCH",
        body: { body: "Changed content", confidential: false },
      },
      {
        path: `${base}/${kind}/artifact-one/approve`,
        method: "POST",
        body: undefined,
      },
      {
        path: `${base}/artifacts/share`,
        method: "POST",
        body: { artifacts: [{ type: singular, id: "artifact-one" }] },
      },
      {
        path: `${base}/artifacts/unshare`,
        method: "POST",
        body: { artifacts: [{ type: singular, id: "artifact-one" }] },
      },
    ]);
  });
}

for (const kind of ["notes", "debriefs"]) {
  const singular = kind === "notes" ? "note" : "debrief";
  test(`${kind}: pending fields cannot accept a later draft before a valid receipt`, async ({
    page,
  }) => {
    const state = await setup(page, kind);
    const pending = held();
    state.hold = pending.promise;
    await draft(page, singular);
    await page.getByRole("button", { name: `Save ${singular}` }).click();
    await expect.poll(() => state.writes).toBe(1);
    const content = page.getByLabel("Content", { exact: true });
    await content.press("End");
    await content.pressSequentially(" later draft");
    await expect(content).toHaveValue("Retain this synthetic draft");
    await expect(
      page.getByRole("checkbox", { name: "Confidential", exact: true }),
    ).toBeDisabled();
    pending.release();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(state.requests[0]?.body).toEqual({
      body: "Retain this synthetic draft",
      confidential: false,
    });
  });
}
