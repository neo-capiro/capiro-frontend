import { test, expect } from "@playwright/test";
import {
  acceptanceArtifact,
  artifactFixture,
  deferred,
  originalBody,
  recoveredBody,
} from "./acceptance-meeting-artifacts-fixtures";

test("reopened debrief preview conceals its own cached body until the current saved read completes", async ({
  page,
}) => {
  const { state, open, unexpected } = await artifactFixture(page, "debriefs");
  await open();
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const preview = page.getByRole("dialog", {
    name: "Meeting debrief · PDF preview",
    exact: true,
  });
  await expect(preview.getByText(originalBody, { exact: true })).toBeVisible();
  expect(state.reads).toHaveLength(2);
  await preview
    .getByRole("button", { name: "Close preview", exact: true })
    .click();
  await expect(preview).toBeHidden();
  const held = deferred();
  state.readHold = held.promise;
  state.items = [
    {
      ...acceptanceArtifact("debriefs"),
      body: recoveredBody,
      updatedAt: "2026-10-10T15:05:00Z",
    },
  ];
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await expect.poll(() => state.reads.length).toBe(3);
  await expect(preview).toBeVisible();
  await expect(preview.getByText(originalBody, { exact: true })).toBeHidden();
  await expect(
    preview.getByRole("button", { name: "Print / Save as PDF", exact: true }),
  ).toBeDisabled();
  held.release();
  await expect(preview.getByText(recoveredBody, { exact: true })).toBeVisible();
  await expect(preview.getByText(originalBody, { exact: true })).toBeHidden();
  await expect(
    preview.getByRole("button", { name: "Print / Save as PDF", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __artifactPrintCalls: number })
          .__artifactPrintCalls,
    ),
  ).toBe(0);
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

for (const invalid of ["meeting", "client", "duplicate"] as const) {
  test(`debrief preview rejects its own ${invalid} receipt after an admitted card list`, async ({
    page,
  }) => {
    const { state, open } = await artifactFixture(page, "debriefs");
    await open();
    await expect(page.getByText(originalBody, { exact: true })).toBeVisible();
    const row = { ...acceptanceArtifact("debriefs"), body: recoveredBody };
    state.items =
      invalid === "duplicate"
        ? [row, { ...row }]
        : invalid === "meeting"
          ? [{ ...row, meetingId: "foreign-meeting" }]
          : [{ ...row, clientId: "foreign-client" }];
    await page.getByRole("button", { name: "Export PDF", exact: true }).click();
    const preview = page.getByRole("dialog", {
      name: "Meeting debrief · PDF preview",
      exact: true,
    });
    await expect(preview.getByRole("alert")).toBeVisible();
    await expect(
      preview.getByText(recoveredBody, { exact: true }),
    ).toBeHidden();
    await expect(
      preview.getByRole("button", { name: "Print / Save as PDF", exact: true }),
    ).toBeDisabled();
    expect(state.writes).toEqual([]);
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __artifactPrintCalls: number })
            .__artifactPrintCalls,
      ),
    ).toBe(0);
  });
}

test("debrief preview preserves omitted optional parent echoes on its own native read", async ({
  page,
}) => {
  const { state, open, unexpected } = await artifactFixture(page, "debriefs");
  await open();
  await expect(page.getByText(originalBody, { exact: true })).toBeVisible();
  const {
    meetingId: _meetingId,
    clientId: _clientId,
    ...unbound
  } = acceptanceArtifact("debriefs");
  state.items = [unbound];
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const preview = page.getByRole("dialog", {
    name: "Meeting debrief · PDF preview",
    exact: true,
  });
  await expect(preview.getByText(originalBody, { exact: true })).toBeVisible();
  await expect(preview.getByRole("alert")).toBeHidden();
  await expect(
    preview.getByRole("button", { name: "Print / Save as PDF", exact: true }),
  ).toBeEnabled();
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});
