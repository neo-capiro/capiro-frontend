import { expect, test } from "@playwright/test";
import {
  hillDayResumeFixture,
  resumeUrl,
  savedJob,
  jobId,
  documentId,
} from "./workspace-hillday-resume-fixture";

test.describe("saved name baseline", () => {
  test("each acknowledged rename uses its exact snapshot and then the returned timestamp", async ({
    page,
  }) => {
    const f = await hillDayResumeFixture(page);
    const baseline = f.document.updatedAt;
    const names: { name: string; expectedUpdatedAt: string }[] = [];
    await page.route("**/api/capiro/workspace.hillday.update", (route) => {
      const { body } = route.request().postDataJSON();
      names.push(body);
      if (body.expectedUpdatedAt !== f.document.updatedAt)
        return route.fulfill({
          status: 409,
          json: { message: "The document changed. Reload before renaming." },
        });
      f.document.name = body.name;
      f.document.updatedAt = new Date(
        Date.parse(f.document.updatedAt) + 1,
      ).toISOString();
      return route.fulfill({ json: f.document });
    });
    await page.goto(resumeUrl("sponsor"));
    const name = page.getByLabel("Document name", { exact: true });
    await expect(name).toHaveValue(f.document.name);
    expect(names).toHaveLength(0);
    await name.fill("  First rename  ");
    await page
      .getByRole("button", { name: "Open calendar →", exact: true })
      .click();
    await expect(page).toHaveURL(/hilldayPhase=meetings/);
    const savedAt = f.document.updatedAt;
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(name).toHaveValue("First rename");
    await name.fill("Second rename");
    await page
      .getByRole("button", { name: "Open calendar →", exact: true })
      .click();
    await expect(page).toHaveURL(/hilldayPhase=meetings/);
    expect(names).toEqual([
      { name: "First rename", expectedUpdatedAt: baseline },
      { name: "Second rename", expectedUpdatedAt: savedAt },
    ]);
  });

  test("a stale rename retains input and its old baseline until explicit reload", async ({
    page,
  }) => {
    const f = await hillDayResumeFixture(page);
    const baseline = f.document.updatedAt;
    const names: { name: string; expectedUpdatedAt: string }[] = [];
    await page.route("**/api/capiro/workspace.hillday.update", (route) => {
      const { body } = route.request().postDataJSON();
      names.push(body);
      if (body.expectedUpdatedAt !== f.document.updatedAt)
        return route.fulfill({
          status: 409,
          json: { message: "The document changed. Reload before renaming." },
        });
      f.document.name = body.name;
      f.document.updatedAt = new Date(
        Date.parse(f.document.updatedAt) + 1,
      ).toISOString();
      return route.fulfill({ json: f.document });
    });
    await page.goto(resumeUrl("sponsor"));
    const name = page.getByLabel("Document name", { exact: true });
    await expect(name).toHaveValue(f.document.name);
    f.document.name = "Another saved name";
    f.document.updatedAt = "2026-10-26T12:00:01.000Z";
    await name.fill("My unsaved name");
    await page
      .getByRole("button", { name: "Open calendar →", exact: true })
      .click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "The document changed. Reload before renaming." }),
    ).toBeVisible();
    await expect(name).toHaveValue("My unsaved name");
    await expect(page).toHaveURL(/hilldayPhase=sponsor/);
    expect(names).toEqual([
      { name: "My unsaved name", expectedUpdatedAt: baseline },
    ]);
    expect(f.document.name).toBe("Another saved name");
    await page.reload();
    await expect(name).toHaveValue("Another saved name");
    expect(names).toHaveLength(1);
    await name.fill("New explicit rename");
    await page
      .getByRole("button", { name: "Open calendar →", exact: true })
      .click();
    await expect(page).toHaveURL(/hilldayPhase=meetings/);
    expect(names[1]).toEqual({
      name: "New explicit rename",
      expectedUpdatedAt: "2026-10-26T12:00:01.000Z",
    });
  });
});

test.describe("saved calendar range", () => {
  test.use({ timezoneId: "UTC" });

  test("saved week retains Monday morning selection in the filtered calendar query", async ({
    page,
  }) => {
    const f = await hillDayResumeFixture(page);
    await page.goto(resumeUrl("meetings"));
    const meeting = page.getByLabel("Include Saved calendar meeting");
    // The fixture applies Core's lower/upper time bounds to a Monday09:00 row.
    // A noon start therefore removes the actual rendered selection.
    await expect(meeting).toBeChecked();
    expect(
      f.calls.find((call) => call.key === "workspace.hillday.calendar")?.input
        .query,
    ).toEqual({
      from: "2026-10-26T00:00:00.000Z",
      to: "2026-11-02T00:00:00.000Z",
      timeZone: "UTC",
    });
    await page.reload();
    await expect(meeting).toBeChecked();
    await page.getByRole("button", { name: "Resolve attendees" }).click();
    await expect(page).toHaveURL(/hilldayPhase=resolution/);
    expect(
      f.calls.find((call) => call.key === "workspace.hillday.meetings")?.input
        .body,
    ).toEqual({
      eventIds: ["saved-event"],
      weekStart: "2026-10-26",
      timeZone: "UTC",
    });
  });
});

test("saved generation entry discovers its existing job and polls without a generation POST", async ({
  page,
}) => {
  const f = await hillDayResumeFixture(page);
  await page.goto(resumeUrl());
  await expect(
    page.getByRole("button", { name: "Refresh progress", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => f.calls.filter((c) => c.key === "workspace.hillday.job").length)
    .toBeGreaterThan(1);
  expect(
    f.calls.filter((c) => c.key === "workspace.hillday.generate"),
  ).toHaveLength(0);
  f.setJob({
    ...savedJob("complete"),
    completedAt: "2026-10-26T12:05:00.000Z",
  });
  await expect(
    page.getByText("Your packet is ready", { exact: true }),
  ).toBeVisible({ timeout: 7000 });
  const reads = f.calls.filter((c) => c.key === "workspace.hillday.job").length;
  await page.waitForTimeout(3000);
  expect(f.calls.filter((c) => c.key === "workspace.hillday.job")).toHaveLength(
    reads,
  );
});

test("a lost start survives reload and unrelated latest progress cannot settle its original identity", async ({
  page,
}) => {
  const f = await hillDayResumeFixture(page, { noJob: true, loseStart: true });
  await page.goto(resumeUrl());
  await expect(
    page.getByText("No saved generation job.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generate packet", exact: true })
    .click();
  const recovery = page.getByRole("button", {
    name: "Recover original generation request",
    exact: true,
  });
  await expect(recovery).toBeEnabled();
  expect(f.starts.size).toBe(1);
  const [requestId, original] = [...f.starts.entries()][0]!;
  original.status = "complete";
  original.completedAt = "2026-10-26T12:05:00.000Z";
  original.units = original.units.map((unit) => ({ ...unit, state: "done" }));
  f.setJob({
    ...savedJob("failed"),
    jobId: "52000000-0000-4000-8000-000000000099",
  });
  await page.reload();
  await expect(recovery).toBeEnabled();
  await page
    .getByRole("button", { name: "Refresh progress", exact: true })
    .click();
  await expect(recovery).toBeEnabled();
  expect(
    f.calls.filter((c) => c.key === "workspace.hillday.generate"),
  ).toHaveLength(1);
  await recovery.click();
  await expect(
    page.getByText("Your packet is ready", { exact: true }),
  ).toBeVisible();
  await expect(recovery).toHaveCount(0);
  expect(f.starts.size).toBe(1);
  expect(
    f.calls
      .filter((c) => c.key === "workspace.hillday.generate")
      .map((c) => c.input.body?.requestId),
  ).toEqual([requestId, requestId]);
  expect(
    f.calls.filter((c) => c.key === "workspace.hillday.job").at(-1)?.input
      .params,
  ).toEqual({ id: documentId, jobId });
});

test("saved meetings and context reopen in order without recreating or clearing the document", async ({
  page,
}) => {
  const f = await hillDayResumeFixture(page);
  await page.goto(resumeUrl("context"));
  await expect(page.getByLabel("Meeting context", { exact: true })).toHaveValue(
    "Saved meeting context",
  );
  await expect(
    page
      .getByRole("navigation", { name: "Meeting context selection" })
      .getByRole("button"),
  ).toHaveText(["Saved meeting 1", "Saved meeting 2"]);
  await page.reload();
  await expect(page.getByLabel("Meeting context", { exact: true })).toHaveValue(
    "Saved meeting context",
  );
  expect(
    f.calls.filter((c) =>
      ["workspace.hillday.create", "workspace.hillday.meetings"].includes(
        c.key,
      ),
    ),
  ).toHaveLength(0);
  await page.goto(resumeUrl("meetings"));
  await expect(page.getByLabel("Include Saved calendar meeting")).toBeChecked();
  await expect(
    page.getByText("2 meetings selected", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Saved meeting 2", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resolve attendees" }).click();
  await expect(page).toHaveURL(/hilldayPhase=resolution/);
  const save = f.calls.find((c) => c.key === "workspace.hillday.meetings");
  expect(save?.input).toEqual({
    params: { id: documentId },
    body: {
      eventIds: ["saved-event"],
      weekStart: "2026-10-26",
      timeZone: "UTC",
    },
  });
  expect(
    f.calls.filter((c) => c.key === "workspace.hillday.create"),
  ).toHaveLength(0);
});

test("unknown units require deliberate same-job retry and lost retry acknowledgement needs readback", async ({
  page,
}) => {
  const f = await hillDayResumeFixture(page, { loseRetry: true });
  const failed = savedJob("failed");
  failed.units[1] = {
    ...failed.units[1]!,
    state: "unknown",
    reason: "Provider outcome unresolved",
  };
  f.setJob(failed);
  const originalSections = structuredClone(f.document.sections);
  await page.goto(resumeUrl());
  const retry = page.getByRole("button", {
    name: "Retry failed and unknown units",
    exact: true,
  });
  await expect(retry).toBeDisabled();
  await page.getByRole("checkbox", { name: /retrying unknown units/ }).check();
  await retry.click();
  await expect(
    page.getByText(/The command acknowledgement is unknown/),
  ).toBeVisible();
  expect(
    f.calls
      .filter((c) => c.key === "workspace.hillday.retry")
      .map((c) => c.input),
  ).toEqual([{ params: { id: documentId, jobId } }]);
  expect(
    f.calls.filter((c) => c.key === "workspace.hillday.generate"),
  ).toHaveLength(0);
  expect(f.getJob()?.units[0]).toEqual(failed.units[0]);
  expect(f.document.sections).toEqual(originalSections);
  await expect(
    page.getByRole("button", { name: "Request cancellation", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Refresh progress", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Request cancellation", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText(/The command acknowledgement is unknown/),
  ).toHaveCount(0);
});

test("running cancellation stays requested until an observed terminal result", async ({
  page,
}) => {
  const f = await hillDayResumeFixture(page);
  await page.goto(resumeUrl());
  await page
    .getByRole("button", { name: "Request cancellation", exact: true })
    .click();
  await expect(
    page.getByText(
      "Cancellation requested. Work already in flight may finish. Waiting for Workspace to report a terminal result.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Generation cancelled", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Request cancellation", exact: true }),
  ).toHaveCount(0);
  expect(
    f.calls
      .filter((c) => c.key === "workspace.hillday.cancel")
      .map((c) => c.input),
  ).toEqual([{ params: { id: documentId, jobId } }]);
  const reads = f.calls.filter((c) => c.key === "workspace.hillday.job").length;
  await expect
    .poll(
      () => f.calls.filter((c) => c.key === "workspace.hillday.job").length,
      { timeout: 7000 },
    )
    .toBeGreaterThan(reads);
  f.setJob({
    ...f.getJob()!,
    status: "cancelled",
    completedAt: "2026-10-26T12:05:00.000Z",
  });
  await expect(
    page.getByText("Generation cancelled", { exact: true }),
  ).toBeVisible({ timeout: 7000 });
});

for (const scenario of ["unavailable", "refused"] as const) {
  test(`latest job ${scenario} is not treated as no job`, async ({ page }) => {
    const f = await hillDayResumeFixture(page, {
      unavailableLatest: scenario === "unavailable",
      denyLatest: scenario === "refused",
    });
    await page.goto(resumeUrl());
    await expect(
      page.getByRole("alert").filter({
        hasText:
          scenario === "unavailable"
            ? "Generation temporarily unavailable"
            : "Generation access refused",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("No saved generation job.", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Generate packet", exact: true }),
    ).toHaveCount(0);
    expect(
      f.calls.filter((c) => c.key === "workspace.hillday.generate"),
    ).toHaveLength(0);
  });
}

test("a pending start cannot install its acknowledgement into a replacement actor lifetime", async ({
  page,
}) => {
  const f = await hillDayResumeFixture(page, { noJob: true, holdStart: true });
  await page.goto(resumeUrl());
  await page
    .getByRole("button", { name: "Generate packet", exact: true })
    .click();
  await expect.poll(() => f.starts.size).toBe(1);
  await f.switchActor();
  await expect(
    page.getByRole("button", { name: "Refresh progress", exact: true }),
  ).toBeEnabled();
  f.release();
  await expect(
    page.getByText("Meri is drafting the packet", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Generation request acknowledged. Following its saved job.",
      { exact: true },
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Recover original generation request",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(
    f.calls.filter((c) => c.key === "workspace.hillday.generate"),
  ).toHaveLength(1);
});
