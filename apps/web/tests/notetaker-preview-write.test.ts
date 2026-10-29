import { describe, expect, it } from "vitest";
import { previewNotetakerWriteRoute } from "../src/shared/preview/notetaker-write.server";
import { previewBackendRejection } from "../src/shared/preview/backend-policy.server";

const api = "https://portfolio-preview.app.capiro.ai";
const meetingId = "90000000-0000-4000-8000-000000000001";
const clientId = "10000000-0000-4000-8000-000000000001";
const noteId = "95000000-0000-4000-8000-000000000001";
const request = (method: string, path: string, headers: Record<string, string> = {}) =>
  new Request(api + path, {
    method,
    headers: { "content-type": "application/json", ...headers },
  });

describe("preview note-taker writes", () => {
  it("admits every note-taker route the calendar actually calls", () => {
    const routes: Array<[string, string]> = [
      ["POST", `/api/backend/core/engagement/meetings/${meetingId}/notetaker`],
      ["DELETE", `/api/backend/core/engagement/meetings/${meetingId}/notetaker`],
      ["POST", `/api/backend/core/engagement/clients/${clientId}/notetaker`],
      ["DELETE", `/api/backend/core/engagement/clients/${clientId}/notetaker`],
      ["POST", `/api/backend/core/engagement/meetings/${meetingId}/prep`],
      ["POST", `/api/backend/core/engagement/meetings/${meetingId}/prep-jobs/${noteId}/resume`],
      ["DELETE", `/api/backend/core/engagement/meetings/${meetingId}/prep-jobs/${noteId}`],
      ["PATCH", `/api/backend/core/engagement/meeting-preps/${noteId}`],
      ["POST", `/api/backend/core/engagement/meeting-preps/${noteId}/pdf-attachment`],
      ["POST", `/api/backend/core/engagement/meetings/${meetingId}/debrief-draft`],
      ["POST", `/api/backend/core/engagement/meetings/${meetingId}/attachments/${noteId}/approve`],
      ["POST", "/api/backend/core/engagement/meeting-commands"],
    ];
    for (const [method, path] of routes)
      expect(previewNotetakerWriteRoute(request(method, path)), `${method} ${path}`).not.toBeNull();
  });

  it("refuses other engagement writes, other services and reads", () => {
    const refused: Array<[string, string]> = [
      ["POST", `/api/backend/core/engagement/meetings/${meetingId}/send`],
      ["POST", `/api/backend/core/engagement/campaigns/${meetingId}/send`],
      ["PUT", `/api/backend/core/engagement/meetings/${meetingId}/prep`],
      ["POST", `/api/backend/core/engagement/meetings/${meetingId}/prep/extra`],
      ["POST", `/api/backend/core/engagement/meetings/notetaker`],
      ["POST", `/api/backend/strategy/engagement/meetings/${meetingId}/prep`],
      ["POST", `/api/backend/core/clients/${clientId}/notetaker`],
      ["GET", `/api/backend/core/engagement/meetings/${meetingId}/notetaker`],
    ];
    for (const [method, path] of refused)
      expect(previewNotetakerWriteRoute(request(method, path)), `${method} ${path}`).toBeNull();
  });

  it("refuses impersonation and tenant override headers", () => {
    for (const header of ["x-capiro-tenant", "x-capiro-impersonate-tenant", "x-tenant-id", "x-user-id"])
      expect(
        previewNotetakerWriteRoute(
          request("POST", `/api/backend/core/engagement/meetings/${meetingId}/notetaker`, {
            [header]: "other",
          }),
        ),
      ).toBeNull();
  });

  it("still holds the rest of the backend in read-only preview", () => {
    const env = { CAPIRO_PREVIEW_READ_ONLY: "true" };
    // Unbound preview target: even an allowlisted write stays held.
    expect(
      previewBackendRejection(
        env,
        request("POST", `/api/backend/core/engagement/meeting-commands`),
      )?.status,
    ).toBe(503);
    // A non-allowlisted write is held too.
    expect(
      previewBackendRejection(env, request("POST", `/api/backend/core/engagement/meetings/${meetingId}/send`))
        ?.status,
    ).toBe(503);
  });
});
