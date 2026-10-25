import { createHash } from "node:crypto";
import { expect, type Page, type Route } from "@playwright/test";
import { client, clientId, json } from "./fixtures";
import {
  installDocumentFixtures,
  nativeFile,
} from "./capability-documents-fixtures";
import type { FileDeletionCommand } from "../../src/features/portfolio/files/deletion-contract";
export const actor = {
  userId: "90000000-0000-4000-8000-000000000002",
  tenantId: "90000000-0000-4000-8000-000000000001",
};
export const file = {
  ...nativeFile,
  metadataRevision: 3,
  uploadedByUserId: actor.userId,
};
const timestamp = "2026-10-25T01:00:00.123Z";
export function receipt(
  command: FileDeletionCommand,
  status: "pending" | "completed" = "completed",
) {
  return {
    schemaVersion: 1,
    operation: "delete_client_file",
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    requestId: command.requestId,
    clientId,
    attachmentId: file.id,
    expectedRevision: 3,
    payloadDigest: createHash("sha256")
      .update(
        JSON.stringify([
          "client-file-delete",
          1,
          actor.tenantId,
          actor.userId,
          command,
        ]),
      )
      .digest("hex"),
    status,
    createdAt: timestamp,
    completedAt: status === "completed" ? timestamp : null,
    result:
      status === "completed"
        ? {
            attachmentId: file.id,
            objectAbsent: true,
            indexedChunksAbsent: true,
          }
        : null,
  };
}
export async function setup(page: Page, baseURL: string | undefined) {
  if (!baseURL) throw new Error("Isolated origin required");
  const origin = new URL(baseURL).origin;
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
  const unexpected = await installDocumentFixtures(page),
    errors: string[] = [],
    deletes: FileDeletionCommand[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = {
    files: [file],
    saved: undefined as FileDeletionCommand | undefined,
  };
  await page.route("**/core/me", (route) =>
    json(route, {
      user: { id: actor.userId, email: null },
      tenant: { id: actor.tenantId, name: "Synthetic tenant" },
      role: "standard_user",
    }),
  );
  await page.route(
    "**/core/clients/10000000-0000-4000-8000-000000000002",
    (route) =>
      json(route, { ...client, id: "10000000-0000-4000-8000-000000000002" }),
  );
  await page.route("**/core/engagement/attachments?**", (route) =>
    json(route, state.files),
  );
  let remove: (route: Route, command: FileDeletionCommand) => Promise<void> = (
    route,
  ) => json(route, { message: "Synthetic lost acknowledgement" }, 503);
  let read: (route: Route) => Promise<void> = (route) =>
    json(route, { message: "Receipt unavailable" }, 404);
  await page.route(`**/engagement/attachments/${file.id}`, (route) => {
    const body = route.request().postDataJSON();
    expect(Object.keys(body)).toEqual([
      "schemaVersion",
      "requestId",
      "clientId",
      "expectedRevision",
    ]);
    const command = { ...body, attachmentId: file.id };
    deletes.push(command);
    state.saved = command;
    return remove(route, command);
  });
  await page.route("**/engagement/attachments/deletions/*", (route) =>
    read(route),
  );
  return {
    state,
    deletes,
    unexpected,
    errors,
    onDelete: (handler: typeof remove) => {
      remove = handler;
    },
    onRead: (handler: typeof read) => {
      read = handler;
    },
    clean: () => {
      expect(unexpected).toEqual([]);
      expect(errors).toEqual([]);
    },
  };
}
export async function openDelete(page: Page) {
  await page
    .getByRole("button", { name: `Actions for ${file.fileName}` })
    .click();
  await page
    .getByRole("menuitem", { name: "Delete file", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Delete file", exact: true });
  await expect(
    dialog.getByRole("button", { name: "Confirm delete" }),
  ).toBeEnabled();
  return dialog;
}
export const dialog = (page: Page) =>
  page.getByRole("dialog", { name: "Delete file", exact: true });
export async function recover(page: Page) {
  await page
    .getByRole("button", { name: "Recover saved file deletion" })
    .click();
  return dialog(page);
}
export const goto = (page: Page) =>
  page.goto("/capability-documents.html?files");
export async function holdDeletionReceipt(
  page: Page,
  body: unknown,
  status: number,
) {
  let release!: () => void, received!: () => void, finished!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    received = resolve;
  });
  const settled = new Promise<void>((resolve) => {
    finished = resolve;
  });
  await page.route("**/engagement/attachments/deletions/*", async (route) => {
    received();
    await gate;
    await json(route, body, status).catch(() => undefined);
    finished();
  });
  return { release, started, settled };
}
