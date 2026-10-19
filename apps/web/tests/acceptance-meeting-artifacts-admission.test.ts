import { describe, expect, it } from "vitest";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import { changeMeetingArtifact } from "../src/features/portfolio/calendar/artifacts/api";
import {
  acceptanceMeeting,
  acceptanceMetadata,
  deferred,
  localDraft,
} from "./browser/acceptance-meeting-artifacts-data";

for (const kind of ["notes", "debriefs"] as const) {
  describe(`${kind} artifact admission around parent preflight`, () => {
    it("refuses a changed list after the awaited parent read before any write", async () => {
      const held = deferred();
      const calls: string[] = [];
      let readable = true;
      const api = createApiClient(async (_url, request) => {
        calls.push(request?.method ?? "GET");
        if (request?.method === "GET") {
          await held.promise;
          return Response.json(acceptanceMeeting());
        }
        return Response.json(acceptanceMetadata(kind));
      });
      const result = changeMeetingArtifact(
        api,
        acceptanceMeeting(),
        kind,
        { tenantId: "tenant-test", userId: "user-test" },
        { action: "save", body: localDraft, confidential: false },
        () => {},
        new AbortController().signal,
        () => {
          if (!readable) throw new ApiError(409, "Saved artifacts unavailable");
        },
      );
      readable = false;
      held.release();
      await expect(result).rejects.toMatchObject({ uncertain: false });
      expect(calls).toEqual(["GET"]);
    });

    it("keeps a valid dispatched receipt meaningful after its list becomes unavailable", async () => {
      const dispatched = deferred();
      const held = deferred();
      const calls: string[] = [];
      let readable = true;
      let admissions = 0;
      const api = createApiClient(async (_url, request) => {
        calls.push(request?.method ?? "GET");
        if (request?.method === "GET")
          return Response.json(acceptanceMeeting());
        dispatched.release();
        await held.promise;
        return Response.json(acceptanceMetadata(kind));
      });
      const result = changeMeetingArtifact(
        api,
        acceptanceMeeting(),
        kind,
        { tenantId: "tenant-test", userId: "user-test" },
        { action: "save", body: localDraft, confidential: false },
        () => {},
        new AbortController().signal,
        () => {
          admissions += 1;
          if (!readable) throw new ApiError(409, "Saved artifacts unavailable");
        },
      );
      await dispatched.promise;
      readable = false;
      held.release();
      await expect(result).resolves.toBeUndefined();
      expect(admissions).toBe(1);
      expect(calls).toEqual(["GET", "POST"]);
    });
  });
}
