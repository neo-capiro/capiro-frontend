import { receiveOwnerCorrectionPage } from "../src/features/meri/memory-review/owner-correction";
import { describe, expect, it } from "vitest";
import {
  ownerHistoryPath,
  receiveOwnerHistory,
} from "../src/features/meri/memory-review/owner-history";
const ref = {
  kind: "item" as const,
  id: "11111111-1111-4111-8111-111111111111",
};
const revision = "2026-10-31T12:00:00.123456Z";
const page = {
  schemaVersion: 1,
  anchor: { ...ref, revision },
  availability: "available",
  entries: [],
  nextCursor: null,
};
describe("owner history receiver", () => {
  it("keeps controls unavailable for older owner-list backends", () => {
    const item = {
      id: ref.id,
      title: "Synthetic",
      value: "Text",
      scope: "user_private",
      clientId: null,
      updatedAt: revision,
    };
    expect(
      receiveOwnerCorrectionPage({
        schemaVersion: 1,
        items: [item],
        nextCursor: null,
      }).items[0]?.reference,
    ).toBeUndefined();
    expect(
      receiveOwnerCorrectionPage({
        schemaVersion: 1,
        ownerReadsVersion: 1,
        items: [item],
        nextCursor: null,
      }).items[0]?.reference,
    ).toEqual(ref);
  });
  it("projects only authorized typed conversation references", () => {
    const sourceId = "22222222-2222-4222-8222-222222222222";
    const result = receiveOwnerHistory(
      {
        ...page,
        entries: [
          {
            kind: "conversation",
            reference: {
              kind: "conversation",
              id: sourceId,
              clientId: null,
              url: "https://untrusted.invalid",
            },
            observedAt: revision,
            transcript: "must not escape",
          },
        ],
      },
      ref,
      "evidence",
    );
    expect(result.sources).toEqual([
      {
        kind: "conversation",
        reference: { kind: "conversation", id: sourceId, clientId: null },
        observedAt: revision,
      },
    ]);
    expect(() =>
      receiveOwnerHistory(
        {
          ...page,
          entries: [
            {
              kind: "conversation",
              reference: { kind: "message", id: sourceId, clientId: null },
              observedAt: revision,
            },
          ],
        },
        ref,
        "evidence",
      ),
    ).toThrow();
  });
  it("distinguishes a supported empty page from absent contracts", () => {
    expect(receiveOwnerHistory(page, ref, "versions").entries).toEqual([]);
    for (const value of [
      {},
      { ...page, schemaVersion: 0 },
      { ...page, availability: "unsupported" },
      { ...page, nextCursor: "cursor" },
    ])
      expect(() => receiveOwnerHistory(value, ref, "versions")).toThrow();
  });
  it("preserves microseconds and refuses another item or namespace", () => {
    expect(receiveOwnerHistory(page, ref, "versions").anchor.revision).toBe(
      revision,
    );
    expect(() =>
      receiveOwnerHistory(
        {
          ...page,
          anchor: {
            ...ref,
            id: "22222222-2222-4222-8222-222222222222",
            revision,
          },
        },
        ref,
        "versions",
      ),
    ).toThrow();
    expect(() =>
      ownerHistoryPath({ ...ref, id: `clio:${ref.id}` }, "versions"),
    ).toThrow();
  });
  it("does not turn unsupported evidence into empty success or forward stored URLs", () => {
    const result = receiveOwnerHistory(
      {
        ...page,
        availability: "unsupported",
        reason: "source_reader_unbound",
        sourceUrl: "https://untrusted.invalid",
      },
      ref,
      "evidence",
    );
    expect(result.availability).toBe("unsupported");
    expect(result).not.toHaveProperty("sourceUrl");
    expect(() => receiveOwnerHistory(page, ref, "evidence")).toThrow();
  });
});
