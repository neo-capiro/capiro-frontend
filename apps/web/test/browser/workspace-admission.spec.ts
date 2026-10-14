import { expect, test, type Route } from "@playwright/test";
import { expectAccessibleHome } from "../accessibility";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { draft, otherId } from "../../tests/prospect-resources-fixtures";

const ordinary = {
  ...draft,
  prospectId: null,
  docTitle: "Synthetic ordinary document",
  config: {
    sections: ["Body"],
    sectionContent: { Body: "Stored synthetic text" },
  },
};
const path = `/modules/workspace?draftId=${ordinary.id}`;

test("an exact Newsletter receipt still opens its existing builder without writes", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "workspace.clients": [],
    "workspace.draft": { ...ordinary, product: "Newsletter" },
  });
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/api/") &&
      request.method() !== "GET"
    )
      writes.push(request.url());
  });
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: ordinary.docTitle, exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Subject", { exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

for (const width of [1440, 390]) {
  test(`wrong Workspace receipt has accessible keyboard retry at ${width}px`, async ({
    page,
  }, info) => {
    await onlyLocalRequests(page);
    await operationFixtures(page, {
      ...moduleRouteFixtures,
      "workspace.draft": { ...ordinary, id: otherId },
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(path);
    await expect(page.getByRole("alert")).toContainText(
      "does not match this link",
    );
    await expectAccessibleHome(page, info);
    await page.screenshot({
      path: info.outputPath(`workspace-admission-${width}.png`),
      fullPage: true,
    });
    const retry = page.getByRole("button", { name: "Try again", exact: true });
    await retry.focus();
    await expect(retry).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alert")).toContainText(
      "does not match this link",
    );
    await expect(
      page.getByLabel("Document title", { exact: true }),
    ).toHaveCount(0);
  });
}

for (const product of [null, "Newsletter"]) {
  test(`Workspace refuses a different returned ${product ?? "ordinary"} draft ID before mounting its editor`, async ({
    page,
  }) => {
    await onlyLocalRequests(page);
    await operationFixtures(page, moduleRouteFixtures);
    let wrong = true;
    const writes: string[] = [],
      inputs: unknown[] = [],
      errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname.startsWith("/api/") &&
        request.method() !== "GET"
      )
        writes.push(request.url());
    });
    await page.route("**/api/capiro/workspace.draft?*", (route) => {
      inputs.push(
        JSON.parse(new URL(route.request().url()).searchParams.get("input")!),
      );
      const id = wrong ? otherId : ordinary.id;
      return route.fulfill({
        json: {
          ...ordinary,
          id,
          product: wrong ? product : null,
          docTitle: wrong
            ? "Wrong document must remain concealed"
            : ordinary.docTitle,
          documents: ordinary.documents.map((document) => ({
            ...document,
            draftId: id,
          })),
        },
      });
    });
    await page.goto(path);
    await expect(page.getByRole("alert")).toContainText(
      "The returned document does not match this link.",
    );
    await expect(
      page.getByLabel("Document title", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Wrong document must remain concealed", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Save draft", exact: true }),
    ).toHaveCount(0);
    expect(writes).toEqual([]);
    wrong = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      page.getByLabel("Document title", { exact: true }),
    ).toHaveValue(ordinary.docTitle);
    await expect(page.getByLabel("Body content", { exact: true })).toHaveValue(
      "Stored synthetic text",
    );
    expect(inputs).toEqual(Array(2).fill({ params: { id: ordinary.id } }));
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
  });
}

for (const phase of ["update", "snapshot"] as const) {
  test(`ordinary Workspace section input stays stable through held ${phase} and reopens after rejection`, async ({
    page,
  }) => {
    await onlyLocalRequests(page);
    await operationFixtures(page, {
      ...moduleRouteFixtures,
      "workspace.draft": ordinary,
    });
    let held: Route | undefined;
    const writes: { operation: string; body: unknown }[] = [];
    for (const operation of ["update", "snapshot"] as const)
      await page.route(
        `**/api/capiro/workspace.draft.${operation}`,
        (route) => {
          writes.push({ operation, body: route.request().postDataJSON() });
          if (operation === phase) {
            held = route;
            return;
          }
          return route.fulfill({ json: ordinary });
        },
      );
    await page.goto(path);
    await page
      .getByLabel("Body content", { exact: true })
      .fill("Exact submitted ordinary text");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => Boolean(held)).toBe(true);
    await expect(
      page.getByLabel("Body content", { exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByLabel("Document title", { exact: true }),
    ).toBeDisabled();
    await held!.fulfill({
      status: 400,
      json: { message: "Synthetic rejected save phase" },
    });
    await expect(page.getByRole("alert")).toContainText(
      "Synthetic rejected save phase",
    );
    await expect(
      page.getByLabel("Body content", { exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel("Body content", { exact: true })).toHaveValue(
      "Exact submitted ordinary text",
    );
    expect(writes[0]).toEqual({
      operation: "update",
      body: {
        params: { id: ordinary.id },
        body: {
          docTitle: ordinary.docTitle,
          config: { sectionContent: { Body: "Exact submitted ordinary text" } },
        },
      },
    });
    expect(writes.map((write) => write.operation)).toEqual(
      phase === "update" ? ["update"] : ["update", "snapshot"],
    );
  });
}
