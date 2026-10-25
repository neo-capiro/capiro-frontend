import { createHash } from "node:crypto";
import { canonicalWorkspaceSnapshot } from "@capiro/shared";
import { test, expect, type Page, type Route } from "@playwright/test";
import type { ClientBriefCopyCommand } from "../../src/shared/capiro/operations/workspace-client-brief-copy";
import { testIdentity } from "../../test/browser/fixtures";
import {
  client,
  clientId,
  installFixtures,
  json,
  prospect,
  prospectId,
} from "./fixtures";
import { briefVersion, savedBrief } from "./acceptance-prospect-brief-fixtures";

const tenantId = "90000000-0000-4000-8000-000000000001";
const userId = "90000000-0000-4000-8000-000000000002";
const actorId = "user_synthetic_PrivateBriefOwner";
const timestamp = "2026-10-25T01:00:00.123Z";
const title = "Synthetic private client strategy";
const sourceTitle = "Synthetic saved Core strategy";
const briefId = "80000000-0000-4000-8000-000000000010";
const draftId = "80000000-0000-4000-8000-000000000020";
const contextItemId = "80000000-0000-4000-8000-000000000021";
const currentPath = `**/business-development/prospects/${prospectId}`;
const briefPath = `${currentPath}/brief`;
const createOperation = "workspace.client-brief-copy.create";
const receiptOperation = "workspace.client-brief-copy.receipt";
const identity = {
  ...testIdentity,
  user: { ...testIdentity.user, id: userId, clerkUserId: actorId },
  tenant: { ...testIdentity.tenant, id: tenantId },
};
const current = {
  ...prospect,
  linkedClientId: clientId,
  convertedAt: timestamp,
  updatedAt: timestamp,
};
const version = (number: number) => ({
  ...briefVersion(number),
  id: `80000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
  sectionsHash: (number === 1 ? "a" : "b").repeat(64),
  snapshotHash: (number === 1 ? "c" : "d").repeat(64),
});
const saved = () => {
  const result = savedBrief(version(2));
  return {
    ...result,
    brief: { ...result.brief!, id: briefId, tenantId, title: sourceTitle },
  };
};
const digest = (command: ClientBriefCopyCommand) =>
  createHash("sha256")
    .update(
      canonicalWorkspaceSnapshot({
        operation: "copy_core_brief_to_client",
        tenantId,
        actorId,
        command,
      }),
    )
    .digest("hex");
const receipt = (command: ClientBriefCopyCommand, available = true) => ({
  schemaVersion: 1,
  operation: "copy_core_brief_to_client",
  status: "completed",
  tenantId,
  actorId,
  prospectId,
  clientId,
  requestId: command.requestId,
  payloadDigest: digest(command),
  draftId,
  contextItemId,
  createdAt: timestamp,
  available,
});

type Handler = (
  route: Route,
  input: { params: Record<string, string>; body?: ClientBriefCopyCommand },
) => Promise<void>;
async function setup(page: Page, baseURL: string | undefined) {
  if (!baseURL) throw new Error("An isolated fixture origin is required");
  const origin = new URL(baseURL).origin;
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
  const unexpected = await installFixtures(page),
    errors: string[] = [],
    writes: string[] = [];
  const operations: { key: string; input: unknown }[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/api/") && request.method() !== "GET")
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await page.route("**/core/me", (route) => json(route, identity));
  await page.route(currentPath, (route) => json(route, current));
  await page.route(briefPath, (route) => json(route, saved()));
  await page.route(`${briefPath}/versions`, (route) =>
    json(route, { brief: saved().brief, versions: [version(2), version(1)] }),
  );
  await page.route(`${briefPath}/versions/*`, (route) =>
    json(
      route,
      version(
        Number(new URL(route.request().url()).pathname.split("/").at(-1)),
      ),
    ),
  );
  let create: Handler = (route) =>
    json(route, { message: "Unexpected copy" }, 500);
  let read: Handler = (route) =>
    json(route, { message: "No saved receipt" }, 404);
  await page.route("**/api/capiro/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      key = decodeURIComponent(url.pathname.split("/").at(-1)!);
    const input =
      request.method() === "GET"
        ? JSON.parse(url.searchParams.get("input") ?? "{}")
        : request.postDataJSON();
    operations.push({ key, input });
    if (key === "me.read") return json(route, identity);
    if (key === createOperation) return create(route, input);
    if (key === receiptOperation) return read(route, input);
    unexpected.push(`${request.method()} ${key}`);
    return json(route, { message: "Unconfigured synthetic operation" }, 500);
  });
  return {
    unexpected,
    errors,
    writes,
    operations,
    onCreate(handler: Handler) {
      create = handler;
    },
    onRead(handler: Handler) {
      read = handler;
    },
    assertClean() {
      expect(unexpected).toEqual([]);
      expect(errors).toEqual([]);
      expect(
        writes.every(
          (value) => value === `POST /api/capiro/${createOperation}`,
        ),
      ).toBe(true);
    },
  };
}
async function openReview(page: Page, historical = false) {
  await page.goto(`/portfolio/prospects/${prospectId}`);
  await page.getByRole("button", { name: "Open brief", exact: true }).click();
  const viewer = page.getByRole("dialog", { name: sourceTitle, exact: true });
  if (historical) {
    await viewer
      .getByRole("button", { name: "Version history", exact: true })
      .click();
    await viewer.getByRole("button", { name: /^Version 1 ·/ }).click();
    await expect(
      viewer.getByRole("article", {
        name: "Saved brief version 1",
        exact: true,
      }),
    ).toBeVisible();
  }
  await viewer
    .getByRole("button", {
      name: "Copy saved version to private client draft",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Review private client brief copy",
    exact: true,
  });
  await expect(
    dialog.getByLabel("New private draft title", { exact: true }),
  ).toBeVisible();
  await expect(dialog).toContainText(client.name);
  await expect(dialog).toContainText(`version ${historical ? 1 : 2}`);
  await dialog
    .getByLabel("New private draft title", { exact: true })
    .fill(title);
  await expect(
    dialog.getByRole("checkbox", { name: /I reviewed this saved source/ }),
  ).not.toBeChecked();
  await expect(
    dialog.getByRole("button", {
      name: "Create reviewed private client draft",
    }),
  ).toBeDisabled();
  return dialog;
}
async function submit(page: Page) {
  const dialog = page.getByRole("dialog", {
    name: "Review private client brief copy",
    exact: true,
  });
  await dialog
    .getByRole("checkbox", { name: /I reviewed this saved source/ })
    .check();
  await dialog
    .getByRole("button", {
      name: "Create reviewed private client draft",
      exact: true,
    })
    .click();
}
const recoveryDialog = (page: Page) =>
  page.getByRole("dialog", {
    name: "Recover private client brief copy",
    exact: true,
  });
async function openRecovery(page: Page) {
  await page
    .getByRole("button", {
      name: "Recover private client brief copy",
      exact: true,
    })
    .click();
  await expect(
    recoveryDialog(page).getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  return recoveryDialog(page);
}
async function assertEncrypted(page: Page, command: ClientBriefCopyCommand) {
  const scope = JSON.stringify([
    "prospect-client-brief-copy",
    tenantId,
    userId,
    actorId,
    prospectId,
  ]);
  const proof = await page.evaluate(
    async ({
      scope,
      command,
      title,
      sourceTitle,
      clientName,
      payloadDigest,
    }) => {
      const fence = localStorage.getItem(`capiro-command-fence-v1:${scope}`);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("capiro-command-recovery-v1", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const row = await new Promise<{
          requestId: string;
          key: CryptoKey;
          iv: Uint8Array;
          ciphertext: ArrayBuffer;
          data?: unknown;
        }>((resolve, reject) => {
          const tx = db.transaction("records", "readonly"),
            request = tx.objectStore("records").get(scope);
          tx.oncomplete = () => resolve(request.result);
          tx.onerror = () => reject(tx.error);
        });
        const encrypted =
          row?.ciphertext instanceof ArrayBuffer &&
          row.ciphertext.byteLength > 0 &&
          row.key instanceof CryptoKey &&
          !row.key.extractable &&
          !Object.hasOwn(row, "data");
        const clear = await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: new Uint8Array(row.iv),
            additionalData: new TextEncoder().encode(scope),
          },
          row.key,
          row.ciphertext,
        );
        const restored = JSON.parse(new TextDecoder().decode(clear));
        return {
          encrypted,
          fenced: !!fence && JSON.parse(fence).requestId === command.requestId,
          privateFence:
            !!fence &&
            ![title, sourceTitle, clientName].some((value) =>
              fence.includes(value),
            ),
          exact:
            restored.state === "pending" &&
            restored.requestId === command.requestId &&
            JSON.stringify(restored.data.command) === JSON.stringify(command) &&
            restored.data.payloadDigest === payloadDigest,
        };
      } finally {
        db.close();
      }
    },
    {
      scope,
      command,
      title,
      sourceTitle,
      clientName: client.name,
      payloadDigest: digest(command),
    },
  );
  expect(proof).toEqual({
    encrypted: true,
    fenced: true,
    privateFence: true,
    exact: true,
  });
}

test("explicit historical source, client and title are encrypted before POST; completed draft opens independently", async ({
  page,
  baseURL,
}) => {
  const state = await setup(page, baseURL),
    commands: ClientBriefCopyCommand[] = [];
  state.onCreate(async (route, input) => {
    const command = input.body!;
    commands.push(command);
    expect(input.params).toEqual({ prospectId, clientId });
    await assertEncrypted(page, command);
    await json(route, receipt(command));
  });
  const dialog = await openReview(page, true);
  await dialog
    .getByRole("checkbox", { name: /I reviewed this saved source/ })
    .check();
  await dialog
    .getByLabel("New private draft title", { exact: true })
    .fill(` ${title} `);
  await expect(
    dialog.getByRole("checkbox", { name: /I reviewed this saved source/ }),
  ).not.toBeChecked();
  expect(commands).toHaveLength(0);
  await submit(page);
  const result = recoveryDialog(page);
  await expect(result.getByRole("status")).toContainText("confirmed");
  expect(commands).toHaveLength(1);
  expect(commands[0]).toEqual({
    schemaVersion: 1,
    requestId: expect.any(String),
    prospectId,
    clientId,
    expectedProspectUpdatedAt: timestamp,
    docTitle: title,
    source: {
      kind: "core_prospect_brief_version",
      prospectId,
      briefId,
      versionId: version(1).id,
      versionNumber: 1,
      sectionsHash: version(1).sectionsHash,
      snapshotHash: version(1).snapshotHash,
    },
  });
  await expect(
    result.getByRole("link", {
      name: "Open private client draft",
      exact: true,
    }),
  ).toHaveAttribute("href", `/modules/workspace?draftId=${draftId}`);
  expect(
    state.operations.filter((value) => value.key === receiptOperation),
  ).toEqual([]);
  state.assertClean();
});

test("lost ACK and reload recover the original command after saved source removal and timestamp change", async ({
  page,
  baseURL,
}) => {
  const state = await setup(page, baseURL),
    commands: ClientBriefCopyCommand[] = [];
  state.onCreate(async (route, input) => {
    commands.push(input.body!);
    await assertEncrypted(page, input.body!);
    await route.abort("failed");
  });
  state.onRead((route, input) => {
    expect(input.params).toEqual({
      prospectId,
      clientId,
      requestId: commands[0]!.requestId,
    });
    return json(route, receipt(commands[0]!));
  });
  await openReview(page);
  await submit(page);
  await expect(
    recoveryDialog(page).getByRole("button", {
      name: "Check original copy result",
    }),
  ).toBeEnabled();
  await page.route(briefPath, (route) =>
    json(route, { message: "Saved source removed" }, 404),
  );
  await page.route(`${briefPath}/versions/*`, (route) =>
    json(route, { message: "Saved source removed" }, 404),
  );
  await page.route(currentPath, (route) =>
    json(route, { ...current, updatedAt: "2026-10-25T02:00:00.987Z" }),
  );
  await page.reload();
  const recovered = await openRecovery(page);
  expect(
    state.operations.filter((value) => value.key === receiptOperation),
  ).toHaveLength(0);
  await recovered
    .getByRole("button", { name: "Check original copy result" })
    .click();
  await expect(recovered.getByRole("status")).toContainText("confirmed");
  await assertEncrypted(page, commands[0]!);
  await recovered
    .getByRole("button", { name: "Acknowledge copy result" })
    .click();
  await expect(recovered).not.toBeVisible();
  expect(
    state.operations.filter((value) => value.key === receiptOperation),
  ).toHaveLength(2);
  expect(commands).toHaveLength(1);
  state.assertClean();
});

test("completed deleted draft stays historical, suppresses retry POST and never offers Open or recreation", async ({
  page,
  baseURL,
}) => {
  const state = await setup(page, baseURL),
    commands: ClientBriefCopyCommand[] = [];
  state.onCreate((route, input) => {
    commands.push(input.body!);
    return route.abort("failed");
  });
  state.onRead((route) => json(route, receipt(commands[0]!, false)));
  await openReview(page);
  await submit(page);
  const dialog = recoveryDialog(page);
  await dialog
    .getByRole("button", { name: "Retry the same reviewed copy" })
    .click();
  await expect(dialog.getByRole("status")).toContainText("copy completed");
  await expect(dialog.getByRole("status")).toContainText("will not recreate");
  await expect(
    dialog.getByRole("link", { name: "Open private client draft" }),
  ).toHaveCount(0);
  await page.reload();
  const restored = await openRecovery(page);
  await restored
    .getByRole("button", { name: "Check original copy result" })
    .click();
  await restored
    .getByRole("button", { name: "Acknowledge copy result" })
    .click();
  await expect(restored).not.toBeVisible();
  expect(commands).toHaveLength(1);
  expect(
    state.operations.filter((value) => value.key === receiptOperation),
  ).toHaveLength(3);
  state.assertClean();
});

test("foreign receipt remains held; GET404 allows only an identical explicit retry", async ({
  page,
  baseURL,
}) => {
  const state = await setup(page, baseURL),
    commands: ClientBriefCopyCommand[] = [],
    events: string[] = [];
  let missing = false;
  state.onCreate((route, input) => {
    commands.push(input.body!);
    events.push("POST");
    return json(
      route,
      commands.length === 1
        ? { ...receipt(input.body!), actorId: "user_foreign" }
        : receipt(input.body!),
    );
  });
  state.onRead((route) => {
    events.push("GET");
    return missing
      ? json(route, { message: "No saved receipt" }, 404)
      : json(route, { ...receipt(commands[0]!), actorId: "user_foreign" });
  });
  await openReview(page);
  await submit(page);
  const dialog = recoveryDialog(page);
  await expect(dialog.getByRole("alert")).toContainText("does not match");
  await dialog
    .getByRole("button", { name: "Retry the same reviewed copy" })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("does not match");
  expect(events).toEqual(["POST", "GET"]);
  await expect(
    dialog.getByRole("button", { name: "Acknowledge copy result" }),
  ).toHaveCount(0);
  await assertEncrypted(page, commands[0]!);
  missing = true;
  await dialog
    .getByRole("button", { name: "Retry the same reviewed copy" })
    .click();
  await expect(dialog.getByRole("status")).toContainText("confirmed");
  expect(events).toEqual(["POST", "GET", "GET", "POST"]);
  expect(commands[1]).toEqual(commands[0]);
  state.assertClean();
});

for (const phase of ["unsent", "retained"] as const)
  test(`current client403 hides ${phase} private details and preserves held recovery`, async ({
    page,
    baseURL,
  }) => {
    const state = await setup(page, baseURL),
      commands: ClientBriefCopyCommand[] = [];
    state.onCreate((route, input) => {
      commands.push(input.body!);
      return route.abort("failed");
    });
    state.onRead((route) => json(route, receipt(commands[0]!)));
    await openReview(page);
    if (phase === "retained") {
      await submit(page);
      await expect(
        recoveryDialog(page).getByRole("button", {
          name: "Check original copy result",
        }),
      ).toBeEnabled();
    }
    await page.route(`**/clients/${clientId}`, (route) =>
      json(route, { message: "Synthetic client access revoked" }, 403),
    );
    if (phase === "retained")
      await recoveryDialog(page)
        .getByRole("button", { name: "Check original copy result" })
        .click();
    else await submit(page);
    const blocked = page.getByRole("dialog");
    await expect(blocked.getByRole("alert")).toContainText("access revoked");
    await expect(blocked).not.toContainText(sourceTitle);
    await expect(blocked).not.toContainText(client.name);
    await expect(
      blocked.getByRole("heading", { name: title, exact: true }),
    ).toHaveCount(0);
    await expect(
      blocked.getByLabel("New private draft title", { exact: true }),
    ).toHaveCount(0);
    expect(commands).toHaveLength(phase === "retained" ? 1 : 0);
    if (phase === "retained") await assertEncrypted(page, commands[0]!);
    await blocked.getByRole("button", { name: "Close", exact: true }).click();
    await page.route(`**/clients/${clientId}`, (route) => json(route, client));
    await page
      .getByRole("button", { name: "Retry brief-copy recovery", exact: true })
      .click();
    if (phase === "retained") {
      const restored = await openRecovery(page);
      await restored
        .getByRole("button", { name: "Check original copy result" })
        .click();
      await expect(restored.getByRole("status")).toContainText("confirmed");
      expect(commands).toHaveLength(1);
    } else {
      await expect(
        page.getByRole("button", {
          name: "Retry brief-copy recovery",
          exact: true,
        }),
      ).toHaveCount(0);
      expect(commands).toHaveLength(0);
    }
    state.assertClean();
  });

test("late Workspace POST404 hides pending details and retains the exact original for GET recovery", async ({
  page,
  baseURL,
}) => {
  const state = await setup(page, baseURL),
    commands: ClientBriefCopyCommand[] = [];
  let available = false;
  state.onCreate(async (route, input) => {
    commands.push(input.body!);
    await assertEncrypted(page, input.body!);
    await json(
      route,
      { message: "Synthetic Workspace access unavailable" },
      404,
    );
  });
  state.onRead((route, input) => {
    expect(input.params).toEqual({
      prospectId,
      clientId,
      requestId: commands[0]!.requestId,
    });
    return available
      ? json(route, receipt(commands[0]!))
      : json(route, { message: "Synthetic Workspace access unavailable" }, 404);
  });
  await openReview(page);
  await submit(page);
  const blocked = page.getByRole("dialog");
  await expect(blocked.getByRole("alert")).toContainText(
    "Workspace access unavailable",
  );
  await expect(blocked).not.toContainText(sourceTitle);
  await expect(blocked).not.toContainText(client.name);
  await expect(
    blocked.getByRole("heading", { name: title, exact: true }),
  ).toHaveCount(0);
  await expect(
    blocked.getByLabel("New private draft title", { exact: true }),
  ).toHaveCount(0);
  await expect(
    blocked.getByRole("button", { name: "Acknowledge copy result" }),
  ).toHaveCount(0);
  expect(commands).toHaveLength(1);
  await assertEncrypted(page, commands[0]!);
  expect(
    state.operations.filter((value) => value.key === receiptOperation),
  ).toHaveLength(0);
  await blocked.getByRole("button", { name: "Close", exact: true }).click();
  available = true;
  await page
    .getByRole("button", { name: "Retry brief-copy recovery", exact: true })
    .click();
  const restored = await openRecovery(page);
  expect(commands).toHaveLength(1);
  await restored
    .getByRole("button", { name: "Check original copy result" })
    .click();
  await expect(restored.getByRole("status")).toContainText("confirmed");
  await assertEncrypted(page, commands[0]!);
  expect(
    state.operations.filter((value) => value.key === receiptOperation),
  ).toHaveLength(1);
  expect(commands).toHaveLength(1);
  state.assertClean();
});

test("initial503 remains retained through reload and GET404 before the same reviewed request is retried", async ({
  page,
  baseURL,
}) => {
  const state = await setup(page, baseURL),
    commands: ClientBriefCopyCommand[] = [],
    events: string[] = [];
  state.onCreate((route, input) => {
    commands.push(input.body!);
    events.push("POST");
    return commands.length === 1
      ? json(
          route,
          { message: "The saved brief copy has not been confirmed" },
          503,
        )
      : json(route, receipt(input.body!));
  });
  state.onRead((route) => {
    events.push("GET");
    return json(route, { message: "No saved receipt" }, 404);
  });
  await openReview(page);
  await submit(page);
  await expect(recoveryDialog(page).getByRole("alert")).toContainText(
    "has not been confirmed",
  );
  await assertEncrypted(page, commands[0]!);
  await page.reload();
  const dialog = await openRecovery(page);
  await dialog
    .getByRole("button", { name: "Check original copy result" })
    .click();
  const blocked = page.getByRole("dialog");
  await expect(blocked.getByRole("alert")).toContainText("No saved receipt");
  await expect(blocked).not.toContainText(sourceTitle);
  await assertEncrypted(page, commands[0]!);
  expect(commands).toHaveLength(1);
  await blocked.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: "Retry brief-copy recovery", exact: true })
    .click();
  const restored = await openRecovery(page);
  await restored
    .getByRole("button", { name: "Retry the same reviewed copy" })
    .click();
  await expect(restored.getByRole("status")).toContainText("confirmed");
  expect(commands[1]).toEqual(commands[0]);
  expect(events).toEqual(["POST", "GET", "GET", "POST"]);
  state.assertClean();
});
