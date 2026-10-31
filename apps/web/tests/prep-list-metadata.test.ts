import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError } from "../src/shared/portfolio/api/http";
import {
  meetingListSchema,
  meetingSchema,
  parseMeeting,
} from "../src/features/portfolio/calendar/contracts";
import {
  preparationListSchema,
  preparationSchema,
} from "../src/features/portfolio/calendar/preparation/schema";
import { fetchMeetings } from "../src/features/portfolio/calendar/feeds";
import {
  readPreparation,
  savePreparation,
} from "../src/features/portfolio/calendar/preparation/api";
import { prepReadbackDecision } from "../src/features/portfolio/calendar/preparation/PreparationEditor";
import { meetingMaterials } from "../src/features/portfolio/calendar/lifecycle";
import type { ApiClient } from "../src/shared/portfolio/api/http";

/**
 * PR #373 return: D5 list tolerance lives in a LIST-ONLY schema. The shared schema also
 * validates the editor's PATCH receipt and the readback GET, where an omitted body means the
 * stored content is unknown — not empty and not deleted.
 */

const MEETING = "00000000-0000-4000-8000-000000000005";
const PREP = "00000000-0000-4000-8000-000000000009";

/** Exactly Core's ten-field list projection (no body fields at all). */
const metadataPrep = {
  id: PREP,
  meetingId: MEETING,
  clientId: null,
  status: "approved",
  provider: "anthropic",
  model: "synthetic-model",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
  sharedAt: null,
  sharedByUserId: null,
};

/** A complete detail/save row, including the identity fields those responses carry. */
const fullPrep = {
  ...metadataPrep,
  summary: "Stored summary",
  agenda: ["Stored agenda"],
  talkingPoints: [],
  risks: [],
  followUps: [],
  emailEvidence: [],
};

const EMPTY_VALUES = {
  summary: "",
  agenda: "",
  talkingPoints: "",
  risks: "",
  followUps: "",
  emailEvidence: "",
};

function meetingPayload(preps: unknown[]) {
  return {
    id: MEETING,
    subject: "Metadata-only list row",
    startsAt: "2026-10-12T13:00:00.000Z",
    endsAt: "2026-10-12T14:00:00.000Z",
    status: "scheduled",
    description: null,
    location: null,
    joinLink: null,
    visibility: "private",
    isVirtual: false,
    meri: null,
    client: null,
    attendees: [],
    preps,
    notes: [],
    debriefs: [],
    attachments: [],
  };
}

/**
 * Mirrors createApiClient's response handling for a 200: the response body is parsed with
 * the schema the call supplied, and a body that does not match raises the same 502 ApiError
 * the real client raises. Nothing else (no fetch, no auth) is modelled.
 */
function clientReturning(payload: unknown) {
  const calls: string[] = [];
  const api = {
    request: async (
      _target: string,
      path: string,
      schema: z.ZodTypeAny,
      options?: { method?: string },
    ) => {
      calls.push(`${options?.method ?? "GET"} ${path}`);
      const parsed = schema.safeParse(payload);
      if (!parsed.success)
        throw new ApiError(
          502,
          "The service returned an unexpected response. Please retry or contact support.",
        );
      return parsed.data;
    },
  } as unknown as ApiClient;
  return { api, calls };
}

describe("D5 — the calendar list parses metadata-only preps", () => {
  it("accepts the list projection through the LIST schema only", () => {
    const parsed = preparationListSchema.parse(metadataPrep);

    expect(parsed.status).toBe("approved");
    expect(parsed.summary).toBeNull();
    expect(parsed.agenda).toEqual([]);
    // The shared/detail schema still refuses it: no body was sent.
    expect(preparationSchema.safeParse(metadataPrep).success).toBe(false);
  });

  it("parses a whole list feed and keeps the lifecycle labels", async () => {
    const { api } = clientReturning([meetingPayload([metadataPrep])]);
    const feed = await fetchMeetings(
      api,
      "2026-10-01T00:00:00.000Z",
      "2026-11-01T00:00:00.000Z",
      "UTC",
    );

    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]?.meeting?.preps[0]?.status).toBe("approved");
    expect(meetingMaterials(feed.items[0]!.meeting!).prep).toBe("Approved");
    expect(
      meetingListSchema.safeParse(meetingPayload([metadataPrep])).success,
    ).toBe(true);
  });

  it("keeps a full detail row parsing and still refuses a missing body", () => {
    expect(meetingSchema.safeParse(meetingPayload([fullPrep])).success).toBe(
      true,
    );
    const read = parseMeeting(meetingPayload([fullPrep]));
    expect(read.meeting.preps[0]?.summary).toBe("Stored summary");
    expect(read.unusablePreps).toBe(0);
    // A detail read that omits the body is insufficient, not empty.
    expect(
      meetingSchema.safeParse(meetingPayload([metadataPrep])).success,
    ).toBe(false);
  });
});

describe("PR #373 — body omission cannot confirm a save or a deletion", () => {
  it("case 1: a metadata-only PATCH receipt is refused, so the editor cannot close as saved", async () => {
    const { api } = clientReturning(metadataPrep);

    // The PATCH succeeded at the transport level but its receipt carries no body: the
    // save is NOT confirmed, so the editor's onSuccess (close) never runs.
    await expect(
      savePreparation(api, MEETING, PREP, { summary: "Changed" }, null),
    ).rejects.toThrow(/unexpected response/);
  });

  it("case 2: an uncertain save cannot be settled by a metadata-only GET", async () => {
    const { api, calls } = clientReturning(metadataPrep);

    await expect(readPreparation(api, MEETING, PREP, null)).rejects.toThrow(
      /unexpected response/,
    );
    // The read is the authorised GET and it wrote nothing: no stored projection reached
    // prepReadbackDecision, so no confirmation and no second PATCH are possible.
    expect(calls).toEqual([`GET engagement/meeting-preps/${PREP}`]);
  });

  it("case 3: an omitted summary cannot pass as a summary:null deletion", () => {
    expect(preparationSchema.safeParse(metadataPrep).success).toBe(false);

    // Control: a REAL deletion — full body with an explicit null — is still confirmed.
    const stored = preparationSchema.parse({ ...fullPrep, summary: null });
    expect(
      prepReadbackDecision({
        attempt: { body: { summary: null }, values: EMPTY_VALUES },
        stored,
        draft: EMPTY_VALUES,
      }).kind,
    ).toBe("confirmed");

    // And a full-body save receipt is still accepted.
    expect(preparationSchema.safeParse(fullPrep).success).toBe(true);
  });
});
