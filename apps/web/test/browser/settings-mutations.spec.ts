import { expect, test } from "@playwright/test";
import { testIdentity } from "./fixtures";
import {
  branding,
  connection,
  contact,
  holdOperation,
  oauthUrl,
  openSettings,
  otherId,
  profile,
  providerCard,
  refuse,
  replaceSession,
  settingsFixture,
  syncStats,
} from "./settings-mutation-fixtures";

test("Contact saves once while pending and renders the validated current read-back", async ({
  page,
}) => {
  let current = { ...contact };
  let reads = 0;
  await settingsFixture(page, {
    "settings.contact.read": () => {
      reads++;
      return current;
    },
  });
  await openSettings(page, "contact-info");
  const pending = await holdOperation(page, "settings.contact.update");
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Edited synthetic firm");
  await page.getByLabel("Email", { exact: true }).fill("updated@example.test");
  const save = page
    .locator("form")
    .filter({ has: page.getByLabel("Organization name", { exact: true }) })
    .locator('button[type="submit"]');
  await save.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(() => pending.requests.length).toBe(1);
  await expect(save).toBeDisabled();
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toBeDisabled();
  expect(pending.requests).toEqual([
    {
      body: {
        ...contact,
        name: "Edited synthetic firm",
        email: "updated@example.test",
      },
    },
  ]);
  current = {
    ...contact,
    name: "Canonical synthetic firm",
    email: "updated@example.test",
  };
  pending.finish(current);
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue(current.name);
  expect(reads).toBeGreaterThan(1);
});

test("Contact refuses failed writes without losing the draft and keeps standard users read-only", async ({
  page,
}) => {
  await settingsFixture(page);
  let writes = 0;
  await page.route("**/api/capiro/settings.contact.update", (route) => {
    writes++;
    return refuse(route, "Synthetic contact conflict");
  });
  await openSettings(page, "contact-info");
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Unsaved synthetic draft");
  await page
    .getByRole("button", { name: "Save contact info", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic contact conflict",
  );
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Unsaved synthetic draft");
  await expect(
    page.getByText("Contact information was saved.", { exact: true }),
  ).toHaveCount(0);
  expect(writes).toBe(1);
  await page.route("**/api/capiro/me.read?*", (route) =>
    route.fulfill({ json: { ...testIdentity, role: "standard_user" } }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Save contact info", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toBeDisabled();
  expect(writes).toBe(1);
});

test("Contact discards a late successful receipt after session replacement", async ({
  page,
}) => {
  await settingsFixture(page);
  await openSettings(page, "contact-info");
  const pending = await holdOperation(page, "settings.contact.update");
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Old session draft");
  await page
    .getByRole("button", { name: "Save contact info", exact: true })
    .click();
  await expect.poll(() => pending.requests.length).toBe(1);
  await replaceSession(page);
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue(contact.name);
  pending.finish({ ...contact, name: "Late old session result" });
  await expect.poll(() => pending.offered).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(
    page.getByRole("button", { name: "Save contact info", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("Contact information was saved.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue(contact.name);
});

test("Branding name save refuses errors then uses a fresh canonical read", async ({
  page,
}) => {
  let current = { ...branding };
  let fail = true;
  const writes: unknown[] = [];
  await settingsFixture(page, { "settings.branding.read": () => current });
  await page.route("**/api/capiro/settings.branding.update", async (route) => {
    writes.push(route.request().postDataJSON());
    if (fail) return refuse(route, "Synthetic branding conflict");
    current = { ...current, name: "Canonical branded firm" };
    await route.fulfill({ json: current });
  });
  await openSettings(page, "branding");
  await page.getByLabel("Company name", { exact: true }).fill("Branding draft");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic branding conflict",
  );
  await expect(page.getByLabel("Company name", { exact: true })).toHaveValue(
    "Branding draft",
  );
  fail = false;
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByLabel("Company name", { exact: true })).toHaveValue(
    current.name,
  );
  expect(writes).toEqual([
    { body: { name: "Branding draft" } },
    { body: { name: "Branding draft" } },
  ]);
});

test("Branding validates logo bytes and confirms only a completed synthetic upload", async ({
  page,
}) => {
  let current: Omit<typeof branding, "logoUploadedAt"> & {
    logoUploadedAt: string | null;
  } = { ...branding };
  const operations: string[] = [];
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  const ticket = {
    url: "https://synthetic.s3.amazonaws.com/",
    fields: { key: "synthetic/logo.png", "Content-Type": "image/png" },
    s3Key: "synthetic/logo.png",
  };
  await settingsFixture(page, {
    "settings.branding.read": () => current,
    "settings.branding.logoUploadUrl": (input) => {
      expect(input).toEqual({
        body: { contentType: "image/png", contentLength: png.length },
      });
      operations.push("ticket");
      return ticket;
    },
    "settings.branding.logoConfirm": (input) => {
      expect(input).toEqual({
        body: { s3Key: ticket.s3Key, contentType: "image/png" },
      });
      operations.push("confirm");
      current = { ...current, logoUploadedAt: "2026-10-15T12:00:00.000Z" };
      return current;
    },
  });
  await page.route(ticket.url, async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers().authorization).toBeUndefined();
    operations.push("upload");
    await route.fulfill({
      status: 204,
      headers: { "access-control-allow-origin": new URL(page.url()).origin },
    });
  });
  await openSettings(page, "branding");
  const file = page.locator('input[type="file"]');
  await file.setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("synthetic"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Choose a PNG, JPG, WEBP or SVG logo.",
  );
  expect(operations).toEqual([]);
  await file.setInputFiles({
    name: "synthetic.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect.poll(() => operations).toEqual(["ticket", "upload", "confirm"]);
  await expect(
    page.getByRole("button", { name: "Upload logo", exact: true }),
  ).toBeEnabled();
});

test("Profiles create, archive and restore through exact current records with refusal retained", async ({
  page,
}) => {
  let clients: (typeof profile)[] = [];
  let rejectArchive = true;
  const writes: { operation: string; input: unknown }[] = [];
  await settingsFixture(page, {
    "clients.list": () => clients,
    "settings.profiles.create": (input) => {
      writes.push({ operation: "create", input });
      clients = [profile];
      return profile;
    },
    "settings.profiles.restore": (input) => {
      writes.push({ operation: "restore", input });
      clients = [profile];
      return profile;
    },
  });
  await page.route("**/api/capiro/settings.profiles.archive", async (route) => {
    writes.push({
      operation: "archive",
      input: route.request().postDataJSON(),
    });
    if (rejectArchive) return refuse(route, "Synthetic archive conflict");
    clients = [{ ...profile, status: "archived" }];
    await route.fulfill({ json: clients[0] });
  });
  await openSettings(page, "profiles");
  await page
    .getByRole("button", { name: "+ Add profile", exact: true })
    .click();
  const create = page.getByRole("dialog", { name: "Add profile", exact: true });
  await create.getByLabel("Name", { exact: true }).fill(profile.name);
  await create.getByLabel("Website (optional)").fill(profile.website);
  await create
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
  await expect(create).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: profile.name, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  const archive = page.getByRole("dialog", {
    name: `Archive ${profile.name}?`,
    exact: true,
  });
  await archive.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(archive.getByRole("alert")).toContainText(
    "Synthetic archive conflict",
  );
  rejectArchive = false;
  await archive.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(archive).toHaveCount(0);
  await page.getByRole("tab", { name: "Archived (1)", exact: true }).click();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await page.getByRole("tab", { name: "Active (1)", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: profile.name, exact: true }),
  ).toBeVisible();
  expect(writes).toEqual([
    {
      operation: "create",
      input: { body: { name: profile.name, website: profile.website } },
    },
    { operation: "archive", input: { params: { clientId: profile.id } } },
    { operation: "archive", input: { params: { clientId: profile.id } } },
    {
      operation: "restore",
      input: { params: { clientId: profile.id }, body: { status: "active" } },
    },
  ]);
});

test("Profiles keep the exact create and archive dialogs open while their writes are pending", async ({
  page,
}) => {
  let clients: (typeof profile)[] = [];
  await settingsFixture(page, { "clients.list": () => clients });
  await openSettings(page, "profiles");

  const pendingCreate = await holdOperation(page, "settings.profiles.create");
  await page.getByRole("button", { name: "+ Add profile" }).click();
  const create = page.getByRole("dialog", { name: "Add profile" });
  await create.getByLabel("Name", { exact: true }).fill(profile.name);
  await create.getByRole("button", { name: "Create profile" }).click();
  await expect.poll(() => pendingCreate.requests.length).toBe(1);
  await expect(create.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.locator('[data-slot="dialog-overlay"]').click({
    position: { x: 2, y: 2 },
  });
  await expect(create).toBeVisible();
  await expect(create.getByLabel("Name", { exact: true })).toHaveValue(
    profile.name,
  );
  expect(pendingCreate.requests).toEqual([{ body: { name: profile.name } }]);
  clients = [profile];
  pendingCreate.finish(profile);
  await expect(create).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: profile.name, exact: true }),
  ).toBeVisible();

  const pendingArchive = await holdOperation(page, "settings.profiles.archive");
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  const archive = page.getByRole("dialog", {
    name: `Archive ${profile.name}?`,
    exact: true,
  });
  await archive.getByRole("button", { name: "Archive", exact: true }).click();
  await expect.poll(() => pendingArchive.requests.length).toBe(1);
  await expect(archive.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await archive.getByRole("button", { name: "Close dialog" }).click();
  await expect(archive).toBeVisible();
  expect(pendingArchive.requests).toEqual([
    { params: { clientId: profile.id } },
  ]);
  pendingArchive.finish({ ...profile, status: "active" });
  await expect(archive.getByRole("alert")).toContainText(
    "did not confirm this profile update",
  );
  await expect(archive).toBeVisible();
  await archive.getByRole("button", { name: "Cancel" }).click();
  await expect(archive).toHaveCount(0);
});

test("Profiles reject another record or an unachieved status instead of confirming archive or restore", async ({
  page,
}) => {
  await settingsFixture(page, { "clients.list": [profile] });
  for (const operation of ["archive", "restore"] as const) {
    const initialStatus = operation === "archive" ? "active" : "archived";
    const finalStatus = operation === "archive" ? "archived" : "active";
    for (const receipt of [
      { ...profile, id: otherId, status: finalStatus },
      { ...profile, status: initialStatus },
    ]) {
      await page.route("**/api/capiro/clients.list?*", (route) =>
        route.fulfill({ json: [{ ...profile, status: initialStatus }] }),
      );
      await page.route(
        `**/api/capiro/settings.profiles.${operation}`,
        (route) => route.fulfill({ json: receipt }),
      );
      await openSettings(page, "profiles");
      if (operation === "restore")
        await page
          .getByRole("tab", { name: "Archived (1)", exact: true })
          .click();
      await page
        .getByRole("button", {
          name: operation === "archive" ? "Archive" : "Restore",
          exact: true,
        })
        .click();
      if (operation === "archive")
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Archive", exact: true })
          .click();
      await expect(page.getByRole("alert").first()).toBeVisible();
      await expect(
        page.getByText(
          `Profile was ${operation === "archive" ? "archived" : "restored"}.`,
          { exact: true },
        ),
      ).toHaveCount(0);
      if (operation === "archive")
        await expect(page.getByRole("dialog")).toBeVisible();
    }
  }
});

test("Integrations require configured capability, keep IMAP unavailable and constrain hosted destinations", async ({
  page,
}) => {
  const writes: unknown[] = [];
  let authUrl = "https://accounts.google.com/synthetic/wrong-provider";
  await settingsFixture(page, {
    "settings.integrations.list": [
      {
        ...connection,
        id: otherId,
        provider: "imap_caldav",
        displayName: "Synthetic IMAP account",
      },
    ],
    "settings.integrations.startMicrosoft": (input) => {
      writes.push(input);
      return { authUrl, connectionId: connection.id };
    },
  });
  await page.route(oauthUrl, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "Synthetic OAuth destination; no provider request",
    }),
  );
  await openSettings(page, "integrations");
  await expect(
    page.getByRole("button", {
      name: "Administrator setup required",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Connect OAuth", exact: true }),
  ).toBeDisabled();
  const imap = page.locator("section").filter({
    has: page.getByRole("heading", { name: "IMAP / CalDAV", exact: true }),
  });
  await expect(
    imap.getByRole("button", { name: "Disconnect", exact: true }),
  ).toBeDisabled();
  await expect(
    imap.getByRole("button", { name: "Sync now", exact: true }),
  ).toBeDisabled();
  await providerCard(page)
    .getByRole("button", { name: "Connect Microsoft 365", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("unexpected destination");
  await expect(page).toHaveURL(/\/settings\/integrations$/);
  authUrl = oauthUrl;
  await providerCard(page)
    .getByRole("button", { name: "Connect Microsoft 365", exact: true })
    .click();
  await expect(page).toHaveURL(oauthUrl);
  expect(writes).toEqual([{ body: {} }, { body: {} }]);
});

test("Integration reconnect refuses an OAuth receipt for another registered account", async ({
  page,
}) => {
  const writes: unknown[] = [];
  await settingsFixture(page, {
    "settings.integrations.list": [
      { ...connection, status: "needs_configuration" },
    ],
    "settings.integrations.startMicrosoft": (input) => {
      writes.push(input);
      return { authUrl: oauthUrl, connectionId: otherId };
    },
  });
  await page.route(oauthUrl, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "Synthetic wrong account destination",
    }),
  );
  await openSettings(page, "integrations");
  await providerCard(page)
    .getByRole("button", { name: "Connect account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/settings\/integrations$/);
  expect(writes).toEqual([{ body: { connectionId: connection.id } }]);
});

test("Integration sync dispatches once and refuses failed-record or wrong-account receipts", async ({
  page,
}) => {
  await settingsFixture(page, { "settings.integrations.list": [connection] });
  await openSettings(page, "integrations");
  const pending = await holdOperation(
    page,
    "settings.integrations.syncMicrosoft",
  );
  const sync = providerCard(page).getByRole("button", {
    name: "Sync now",
    exact: true,
  });
  await sync.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(sync).toBeDisabled();
  await expect.poll(() => pending.requests.length).toBe(1);
  pending.finish({
    connectionId: connection.id,
    calendar: { ...syncStats, failed: 1 },
  });
  await expect(page.getByRole("alert")).toContainText("failed records");
  await expect(
    page.getByText("Connection sync completed.", { exact: true }),
  ).toHaveCount(0);
  await page.route(
    "**/api/capiro/settings.integrations.syncMicrosoft",
    (route) =>
      route.fulfill({ json: { connectionId: otherId, calendar: syncStats } }),
  );
  await sync.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText("Connection sync completed.", { exact: true }),
  ).toHaveCount(0);
  expect(pending.requests).toEqual([
    { params: { connectionId: connection.id } },
  ]);
});

for (const outcome of ["negative", "foreign", "confirmed"] as const)
  test(`Integration disconnect retains refusal and requires a matching affirmative receipt: ${outcome}`, async ({
    page,
  }) => {
    let connections = [connection];
    await settingsFixture(page, {
      "settings.integrations.list": () => connections,
    });
    let reply: "refusal" | "negative" | "foreign" | "confirmed" = "refusal";
    const writes: unknown[] = [];
    await page.route(
      "**/api/capiro/settings.integrations.disconnectMicrosoft",
      async (route) => {
        writes.push(route.request().postDataJSON());
        if (reply === "refusal")
          return refuse(route, "Synthetic disconnect conflict");
        if (reply === "confirmed") connections = [];
        await route.fulfill({
          json: {
            disconnected: reply !== "negative",
            connectionId: reply === "foreign" ? otherId : connection.id,
            subscriptionsDeleted: 0,
          },
        });
      },
    );
    await openSettings(page, "integrations");
    await providerCard(page)
      .getByRole("button", { name: "Disconnect", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Disconnect Microsoft 365?",
      exact: true,
    });
    await dialog
      .getByRole("button", { name: "Disconnect", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Synthetic disconnect conflict",
    );
    reply = outcome;
    await dialog
      .getByRole("button", { name: "Disconnect", exact: true })
      .click();
    if (outcome !== "confirmed") {
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(
        "This change will not be submitted again.",
      );
      await expect(
        dialog.getByRole("button", { name: "Disconnect", exact: true }),
      ).toBeDisabled();
      await expect(
        page.getByText("Account was disconnected.", { exact: true }),
      ).toHaveCount(0);
      // A mismatched 200 is unknown. A still-connected readback cannot authorize replay.
      await dialog
        .getByRole("button", { name: "Check current result" })
        .click();
      await expect(
        dialog.getByRole("button", { name: "Disconnect", exact: true }),
      ).toBeDisabled();
      await page.reload();
      await expect(
        providerCard(page).getByRole("button", {
          name: "Disconnect",
          exact: true,
        }),
      ).toBeDisabled();
      await expect(
        page.getByRole("heading", {
          name: connection.displayName,
          exact: true,
        }),
      ).toBeVisible();
      expect(writes).toEqual([
        { params: { connectionId: connection.id } },
        { params: { connectionId: connection.id } },
      ]);
      return;
    }
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByText("Account was disconnected.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: connection.displayName, exact: true }),
    ).toHaveCount(0);
    expect(writes).toEqual([
      { params: { connectionId: connection.id } },
      { params: { connectionId: connection.id } },
    ]);
  });
