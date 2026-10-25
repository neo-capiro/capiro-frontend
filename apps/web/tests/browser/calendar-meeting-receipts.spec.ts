import {
  commandReceipt,
  installCommandActor,
  type CommandInput,
} from "./meeting-command-fixture";
import { test, expect } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
for (const foreign of [
  { meetingId: "00000000-0000-4000-8000-000000000099" },
  { clientId: "00000000-0000-4000-8000-000000000098" },
  { clientId: null },
]) {
  test(`foreign meeting receipt retains editor: ${JSON.stringify(foreign)}`, async ({
    page,
  }) => {
    await installFixtures(page);
    await installCommandActor(page);
    await page.route("**/core/engagement/meeting-commands**", (route) => {
      expect(route.request().method()).toBe("POST");
      const input = route.request().postDataJSON() as CommandInput;
      expect(input.meeting?.assignClient).toBe(false);
      return json(route, commandReceipt(input, foreign));
    });
    await page.goto("/calendar-meeting-receipts.html");
    await page.getByRole("button", { name: "Save meeting" }).click();
    await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
      "Synthetic meeting",
    );
    await expect(page.getByText(/saved for recovery/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save meeting" }),
    ).toBeDisabled();
  });
}
test("native normalized meeting receipt succeeds and an empty location is explicitly cleared", async ({
  page,
}) => {
  await installFixtures(page);
  await installCommandActor(page);
  let body: CommandInput | undefined;
  let receipt: unknown;
  await page.route("**/core/engagement/meeting-commands**", (route) => {
    if (route.request().method() === "POST") {
      body = route.request().postDataJSON();
      receipt = commandReceipt(body!);
    }
    return json(route, receipt);
  });
  await page.goto("/calendar-meeting-receipts.html");
  await page.getByLabel("Location or join URL").fill("");
  await page.getByRole("button", { name: "Save meeting" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(body?.meeting).toMatchObject({ location: "" });
});

test("pending meeting fields cannot accept a newer unsaved draft before a valid receipt", async ({
  page,
}) => {
  await installFixtures(page);
  await installCommandActor(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  let receipt: unknown;
  await page.route("**/core/engagement/meeting-commands**", async (route) => {
    if (route.request().method() === "POST") {
      requests++;
      receipt = commandReceipt(route.request().postDataJSON());
      await pending;
    }
    return json(route, receipt);
  });
  await page.goto("/calendar-meeting-receipts.html");
  await page.getByRole("button", { name: "Save meeting" }).click();
  await expect.poll(() => requests).toBe(1);
  for (const [label, value] of [
    ["Subject", "Synthetic meeting"],
    ["Description", ""],
    ["Location or join URL", "Old location"],
    ["Starts", "2026-10-10T14:00"],
    ["Ends", "2026-10-10T15:00"],
  ]) {
    const field = page.getByLabel(label!, { exact: true });
    await expect(field).toHaveAttribute("readonly", "");
    if (
      label === "Subject" ||
      label === "Description" ||
      label === "Location or join URL"
    ) {
      await field.press("End");
      await field.pressSequentially(" newer unsaved draft");
    }
    await expect(field).toHaveValue(value!);
  }
  release();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(requests).toBe(1);
});
