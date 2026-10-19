import { describe, expect, it } from "vitest";
import { legiwatchOperations } from "./legiwatch";
import { insightSchema } from "./legiwatch-hearing-schemas";

describe("verified LegiWatch contract boundaries", () => {
  it("keeps the ticket endpoint and actual gateway route tied to the validated session", () => {
    const operation = legiwatchOperations["legiwatch.session.wsTicket"];
    expect(operation.service).toBe("intelligence");
    expect(operation.path).toBe("/hearings/:id/ws-ticket");
    expect(operation.websocket).toEqual({
      path: "/live",
      sessionParam: "id",
      sessionQuery: "sessionId",
      ticketField: "ticket",
      ticketQuery: "ticket",
    });
    expect(
      operation.request.safeParse({
        params: { id: "session-1", tenantId: "other" },
      }).success,
    ).toBe(false);
    expect(
      operation.response.safeParse({
        ticket: "a",
        expiresAt: "2026-10-11T10:00:00Z",
      }).success,
    ).toBe(false);
  });
  it("requires an explicit attendance request while following preserves no capture demand", () => {
    const attendance = legiwatchOperations["legiwatch.attendance.request"];
    expect(
      attendance.request.safeParse({
        params: { id: "hearing-1" },
        body: {
          mode: "automatic",
          consentAcknowledged: true,
          tenantId: "other",
        },
      }).success,
    ).toBe(false);
    expect(
      legiwatchOperations["legiwatch.follow.update"].request.safeParse({
        params: { id: "hearing-1" },
        body: { capture: true },
      }).success,
    ).toBe(false);
  });
  it("preserves nullable official evidence without substituting transcript prose", () => {
    const insight = insightSchema.parse({
      id: "i",
      insightType: "KEY_QUOTE",
      title: "Quote",
      summary: "Summary",
      preliminary: true,
      speakerName: null,
      confidence: null,
      evidence: {
        segmentId: "s",
        sequence: 1,
        startMs: 0,
        endMs: 10,
        text: null,
      },
      entities: [],
      relevance: [
        {
          id: "r",
          clientId: "c",
          clientName: null,
          insightId: "i",
          score: 0.6,
          rationale: "Rationale",
          matchedOn: [],
        },
      ],
    });
    expect(insight.evidence.text).toBeNull();
    expect(insight.relevance[0]?.clientName).toBeNull();
  });
  it("rejects a delivery without the reviewed composition approval hash", () => {
    expect(
      legiwatchOperations["legiwatch.report.send"].request.safeParse({
        params: { id: "run-1" },
        body: {
          subject: "Update",
          introduction: "",
          selection: [
            { kind: "manual", email: "person@example.com", role: "to" },
          ],
        },
      }).success,
    ).toBe(false);
    expect(
      legiwatchOperations["legiwatch.folder.bulk"].response.safeParse({
        results: [{ billId: "canonical", status: "added" }],
        alertsActivated: true,
      }).success,
    ).toBe(false);
  });
});
