import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  sharingMeetingSchema,
  sharedFeedSchema,
  sharingScope,
} from "../src/features/portfolio/calendar/sharing/contracts";
import { sharingTargets } from "../src/features/portfolio/calendar/sharing/targets";
import {
  sharingCommand,
  preflightSharing,
} from "../src/features/portfolio/calendar/sharing/api";
import {
  sharingActor as actor,
  sharingMeeting as meeting,
  sharingFile as file,
  sharedMeetingFixture,
} from "./calendar-sharing-fixtures";
const parse = (row: unknown) => sharingMeetingSchema.parse(row);
describe("native shared feed and current eligibility", () => {
  it("preserves nullable original attribution in all native artifact collections", () => {
    const row = sharedMeetingFixture();
    row.preps[0]!.sharedByUserId = null;
    row.attachments[0]!.sharedByUserId = null;
    expect(sharingScope(meeting, actor).safeParse(row).success).toBe(true);
    expect(
      sharedFeedSchema(meeting.client.id, actor.tenantId).safeParse([row])
        .success,
    ).toBe(true);
  });
  it.each(["tenant", "client", "meeting"])(
    "rejects foreign %s scope",
    (kind) => {
      const row = sharedMeetingFixture();
      if (kind === "tenant") row.tenantId = "foreign";
      if (kind === "client") row.client.id = "foreign";
      if (kind === "meeting") row.attachments[0]!.meetingId = "foreign";
      expect(sharingScope(meeting, actor).safeParse(row).success).toBe(false);
    },
  );
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
  "revoked",
  "parent",
  "file-revision",
] as const)
  it(`sharing preflight ${scenario}`, async () => {
    const selected = sharingTargets(
      parse(meeting),
      [file],
      actor,
      false,
    ).filter((row) => row.type === "prep" || row.type === "attachment");
    const current = structuredClone(meeting);
    if (scenario === "changed")
      current.preps[0]!.summary = "Changed after review";
    if (scenario === "parent") current.updatedAt = "2026-10-24T12:00:00Z";
    if (scenario === "file-revision")
      current.attachments[0]!.metadataRevision++;
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(init?.method).toBe("GET");
        return Response.json(
          String(input).includes("/attachments?") ? [file] : current,
        );
      },
    );
    let guards = 0;
    const guard = () => {
      if (++guards === 2 && scenario === "revoked")
        throw Error("Actor replaced");
    };
    const result = preflightSharing(
      createApiClient(fetcher),
      meeting,
      actor,
      false,
      "share",
      selected,
      guard,
      new AbortController().signal,
    );
    if (scenario === "success") await expect(result).resolves.toBeUndefined();
    else await expect(result).rejects.toThrow();
    expect(fetcher.mock.calls.map((call) => call[1]?.method)).toEqual([
      "GET",
      "GET",
      "GET",
    ]);
    const command = sharingCommand(meeting, "share", selected);
    expect(command).toMatchObject({
      meetingId: meeting.id,
      expectedClientId: meeting.client.id,
      expectedRevision: meeting.updatedAt,
      artifacts: [
        {
          type: "prep",
          id: meeting.preps[0]!.id,
          revision: meeting.preps[0]!.updatedAt,
        },
        { type: "attachment", id: file.id, revision: 0 },
      ],
    });
  });
