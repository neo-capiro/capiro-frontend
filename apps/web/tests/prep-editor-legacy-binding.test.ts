// Review finding 2 — a legacy prep with `clientId: null` is now readable from a
// client-scoped meeting, but the editor used to send the enclosing non-null client
// id while Core preserves the stored null stamp. The write commits and the receipt
// check then reports it invalid (502), which invites a blind retry.
//
// Correction under test: an unbound row is explicitly read-only until the backend
// establishes its binding; known-client editing keeps working, and a stated
// different non-null client is still refused.
import { describe, expect, it } from "vitest";
import type { Preparation } from "../src/features/portfolio/calendar/preparation/schema";
import {
  editValues,
  prepEditability,
} from "../src/features/portfolio/calendar/preparation/editing";
import { submitPrepEdit } from "../src/features/portfolio/calendar/preparation/PreparationEditor";
import {
  readPreparation,
  savePreparation,
} from "../src/features/portfolio/calendar/preparation/api";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";

const CLIENT = "5c1f0d6a-1b0e-4a4a-9f3a-2b0c9d8e7f61";
const OTHER = "9b2c4d1e-2f3a-4b5c-8d6e-7f8091a2b3c4";

function storedPrep(overrides: Partial<Preparation> = {}): Preparation {
  return {
    id: "prep-legacy-1",
    meetingId: "meeting-1",
    clientId: null,
    status: "approved",
    summary: "Synthetic summary",
    agenda: ["Synthetic agenda"],
    talkingPoints: [],
    risks: [],
    followUps: [],
    emailEvidence: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
    generatedFrom: {},
    ...overrides,
  };
}

function changedValues(prep: Preparation) {
  return { ...editValues(prep), summary: "Synthetic summary, revised" };
}

/** A real request/response pair through the same client the editor uses. */
function apiReturning(
  reply: (request: {
    method?: string;
    url: string;
    body?: unknown;
  }) => Response,
  calls: Array<{ method?: string; url: string; body?: unknown }> = [],
) {
  return createApiClient(async (url, request) => {
    const call = {
      method: request?.method,
      url: String(url),
      body:
        typeof request?.body === "string"
          ? JSON.parse(request.body)
          : undefined,
    };
    calls.push(call);
    return reply(call);
  });
}

describe("prepEditability — unknown client provenance is not writable", () => {
  it("treats a legacy null stamp under a client-scoped meeting as read-only", () => {
    expect(prepEditability({ clientId: null }, CLIENT)).toBe("unbound-legacy");
  });

  it("keeps a correctly bound row editable, including a client-less meeting", () => {
    expect(prepEditability({ clientId: CLIENT }, CLIENT)).toBe("editable");
    expect(prepEditability({ clientId: null }, null)).toBe("editable");
  });

  it("still names a stated different client as such", () => {
    expect(prepEditability({ clientId: OTHER }, CLIENT)).toBe("other-client");
    expect(prepEditability({ clientId: CLIENT }, null)).toBe("other-client");
  });
});

describe("submitPrepEdit — the editor never sends an unbound or foreign row", () => {
  it("does not save a legacy null-stamped prep under a client-scoped meeting", () => {
    const prep = storedPrep();
    const bodies: unknown[] = [];
    submitPrepEdit({
      prep,
      values: changedValues(prep),
      clientId: CLIENT,
      canWrite: true,
      save: (body) => bodies.push(body),
    });
    // No PATCH is issued, so a committed-then-invalid save cannot occur here.
    expect(bodies).toEqual([]);
  });

  it("does not save a prep that names another client", () => {
    const prep = storedPrep({ clientId: OTHER });
    const bodies: unknown[] = [];
    submitPrepEdit({
      prep,
      values: changedValues(prep),
      clientId: CLIENT,
      canWrite: true,
      save: (body) => bodies.push(body),
    });
    expect(bodies).toEqual([]);
  });

  it("saves only the changed sections of a correctly bound prep", () => {
    const prep = storedPrep({ clientId: CLIENT });
    const bodies: Array<Record<string, unknown>> = [];
    submitPrepEdit({
      prep,
      values: changedValues(prep),
      clientId: CLIENT,
      canWrite: true,
      save: (body) => bodies.push(body as Record<string, unknown>),
    });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toEqual({ summary: "Synthetic summary, revised" });
  });

  it("sends nothing when the body is unchanged", () => {
    const prep = storedPrep({ clientId: CLIENT });
    const bodies: unknown[] = [];
    submitPrepEdit({
      prep,
      values: editValues(prep),
      clientId: CLIENT,
      canWrite: true,
      save: (body) => bodies.push(body),
    });
    expect(bodies).toEqual([]);
  });
});

describe("savePreparation — the committed save and its receipt", () => {
  it("accepts the server echo for a correctly bound prep (ordinary editing works)", async () => {
    const prep = storedPrep({ clientId: CLIENT });
    const calls: Array<{ method?: string; url: string; body?: unknown }> = [];
    const api = apiReturning(
      () => Response.json({ ...prep, summary: "Synthetic summary, revised" }),
      calls,
    );
    const saved = await savePreparation(
      api,
      "meeting-1",
      prep.id,
      { summary: "Synthetic summary, revised" },
      CLIENT,
    );
    expect(saved.summary).toBe("Synthetic summary, revised");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.url).toBe(
      `/api/backend/core/engagement/meeting-preps/${prep.id}`,
    );
    expect(calls[0]?.body).toEqual({ summary: "Synthetic summary, revised" });
  });

  it("refuses a receipt stamped with a different client", async () => {
    const prep = storedPrep({ clientId: OTHER });
    const api = apiReturning(() => Response.json(prep));
    await expect(
      savePreparation(api, "meeting-1", prep.id, { summary: "x" }, CLIENT),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("does not report a null stamp as a plain retry: the guidance is to check the saved record", async () => {
    // The race the read-only rule exists to prevent: a bound row whose write comes
    // back with the stored stamp missing. It is refused, and the message tells the
    // reader to check the saved content rather than to resend.
    const legacy = storedPrep();
    const api = apiReturning(() => Response.json(legacy));
    await expect(
      savePreparation(api, "meeting-1", legacy.id, { summary: "x" }, CLIENT),
    ).rejects.toThrow(/refresh to check the saved content/i);
  });
});

describe("readPreparation — the readback used to settle an uncertain save", () => {
  it("reads the stored prep by id under the same meeting and client identity", async () => {
    const prep = storedPrep({ clientId: CLIENT, summary: "Stored summary" });
    const calls: Array<{ method?: string; url: string; body?: unknown }> = [];
    const api = apiReturning(() => Response.json(prep), calls);
    const stored = await readPreparation(api, "meeting-1", prep.id, CLIENT);
    expect(stored.summary).toBe("Stored summary");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.url).toBe(
      `/api/backend/core/engagement/meeting-preps/${prep.id}`,
    );
    // A readback never writes.
    expect(calls[0]?.body).toBeUndefined();
  });

  it("refuses a readback that returns another client identity", async () => {
    const prep = storedPrep({ clientId: OTHER, summary: "Stored summary" });
    const api = apiReturning(() => Response.json(prep));
    await expect(
      readPreparation(api, "meeting-1", prep.id, CLIENT),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("refuses a readback that returns an unbound legacy row for a bound meeting", async () => {
    const prep = storedPrep({ clientId: null, summary: "Stored summary" });
    const api = apiReturning(() => Response.json(prep));
    await expect(
      readPreparation(api, "meeting-1", prep.id, CLIENT),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("surfaces a denied readback as an error, never as a reconciled outcome", async () => {
    const api = apiReturning(() =>
      Response.json({ message: "Forbidden" }, { status: 403 }),
    );
    await expect(
      readPreparation(api, "meeting-1", "prep-legacy-1", CLIENT),
    ).rejects.toMatchObject({ status: 403 });
  });
});
