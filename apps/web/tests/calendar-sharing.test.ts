import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  sharingMeetingSchema,
  sharingReceipt,
  sharedFeedSchema,
  type ShareRef,
} from "../src/features/portfolio/calendar/sharing/contracts";
import { sharingTargets } from "../src/features/portfolio/calendar/sharing/targets";
import { changeSharing } from "../src/features/portfolio/calendar/sharing/api";
import {
  sharingActor as actor,
  sharingMeeting as meeting,
  sharingFile as file,
  sharedMeetingFixture,
} from "./calendar-sharing-fixtures";
const refs: ShareRef[] = [
  { type: "prep", id: meeting.preps[0]!.id },
  { type: "attachment", id: file.id },
];
import { meetingAttachmentSchema } from "../src/features/portfolio/calendar/review/contracts";
const parse = (row: unknown) => sharingMeetingSchema.parse(row);

describe("native selected artifact sharing and client feed", () => {
  it("accepts all four native artifact collections and preserves nullable original attribution", () => {
    const row = sharedMeetingFixture();
    row.preps[0]!.sharedByUserId = null;
    row.attachments[0]!.sharedByUserId = null;
    expect(
      sharingReceipt(meeting, actor, "share", refs).safeParse(row).success,
    ).toBe(true);
    expect(
      sharedFeedSchema(meeting.client.id, actor.tenantId).safeParse([row])
        .success,
    ).toBe(true);
  });
  it.each(["tenant", "client", "meeting", "missing", "private", "unapproved"])(
    "rejects a %s sharing receipt",
    (kind) => {
      const row = sharedMeetingFixture();
      if (kind === "tenant") row.tenantId = "foreign";
      if (kind === "client") row.client.id = "foreign";
      if (kind === "meeting") row.attachments[0]!.meetingId = "foreign";
      if (kind === "missing") row.preps = [];
      if (kind === "private") row.visibility = "private";
      if (kind === "unapproved") row.preps[0]!.status = "edited";
      expect(
        sharingReceipt(meeting, actor, "share", refs).safeParse(row).success,
      ).toBe(false);
    },
  );
  it("unsharing selected artifacts permits other artifacts to keep the meeting shared", () => {
    const row = sharedMeetingFixture();
    Object.assign(row.preps[0]!, { sharedAt: null, sharedByUserId: null });
    Object.assign(row.attachments[0]!, {
      sharedAt: null,
      sharedByUserId: null,
    });
    expect(
      sharingReceipt(meeting, actor, "unshare", refs).safeParse(row).success,
    ).toBe(true);
    Object.assign(row.attachments[0]!, { sharedByUserId: "stale" });
    expect(
      sharingReceipt(meeting, actor, "unshare", refs).safeParse(row).success,
    ).toBe(false);
  });
  it("feed rejects private, foreign-client, foreign-tenant, unshared and duplicate records", () => {
    const row = sharedMeetingFixture();
    const schema = sharedFeedSchema(meeting.client.id, actor.tenantId);
    expect(schema.safeParse([row, row]).success).toBe(false);
    for (const changed of [
      { ...row, visibility: "private" },
      { ...row, tenantId: "foreign" },
      { ...row, client: { ...row.client, id: "foreign" } },
      { ...row, preps: meeting.preps },
    ])
      expect(schema.safeParse([changed]).success).toBe(false);
    expect(
      schema.safeParse([
        { ...row, groupedMeetingIds: [row.id, "another-native-record"] },
      ]).success,
    ).toBe(true);
  });
  it("institutional, confidential, unapproved and unreadable files cannot be selected for sharing", () => {
    const row = parse(meeting);
    row.preps[0]!.generatedFrom = {
      schemaVersion: "research_portfolio_institutional_v1",
    };
    row.notes[0]!.confidential = true;
    row.debriefs[0]!.status = "generated";
    const targets = sharingTargets(
      row,
      [{ ...file, usable: false }],
      actor,
      false,
    );
    expect(targets.map((target) => target.shareReason)).toEqual([
      "Private Research Portfolio preparation",
      "Confidential artifact",
      "Approval required",
      "Current file readiness is unavailable",
    ]);
  });
  it("rotating signed download links do not replace the reviewed file identity", () => {
    const row = parse(meeting);
    const before = sharingTargets(
      row,
      [{ ...file, downloadUrl: "https://example.test/first" }],
      actor,
      false,
    );
    const after = sharingTargets(
      row,
      [{ ...file, downloadUrl: "https://example.test/rotated" }],
      actor,
      false,
    );
    expect(
      before.find((target) => target.type === "attachment")?.snapshot,
    ).toBe(after.find((target) => target.type === "attachment")?.snapshot);
  });
  it("standard unshare requires original sharer or note/debrief author, while admins may unshare", () => {
    const row = parse(sharedMeetingFixture());
    row.preps[0]!.sharedByUserId = null;
    const standard = sharingTargets(row, [file], actor, false);
    expect(standard[0]!.unshareReason).toMatch(/Only the sharer/);
    expect(standard[1]!.unshareReason).toBeUndefined();
    expect(
      sharingTargets(row, [file], actor, true)[0]!.unshareReason,
    ).toBeUndefined();
  });
});
for (const scenario of [
  "success",
  "changed",
  "uncertain",
  "foreign receipt",
  "revoked",
] as const)
  it(`sharing dispatch ${scenario}`, async () => {
    const selected = sharingTargets(
      parse(meeting),
      [meetingAttachmentSchema.parse(file)],
      actor,
      false,
    ).filter((row) => row.type === "prep" || row.type === "attachment");
    const current = structuredClone(meeting);
    if (scenario === "changed")
      current.preps[0]!.summary = "Changed after review";
    const receipt = sharedMeetingFixture();
    if (scenario === "foreign receipt") receipt.tenantId = "foreign";
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        return new Response(
          JSON.stringify(
            init?.method === "POST"
              ? receipt
              : url.includes("/attachments?")
                ? [file]
                : current,
          ),
          {
            status:
              init?.method === "POST" && scenario === "uncertain" ? 503 : 200,
          },
        );
      },
    );
    const api = createApiClient(fetcher);
    let guards = 0;
    const guard = () => {
      if (++guards === 2 && scenario === "revoked")
        throw new Error("Synthetic actor replaced");
    };
    const action = changeSharing(
      api,
      meeting,
      actor,
      false,
      "share",
      selected,
      guard,
      new AbortController().signal,
    );
    if (scenario === "success") await expect(action).resolves.toBeUndefined();
    else
      await expect(action).rejects.toMatchObject({
        uncertain: scenario === "uncertain" || scenario === "foreign receipt",
      });
    expect(
      fetcher.mock.calls.filter((call) => call[1]?.method === "POST"),
    ).toHaveLength(scenario === "changed" || scenario === "revoked" ? 0 : 1);
  });
