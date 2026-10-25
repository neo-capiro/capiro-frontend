import { expect, it } from "vitest";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import { preflightMeetingArtifact } from "../src/features/portfolio/calendar/artifacts/api";
import {
  acceptanceMeeting,
  deferred,
} from "./browser/acceptance-meeting-artifacts-data";
const meeting = {
  ...acceptanceMeeting(),
  updatedAt: "2026-10-24T12:00:00.000Z",
};
it("rechecks the artifact list after the awaited parent read before journal reservation or dispatch", async () => {
  const held = deferred();
  let readable = true;
  const calls: string[] = [];
  const api = createApiClient(async (_url, request) => {
    calls.push(request?.method ?? "GET");
    await held.promise;
    return Response.json(meeting);
  });
  const result = preflightMeetingArtifact(
    api,
    meeting,
    () => {},
    new AbortController().signal,
    () => {
      if (!readable) throw new ApiError(409, "Saved artifacts unavailable");
    },
  );
  readable = false;
  held.release();
  await expect(result).rejects.toMatchObject({ status: 409 });
  expect(calls).toEqual(["GET"]);
});
it.each(["client", "revision", "aborted"])(
  "refuses changed %s preflight without a writer",
  async (kind) => {
    const controller = new AbortController();
    const calls: string[] = [];
    const api = createApiClient(async (_url, request) => {
      calls.push(request?.method ?? "GET");
      if (kind === "aborted") controller.abort();
      return Response.json({
        ...meeting,
        ...(kind === "client"
          ? { client: null }
          : kind === "revision"
            ? { updatedAt: "2026-10-24T12:01:00.000Z" }
            : {}),
      });
    });
    await expect(
      preflightMeetingArtifact(
        api,
        meeting,
        () => controller.signal.throwIfAborted(),
        controller.signal,
      ),
    ).rejects.toThrow();
    expect(calls).toEqual(["GET"]);
  },
);
it("a successful preflight only reads; durable dispatch has a separate retained original", async () => {
  const calls: string[] = [];
  const api = createApiClient(async (_url, request) => {
    calls.push(request?.method ?? "GET");
    return Response.json(meeting);
  });
  await preflightMeetingArtifact(
    api,
    meeting,
    () => {},
    new AbortController().signal,
  );
  expect(calls).toEqual(["GET"]);
});
