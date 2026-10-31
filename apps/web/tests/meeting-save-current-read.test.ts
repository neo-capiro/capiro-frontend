import { beforeEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { parseMeeting } from "../src/features/portfolio/calendar/contracts";
import { useSaveMeeting } from "../src/features/portfolio/calendar/mutations";

const observed = vi.hoisted(() => ({
  cache: undefined as QueryClient | undefined,
  blocked: false,
  guard: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => observed.cache,
}));
vi.mock(
  "../src/features/portfolio/calendar/commands/useMeetingCommand",
  () => ({
    useMeetingCommand: () => observed,
  }),
);
const payload = {
  id: "synthetic-meeting",
  subject: "Internal fixture",
  updatedAt: "2026-10-31T12:00:00Z",
  description: null,
  location: null,
  startsAt: "2026-11-01T12:00:00Z",
  endsAt: "2026-11-01T13:00:00Z",
  status: "scheduled",
  joinLink: null,
  visibility: "private",
  isVirtual: false,
  meri: null,
  client: { id: "synthetic-client", name: "Internal client" },
  attendees: [],
  preps: [],
};
const read = parseMeeting(payload);
const key = ["meeting", payload.id, payload.client.id];
const input = {
  subject: "Updated internal fixture",
  startsAt: payload.startsAt,
  endsAt: payload.endsAt,
  expectedRevision: payload.updatedAt,
};
beforeEach(() => {
  observed.cache = new QueryClient();
  observed.cache.setQueryData(key, parseMeeting(payload));
  observed.blocked = false;
  observed.guard.mockReset();
  observed.save.mockReset().mockImplementation(async (_change, before) => {
    await before(new AbortController().signal, observed.guard);
  });
});
function useSaveFixture() {
  useSaveMeeting(
    read.meeting,
    vi.fn(),
    payload.client.id,
    payload.client.id,
  ).mutate(input);
  return observed.save.mock.results[0]?.value;
}
it("accepts the actual parseMeeting envelope and preserves assignment and CAS", async () => {
  await expect(useSaveFixture()).resolves.toBeUndefined();
  expect(observed.guard).toHaveBeenCalledOnce();
  expect(observed.save.mock.calls[0][0]).toMatchObject({
    operation: "update",
    meetingId: payload.id,
    expectedClientId: payload.client.id,
    expectedRevision: payload.updatedAt,
    meeting: { assignClient: false, clientId: null, subject: input.subject },
  });
});
it.each([
  [
    "wrong meeting",
    { ...read, meeting: { ...read.meeting, id: "other-meeting" } },
  ],
  [
    "reassigned client",
    { ...read, meeting: { ...read.meeting, client: null } },
  ],
  [
    "new revision",
    {
      ...read,
      meeting: { ...read.meeting, updatedAt: "2026-10-31T13:00:00Z" },
    },
  ],
  ["naked meeting", read.meeting],
])("rejects %s in the exact detail cache", async (_label, data) => {
  observed.cache!.setQueryData(key, data);
  await expect(useSaveFixture()).rejects.toMatchObject({ status: 409 });
});
it.each([
  ["fetching", { fetchStatus: "fetching" as const }],
  ["paused", { fetchStatus: "paused" as const }],
  ["invalidated", { isInvalidated: true }],
  ["failed", { status: "error" as const, error: new Error("Read failed") }],
])("rejects a %s detail read", async (_label, state) => {
  observed
    .cache!.getQueryCache()
    .find({ queryKey: key, exact: true })!
    .setState(state);
  await expect(useSaveFixture()).rejects.toMatchObject({ status: 409 });
});
it("does not accept another read scope or an absent current read", async () => {
  observed.cache!.removeQueries({ queryKey: key, exact: true });
  observed.cache!.setQueryData(["meeting", payload.id, null], read);
  await expect(useSaveFixture()).rejects.toMatchObject({ status: 409 });
});
it("preserves the actor guard and blocked recovery behavior", async () => {
  observed.guard.mockImplementation(() => {
    throw new Error("Actor changed");
  });
  await expect(useSaveFixture()).rejects.toThrow("Actor changed");
  observed.save.mockClear();
  observed.blocked = true;
  useSaveFixture();
  expect(observed.save).not.toHaveBeenCalled();
});
it("keeps creation independent of a detail cache while retaining the guard", async () => {
  observed.cache!.clear();
  useSaveMeeting(undefined, vi.fn(), payload.client.id).mutate(input);
  await expect(observed.save.mock.results[0].value).resolves.toBeUndefined();
  expect(observed.guard).toHaveBeenCalledOnce();
  expect(observed.save.mock.calls[0][0]).toMatchObject({
    operation: "create",
    meetingId: null,
    expectedRevision: null,
    meeting: { assignClient: true, clientId: payload.client.id },
  });
});
