import {
  commandReceipt,
  installCommandActor,
  type CommandInput,
} from "./meeting-command-fixture";
import { test, expect } from "@playwright/test";
import { installFixtures, json, clientId } from "./fixtures";
const meeting = {
  updatedAt: "2026-10-10T13:00:00.000Z",
  id: "91000000-0000-4000-8000-000000000001",
  subject: "Synthetic meeting",
  description: null,
  location: "Old location",
  startsAt: "2026-10-10T14:00:00Z",
  endsAt: "2026-10-10T15:00:00Z",
  status: "scheduled",
  joinLink: null,
  visibility: "private",
  isVirtual: false,
  meri: null,
  client: { id: clientId, name: "Synthetic" },
  attendees: [],
  preps: [],
};
for (const stale of [false, true])
  test(`existing meeting No client sends explicit null and ${stale ? "rejects old association" : "accepts native clear receipt"}`, async ({
    page,
  }) => {
    await installFixtures(page);
    await installCommandActor(page);
    const writes: CommandInput[] = [];
    let receipt: unknown;
    await page.route("**/core/engagement/meeting-commands**", (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as CommandInput;
        writes.push(body);
        receipt = commandReceipt(body, {
          clientId: stale ? meeting.client.id : null,
        });
      }
      return json(route, receipt);
    });
    await page.goto("/calendar-meeting-receipts.html?mode=clear");
    await page
      .getByRole("combobox", { name: "Client", exact: true })
      .selectOption("");
    await page.getByRole("button", { name: "Save meeting" }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]?.meeting).toMatchObject({
      assignClient: true,
      clientId: null,
    });
    if (stale) {
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText(/saved for recovery/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Save meeting" }),
      ).toBeDisabled();
    } else {
      await page.getByRole("button", { name: "Done", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  });
test("new unscoped meeting explicitly retains No client", async ({ page }) => {
  await installFixtures(page);
  await installCommandActor(page);
  const writes: CommandInput[] = [];
  let receipt: unknown;
  await page.route("**/core/engagement/meeting-commands**", (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as CommandInput;
      writes.push(body);
      receipt = commandReceipt(body);
    }
    return json(route, receipt);
  });
  await page.goto("/calendar-meeting-receipts.html?mode=create");
  await page.getByLabel("Subject", { exact: true }).fill(meeting.subject);
  await page.getByLabel("Starts", { exact: true }).fill("2026-10-10T14:00");
  await page.getByLabel("Ends", { exact: true }).fill("2026-10-10T15:00");
  await page.getByRole("button", { name: "Save meeting" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(writes).toHaveLength(1);
  expect(writes[0]?.meeting).toMatchObject({
    assignClient: true,
    clientId: null,
  });
});
