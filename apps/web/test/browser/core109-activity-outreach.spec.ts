import { expect, test, type Route } from "@playwright/test";
import {
  assertNoEffects,
  clientId,
  destination,
  otherClientId,
  otherRecordId,
  record,
  recordId,
  recordRoute,
  requestCompletion,
  setupOutreach,
} from "./core109-outreach-fixtures";

for (const width of [1440, 390]) {
  test(`CORE-109 Activity opens the exact current Outreach record at ${width}px without writes`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const observed = await setupOutreach(page);
    await page.goto(`/portfolio/${clientId}`);
    const link = page.getByRole("link", {
      name: "Open outreach",
      exact: false,
    });
    await expect(link).toHaveAttribute("href", destination());
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(destination());
    await expect(
      page.getByRole("dialog", { name: "Outreach draft", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
      record.subject,
    );
    await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
      record.body,
    );
    expect(observed.reads).toEqual([{ params: { id: recordId } }]);
    assertNoEffects(observed);
    await page.goBack();
    await expect(link).toBeVisible();
    assertNoEffects(observed);
  });
}
for (const mismatch of [
  "record",
  "client",
  "null-client",
  "missing-client",
] as const) {
  test(`CORE-109 refuses ${mismatch} mismatch before exposing a source editor`, async ({
    page,
  }) => {
    const observed = await setupOutreach(page);
    const payload = {
      ...record,
      id: mismatch === "record" ? otherRecordId : recordId,
      client:
        mismatch === "client"
          ? { id: otherClientId, name: "Other client" }
          : mismatch === "null-client"
            ? null
            : mismatch === "missing-client"
              ? undefined
              : record.client,
    };
    await page.route(recordRoute, (route) => route.fulfill({ json: payload }));
    await page.goto(destination());
    await expect(page.getByRole("alert")).toContainText(
      "The returned outreach does not match this link.",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "New outreach", exact: false }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Body", { exact: true })).toHaveCount(0);
    assertNoEffects(observed);
  });
}
for (const status of [403, 404, 503]) {
  test(`CORE-109 current source ${status} refuses blank-draft fallback and recovers by exact reread`, async ({
    page,
  }) => {
    const observed = await setupOutreach(page);
    let unavailable = true;
    await page.route(recordRoute, (route) =>
      unavailable
        ? route.fulfill({
            status,
            json: { message: "Current source unavailable" },
          })
        : route.fulfill({ json: record }),
    );
    await page.goto(destination());
    await expect(page.getByRole("alert")).toContainText(
      "Current source unavailable",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "New outreach", exact: false }),
    ).toHaveCount(0);
    assertNoEffects(observed);
    unavailable = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
      record.body,
    );
    expect(observed.reads).toEqual([
      { params: { id: recordId } },
      { params: { id: recordId } },
    ]);
    assertNoEffects(observed);
  });
}
for (const replacement of ["record", "client"] as const) {
  test(`CORE-109 ${replacement} replacement rejects the held previous source read`, async ({
    page,
  }) => {
    const observed = await setupOutreach(page);
    let held: Route | undefined;
    await page.route(recordRoute, (route) => {
      const input = JSON.parse(
        new URL(route.request().url()).searchParams.get("input")!,
      );
      if (input.params.id === recordId) {
        held = route;
        return;
      }
      return route.fulfill({
        json: {
          ...record,
          id: otherRecordId,
          body: "Current replacement body",
          client: {
            ...record.client,
            id: replacement === "client" ? otherClientId : clientId,
          },
        },
      });
    });
    await page.goto(destination());
    await expect.poll(() => Boolean(held)).toBe(true);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const settled = requestCompletion(page, held!.request());
    await page.evaluate(
      (next) => {
        history.pushState({}, "", next);
        dispatchEvent(new PopStateEvent("popstate"));
      },
      destination(
        replacement === "client" ? otherClientId : clientId,
        otherRecordId,
      ),
    );
    await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
      "Current replacement body",
    );
    await held!.fulfill({ json: record }).catch(() => {});
    await settled;
    await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
      "Current replacement body",
    );
    expect(observed.reads).toEqual([
      { params: { id: recordId } },
      { params: { id: otherRecordId } },
    ]);
    assertNoEffects(observed);
  });
}
for (const replacement of [
  { userId: "replacement-user" },
  { orgId: "replacement-org" },
  { sessionId: "replacement-session" },
]) {
  test(`CORE-109 authority replacement ${Object.keys(replacement)[0]} retires the held private record`, async ({
    page,
  }) => {
    const observed = await setupOutreach(page);
    let held: Route | undefined;
    let reads = 0;
    await page.route(recordRoute, (route) => {
      if (++reads === 1) {
        held = route;
        return;
      }
      return route.fulfill({
        status: 404,
        json: { message: "Replacement scope has no source record" },
      });
    });
    await page.goto(destination());
    await expect.poll(() => Boolean(held)).toBe(true);
    const settled = requestCompletion(page, held!.request());
    await page.evaluate(
      (detail) => dispatchEvent(new CustomEvent("test:session", { detail })),
      replacement,
    );
    await expect(page.getByRole("alert")).toContainText(
      "Replacement scope has no source record",
    );
    await held!.fulfill({ json: record }).catch(() => {});
    await settled;
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByLabel("Body", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "New outreach", exact: false }),
    ).toHaveCount(0);
    expect(reads).toBe(2);
    assertNoEffects(observed);
  });
}
