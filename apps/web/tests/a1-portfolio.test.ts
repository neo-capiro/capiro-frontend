import { describe, expect, it, vi } from "vitest";
// Civil-day conversion is outside these fixtures; fail if a test starts using it.
vi.mock("../src/shared/portfolio/date/civil", () => ({
  validDay: () => {
    throw new Error("Unexpected civil-day conversion");
  },
}));
import { meetingAssignmentFields } from "../src/features/portfolio/calendar/meeting-save";
import { changeActivity } from "../src/features/portfolio/client-profile/activity-change";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  noteSchema,
  type Meeting,
} from "../src/features/portfolio/calendar/contracts";

const date = "2026-10-21T12:00:00.000Z";
describe("A1 Portfolio receiving and writes", () => {
  it("pins every meeting edit to the reviewed revision without rewriting unchanged client assignment", () => {
    const base: Meeting = {
      id: "meeting-1",
      subject: "Meeting",
      description: null,
      location: null,
      startsAt: date,
      endsAt: date,
      status: "scheduled",
      joinLink: null,
      visibility: "private",
      isVirtual: false,
      meri: null,
      attendees: [],
      preps: [],
      client: { id: "c1", name: "Client" },
      updatedAt: date,
    };
    expect(meetingAssignmentFields(base, "c1")).toEqual({
      expectedRevision: date,
    });
    expect(meetingAssignmentFields({ ...base, client: null }, null)).toEqual({
      expectedRevision: date,
    });
    expect(meetingAssignmentFields(base, "c2")).toEqual({
      clientId: "c2",
      expectedRevision: date,
    });
    expect(meetingAssignmentFields(base, null)).toEqual({
      clientId: null,
      expectedRevision: date,
    });
    expect(() =>
      meetingAssignmentFields({ ...base, updatedAt: undefined }, "c2"),
    ).toThrow("Refresh");
    expect(() =>
      meetingAssignmentFields({ ...base, updatedAt: undefined }, "c1"),
    ).toThrow("Refresh");
    expect(() =>
      meetingAssignmentFields(
        { ...base, client: null, updatedAt: undefined },
        null,
      ),
    ).toThrow("Refresh");
    expect(meetingAssignmentFields(undefined, null)).toEqual({});
    expect(meetingAssignmentFields(undefined, "c1")).toEqual({
      clientId: "c1",
    });
  });
  it("PF-12 preserves unavailable sharing state and current capability refusals in the read schema", () => {
    const row = noteSchema.parse({
      id: "d1",
      meetingId: "m1",
      clientId: "c1",
      body: null,
      restricted: true,
      confidential: true,
      createdAt: date,
      updatedAt: date,
      metadataVersion: 1,
      revision: date,
      sharingKnown: false,
      approvalKnown: false,
      approvedAt: null,
      approvedByUserId: null,
      sharedAt: null,
      sharedByUserId: null,
      capabilities: {
        edit: false,
        approve: false,
        share: false,
        unshare: false,
      },
    });
    expect(row.sharingKnown).toBe(false);
    expect(row.approvalKnown).toBe(false);
    expect(row.capabilities).toEqual({
      edit: false,
      approve: false,
      share: false,
      unshare: false,
    });
    expect(row.approvedByUserId).toBeNull();
  });
  it("PF-22 completes undated recorded obligations and refuses dated notes before dispatch", async () => {
    for (const kind of ["commitment", "request", "note", "email"] as const) {
      const row = {
        id: "a1",
        kind,
        title: "Title",
        body: null,
        occurredAt: date,
        sourceType: null,
        sourceId: null,
        origin: "recorded" as const,
        dueAt: kind === "note" ? date : null,
        settledAt: null,
        pinned: false,
      };
      const fetcher = vi.fn(
        async (_url: Parameters<typeof fetch>[0], options?: RequestInit) =>
          new Response(
            JSON.stringify(
              options?.method === "GET"
                ? [row]
                : { ...row, tenantId: "t1", clientId: "c1", settledAt: date },
            ),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      );
      const dispatched = vi.fn();
      const result = changeActivity(
        createApiClient(fetcher),
        "c1",
        { userId: "u1", tenantId: "t1" },
        row,
        { action: "settle", settled: true },
        () => {},
        new AbortController().signal,
        dispatched,
      );
      if (kind === "commitment" || kind === "request") {
        await result;
        expect(dispatched).toHaveBeenCalledTimes(1);
        expect(fetcher).toHaveBeenCalledTimes(2);
      } else {
        await expect(result).rejects.toThrow(
          "Only a recorded commitment or request",
        );
        expect(fetcher).not.toHaveBeenCalled();
        expect(dispatched).not.toHaveBeenCalled();
      }
    }
  });
});
