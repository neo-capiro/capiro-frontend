import { beforeEach, expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { sectionKeys } from "../src/features/portfolio/prospects/brief/contracts";
import { runRefresh } from "../src/features/portfolio/prospects/brief/refresh/recovery";
import {
  retainedSchema,
  type RefreshAttempt,
} from "../src/features/portfolio/prospects/brief/refresh/contracts";
import { assertAccepted } from "../src/features/portfolio/prospects/brief/refresh/api";
const storage = vi.hoisted(() => ({ saved: null as RefreshAttempt | null }));
vi.mock("../src/shared/session/recovery/journal", () => ({
  readRecovery: async () => structuredClone(storage.saved),
  reserveRecovery: async (_s: string, _id: string, value: RefreshAttempt) =>
    structuredClone((storage.saved ??= value)),
  updateRecovery: async (_s: string, _id: string, value: RefreshAttempt) => {
    storage.saved = structuredClone(value);
  },
  acknowledgeRecovery: async () => {
    storage.saved = null;
  },
  withRecoveryCommandLock: async (
    _s: string,
    _g: unknown,
    run: () => Promise<unknown>,
  ) => run(),
}));
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scope = { tenantId: id(1), userId: id(2), prospectId: id(3) };
const sections = Object.fromEntries(
  sectionKeys.map((k) => [
    k,
    { text: k + " exact text", provenance: "generated", citationIndexes: [] },
  ]),
);
const proposal = (proposalId: string) =>
  retainedSchema.parse({
    ...scope,
    createdByUserId: scope.userId,
    proposalId,
    expectedVersionNumber: 1,
    baseVersionNumber: 1,
    keepUserEdits: true,
    briefId: id(4),
    baseVersionId: id(5),
    proposalHash: "a".repeat(64),
    sourceHash: "b".repeat(64),
    createdAt: "2026-10-29T00:00:00Z",
    proposed: sections,
    citations: [],
    diff: sectionKeys.map((k) => ({
      section: k,
      changed: true,
      baseText: "before",
      proposedText: k + " exact text",
    })),
    sourceSnapshot: {
      generatedAt: "2026-10-29T00:00:00Z",
      identityBasis: "manual",
      canonicalEntityId: null,
      canonicalName: null,
      evidence: [],
    },
    snapshotHash: "c".repeat(64),
  });
const version = (p: ReturnType<typeof proposal>) => ({
  id: id(6),
  versionNumber: 2,
  createdAt: p.createdAt,
  createdByUserId: scope.userId,
  sectionsHash: "d".repeat(64),
  citationCount: 0,
  sections: p.proposed,
  citations: p.citations,
  sourceSnapshot: p.sourceSnapshot,
  snapshotHash: p.snapshotHash,
});
beforeEach(() => {
  storage.saved = null;
});
it("recovers a lost acceptance response without a second write or a new proposal", async () => {
  let p: ReturnType<typeof proposal> | undefined,
    accepted: ReturnType<typeof version> | null = null;
  const posts: Array<{ path: string; body: unknown }> = [];
  const api = createApiClient(async (input, init) => {
    const path = String(input);
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      posts.push({ path, body });
      if (path.endsWith("refresh-accept")) {
        accepted = version(p!);
        throw Error("Response lost after commit");
      }
      p = proposal(body.proposalId);
      return Response.json(p);
    }
    return Response.json({ proposal: p, acceptedVersion: accepted });
  });
  const guard = () => {},
    signal = new AbortController().signal;
  const prepared = await runRefresh(
    api,
    scope,
    { kind: "prepare", expectedVersionNumber: 1, keepUserEdits: true },
    guard,
    signal,
    () => {},
  );
  await expect(
    runRefresh(
      api,
      scope,
      {
        kind: "accept",
        expected: structuredClone(storage.saved!),
        review: prepared!.proposal,
      },
      guard,
      signal,
      () => {},
    ),
  ).rejects.toThrow();
  expect(storage.saved?.acceptHash).toBe(p!.proposalHash);
  const recovered = await runRefresh(
    api,
    scope,
    { kind: "retry", expected: structuredClone(storage.saved!) },
    guard,
    signal,
    () => {},
  );
  expect(recovered?.acceptedVersion?.id).toBe(id(6));
  expect(posts).toHaveLength(2);
  expect(posts[1]!.body).toEqual({
    proposalId: p!.proposalId,
    proposalHash: p!.proposalHash,
  });
});
it("rejects saved receipt content or citation drift", () => {
  const p = proposal(id(7)),
    v = version(p);
  expect(() => assertAccepted(p, v)).not.toThrow();
  expect(() =>
    assertAccepted(p, {
      ...v,
      sections: {
        ...v.sections,
        judgment: { ...v.sections.judgment, text: "different" },
      },
    }),
  ).toThrow();
  expect(() =>
    assertAccepted(p, { ...v, citations: [{ title: "different" }] }),
  ).toThrow();
});
it("cannot discard unresolved acceptance even after a read says pending", async () => {
  const p = proposal(id(8));
  storage.saved = {
    request: {
      proposalId: p.proposalId,
      expectedVersionNumber: 1,
      keepUserEdits: true,
    },
    acceptHash: p.proposalHash,
    refused: false,
  };
  const api = createApiClient(async () =>
    Response.json({ proposal: p, acceptedVersion: null }),
  );
  await expect(
    runRefresh(
      api,
      scope,
      { kind: "clear", expected: storage.saved },
      () => {},
      new AbortController().signal,
      () => {},
    ),
  ).rejects.toThrow("unresolved");
  expect(storage.saved).not.toBeNull();
});
