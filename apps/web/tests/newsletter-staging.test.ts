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
  newsletterStagingBody,
} from "../src/shared/capiro/operations/workspace-newsletter-staging";
import {
  requireCompatibleSponsor,
  verifyStagingReceipt,
  verifyStagingProjection,
  stagingRecovery,
  historicalStagingSource,
} from "../src/features/modules/workspace/newsletter/staging-model";
const body = {
  requestId: "b0000000-0000-4000-8000-000000000001",
  draftId: draft.id,
  versionId: revision.versionId,
  snapshotHash: revision.snapshotHash,
  projectionVersion: revision.projectionVersion,
  projectionHash: revision.projectionHash,
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

it("retains the published projection identity and refuses partial/unsupported pins", () => {
  const intent = { sessionId, body };
  expect(stagingRecovery.schema.parse(intent)).toEqual(intent);
  for (const change of [
    { projectionHash: undefined },
    { projectionVersion: undefined },
    { projectionHash: "invalid" },
    { projectionVersion: "unsupported" },
  ]) {
    expect(
      newsletterStagingBody.safeParse({ ...body, ...change }).success,
    ).toBe(false);
    expect(
      newsletterStagingReceipt.safeParse({
        ...receipt(body),
        staged: { ...receipt(body).staged, ...change },
      }).success,
    ).toBe(false);
  }
});
it.each([
  { projectionHash: "e".repeat(64) },
  { projectionVersion: "workspace-outreach-plaintext-v1" as const },
])("rejects changed selected or returned projection %j", (change) => {
  expect(() =>
    verifyStagingProjection({ sessionId, body }, { ...revision, ...change }),
  ).toThrow(/projection changed/);
  expect(() =>
    verifyStagingReceipt(
      { ...receipt(body), staged: { ...receipt(body).staged, ...change } },
      { sessionId, body },
      revision,
    ),
  ).toThrow(/receipt does not match/);
});
it("keeps historical request bytes unpinned and accepts only its exact replay receipt", () => {
  const {
    projectionVersion: _version,
    projectionHash: _hash,
    ...oldBody
  } = body;
  void _version;
  void _hash;
  const original = { sessionId, body: oldBody };
  expect(stagingRecovery.schema.parse(original)).toEqual(original);
  const source = historicalStagingSource(draft, draft.id);
  expect(() =>
    verifyStagingReceipt(receipt(oldBody, true), original, source),
  ).not.toThrow();
  expect(() =>
    verifyStagingReceipt(receipt(body, true), original, source),
  ).toThrow();
  expect(() =>
    verifyStagingReceipt(receipt(oldBody, false), original, source),
  ).toThrow();
  expect(() =>
    historicalStagingSource({ ...draft, clientId: undefined }, draft.id),
  ).toThrow();
  expect(() =>
    historicalStagingSource({ ...draft, clientAssociation: "held" }, draft.id),
  ).toThrow();
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
