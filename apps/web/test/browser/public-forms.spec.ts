import { expect, test } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
const token = "20000000-0000-4000-8000-000000000001." + "a".repeat(64);
const question = "30000000-0000-4000-8000-000000000001";
test("public form submits only displayed answers and shows the returned receipt without sign-in", async ({
  page,
}) => {
  const writes: unknown[] = [],
    operations: string[] = [];
  await onlyLocalRequests(page);
  page.on("request", (request) => {
    if (request.url().includes("/api/capiro/"))
      operations.push(new URL(request.url()).pathname);
  });
  await operationFixtures(page, {
    "public-form.read": {
      name: "Synthetic public intake",
      description: "Test form",
      confirmationMessage: "Synthetic request received",
      allowAnotherSubmission: true,
      fields: [
        {
          id: question,
          label: "Request title",
          type: "text",
          required: true,
          options: [],
          maxLength: 500,
        },
      ],
    },
    "public-form.submit": (input) => {
      writes.push(input);
      return { received: true };
    },
  });
  await page.goto(`/forms/${token}`);
  await page.getByLabel("Request title").fill("Synthetic request");
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Synthetic request received" }),
  ).toBeVisible();
  expect(writes).toEqual([
    { params: { token }, body: { [question]: "Synthetic request" } },
  ]);
  expect(operations.every((path) => path.includes("public-form."))).toBe(true);
  await page.getByRole("button", { name: "Submit another request" }).click();
  await expect(page.getByLabel("Request title")).toHaveValue("");
});
test("revoked public capability renders an unavailable state without a submission action", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  await page.route("**/api/capiro/public-form.read*", (route) =>
    route.fulfill({
      status: 404,
      json: { message: "This form link is unavailable." },
    }),
  );
  await page.goto(`/forms/${token}`);
  await expect(page.getByRole("alert")).toContainText(
    "This form link is unavailable.",
  );
  await expect(
    page.getByRole("button", { name: "Submit request" }),
  ).toHaveCount(0);
});
