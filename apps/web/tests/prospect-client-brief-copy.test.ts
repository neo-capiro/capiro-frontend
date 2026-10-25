import { createHash } from "node:crypto";
import { canonicalWorkspaceSnapshot } from "@capiro/shared";
import { expect, it } from "vitest";
import {
  clientBriefCopyCommandSchema,
  clientBriefCopyReceiptSchema,
  workspaceClientBriefCopyOperations,
} from "../src/shared/capiro/operations/workspace-client-brief-copy";
import {
  clientBriefCopyDigest,
  clientBriefCopyRequest,
  prepareClientBriefCopy,
} from "../src/features/portfolio/prospects/brief/client-copy/command";
import { readClientBriefReview } from "../src/features/portfolio/prospects/brief/client-copy/review";
import {
  actor,
  fixture,
  id,
  receiptFor,
  review,
  savedBrief,
} from "./prospect-client-brief-copy-fixtures";
const signal = new AbortController().signal,
  guard = () => {};
const prepare = () =>
  prepareClientBriefCopy(actor, review, "  Synthetic private title  ", id(50));
it("canonicalizes only the reviewed title and binds the exact Clerk owner and full saved manifest with the public Workspace digest", async () => {
  const saved = await prepare();
  expect(saved.command.docTitle).toBe("Synthetic private title");
  expect(saved.command.source).toEqual(review.selection.source);
  expect(saved.payloadDigest).toBe(
    createHash("sha256")
      .update(
        canonicalWorkspaceSnapshot({
          operation: "copy_core_brief_to_client",
          tenantId: actor.tenantId,
          actorId: actor.ownerId,
          command: saved.command,
        }),
      )
      .digest("hex"),
  );
  expect(
    await clientBriefCopyDigest(
      { ...actor, ownerId: actor.userId },
      saved.command,
    ),
  ).not.toBe(saved.payloadDigest);
  expect(JSON.stringify(saved)).not.toContain(
    "Saved companyAndFirmImplication",
  );
});
it("registers only the finite Workspace routes and rejects path/body or source mismatch", async () => {
  const saved = await prepare(),
    operation =
      workspaceClientBriefCopyOperations["workspace.client-brief-copy.create"];
  expect(operation.service).toBe("workspace");
  expect(operation.path).toBe(
    "/prospects/:prospectId/clients/:clientId/brief-copies",
  );
  expect(
    operation.request.safeParse({
      params: { prospectId: id(3), clientId: id(99) },
      body: saved.command,
    }).success,
  ).toBe(false);
  expect(
    clientBriefCopyCommandSchema.safeParse({
      ...saved.command,
      source: { ...saved.command.source, prospectId: id(99) },
    }).success,
  ).toBe(false);
});
it.each([
  { schemaVersion: 2 },
  { expectedProspectUpdatedAt: "2026-10-25T01:00:00Z" },
  { docTitle: " padded " },
  { docTitle: " " },
  { docTitle: "x".repeat(501) },
  { requestId: "wrong" },
  { extra: true },
])("rejects a malformed or noncanonical command %#", async (change) => {
  const saved = await prepare();
  expect(
    clientBriefCopyCommandSchema.safeParse({ ...saved.command, ...change })
      .success,
  ).toBe(false);
});
it("reads the specifically selected historical version without silently switching to the current version", async () => {
  const historical = structuredClone(savedBrief.currentVersion!);
  historical.id = id(30);
  historical.versionNumber = 1;
  const selected = {
    ...review.selection,
    source: { ...review.selection.source, versionId: id(30), versionNumber: 1 },
  };
  const f = fixture({
    coreResponse: (path) =>
      path.endsWith("/versions/1") ? Response.json(historical) : undefined,
  });
  const result = await readClientBriefReview(
    f.api,
    { tenantId: actor.tenantId, prospectId: id(3) },
    id(4),
    selected,
    signal,
    guard,
  );
  expect(result.selection.source.versionId).toBe(id(30));
  expect(f.calls.some((call) => call.path.endsWith("/versions/1"))).toBe(true);
});
it.each(["hash", "source", "client", "timestamp"])(
  "holds a stale %s review before any write",
  async (change) => {
    const brief = structuredClone(savedBrief),
      current = structuredClone(review);
    if (change === "hash") brief.currentVersion!.sectionsHash = "c".repeat(64);
    if (change === "source") brief.brief!.id = id(90);
    if (change === "client") current.prospect.linkedClientId = id(90);
    if (change === "timestamp")
      current.prospect.updatedAt = "2026-10-25T01:00:00Z";
    const f = fixture({ brief, current });
    await expect(
      readClientBriefReview(
        f.api,
        { tenantId: actor.tenantId, prospectId: id(3) },
        id(4),
        review.selection,
        signal,
        guard,
      ),
    ).rejects.toThrow();
    expect(f.calls.every((call) => call.method === "GET")).toBe(true);
  },
);
it.each([
  "tenantId",
  "actorId",
  "prospectId",
  "clientId",
  "requestId",
  "payloadDigest",
])("refuses a response for a different %s", async (key) => {
  const saved = await prepare(),
    receipt = {
      ...receiptFor(saved),
      [key]:
        key === "actorId"
          ? actor.userId
          : key === "payloadDigest"
            ? "c".repeat(64)
            : id(90),
    };
  const f = fixture({ copy: () => receipt });
  await expect(
    clientBriefCopyRequest(f.workspace, actor, saved, false, signal, guard),
  ).rejects.toThrow("does not match");
});
it("rejects extra keys, invented refusal, missing availability and noncanonical receipt time", async () => {
  const receipt = receiptFor(await prepare());
  for (const change of [
    { extra: true },
    { status: "refused" },
    { available: undefined },
    { createdAt: "2026-10-25T01:00:00Z" },
  ])
    expect(
      clientBriefCopyReceiptSchema.safeParse({ ...receipt, ...change }).success,
    ).toBe(false);
});
