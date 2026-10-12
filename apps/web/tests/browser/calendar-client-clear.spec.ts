import { test, expect } from "@playwright/test";
import { installFixtures, json, clientId } from "./fixtures";
const meeting = {
  id: "meeting-one",
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
    const writes: Record<string, unknown>[] = [];
    await page.route("**/core/engagement/meetings/meeting-one", (route) => {
      const body = route.request().postDataJSON();
      writes.push(body);
      return json(route, {
        ...meeting,
        client: stale || body.clientId !== null ? meeting.client : null,
      });
    });
    await page.goto("/calendar-meeting-receipts.html?mode=clear");
    await page
      .getByRole("combobox", { name: "Client", exact: true })
      .selectOption("");
    await page.getByRole("button", { name: "Save meeting" }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toHaveProperty("clientId", null);
    if (stale) {
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText(/may have completed/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Save meeting" }),
      ).toBeDisabled();
    } else await expect(page.getByRole("dialog")).toHaveCount(0);
  });
test("new unscoped meeting omits clientId and accepts backend association", async ({
  page,
}) => {
  await installFixtures(page);
  const writes: Record<string, unknown>[] = [];
  await page.route("**/core/engagement/meetings", (route) => {
    writes.push(route.request().postDataJSON());
    return json(route, { ...meeting, location: null });
  });
  await page.goto("/calendar-meeting-receipts.html?mode=create");
  await page.getByLabel("Subject", { exact: true }).fill(meeting.subject);
  await page.getByLabel("Starts", { exact: true }).fill("2026-10-10T14:00");
  await page.getByLabel("Ends", { exact: true }).fill("2026-10-10T15:00");
  await page.getByRole("button", { name: "Save meeting" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(writes).toHaveLength(1);
  expect(writes[0]).not.toHaveProperty("clientId");
});
