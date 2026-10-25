import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  contactTransferRequest,
  prepareContactTransfer,
} from "../src/features/portfolio/prospects/contact-transfer/command";
import { transferCommandSchema } from "../src/features/portfolio/prospects/contact-transfer/contracts";
import {
  assertTransferReview,
  exactContactMatches,
  readTransferReview,
  restoreTransferChoices,
} from "../src/features/portfolio/prospects/contact-transfer/review";
import {
  actor,
  apiFixture,
  id,
  matchingPerson,
  receiptFor,
  review,
} from "./prospect-contact-transfer-fixtures";
const guard = () => {},
  signal = () => new AbortController().signal;
const prepare = () => {
  let key = 30;
  return prepareContactTransfer(
    actor,
    review,
    [{ sourceId: id(5), action: "create" }],
    () => id(key++),
  );
};

describe("PF18 exact reviewed contact transfer", () => {
  it("preserves explicit create/link/skip choices against current source versions after refusal", async () => {
    const before = {
      ...review,
      people: [matchingPerson],
      contacts: [
        { ...review.contacts[0]!, name: "Create contact" },
        { ...review.contacts[0]!, id: id(7) },
        { ...review.contacts[0]!, id: id(8), name: "Skipped contact" },
      ],
    };
    const decisions = [
      { sourceId: id(5), action: "create" as const },
      { sourceId: id(7), action: "link" as const, personId: id(6) },
      { sourceId: id(8), action: "skip" as const },
    ];
    const attempt = await prepareContactTransfer(actor, before, decisions);
    const current = {
      ...before,
      contacts: before.contacts.map((source) => ({ ...source, version: 3 })),
    };
    const restored = restoreTransferChoices(attempt, current);
    expect(restored.review).toBe(current);
    expect(restored.decisions).toEqual(decisions);
    expect(restored.notices).toHaveLength(3);
    expect(
      restored.decisions.some((decision) => "createRequestId" in decision),
    ).toBe(false);
  });
  it("visibly identifies a missing original source rather than silently transferring another", async () => {
    const attempt = await prepare();
    const restored = restoreTransferChoices(attempt, {
      ...review,
      contacts: [],
    });
    expect(restored.decisions).toEqual([]);
    expect(restored.notices).toEqual([
      {
        sourceId: id(5),
        message: expect.stringContaining(
          "Synthetic Contact is no longer available",
        ),
      },
    ]);
  });
  it("preserves and flags a stale selected target while requiring an invalid link or create choice to be corrected", async () => {
    const before = { ...review, people: [matchingPerson] };
    const attempt = await prepareContactTransfer(actor, before, [
      { sourceId: id(5), action: "link", personId: id(6) },
    ]);
    for (const people of [
      [],
      [{ ...matchingPerson, updatedAt: "2026-10-25T02:00:00.321Z" }],
    ]) {
      const restored = restoreTransferChoices(attempt, { ...before, people });
      expect(restored.decisions).toEqual([
        { sourceId: id(5), action: "link", personId: id(6) },
      ]);
      expect(restored.notices[0]!.message).toContain("previous link");
      if (!people.length)
        expect(() =>
          assertTransferReview(
            restored.review,
            restored.review,
            restored.decisions,
          ),
        ).toThrow("changed");
    }
    const create = restoreTransferChoices(await prepare(), before);
    expect(create.decisions).toEqual([{ sourceId: id(5), action: "create" }]);
    expect(create.notices[0]!.message).toContain("exact client match");
    expect(() =>
      assertTransferReview(create.review, create.review, create.decisions),
    ).toThrow("exact match");
  });
  it("uses the Core canonical command order, actor-bound digest and millisecond timestamps", async () => {
    const attempt = await prepare();
    const expected = {
      schemaVersion: 1,
      requestId: id(30),
      prospectId: id(3),
      clientId: id(4),
      expectedProspectUpdatedAt: review.prospect.updatedAt,
      items: [
        {
          sourceId: id(5),
          expectedVersion: 2,
          action: "create",
          createRequestId: id(31),
        },
      ],
    };
    expect(JSON.stringify(attempt.command)).toBe(JSON.stringify(expected));
    expect(attempt.payloadDigest).toBe(
      createHash("sha256")
        .update(
          JSON.stringify([
            "prospect-contact-transfer",
            1,
            actor.tenantId,
            actor.userId,
            expected,
          ]),
        )
        .digest("hex"),
    );
  });
  it("sorts distinct source IDs and allows explicit links to one exact target", async () => {
    const current = {
      ...review,
      people: [matchingPerson],
      contacts: [review.contacts[0]!, { ...review.contacts[0]!, id: id(7) }],
    };
    const attempt = await prepareContactTransfer(actor, current, [
      { sourceId: id(7), action: "link", personId: id(6) },
      { sourceId: id(5), action: "link", personId: id(6) },
    ]);
    expect(attempt.command.items.map((item) => item.sourceId)).toEqual([
      id(5),
      id(7),
    ]);
    expect(
      attempt.command.items.every(
        (item) =>
          item.action === "link" &&
          item.expectedUpdatedAt === matchingPerson.updatedAt,
      ),
    ).toBe(true);
  });
  it("matches all five trim/null fields case-sensitively", () => {
    expect(
      exactContactMatches(
        { ...review.contacts[0]!, title: " Director ", phone: " " },
        [matchingPerson],
      ),
    ).toHaveLength(1);
    for (const field of ["name", "title", "email", "phone", "notes"] as const)
      expect(
        exactContactMatches(review.contacts[0]!, [
          { ...matchingPerson, [field]: `Different ${field}` },
        ]),
      ).toHaveLength(0);
    expect(
      exactContactMatches(review.contacts[0]!, [
        { ...matchingPerson, email: "CONTACT@example.test" },
      ]),
    ).toEqual([]);
  });
  it("refuses create with an existing exact match or two selected duplicate create tuples", async () => {
    await expect(
      prepareContactTransfer(actor, { ...review, people: [matchingPerson] }, [
        { sourceId: id(5), action: "create" },
      ]),
    ).rejects.toThrow("exact match");
    await expect(
      prepareContactTransfer(
        actor,
        {
          ...review,
          contacts: [
            review.contacts[0]!,
            { ...review.contacts[0]!, id: id(7) },
          ],
        },
        [
          { sourceId: id(5), action: "create" },
          { sourceId: id(7), action: "create" },
        ],
      ),
    ).rejects.toThrow("exact match");
  });
  it("requires a current target timestamp without createdAt fallback", async () => {
    await expect(
      prepareContactTransfer(
        actor,
        { ...review, people: [{ ...matchingPerson, updatedAt: undefined }] },
        [{ sourceId: id(5), action: "link", personId: id(6) }],
      ),
    ).rejects.toThrow("current version");
  });
  it.each([
    "source-version",
    "source-fields",
    "prospect-version",
    "client",
    "link-version",
  ])(
    "refuses a changed %s before dispatch, including skip versions",
    (changed) => {
      const before = { ...review, people: [matchingPerson] },
        current = structuredClone(before);
      if (changed === "source-version") current.contacts[0]!.version++;
      if (changed === "source-fields") current.contacts[0]!.notes = "Changed";
      if (changed === "prospect-version")
        current.prospect.updatedAt = "2026-10-25T02:00:00.321Z";
      if (changed === "client") current.client.id = id(9);
      if (changed === "link-version")
        current.people[0]!.updatedAt = "2026-10-25T02:00:00.321Z";
      expect(() =>
        assertTransferReview(before, current, [
          changed === "link-version"
            ? { sourceId: id(5), action: "link", personId: id(6) }
            : { sourceId: id(5), action: "skip" },
        ]),
      ).toThrow("changed");
    },
  );
  it("reads actual Core timestamps and rejects a moved prospect/client association", async () => {
    const fixture = apiFixture({
      current: { ...review, people: [matchingPerson] },
    });
    expect(
      (await readTransferReview(fixture.api, id(3), id(4), signal(), guard))
        .people[0]!.updatedAt,
    ).toBe(matchingPerson.updatedAt);
    const moved = apiFixture({
      current: {
        ...review,
        prospect: { ...review.prospect, linkedClientId: id(8) },
      },
    });
    await expect(
      readTransferReview(moved.api, id(3), id(4), signal(), guard),
    ).rejects.toThrow("linked client");
  });
  it("rejects empty, oversized, duplicate and authority-bearing command bodies", async () => {
    const { command } = await prepare();
    for (const items of [
      [],
      Array(51).fill(command.items[0]),
      [command.items[0], command.items[0]],
    ])
      expect(
        transferCommandSchema.safeParse({ ...command, items }).success,
      ).toBe(false);
    expect(
      transferCommandSchema.safeParse({ ...command, tenantId: actor.tenantId })
        .success,
    ).toBe(false);
    expect(
      transferCommandSchema.safeParse({
        ...command,
        expectedProspectUpdatedAt: "2026-10-25T01:00:00Z",
      }).success,
    ).toBe(false);
  });
  it.each([
    "tenantId",
    "actorUserId",
    "requestId",
    "prospectId",
    "clientId",
    "payloadDigest",
    "sourceVersion",
    "action",
    "personId",
    "extra",
  ])("rejects an unmatched %s receipt", async (field) => {
    const attempt = await prepare(),
      receipt = receiptFor(attempt);
    if (["sourceVersion", "action", "personId"].includes(field))
      Object.assign(receipt.result!.items[0]!, {
        [field]:
          field === "sourceVersion" ? 99 : field === "action" ? "skip" : null,
      });
    else
      Object.assign(receipt, {
        [field]: field === "payloadDigest" ? "0".repeat(64) : id(99),
      });
    await expect(
      contactTransferRequest(
        createApiClient(async () => Response.json(receipt)),
        actor,
        attempt,
        false,
        signal(),
        guard,
      ),
    ).rejects.toMatchObject({ status: 502 });
  });
  it("accepts only the original completed or refused result and guards cancellation around responses", async () => {
    const attempt = await prepare();
    for (const status of ["completed", "refused"] as const) {
      const receipt = receiptFor(attempt, status);
      expect(
        await contactTransferRequest(
          createApiClient(async () => Response.json(receipt)),
          actor,
          attempt,
          false,
          signal(),
          guard,
        ),
      ).toEqual(receipt);
    }
    const controller = new AbortController();
    await expect(
      contactTransferRequest(
        createApiClient(async () => {
          controller.abort();
          return Response.json(receiptFor(attempt));
        }),
        actor,
        attempt,
        true,
        controller.signal,
        guard,
      ),
    ).rejects.toThrow();
  });
});
