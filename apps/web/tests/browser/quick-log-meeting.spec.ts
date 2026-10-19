import { test, expect, type Page } from "@playwright/test";
import { client, clientId, json } from "./fixtures";
import { installRemoval, savedActivity } from "./overview-removal-fixtures";

const secondId = "10000000-0000-4000-8000-000000000002";
const meetingEntry = (page: Page) =>
  page.getByRole("button", { name: "Record a meeting", exact: true });
const quickLog = (page: Page) =>
  page.getByRole("dialog", { name: "Quick log", exact: true });

function recordWrites(page: Page) {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/") && request.method() !== "GET")
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  return writes;
}

async function fillActivity(page: Page) {
  const dialog = quickLog(page);
  await expect(dialog.getByLabel("Activity type").locator("option")).toHaveText(
    ["Note", "Call", "Logged email", "Decision", "Request", "Commitment"],
  );
  await expect(dialog.getByText(/We owe|They owe|Counterparty/)).toHaveCount(0);
  await dialog.getByLabel("Activity type").selectOption("call");
  await dialog.getByLabel("Title", { exact: true }).fill("Private local title");
  await dialog
    .getByLabel("Details", { exact: true })
    .fill("Private local details");
}

for (const currentId of [clientId, secondId])
  test(`meeting handoff uses current client ${currentId}, carries no activity draft and sends no write`, async ({
    page,
  }) => {
    const { unexpected } = await installRemoval(page);
    const writes = recordWrites(page);
    if (currentId === secondId) {
      const second = {
        ...client,
        id: secondId,
        name: "Synthetic second client",
      };
      await page.route("**/api/backend/core/clients", (route) =>
        json(route, [client, second]),
      );
      await page.route(`**/api/backend/core/clients/${secondId}**`, (route) => {
        if (route.request().method() !== "GET") return route.fallback();
        const tail = new URL(route.request().url()).pathname.split(secondId)[1];
        if (!tail) return json(route, second);
        if (
          [
            "/team",
            "/activity",
            "/facilities",
            "/objectives",
            "/people",
          ].includes(tail)
        )
          return json(route, []);
        return route.fallback();
      });
    }
    await page.goto(
      `/portfolio/${currentId}?log=1&clientId=unrelated&subject=ignored&body=ignored`,
    );
    await fillActivity(page);
    await expect(meetingEntry(page)).toBeEnabled();
    await expect(meetingEntry(page)).toHaveAccessibleDescription(
      "Enter the required start and end times in Calendar.",
    );
    if (currentId === clientId) {
      await quickLog(page).screenshot({
        path: "work/quick-log-meeting-desktop.png",
      });
      await meetingEntry(page)
        .locator("..")
        .screenshot({ path: "work/quick-log-meeting-row-desktop.png" });
    }
    await meetingEntry(page).click();
    await expect(page).toHaveURL(
      `/portfolio/${currentId}/calendar?new=meeting`,
    );
    await expect(quickLog(page)).toHaveCount(0);
    const meeting = page.getByRole("dialog", {
      name: "New meeting",
      exact: true,
    });
    await expect(meeting).toBeVisible();
    await expect(meeting.getByLabel("Subject", { exact: true })).toHaveValue(
      "",
    );
    await expect(
      meeting.getByLabel("Description", { exact: true }),
    ).toHaveValue("");
    for (const label of ["Starts", "Ends"]) {
      await expect(meeting.getByLabel(label, { exact: true })).toHaveValue("");
      await expect(meeting.getByLabel(label, { exact: true })).toHaveAttribute(
        "required",
        "",
      );
    }
    await expect(meeting.getByLabel("Client", { exact: true })).toHaveCount(0);
    expect(writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });

test("phone handoff wraps as designed and opens Calendar without satisfying activity validation", async ({
  page,
}) => {
  const { unexpected } = await installRemoval(page);
  const writes = recordWrites(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/portfolio/${clientId}?log=1`);
  await expect(
    quickLog(page).getByLabel("Title", { exact: true }),
  ).toBeFocused();
  const entry = meetingEntry(page);
  await expect(entry).toBeEnabled();
  const action = await entry.boundingBox();
  const caption = await quickLog(page)
    .getByText("Enter the required start and end times in Calendar.", {
      exact: true,
    })
    .boundingBox();
  expect(action).not.toBeNull();
  expect(caption?.y).toBeGreaterThanOrEqual(action!.y + action!.height);
  expect((action?.x ?? 0) + (action?.width ?? 0)).toBeLessThanOrEqual(390);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await quickLog(page).screenshot({
    path: "work/quick-log-meeting-phone-dark.png",
  });
  await entry
    .locator("..")
    .screenshot({ path: "work/quick-log-meeting-row-phone-dark.png" });
  await entry.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "New meeting", exact: true }),
  ).toBeVisible();
  expect(writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("an unsupported current role cannot navigate through the meeting handoff", async ({
  page,
}) => {
  const { state, unexpected } = await installRemoval(page);
  state.role = "viewer";
  const writes = recordWrites(page);
  await page.goto(`/portfolio/${clientId}?log=1`);
  await expect(meetingEntry(page)).toBeDisabled();
  await meetingEntry(page).evaluate((button) =>
    (button as HTMLButtonElement).click(),
  );
  await expect(page).toHaveURL(`/portfolio/${clientId}?log=1`);
  await expect(
    page.getByRole("dialog", { name: "New meeting", exact: true }),
  ).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("a pending activity save blocks the handoff and preserves the original exact save receipt", async ({
  page,
}) => {
  const { unexpected } = await installRemoval(page);
  const writes = recordWrites(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    `**/api/backend/core/clients/${clientId}/activity*`,
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = route.request().postDataJSON();
      await held;
      return json(route, { ...savedActivity, ...body });
    },
  );
  await page.goto(`/portfolio/${clientId}?log=1`);
  await fillActivity(page);
  await quickLog(page)
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  await expect(
    quickLog(page).getByRole("button", { name: "Saving…", exact: true }),
  ).toBeDisabled();
  await expect(meetingEntry(page)).toBeDisabled();
  await meetingEntry(page).evaluate((button) =>
    (button as HTMLButtonElement).click(),
  );
  await expect(page).toHaveURL(`/portfolio/${clientId}?log=1`);
  release();
  await expect(quickLog(page)).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "Quick log result" }),
  ).toContainText("Logged to Test Aerospace");
  expect(writes).toEqual([
    `POST /api/backend/core/clients/${clientId}/activity`,
  ]);
  await expect(
    page.getByRole("dialog", { name: "New meeting", exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("an unknown activity result retains the draft, blocks the handoff and exposes no Undo", async ({
  page,
}) => {
  const { state, unexpected } = await installRemoval(page);
  state.mode = "wrongCreate";
  const writes = recordWrites(page);
  await page.goto(`/portfolio/${clientId}?log=1`);
  await fillActivity(page);
  await quickLog(page)
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  await expect(quickLog(page)).toContainText("The save result is uncertain.");
  await expect(meetingEntry(page)).toBeDisabled();
  await meetingEntry(page).evaluate((button) =>
    (button as HTMLButtonElement).click(),
  );
  await expect(page).toHaveURL(`/portfolio/${clientId}?log=1`);
  await expect(quickLog(page).getByLabel("Title", { exact: true })).toHaveValue(
    "Private local title",
  );
  await expect(
    quickLog(page).getByLabel("Details", { exact: true }),
  ).toHaveValue("Private local details");
  await expect(
    quickLog(page).getByRole("button", { name: "Save activity", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toHaveCount(0);
  expect(writes).toEqual([
    `POST /api/backend/core/clients/${clientId}/activity`,
  ]);
  expect(unexpected).toEqual([]);
});

test("a direct save locks its captured draft and a refusal restores the same editable fields", async ({
  page,
}, testInfo) => {
  const { unexpected } = await installRemoval(page);
  const writes = recordWrites(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    `**/api/backend/core/clients/${clientId}/activity*`,
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await held;
      return json(route, { message: "Review the synthetic activity" }, 422);
    },
  );
  await page.goto(`/portfolio/${clientId}?log=1`, { waitUntil: "commit" });
  const dialog = quickLog(page);
  await dialog.getByLabel("Activity type").selectOption("commitment");
  await dialog.getByLabel("Title", { exact: true }).fill("Captured promise");
  await dialog.getByLabel("Details", { exact: true }).fill("Captured details");
  await dialog.getByLabel("Who owes it").selectOption("we_owe");
  await dialog.getByLabel("Counterparty").fill("Client counsel");
  await dialog.getByLabel("Due date").fill("2026-10-25");
  await dialog.getByLabel("When", { exact: true }).fill("2026-10-19T09:30");
  await expect(dialog.getByLabel("Objective", { exact: true })).toBeEnabled();
  await dialog
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  try {
    await expect.poll(() => writes.length).toBe(1);
    for (const name of [
      "Activity type",
      "Title",
      "Details",
      "Who owes it",
      "Counterparty",
      "Due date",
      "When",
      "Objective",
    ])
      await expect(dialog.getByLabel(name, { exact: true })).toBeDisabled();
    await expect(
      dialog.getByRole("checkbox", { name: "Add generic follow-up" }),
    ).toBeDisabled();
    await page.screenshot({
      path: testInfo.outputPath("pending-quick-log-1440x1040.png"),
    });
  } finally {
    release();
  }
  await expect(dialog).toContainText("Review the synthetic activity");
  await expect(dialog.getByLabel("Title", { exact: true })).toBeEnabled();
  await expect(dialog.getByLabel("Title", { exact: true })).toHaveValue(
    "Captured promise",
  );
  await expect(dialog.getByLabel("Details", { exact: true })).toHaveValue(
    "Captured details",
  );
  await expect(dialog.getByLabel("Activity type")).toHaveValue("commitment");
  await expect(dialog.getByLabel("Who owes it")).toHaveValue("we_owe");
  await expect(dialog.getByLabel("Counterparty")).toHaveValue("Client counsel");
  await expect(dialog.getByLabel("Due date")).toHaveValue("2026-10-25");
  await expect(dialog.getByLabel("When", { exact: true })).toHaveValue(
    "2026-10-19T09:30",
  );
  expect(writes).toEqual([
    `POST /api/backend/core/clients/${clientId}/activity`,
  ]);
  expect(unexpected).toEqual([]);
});
