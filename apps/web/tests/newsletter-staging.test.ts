import { expect, it } from "vitest";
import {
  draft,
  revision,
  sessionId,
  receipt,
} from "./newsletter-staging-fixtures";
import {
  newsletterStagingOperations,
  newsletterStagingReceipt,
} from "../src/shared/capiro/operations/workspace-newsletter-staging";
import {
  requireCompatibleSponsor,
  verifyStagingReceipt,
} from "../src/features/modules/workspace/newsletter/staging-model";
const body = {
  requestId: "b0000000-0000-4000-8000-000000000001",
  draftId: draft.id,
  versionId: revision.versionId,
  snapshotHash: revision.snapshotHash,
  expectedStateVersion: 3,
};
it("pins selected revision to Workspace and fixed literal staging to Core", () => {
  expect(
    newsletterStagingOperations["workspace.newsletter.revision"],
  ).toMatchObject({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/versions/:versionId/outreach-revision",
  });
  expect(
    newsletterStagingOperations["workspace.newsletter.stage"],
  ).toMatchObject({
    service: "core",
    method: "POST",
    path: "/engagement/outreach-v3/sessions/:sessionId/newsletter-staging",
  });
});
it.each(["content", "commands", "actor", "tenant", "sender", "sendIntent"])(
  "rejects caller %s from the staging request",
  (field) => {
    const operation = newsletterStagingOperations["workspace.newsletter.stage"];
    expect(
      operation.request.safeParse({
        params: { sessionId },
        body: { ...body, [field]: "unauthorized" },
      }).success,
    ).toBe(false);
  },
);
it("requires literal bounded plaintext without template slots", () => {
  const schema =
    newsletterStagingOperations["workspace.newsletter.revision"].response;
  for (const contentSkeleton of [
    { ...revision.contentSkeleton, body: "{{name}}" },
    { ...revision.contentSkeleton, slots: ["name"] },
    { ...revision.contentSkeleton, body: "x".repeat(8001) },
    { ...revision.contentSkeleton, body: "" },
  ])
    expect(schema.safeParse({ ...revision, contentSkeleton }).success).toBe(
      false,
    );
});
it.each([
  "multi_client",
  "coalition",
  "undecided",
  "internal_team",
  "none",
  "client",
])("never interprets %s as a firm sponsor", (kind) => {
  expect(() =>
    requireCompatibleSponsor(revision, { kind, clientRefs: [] }),
  ).toThrow();
});
it("client content requires exactly its canonical single-client sponsor", () => {
  const selected = { ...revision, clientId: draft.id };
  expect(() =>
    requireCompatibleSponsor(selected, {
      kind: "client",
      clientRefs: [{ clientId: draft.id }],
    }),
  ).not.toThrow();
  for (const sponsor of [
    { kind: "firm", clientRefs: [] },
    { kind: "client", clientRefs: [{ clientId: sessionId }] },
    {
      kind: "client",
      clientRefs: [{ clientId: draft.id }, { clientId: sessionId }],
    },
  ])
    expect(() => requireCompatibleSponsor(selected, sponsor)).toThrow();
});
it("accepts original or replayed exact receipt and rejects provenance/state substitution", () => {
  for (const replayed of [false, true])
    expect(() =>
      verifyStagingReceipt(
        newsletterStagingReceipt.parse(receipt(body, replayed)),
        { sessionId, body },
        revision,
      ),
    ).not.toThrow();
  const base = receipt(body);
  for (const change of [
    { versionId: sessionId },
    { draftId: sessionId },
    { snapshotHash: "e".repeat(64) },
    { requestId: sessionId },
    { authorId: "replacement" },
    { clientId: sessionId },
    { expectedStateVersion: 4 },
  ])
    expect(() =>
      verifyStagingReceipt(
        { ...base, staged: { ...base.staged, ...change } },
        { sessionId, body },
        revision,
      ),
    ).toThrow();
  expect(() =>
    verifyStagingReceipt(
      { ...base, stateVersion: 5 },
      { sessionId, body },
      revision,
    ),
  ).toThrow();
});
