import { expect, test, type Page } from "@playwright/test";
async function connect(page: Page) {
  await page.goto("/browser-viewer.html");
  await page.getByText("Browser control", { exact: true }).click();
  await page.getByRole("button", { name: "Take control", exact: true }).click();
  const surface = page.getByRole("application");
  await expect(surface).toHaveAttribute("aria-disabled", "false");
  return surface;
}
test("native decoded canvas input, explicit return and no automatic resume", async ({
  page,
}) => {
  const surface = await connect(page);
  await surface.click({ position: { x: 50, y: 50 } });
  await expect(surface).toHaveAttribute("aria-disabled", "false");
  await surface.press("A");
  await expect(page.getByLabel("Service operations")).toContainText(
    "input,read,frame,input,read,frame",
  );
  await expect(surface).toHaveAttribute("aria-disabled", "false");
  await page
    .getByRole("button", { name: "Return control", exact: true })
    .click();
  await expect(
    page.getByText(
      "Control returned. Meri stays paused until you explicitly resume.",
    ),
  ).toBeVisible();
  await expect(surface).toHaveCount(0);
  await expect(page.getByLabel("Service operations")).not.toContainText(
    "resume",
  );
});
test("lost input acknowledgement requires readback and never replays a click", async ({
  page,
}) => {
  const surface = await connect(page);
  await page.getByRole("button", { name: "Lose next input ACK" }).click();
  await surface.click();
  await expect(page.getByRole("alert")).toContainText("could not be confirmed");
  await page
    .getByRole("button", { name: "Refresh browser", exact: true })
    .click();
  await expect(surface).toHaveAttribute("aria-disabled", "false");
  expect(
    (await page.getByLabel("Service operations").innerText())
      .split(",")
      .filter((value) => value === "input"),
  ).toHaveLength(1);
});
test("session expiry removes the native image and serialized port holds no image or ticket", async ({
  page,
}) => {
  await connect(page);
  await expect(page.getByLabel("Serialized port")).toHaveText("{}");
  await page.getByRole("button", { name: "Expire session" }).click();
  await expect(page.getByRole("application")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Refresh browser", exact: true }),
  ).toBeDisabled();
});
