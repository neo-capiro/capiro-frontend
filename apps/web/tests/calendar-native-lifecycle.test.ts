import { describe, expect, it } from "vitest";
import {
  artifactReceiptSchema,
  type ArtifactKind,
} from "../src/features/portfolio/calendar/artifacts/contracts";

const actor = { userId: "author", tenantId: "tenant" };
const meeting = {
  id: "meeting",
  subject: "Synthetic",
  description: null,
  location: null,
  startsAt: "2026-10-10T14:00:00Z",
  endsAt: "2026-10-10T15:00:00Z",
  status: "scheduled",
  joinLink: null,
  visibility: "shared" as const,
  isVirtual: false,
  meri: null,
  client: { id: "client", name: "Synthetic" },
  attendees: [],
  preps: [],
};
const metadata = {
  id: "artifact",
  meetingId: meeting.id,
  clientId: meeting.client.id,
  authorUserId: actor.userId,
  confidential: false,
  sharedAt: null,
  sharedByUserId: null,
  createdAt: "2026-10-10T15:00:00Z",
  updatedAt: "2026-10-10T15:00:00Z",
};
const save = {
  action: "save" as const,
  body: "Synthetic content",
  confidential: false,
};
const clearedApproval = { approvedAt: null, approvedByUserId: null };
describe("pinned native artifact lifecycle", () => {
  for (const kind of ["notes", "debriefs"] as ArtifactKind[]) {
    const receipt = {
      ...metadata,
      status: kind === "notes" ? "draft" : "generated",
      ...(kind === "notes" ? clearedApproval : {}),
    };
    it(`${kind} accepts its real creation status and rejects the other artifact's status`, () => {
      const schema = artifactReceiptSchema(meeting, kind, actor, save);
      expect(schema.safeParse(receipt).success).toBe(true);
      expect(
        schema.safeParse({
          ...receipt,
          status: kind === "notes" ? "generated" : "draft",
        }).success,
      ).toBe(false);
    });
    it(`${kind} accepts a native idempotent share whose original sharer was deleted`, () => {
      const artifact = {
        ...receipt,
        status: "approved",
        sharedAt: metadata.updatedAt,
        sharedByUserId: null,
      };
      const schema = artifactReceiptSchema(meeting, kind, actor, {
        action: "share",
        id: metadata.id,
      });
      expect(schema.safeParse({ ...meeting, [kind]: [artifact] }).success).toBe(
        true,
      );
      for (const invalid of [
        { id: "foreign" },
        { meetingId: "foreign" },
        { clientId: "foreign" },
        { status: "edited" },
        { confidential: true },
        { sharedAt: null },
      ])
        expect(
          schema.safeParse({
            ...meeting,
            [kind]: [{ ...artifact, ...invalid }],
          }).success,
        ).toBe(false);
      expect(
        schema.safeParse({
          ...meeting,
          visibility: "private",
          [kind]: [artifact],
        }).success,
      ).toBe(false);
    });
  }
  for (const editing of [false, true])
    it(`note ${editing ? "edit" : "create"} requires cleared native approval stamps`, () => {
      const schema = artifactReceiptSchema(meeting, "notes", actor, {
        ...save,
        ...(editing ? { id: metadata.id } : {}),
      });
      const receipt = {
        ...metadata,
        status: editing ? "edited" : "draft",
        ...clearedApproval,
      };
      expect(schema.safeParse(receipt).success).toBe(true);
      expect(
        schema.safeParse({ ...receipt, approvedAt: metadata.updatedAt })
          .success,
      ).toBe(false);
      expect(
        schema.safeParse({ ...receipt, approvedByUserId: actor.userId })
          .success,
      ).toBe(false);
      const { approvedAt, approvedByUserId, ...incomplete } = receipt;
      void approvedAt;
      void approvedByUserId;
      expect(schema.safeParse(incomplete).success).toBe(false);
    });
  it("debrief edit accepts edited metadata without nonexistent approval stamps", () => {
    expect(
      artifactReceiptSchema(meeting, "debriefs", actor, {
        ...save,
        id: metadata.id,
      }).safeParse({ ...metadata, status: "edited" }).success,
    ).toBe(true);
  });
});
