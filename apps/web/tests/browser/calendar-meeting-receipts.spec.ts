import { test, expect } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
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
  client: { id: "client-one", name: "Synthetic" },
  attendees: [],
  preps: [],
};
for (const foreign of [
  { id: "foreign" },
  { client: { id: "foreign", name: "Other" } },
]) {
  test(`foreign meeting receipt retains editor: ${JSON.stringify(foreign)}`, async ({
    page,
  }) => {
    await installFixtures(page);
    await page.route("**/core/engagement/meetings/meeting-one", (route) =>
      json(route, { ...meeting, ...foreign }),
    );
    await page.goto("/calendar-meeting-receipts.html");
    await page.getByRole("button", { name: "Save meeting" }).click();
    await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
      "Synthetic meeting",
    );
    await expect(page.getByText(/may have completed/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save meeting" }),
    ).toBeDisabled();
  });
}
test("native normalized meeting receipt succeeds and an empty location is explicitly cleared", async ({
  page,
}) => {
  await installFixtures(page);
  let body: unknown;
  await page.route("**/core/engagement/meetings/meeting-one", (route) => {
    body = route.request().postDataJSON();
    return json(route, {
      ...meeting,
      location: null,
      startsAt: "2026-10-10T14:00:00.000Z",
      endsAt: "2026-10-10T15:00:00.000Z",
    });
  });
  await page.goto("/calendar-meeting-receipts.html");
  await page.getByLabel("Location or join URL").fill("");
  await page.getByRole("button", { name: "Save meeting" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(body).toMatchObject({ location: "" });
});
