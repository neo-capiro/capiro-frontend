import { expect, test } from "@playwright/test";
import { capability, capabilityId, clientId, json } from "./fixtures";
import {
  holdResponse,
  installCapabilityBoundary,
  transition,
} from "./capability-boundary-fixtures";

for (const change of ["role", "invalidate", "refetch-identity"])
  test(`capability writes are disabled after identity ${change}`, async ({
    page,
  }) => {
    const unexpected = await installCapabilityBoundary(page);
    await page.goto(`/capability-boundary.html?capability=${capabilityId}`);
    const editor = page.getByRole("dialog", {
      name: "Capability: Test sensor",
    });
    const save = editor.getByRole("button", {
      name: "Save capability",
      exact: true,
    });
    await expect(save).toBeEnabled();
    if (change === "refetch-identity")
      await page.route("**/core/me", (route) =>
        json(route, { message: "Synthetic identity denied" }, 403),
      );
    await transition(page, change);
    await expect(save).toBeDisabled();
    await expect(
      editor.getByRole("button", { name: "Remove capability", exact: true }),
    ).toBeDisabled();
    await expect(editor.getByLabel("Name", { exact: true })).toBeDisabled();
    // A synthetic native submit bypasses button disabled state. The writer must
    // still check the real cache before any request is dispatched.
    await editor
      .locator("form")
      .evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect(
      page.getByLabel("Synthetic pending capability writes"),
    ).toHaveText("0");
    await expect(editor.getByRole("alert")).toBeVisible();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Refresh", exact: true }),
    ).toBeDisabled();
    expect(unexpected).toEqual([]);
  });

for (const action of ["save", "remove"] as const)
  for (const change of ["actor", "client", "unmount"])
    test(`late capability ${action} cannot refresh or close after ${change} changes`, async ({
      page,
    }) => {
      const unexpected = await installCapabilityBoundary(page);
      let reads = 0;
      await page.route(`**/core/clients/${clientId}/capabilities`, (route) => {
        reads += 1;
        return json(route, [capability]);
      });
      const held = await holdResponse(
        page,
        `**/core/clients/${clientId}/capabilities/${capabilityId}`,
        action === "save" ? "PATCH" : "DELETE",
        action === "save" ? capability : { deleted: true },
      );
      await page.goto(`/capability-boundary.html?capability=${capabilityId}`);
      const editor = page.getByRole("dialog", {
        name: "Capability: Test sensor",
      });
      await editor.getByText("Details", { exact: true }).click();
      await editor
        .getByLabel("Name", { exact: true })
        .fill("Original actor draft");
      if (action === "save")
        await editor
          .getByRole("button", { name: "Save capability", exact: true })
          .click();
      else {
        await editor
          .getByRole("button", { name: "Remove capability", exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "Remove capability", exact: true })
          .getByRole("button", { name: "Confirm remove" })
          .click();
      }
      await held.started;
      await transition(page, change);
      if (change === "unmount")
        await expect(page.getByText("Capability view unmounted")).toBeVisible();
      if (change === "client")
        await expect(
          page
            .getByRole("dialog", {
              name: "Capability: Second client capability",
            })
            .getByLabel("Name", { exact: true }),
        ).toHaveValue("Second client capability");
      held.release();
      await held.settled;
      await expect(
        page.getByLabel("Synthetic pending capability writes"),
      ).toHaveText("0");
      expect(new URL(page.url()).searchParams.get("capability")).toBe(
        capabilityId,
      );
      expect(reads).toBe(1);
      expect(held.calls()).toBe(1);
      expect(unexpected).toEqual([]);
    });

test("capability save keeps a single immutable draft in flight then refreshes and closes", async ({
  page,
}) => {
  const unexpected = await installCapabilityBoundary(page);
  let saved = false;
  await page.route(`**/core/clients/${clientId}/capabilities`, (route) =>
    json(route, [
      {
        ...capability,
        name: saved ? "Saved synthetic capability" : capability.name,
      },
    ]),
  );
  const held = await holdResponse(
    page,
    `**/core/clients/${clientId}/capabilities/${capabilityId}`,
    "PATCH",
    { ...capability, name: "Saved synthetic capability" },
  );
  await page.goto(`/capability-boundary.html?capability=${capabilityId}`);
  const editor = page.getByRole("dialog", { name: "Capability: Test sensor" });
  await editor.getByText("Details", { exact: true }).click();
  await editor
    .getByLabel("Name", { exact: true })
    .fill("Saved synthetic capability");
  await editor
    .getByRole("button", { name: "Save capability", exact: true })
    .click();
  await held.started;
  await expect(editor.getByLabel("Name", { exact: true })).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "Remove capability", exact: true }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "Saving…", exact: true }),
  ).toBeDisabled();
  saved = true;
  held.release();
  await held.settled;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Saved synthetic capability/ }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.has("capability")).toBe(false);
  expect(held.calls()).toBe(1);
  expect(unexpected).toEqual([]);
});

test("capability remove confirms one existing record then refreshes the empty list", async ({
  page,
}) => {
  const unexpected = await installCapabilityBoundary(page);
  let removed = false;
  await page.route(`**/core/clients/${clientId}/capabilities`, (route) =>
    json(route, removed ? [] : [capability]),
  );
  await page.route(
    `**/core/clients/${clientId}/capabilities/${capabilityId}`,
    (route) => {
      expect(route.request().method()).toBe("DELETE");
      removed = true;
      return route.fulfill({ status: 204 });
    },
  );
  await page.goto(`/capability-boundary.html?capability=${capabilityId}`);
  await page
    .getByRole("dialog", { name: "Capability: Test sensor" })
    .getByRole("button", { name: "Remove capability", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Remove capability", exact: true })
    .getByRole("button", { name: "Confirm remove" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText(
      "Add a capability area to describe what this client can deliver.",
    ),
  ).toBeVisible();
  expect(removed).toBe(true);
  expect(new URL(page.url()).searchParams.has("capability")).toBe(false);
  expect(unexpected).toEqual([]);
});

test("capability create uses the existing client collection and closes after the refreshed read", async ({
  page,
}) => {
  const unexpected = await installCapabilityBoundary(page);
  let saved: typeof capability | undefined;
  let writes = 0;
  await page.route(`**/core/clients/${clientId}/capabilities`, (route) => {
    if (route.request().method() === "GET")
      return json(route, saved ? [saved] : []);
    expect(route.request().method()).toBe("POST");
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      name: "New synthetic sensor",
      type: "product",
      trl: null,
      peNumbers: [],
      keywords: [],
    });
    expect(body).not.toHaveProperty("clientId");
    writes += 1;
    saved = {
      ...capability,
      ...body,
      id: "40000000-0000-4000-8000-000000000003",
    };
    return json(route, saved);
  });
  await page.goto("/capability-boundary.html");
  await page
    .getByRole("button", { name: "Add capability", exact: true })
    .click();
  const editor = page.getByRole("dialog", { name: "New capability" });
  await editor.getByLabel("Name", { exact: true }).fill("New synthetic sensor");
  await editor
    .getByRole("button", { name: "Add capability", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /New synthetic sensor/ }),
  ).toBeVisible();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});
