import { test, expect } from "@playwright/test";
import {
  acceptanceArtifact,
  artifactFixture,
  controls,
  deferred,
  listSettled,
  listState,
  originalBody,
  recoveredBody,
} from "./acceptance-meeting-artifacts-fixtures";

for (const kind of ["notes", "debriefs"] as const) {
  test(`${kind}: held list conceals the saved body and recovers only current records`, async ({
    page,
  }) => {
    const { state, open, unexpected } = await artifactFixture(page, kind);
    await open();
    await expect(page.getByText(originalBody, { exact: true })).toBeVisible();
    const held = deferred();
    state.readHold = held.promise;
    state.items = [{ ...acceptanceArtifact(kind), body: recoveredBody }];
    await controls(page, "refresh");
    await expect.poll(() => state.reads.length).toBe(2);
    await expect
      .poll(async () => (await listState(page))?.fetchStatus)
      .toBe("fetching");
    await expect(page.getByText(originalBody, { exact: true })).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Edit", exact: true }),
    ).toBeHidden();
    await expect(
      page.getByText(`No ${kind} yet.`, { exact: true }),
    ).toBeHidden();
    held.release();
    await listSettled(page, "success");
    await expect(page.getByText(recoveredBody, { exact: true })).toBeVisible();
    await expect(page.getByText(originalBody, { exact: true })).toBeHidden();
    expect(state.writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });

  for (const status of [403, 503]) {
    test(`${kind}: failed HTTP${status} refresh removes body and stale actions, with deliberate recovery`, async ({
      page,
    }) => {
      const { state, open, unexpected } = await artifactFixture(page, kind);
      await open();
      await expect(page.getByText(originalBody, { exact: true })).toBeVisible();
      state.readStatus = status;
      await controls(page, "refresh");
      await listSettled(page, "error");
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByText(originalBody, { exact: true })).toBeHidden();
      for (const name of ["Edit", "Approve", "Share", "Unshare", "Export PDF"])
        await expect(
          page.getByRole("button", { name, exact: true }),
        ).toBeHidden();
      await expect(
        page.getByText(`No ${kind} yet.`, { exact: true }),
      ).toBeHidden();
      state.readStatus = 200;
      state.items = [{ ...acceptanceArtifact(kind), body: recoveredBody }];
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await listSettled(page, "success");
      await expect(
        page.getByText(recoveredBody, { exact: true }),
      ).toBeVisible();
      expect(state.writes).toEqual([]);
      expect(unexpected).toEqual([]);
    });
  }

  test(`${kind}: an older released read cannot replace a newer failed read`, async ({
    page,
  }) => {
    const { state, open } = await artifactFixture(page, kind);
    await open();
    await expect(page.getByText(originalBody, { exact: true })).toBeVisible();
    const held = deferred();
    state.readHold = held.promise;
    await controls(page, "refresh");
    await expect.poll(() => state.reads.length).toBe(2);
    const oldRead = state.reads[1]!;
    expect(oldRead.transport).toBe("pending");
    state.readHold = undefined;
    state.readStatus = 403;
    await controls(page, "refresh");
    await listSettled(page, "error");
    const refused = await listState(page);
    held.release();
    await oldRead.settled;
    if (oldRead.transport === "failed")
      expect(oldRead.failure).toContain("ERR_ABORTED");
    else expect(oldRead.transport).toBe("finished");
    await expect.poll(() => listState(page)).toEqual(refused);
    await expect(page.getByText(originalBody, { exact: true })).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Edit", exact: true }),
    ).toBeHidden();
    expect(state.writes).toEqual([]);
  });

  for (const invalid of ["meeting", "client", "duplicate"] as const) {
    test(`${kind}: rejects ${invalid} list provenance without body or write controls`, async ({
      page,
    }) => {
      const { state, open } = await artifactFixture(page, kind);
      const item = acceptanceArtifact(kind);
      if (invalid === "meeting")
        state.items = [{ ...item, meetingId: "foreign-meeting" }];
      if (invalid === "client")
        state.items = [{ ...item, clientId: "foreign-client" }];
      if (invalid === "duplicate") state.items = [item, { ...item }];
      await open();
      await listSettled(page, "error");
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByText(originalBody, { exact: true })).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Edit", exact: true }),
      ).toBeHidden();
      expect(state.writes).toEqual([]);
    });
  }

  test(`${kind}: omitted optional parent echoes preserve the original native list projection`, async ({
    page,
  }) => {
    const { state, open, unexpected } = await artifactFixture(page, kind);
    const {
      meetingId: _meetingId,
      clientId: _clientId,
      ...unbound
    } = acceptanceArtifact(kind);
    state.items = [unbound];
    await open();
    await listSettled(page, "success");
    await expect(page.getByRole("alert")).toBeHidden();
    await expect(page.getByText(originalBody, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit", exact: true }),
    ).toBeEnabled();
    expect(state.writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });

  for (const clientId of ["client-one", null]) {
    test(`${kind}: exact native ${clientId ?? "unscoped"} parent remains usable`, async ({
      page,
    }) => {
      const { state, open, unexpected } = await artifactFixture(
        page,
        kind,
        clientId,
      );
      await open();
      await listSettled(page, "success");
      await expect(page.getByText(originalBody, { exact: true })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Edit", exact: true }),
      ).toBeEnabled();
      if (kind === "debriefs")
        await expect(
          page.getByText("Sharing status unavailable", { exact: true }),
        ).toBeVisible();
      expect(state.writes).toEqual([]);
      expect(unexpected).toEqual([]);
    });
  }
}
