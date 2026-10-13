import { expect, test, type Page } from "@playwright/test";
import { clientId, installFixtures, json } from "./fixtures";
import { voiceMeeting } from "./voice-meeting";

async function dayFixture(page: Page) {
  const unexpected = await installFixtures(page);
  const reads: URL[] = [];
  const writes: string[] = [];
  const meeting = {
    ...voiceMeeting,
    subject: "Synthetic selected-day meeting",
    startsAt: "2026-11-01T17:00:00Z",
    endsAt: "2026-11-01T18:00:00Z",
  };
  await page.route("**/core/engagement/meetings**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== "GET") {
      writes.push(request.method() + " " + url.pathname);
      return json(route, { message: "Unexpected synthetic write" }, 500);
    }
    if (url.pathname.endsWith("/meetings")) {
      reads.push(url);
      const from = url.searchParams.get("from") ?? "";
      const to = url.searchParams.get("to") ?? "";
      // Preserve the inspected native startsAt >= from, < to query semantics.
      return json(
        route,
        meeting.startsAt >= from && meeting.startsAt < to ? [meeting] : [],
      );
    }
    if (url.pathname.endsWith(`/${meeting.id}`)) return json(route, meeting);
    if (url.pathname.endsWith("/notes") || url.pathname.endsWith("/debriefs"))
      return json(route, []);
    if (url.pathname.endsWith("/notetaker")) return json(route, null);
    return json(route, { message: "Unhandled synthetic meeting route" }, 404);
  });
  return { reads, writes, unexpected, meeting };
}

for (const width of [1440, 390]) {
  test(`Day navigation keeps the selected scope and zone at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1040 });
    const fixture = await dayFixture(page);
    await page.goto(
      `/calendar?clientId=${clientId}&date=2026-11-01&zone=America%2FLos_Angeles&view=month`,
    );
    const view = page.getByRole("combobox", { name: "Calendar view" });
    await view.selectOption("day");
    await expect(view).toHaveValue("day");
    await expect(
      page.locator('[data-view="day"] [data-time-grid-date]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-view="day"] [data-time-grid-date]'),
    ).toHaveAttribute("data-time-grid-date", "2026-11-01");
    await expect(
      page.getByText(/Shows meetings that start on this day/),
    ).toBeVisible();
    await expect
      .poll(() =>
        fixture.reads.some(
          (url) =>
            url.searchParams.get("from") === "2026-11-01T07:00:00Z" &&
            url.searchParams.get("to") === "2026-11-02T08:00:00Z",
        ),
      )
      .toBe(true);
    for (const next of ["week", "agenda", "month", "day"]) {
      await view.selectOption(next);
      await expect(
        page.getByLabel("Calendar date", { exact: true }),
      ).toHaveValue("2026-11-01");
      await expect(
        page.getByRole("combobox", { name: "Calendar timezone" }),
      ).toHaveValue("America/Los_Angeles");
      await expect(
        page.getByRole("combobox", { name: "Calendar scope" }),
      ).toHaveValue(clientId);
    }
    await page
      .getByRole("button", { name: "Next period", exact: true })
      .click();
    await expect(page.getByLabel("Calendar date", { exact: true })).toHaveValue(
      "2026-11-02",
    );
    await page
      .getByRole("button", { name: "Previous period", exact: true })
      .click();
    await expect(page.getByLabel("Calendar date", { exact: true })).toHaveValue(
      "2026-11-01",
    );
    await expect(page).toHaveURL(/view=day/);
    expect(
      fixture.reads.every(
        (url) => url.searchParams.get("clientId") === clientId,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`day-${width}.png`),
      fullPage: true,
    });
    expect(fixture.writes).toEqual([]);
    expect(fixture.unexpected).toEqual([]);
  });
}

test("Day date picker and Today follow the selected timezone and keep Master scope", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-01T00:30:00Z"));
  const fixture = await dayFixture(page);
  await page.goto(
    "/calendar?date=2028-02-29&zone=America%2FLos_Angeles&view=day",
  );
  await expect(
    page.getByRole("combobox", { name: "Calendar view" }),
  ).toHaveValue("day");
  await page.getByRole("button", { name: "Next period", exact: true }).click();
  await expect(page.getByLabel("Calendar date", { exact: true })).toHaveValue(
    "2028-03-01",
  );
  await page.getByLabel("Calendar date", { exact: true }).fill("2026-03-08");
  await expect
    .poll(() =>
      fixture.reads.some(
        (url) =>
          url.searchParams.get("from") === "2026-03-08T08:00:00Z" &&
          url.searchParams.get("to") === "2026-03-09T07:00:00Z",
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.getByLabel("Calendar date", { exact: true })).toHaveValue(
    "2026-10-31",
  );
  expect(fixture.reads.every((url) => !url.searchParams.has("clientId"))).toBe(
    true,
  );
  expect(fixture.writes).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("Day meeting entry preserves the current calendar route without dispatching a write", async ({
  page,
}) => {
  const fixture = await dayFixture(page);
  await page.goto(
    `/portfolio/${clientId}/calendar?date=2026-11-01&zone=America%2FLos_Angeles&view=day`,
  );
  const event = page
    .locator('[data-view="day"]')
    .getByText(fixture.meeting.subject, { exact: true });
  await event.scrollIntoViewIfNeeded();
  await event.click();
  await expect(page).toHaveURL(new RegExp(`meeting=${fixture.meeting.id}`));
  const url = new URL(page.url());
  expect(url.pathname).toBe(`/portfolio/${clientId}/calendar`);
  expect(url.searchParams.get("view")).toBe("day");
  expect(url.searchParams.get("date")).toBe("2026-11-01");
  expect(url.searchParams.get("zone")).toBe("America/Los_Angeles");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(fixture.writes).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});
