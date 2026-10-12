import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { changeMeetingArtifact } from "../src/features/portfolio/calendar/artifacts/api";
import {
  artifactReceiptSchema,
  type ArtifactChange,
  type ArtifactKind,
} from "../src/features/portfolio/calendar/artifacts/contracts";

const actor = { userId: "actor-one", tenantId: "tenant-one" };
const meeting = {
  id: "meeting-one",
  subject: "Synthetic",
  description: null,
  location: null,
  startsAt: "2026-10-10T14:00:00Z",
  endsAt: "2026-10-10T15:00:00Z",
  status: "scheduled",
  joinLink: null,
  visibility: "private" as const,
  isVirtual: false,
  meri: null,
  client: { id: "client-one", name: "Synthetic" },
  attendees: [],
  preps: [],
};
const metadata = {
  id: "artifact-one",
  meetingId: "meeting-one",
  clientId: "client-one",
  authorUserId: "actor-one",
  confidential: false,
  status: "draft",
  sharedAt: null,
  sharedByUserId: null,
  createdAt: "2026-10-10T15:00:00Z",
  updatedAt: "2026-10-10T15:00:00Z",
};
const save: ArtifactChange = {
  action: "save",
  body: "Retained content",
  confidential: false,
};
for (const kind of ["notes", "debriefs"] as ArtifactKind[]) {
  describe(kind, () => {
    it.each([
      {},
      null,
      { ...metadata, meetingId: "foreign" },
      { ...metadata, clientId: "foreign" },
      { ...metadata, authorUserId: "foreign" },
      { ...metadata, confidential: true },
      { ...metadata, status: "approved" },
    ])("rejects an unrelated or incomplete creation receipt: %j", (receipt) => {
      expect(
        artifactReceiptSchema(meeting, kind, actor, save).safeParse(receipt)
          .success,
      ).toBe(false);
    });
    it("accepts native metadata without plaintext or a tenant field", () => {
      expect(
        artifactReceiptSchema(meeting, kind, actor, save).safeParse(metadata)
          .success,
      ).toBe(true);
    });
    it("validates edit ID and lifecycle while allowing an admin to edit another author's artifact", () => {
      const schema = artifactReceiptSchema(meeting, kind, actor, {
        ...save,
        id: metadata.id,
      });
      expect(
        schema.safeParse({
          ...metadata,
          authorUserId: "another-author",
          status: "edited",
        }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ ...metadata, id: "foreign", status: "edited" })
          .success,
      ).toBe(false);
      expect(schema.safeParse(metadata).success).toBe(false);
    });
    it("validates native approval attribution separately for notes and debriefs", () => {
      const schema = artifactReceiptSchema(meeting, kind, actor, {
        action: "approve",
        id: metadata.id,
      });
      const receipt = {
        ...metadata,
        status: "approved",
        ...(kind === "notes"
          ? { approvedAt: metadata.updatedAt, approvedByUserId: actor.userId }
          : {}),
      };
      expect(schema.safeParse(receipt).success).toBe(true);
      expect(schema.safeParse({ ...receipt, id: "foreign" }).success).toBe(
        false,
      );
      if (kind === "notes")
        expect(
          schema.safeParse({ ...receipt, approvedByUserId: "foreign" }).success,
        ).toBe(false);
    });
    it("accepts an idempotent share retaining its original sharer and rejects absent/foreign artifacts", () => {
      const schema = artifactReceiptSchema(meeting, kind, actor, {
        action: "share",
        id: metadata.id,
      });
      const artifact = {
        ...metadata,
        status: "approved",
        sharedAt: metadata.updatedAt,
        sharedByUserId: "original-sharer",
      };
      const receipt = { ...meeting, visibility: "shared", [kind]: [artifact] };
      expect(schema.safeParse(receipt).success).toBe(true);
      expect(schema.safeParse({ ...receipt, [kind]: [] }).success).toBe(false);
      expect(
        schema.safeParse({
          ...receipt,
          [kind]: [{ ...artifact, meetingId: "foreign" }],
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({ ...receipt, [kind]: [artifact, artifact] }).success,
      ).toBe(false);
    });
    it("accepts unshare with another artifact still shared, but requires both selected share stamps cleared", () => {
      const schema = artifactReceiptSchema(meeting, kind, actor, {
        action: "unshare",
        id: metadata.id,
      });
      const receipt = {
        ...meeting,
        visibility: "shared",
        [kind]: [{ ...metadata, status: "approved" }],
      };
      expect(schema.safeParse(receipt).success).toBe(true);
      expect(
        schema.safeParse({
          ...receipt,
          [kind]: [{ ...metadata, sharedByUserId: "original-sharer" }],
        }).success,
      ).toBe(false);
    });
    it.each([200, 204, 500, 503])(
      "retains uncertainty for dispatched invalid responses (HTTP %i)",
      async (status) => {
        const fetcher = vi
          .fn()
          .mockResolvedValueOnce(Response.json(meeting))
          .mockResolvedValueOnce(
            status === 204
              ? new Response(null, { status })
              : Response.json({}, { status }),
          );
        await expect(
          changeMeetingArtifact(
            createApiClient(fetcher),
            meeting,
            kind,
            actor,
            save,
            () => {},
            new AbortController().signal,
          ),
        ).rejects.toMatchObject({ uncertain: true });
        expect(fetcher).toHaveBeenCalledTimes(2);
      },
    );
    it.each([400, 401, 403, 404, 409, 422])(
      "distinguishes a known HTTP %i refusal from uncertain completion",
      async (status) => {
        const fetcher = vi
          .fn()
          .mockResolvedValueOnce(Response.json(meeting))
          .mockResolvedValueOnce(
            Response.json({ message: "Refused" }, { status }),
          );
        await expect(
          changeMeetingArtifact(
            createApiClient(fetcher),
            meeting,
            kind,
            actor,
            save,
            () => {},
            new AbortController().signal,
          ),
        ).rejects.toMatchObject({
          uncertain: false,
          message:
            status === 401 ? "Your session expired. Sign in again." : "Refused",
        });
      },
    );
    it("does not dispatch after a changed parent client", async () => {
      const fetcher = vi.fn().mockResolvedValue(
        Response.json({
          ...meeting,
          client: { id: "foreign", name: "Other" },
        }),
      );
      await expect(
        changeMeetingArtifact(
          createApiClient(fetcher),
          meeting,
          kind,
          actor,
          save,
          () => {},
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ uncertain: false });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it("does not dispatch after the initiating scope aborts during preflight", async () => {
      const controller = new AbortController();
      const fetcher = vi.fn().mockImplementation(async () => {
        controller.abort();
        return Response.json(meeting);
      });
      await expect(
        changeMeetingArtifact(
          createApiClient(fetcher),
          meeting,
          kind,
          actor,
          save,
          () => {},
          controller.signal,
        ),
      ).rejects.toMatchObject({ uncertain: false });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it("treats a network failure after dispatch as uncertain", async () => {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(Response.json(meeting))
        .mockRejectedValueOnce(new TypeError("Network failed"));
      await expect(
        changeMeetingArtifact(
          createApiClient(fetcher),
          meeting,
          kind,
          actor,
          save,
          () => {},
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ uncertain: true });
    });
  });
}

describe("meeting save native normalization", () => {
  it("matches normalized fields and equivalent instants", async () => {
    const { meetingSaveReceiptSchema } =
      await import("../src/features/portfolio/calendar/meeting-save");
    const input = {
      subject: "  Synthetic  ",
      description: " ",
      location: " ",
      startsAt: meeting.startsAt,
      endsAt: meeting.endsAt,
      clientId: "client-one",
    };
    const schema = meetingSaveReceiptSchema(meeting.id, input);
    expect(
      schema.safeParse({ ...meeting, startsAt: "2026-10-10T14:00:00.000Z" })
        .success,
    ).toBe(true);
    expect(schema.safeParse({ ...meeting, id: "foreign" }).success).toBe(false);
    expect(
      schema.safeParse({ ...meeting, client: { id: "foreign", name: "Other" } })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...meeting, startsAt: "2026-10-10T16:00:00Z" })
        .success,
    ).toBe(false);
  });
  it("permits backend automatic association only on an unscoped create", async () => {
    const { meetingSaveReceiptSchema } =
      await import("../src/features/portfolio/calendar/meeting-save");
    const input = {
      subject: meeting.subject,
      startsAt: meeting.startsAt,
      endsAt: meeting.endsAt,
    };
    expect(
      meetingSaveReceiptSchema(undefined, input).safeParse(meeting).success,
    ).toBe(true);
    expect(
      meetingSaveReceiptSchema(undefined, {
        ...input,
        clientId: "other",
      }).safeParse(meeting).success,
    ).toBe(false);
    expect(
      meetingSaveReceiptSchema(meeting.id, {
        ...input,
        clientId: null,
      }).safeParse(meeting).success,
    ).toBe(false);
    expect(
      meetingSaveReceiptSchema(meeting.id, {
        ...input,
        clientId: null,
      }).safeParse({ ...meeting, client: null }).success,
    ).toBe(true);
  });
});
