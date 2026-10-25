import { createHash } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import type { TransferCommand } from "../../src/features/portfolio/prospects/contact-transfer/contracts";
import {
  client,
  clientId,
  installFixtures,
  json,
  person,
  prospect,
  prospectId,
} from "./fixtures";

const tenantId = "90000000-0000-4000-8000-000000000001";
const actorUserId = "90000000-0000-4000-8000-000000000002";
const timestamp = "2026-10-25T01:00:00.123Z";
const currentPath = `**/business-development/prospects/${prospectId}`;
const contactsPath = `${currentPath}/contacts`;
const commandPath = `${contactsPath}/transfers`;
const receiptPath = `${commandPath}/*`;
const current = {
  ...prospect,
  linkedClientId: clientId,
  convertedAt: timestamp,
  updatedAt: timestamp,
};
const source = {
  id: "80000000-0000-4000-8000-000000000001",
  prospectId,
  requestId: "80000000-0000-4000-8000-000000000011",
  name: "Synthetic Create Contact",
  title: "Director",
  email: "create@example.test",
  phone: null,
  notes: "Synthetic reviewed note",
  version: 2,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const linked = {
  ...source,
  id: "80000000-0000-4000-8000-000000000002",
  requestId: "80000000-0000-4000-8000-000000000012",
  name: "Synthetic Exact Contact",
  email: "exact@example.test",
};
const skipped = {
  ...source,
  id: "80000000-0000-4000-8000-000000000003",
  requestId: "80000000-0000-4000-8000-000000000013",
  name: "Synthetic Skipped Contact",
  email: "skip@example.test",
};
const target = {
  ...person,
  name: linked.name,
  title: linked.title,
  email: linked.email,
  phone: linked.phone,
  notes: linked.notes,
  updatedAt: timestamp,
};

function receipt(
  command: TransferCommand,
  status: "completed" | "refused" = "completed",
) {
  return {
    schemaVersion: 1,
    tenantId,
    actorUserId,
    requestId: command.requestId,
    prospectId,
    clientId,
    payloadDigest: createHash("sha256")
      .update(
        JSON.stringify([
          "prospect-contact-transfer",
          1,
          tenantId,
          actorUserId,
          command,
        ]),
      )
      .digest("hex"),
    status,
    createdAt: timestamp,
    result:
      status === "completed"
        ? {
            items: command.items.map((item, index) => ({
              sourceId: item.sourceId,
              sourceVersion: item.expectedVersion,
              action: item.action,
              personId:
                item.action === "skip"
                  ? null
                  : item.action === "link"
                    ? item.personId
                    : `60000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
            })),
          }
        : null,
    refusal:
      status === "refused"
        ? {
            code: "PROSPECT_CONTACT_TRANSFER_REFUSED",
            message: "Synthetic transfer refused. Review current contacts.",
          }
        : null,
  };
}

async function setup(page: Page, baseURL: string | undefined) {
  if (!baseURL) throw new Error("Isolated fixture origin is required");
  const origin = new URL(baseURL).origin;
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
  const unexpected = await installFixtures(page);
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/") && request.method() !== "GET")
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await page.route("**/core/me", (route) =>
    json(route, {
      user: { id: actorUserId, email: "actor@example.test" },
      tenant: { id: tenantId, name: "Synthetic tenant" },
      role: "user_admin",
    }),
  );
  await page.route(currentPath, (route) => json(route, current));
  await page.route(contactsPath, (route) =>
    json(route, {
      prospectId,
      readOnly: true,
      contacts: [source, linked, skipped],
      nextCursor: null,
    }),
  );
  await page.route(`**/clients/${clientId}/people`, (route) =>
    json(route, [target]),
  );
  return { unexpected, errors, writes };
}

async function openReview(page: Page) {
  await page.goto(`/portfolio/prospects/${prospectId}`);
  await page
    .getByRole("button", { name: "Review contact carry-over", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Review contact carry-over",
    exact: true,
  });
  await expect(
    dialog.getByRole("combobox", {
      name: `Action for ${source.name}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Transfer reviewed contacts" }),
  ).toBeDisabled();
  return dialog;
}

async function selectCreate(page: Page) {
  const dialog = page.getByRole("dialog", {
    name: "Review contact carry-over",
    exact: true,
  });
  await dialog
    .getByRole("combobox", { name: `Action for ${source.name}`, exact: true })
    .selectOption("create");
  await dialog
    .getByRole("checkbox", { name: /I reviewed each selected/ })
    .check();
  await dialog
    .getByRole("button", { name: "Transfer reviewed contacts" })
    .click();
}

test("explicit create, exact link and skip survive lost ACK and reload; deleted sources do not hide the receipt", async ({
  page,
  baseURL,
}) => {
  const state = await setup(page, baseURL);
  const commands: TransferCommand[] = [];
  let reads = 0;
  await page.route(commandPath, async (route) => {
    const command = route.request().postDataJSON() as TransferCommand;
    commands.push(command);
    const fences = await page.evaluate(() =>
      Object.entries(localStorage).filter(([key]) =>
        key.startsWith("capiro-command-fence-v1:"),
      ),
    );
    expect(
      fences.some(
        ([, value]) => JSON.parse(value).requestId === command.requestId,
      ),
    ).toBe(true);
    expect(JSON.stringify(fences)).not.toContain(source.name);
    expect(JSON.stringify(fences)).not.toContain(source.email);
    const encrypted = await page.evaluate(async (expectedRequestId) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("capiro-command-recovery-v1", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise<boolean>((resolve, reject) => {
          const transaction = db.transaction("records", "readonly");
          const request = transaction.objectStore("records").getAll();
          transaction.oncomplete = () =>
            resolve(
              request.result.some(
                (row) =>
                  row.requestId === expectedRequestId &&
                  row.ciphertext instanceof ArrayBuffer &&
                  row.ciphertext.byteLength > 0 &&
                  row.key instanceof CryptoKey &&
                  !row.key.extractable &&
                  !Object.hasOwn(row, "data"),
              ),
            );
          transaction.onerror = () => reject(transaction.error);
        });
      } finally {
        db.close();
      }
    }, command.requestId);
    expect(encrypted).toBe(true);
    await route.abort("failed");
  });
  await page.route(receiptPath, (route) => {
    reads++;
    return json(route, receipt(commands[0]!));
  });
  const dialog = await openReview(page);
  await dialog
    .getByRole("combobox", { name: `Action for ${source.name}`, exact: true })
    .selectOption("create");
  await dialog
    .getByRole("combobox", { name: `Action for ${linked.name}`, exact: true })
    .selectOption(`link:${target.id}`);
  await dialog
    .getByRole("combobox", { name: `Action for ${skipped.name}`, exact: true })
    .selectOption("skip");
  expect(commands).toHaveLength(0);
  await dialog
    .getByRole("checkbox", { name: /I reviewed each selected/ })
    .check();
  await dialog
    .getByRole("button", { name: "Transfer reviewed contacts" })
    .click();
  await expect(
    page.getByRole("button", { name: "Check original transfer result" }),
  ).toBeEnabled();
  expect(commands).toHaveLength(1);
  expect(commands[0]?.items).toEqual([
    {
      sourceId: source.id,
      expectedVersion: 2,
      action: "create",
      createRequestId: expect.any(String),
    },
    {
      sourceId: linked.id,
      expectedVersion: 2,
      action: "link",
      personId: target.id,
      expectedUpdatedAt: timestamp,
    },
    { sourceId: skipped.id, expectedVersion: 2, action: "skip" },
  ]);
  await page.route(contactsPath, (route) =>
    json(route, { prospectId, readOnly: true, contacts: [], nextCursor: null }),
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Recover contact carry-over", exact: true })
    .click();
  const recovery = page.getByRole("dialog", {
    name: "Recover contact carry-over",
    exact: true,
  });
  expect(reads).toBe(0);
  await expect(recovery).toContainText(source.name);
  await recovery
    .getByRole("button", { name: "Check original transfer result" })
    .click();
  await expect(recovery.getByRole("status")).toContainText("completed");
  await recovery
    .getByRole("button", { name: "Acknowledge transfer result" })
    .click();
  await expect(recovery).not.toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Review contact carry-over",
      exact: true,
    }),
  ).toBeFocused();
  expect(reads).toBe(2);
  expect(state.writes).toEqual([
    `POST /api/backend/core/business-development/prospects/${prospectId}/contacts/transfers`,
  ]);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("refusal stays retained while verification fails, then explicit fresh review creates a new reviewed command", async ({
  page,
  baseURL,
}) => {
  const state = await setup(page, baseURL);
  const commands: TransferCommand[] = [];
  let receiptAvailable = false;
  let sourceVersion = 2;
  await page.route(contactsPath, (route) =>
    json(route, {
      prospectId,
      readOnly: true,
      contacts: [{ ...source, version: sourceVersion }],
      nextCursor: null,
    }),
  );
  await page.route(commandPath, (route) => {
    const command = route.request().postDataJSON() as TransferCommand;
    commands.push(command);
    return json(route, receipt(command, "refused"));
  });
  await page.route(receiptPath, (route) =>
    receiptAvailable
      ? json(route, receipt(commands[0]!, "refused"))
      : json(
          route,
          { message: "Synthetic receipt temporarily unavailable" },
          503,
        ),
  );
  await openReview(page);
  await selectCreate(page);
  const recovery = page.getByRole("dialog", {
    name: "Recover contact carry-over",
    exact: true,
  });
  await recovery
    .getByRole("button", { name: "Review a new transfer after refusal" })
    .click();
  await expect(recovery.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Recover contact carry-over", exact: true })
    .click();
  expect(commands).toHaveLength(1);
  receiptAvailable = true;
  sourceVersion = 3;
  await recovery
    .getByRole("button", { name: "Check original transfer result" })
    .click();
  await recovery
    .getByRole("button", { name: "Review a new transfer after refusal" })
    .click();
  await expect(recovery).not.toBeVisible();
  const fresh = page.getByRole("dialog", {
    name: "Review contact carry-over",
    exact: true,
  });
  await expect(fresh).toBeVisible();
  await expect(
    fresh.getByRole("combobox", {
      name: `Action for ${source.name}`,
      exact: true,
    }),
  ).toHaveValue("create");
  await expect(
    fresh.getByRole("checkbox", { name: /I reviewed each selected/ }),
  ).not.toBeChecked();
  expect(commands).toHaveLength(1);
  await fresh
    .getByRole("checkbox", { name: /I reviewed each selected/ })
    .check();
  await fresh
    .getByRole("button", { name: "Transfer reviewed contacts" })
    .click();
  await expect.poll(() => commands.length).toBe(2);
  expect(commands[1]?.requestId).not.toBe(commands[0]?.requestId);
  expect(commands[1]?.items[0]?.expectedVersion).toBe(3);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("a changed source version blocks dispatch and requires refreshing the review", async ({
  page,
  baseURL,
}) => {
  const state = await setup(page, baseURL);
  let posts = 0;
  await page.route(commandPath, (route) => {
    posts++;
    return json(route, { message: "Unexpected transfer" }, 500);
  });
  const dialog = await openReview(page);
  await page.route(contactsPath, (route) =>
    json(route, {
      prospectId,
      readOnly: true,
      contacts: [{ ...source, version: 3 }, linked, skipped],
      nextCursor: null,
    }),
  );
  await selectCreate(page);
  await expect(dialog.getByRole("alert")).toContainText(
    "selected source contact changed",
  );
  expect(posts).toBe(0);
  expect(state.writes).toEqual([]);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("a foreign receipt stays pending and explicit retry reuses the exact original command", async ({
  page,
  baseURL,
}) => {
  const state = await setup(page, baseURL);
  const commands: TransferCommand[] = [];
  await page.route(commandPath, async (route) => {
    const command = route.request().postDataJSON() as TransferCommand;
    commands.push(command);
    if (commands.length === 1) await route.abort("failed");
    else await json(route, receipt(command));
  });
  await page.route(receiptPath, (route) =>
    json(route, { ...receipt(commands[0]!), actorUserId: tenantId }),
  );
  await openReview(page);
  await selectCreate(page);
  await expect(
    page.getByRole("button", { name: "Check original transfer result" }),
  ).toBeEnabled();
  await page.reload();
  await page
    .getByRole("button", { name: "Recover contact carry-over", exact: true })
    .click();
  const recovery = page.getByRole("dialog", {
    name: "Recover contact carry-over",
    exact: true,
  });
  await recovery
    .getByRole("button", { name: "Check original transfer result" })
    .click();
  await expect(recovery.getByRole("alert")).toContainText("does not match");
  await expect(
    recovery.getByRole("button", { name: "Acknowledge transfer result" }),
  ).toHaveCount(0);
  expect(commands).toHaveLength(1);
  await recovery
    .getByRole("button", { name: "Retry the same reviewed transfer" })
    .click();
  await expect(recovery.getByRole("status")).toContainText("completed");
  expect(commands).toHaveLength(2);
  expect(commands[1]).toEqual(commands[0]);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("relinking the prospect hides the old client's retained details and holds new transfers", async ({
  page,
  baseURL,
}) => {
  const state = await setup(page, baseURL);
  let posts = 0;
  await page.route(commandPath, (route) => {
    posts++;
    return route.abort("failed");
  });
  await openReview(page);
  await selectCreate(page);
  await expect(
    page.getByRole("button", { name: "Check original transfer result" }),
  ).toBeEnabled();
  const newClientId = "10000000-0000-4000-8000-000000000099";
  await page.route(currentPath, (route) =>
    json(route, { ...current, linkedClientId: newClientId }),
  );
  await page.route(`**/clients/${newClientId}`, (route) =>
    json(route, {
      ...client,
      id: newClientId,
      name: "Synthetic new linked client",
    }),
  );
  await page.route(`**/clients/${newClientId}/people`, (route) =>
    json(route, []),
  );
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Recover contact carry-over",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      /original contact transfer is held for a different account or linked client/i,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", {
      name: "Recover contact carry-over",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByText(`Original transfer to ${client.name}`),
  ).toHaveCount(0);
  expect(posts).toBe(1);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});

for (const phase of ["unsent", "retained", "fresh"] as const) {
  test(`current client denial hides ${phase} contact details and allows explicit recovery`, async ({
    page,
    baseURL,
  }) => {
    const state = await setup(page, baseURL);
    const commands: TransferCommand[] = [];
    const pending = phase === "retained";
    let sourceVersion = 2;
    await page.route(contactsPath, (route) =>
      json(route, {
        prospectId,
        readOnly: true,
        contacts: [{ ...source, version: sourceVersion }],
        nextCursor: null,
      }),
    );
    await page.route(commandPath, (route) => {
      const command = route.request().postDataJSON() as TransferCommand;
      commands.push(command);
      return phase === "fresh"
        ? json(route, receipt(command, "refused"))
        : route.abort("failed");
    });
    await page.route(receiptPath, (route) =>
      json(
        route,
        receipt(commands[0]!, phase === "fresh" ? "refused" : "completed"),
      ),
    );
    let dialog = await openReview(page);
    if (phase !== "unsent") {
      await selectCreate(page);
      dialog = page.getByRole("dialog", {
        name: "Recover contact carry-over",
        exact: true,
      });
      if (pending)
        await expect(
          dialog.getByRole("button", {
            name: "Check original transfer result",
          }),
        ).toBeEnabled();
      await expect(dialog).toContainText(source.name);
      if (phase === "fresh") {
        sourceVersion = 3;
        await dialog
          .getByRole("button", { name: "Review a new transfer after refusal" })
          .click();
        dialog = page.getByRole("dialog", {
          name: "Review contact carry-over",
          exact: true,
        });
        await expect(
          dialog.getByRole("region", {
            name: "Changes since the refused transfer",
          }),
        ).toContainText(source.name);
      }
    }
    await page.route(`**/clients/${clientId}`, (route) =>
      json(route, { message: "Synthetic client access revoked" }, 403),
    );
    if (pending)
      await dialog
        .getByRole("button", { name: "Check original transfer result" })
        .click();
    else await selectCreate(page);
    await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
    await expect(page.getByRole("dialog")).not.toContainText(source.name);
    await expect(
      page
        .getByRole("dialog")
        .getByRole("button", { name: "Transfer reviewed contacts" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Changes since the refused transfer" }),
    ).toHaveCount(0);
    expect(commands).toHaveLength(phase === "unsent" ? 0 : 1);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await page.route(`**/clients/${clientId}`, (route) => json(route, client));
    await page
      .getByRole("button", { name: "Retry contact recovery", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: pending
          ? "Recover contact carry-over"
          : "Review contact carry-over",
        exact: true,
      })
      .click();
    if (pending) {
      const restored = page.getByRole("dialog", {
        name: "Recover contact carry-over",
        exact: true,
      });
      await expect(restored).toContainText(source.name);
      await restored
        .getByRole("button", { name: "Check original transfer result" })
        .click();
      await expect(restored.getByRole("status")).toContainText("completed");
    }
    expect(commands).toHaveLength(phase === "unsent" ? 0 : 1);
    expect(state.unexpected).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}

test("late owner 404 hides contact details and retains the exact command for restored GET recovery", async ({
  page,
  baseURL,
}) => {
  const state = await setup(page, baseURL);
  const commands: TransferCommand[] = [];
  let denied = false;
  let reads = 0;
  await page.route(`**/clients/${clientId}`, (route) =>
    denied
      ? json(route, { message: "Synthetic client unavailable" }, 404)
      : json(route, client),
  );
  await page.route(commandPath, (route) => {
    commands.push(route.request().postDataJSON() as TransferCommand);
    // The current-access reads already succeeded. The owner now denies this
    // dispatched command using its canonical non-disclosing status.
    denied = true;
    return json(route, { message: "Synthetic client unavailable" }, 404);
  });
  await page.route(receiptPath, (route) => {
    reads++;
    expect(route.request().url()).toContain(commands[0]!.requestId);
    return json(route, receipt(commands[0]!));
  });
  await openReview(page);
  await selectCreate(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog).not.toContainText(source.name);
  await expect(dialog).not.toContainText(client.name);
  await expect(
    dialog.getByRole("button", { name: "Check original transfer result" }),
  ).toHaveCount(0);
  expect(commands).toHaveLength(1);
  expect(reads).toBe(0);
  const original = structuredClone(commands[0]!);
  const encrypted = await page.evaluate(async (requestId) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("capiro-command-recovery-v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction("records", "readonly");
        const request = transaction.objectStore("records").getAll();
        transaction.oncomplete = () =>
          resolve(
            request.result.some(
              (row) =>
                row.requestId === requestId &&
                row.ciphertext instanceof ArrayBuffer &&
                row.ciphertext.byteLength > 0 &&
                row.key instanceof CryptoKey &&
                !row.key.extractable &&
                !Object.hasOwn(row, "data"),
            ),
          );
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      db.close();
    }
  }, original.requestId);
  expect(encrypted).toBe(true);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  denied = false;
  await page
    .getByRole("button", { name: "Retry contact recovery", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Recover contact carry-over", exact: true })
    .click();
  const restored = page.getByRole("dialog", {
    name: "Recover contact carry-over",
    exact: true,
  });
  await expect(restored).toContainText(source.name);
  expect(commands).toEqual([original]);
  expect(reads).toBe(0);
  await restored
    .getByRole("button", { name: "Check original transfer result" })
    .click();
  await expect(restored.getByRole("status")).toContainText("completed");
  expect(reads).toBe(1);
  expect(commands).toEqual([original]);
  expect(state.unexpected).toEqual([]);
  expect(state.errors).toEqual([]);
});
