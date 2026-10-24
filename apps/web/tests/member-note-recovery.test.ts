import "./command-recovery-platform";
import { describe, expect, it } from "vitest";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import {
  prepareMemberNote,
  memberNoteRefusal,
  requireMemberNoteReceipt,
  memberNoteCommandReceiptSchema,
} from "../src/features/portfolio/relationships/member-notes/command";
import { recoverMemberNote } from "../src/features/portfolio/relationships/member-notes/api";
import {
  memberNoteRecoveryContract,
  memberNoteRecoveryScope,
} from "../src/features/portfolio/relationships/member-notes/recovery";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  withRecoveryCommandLock,
  updateRecovery,
  retireMemberNoteRefusalRecovery,
} from "../src/shared/session/recovery/journal";
import { installPlatform, local } from "./command-recovery-platform";

installPlatform();
const actor = {
  tenantId: "10000000-0000-4000-8000-000000000001",
  userId: "20000000-0000-4000-8000-000000000001",
};
const member = { id: "member-42", name: "Synthetic Member" };
const id = "30000000-0000-4000-8000-000000000001";
const guard = () => {};
const scope = memberNoteRecoveryScope(actor, member.id);
const prepare = () =>
  prepareMemberNote(actor, member, "Private synthetic note", id);
function response(attempt: Awaited<ReturnType<typeof prepare>>) {
  return {
    schemaVersion: 1,
    requestId: id,
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    payloadDigest: attempt.payloadDigest,
    note: {
      id,
      directoryContactId: member.id,
      directoryContactName: member.name,
      body: attempt.input.body,
      createdAt: "2026-10-24T12:00:00Z",
      createdBy: {
        id: actor.userId,
        email: null,
        firstName: null,
        lastName: null,
      },
    },
  };
}
describe("Directory note durable recovery", () => {
  it("only a typed exact rollback refusal permits explicit retirement", async () => {
    const attempt = await prepare();
    const failure = {
      schemaVersion: 1,
      code: "DIRECTORY_NOTE_REFUSED",
      requestId: id,
      memberId: member.id,
      payloadDigest: attempt.payloadDigest,
      status: 409,
      message: "Review changed member",
    };
    const matched = memberNoteRefusal(
      new ApiError(409, failure.message, failure),
      attempt,
    )!;
    expect(matched).toEqual(failure);
    await reserveRecovery(
      scope,
      id,
      attempt,
      memberNoteRecoveryContract,
      guard,
    );
    await updateRecovery(
      scope,
      id,
      { ...attempt, refusal: matched },
      memberNoteRecoveryContract,
      guard,
    );
    expect(
      (await readRecovery(scope, memberNoteRecoveryContract, guard))?.refusal,
    ).toEqual(failure);
    await retireMemberNoteRefusalRecovery(scope, id, matched, guard);
    expect(
      await readRecovery(scope, memberNoteRecoveryContract, guard),
    ).toBeNull();
  });
  it("generic denial and foreign rollback envelopes cannot release the command", async () => {
    const attempt = await prepare();
    const failure = {
      schemaVersion: 1,
      code: "DIRECTORY_NOTE_REFUSED",
      requestId: id,
      memberId: member.id,
      payloadDigest: attempt.payloadDigest,
      status: 409,
      message: "Review",
    };
    for (const error of [
      new ApiError(409, "Generic refusal"),
      new ApiError(403, "Denied", failure),
      new ApiError(409, "Wrong digest", {
        ...failure,
        payloadDigest: "0".repeat(64),
      }),
      new ApiError(409, "Foreign member", {
        ...failure,
        memberId: "member-99",
      }),
    ])
      expect(memberNoteRefusal(error, attempt)).toBeUndefined();
    await reserveRecovery(
      scope,
      id,
      attempt,
      memberNoteRecoveryContract,
      guard,
    );
    await expect(
      retireMemberNoteRefusalRecovery(
        scope,
        id,
        { ...failure, requestId: "30000000-0000-4000-8000-000000000002" },
        guard,
      ),
    ).rejects.toThrow();
    await expect(
      retireMemberNoteRefusalRecovery(
        scope,
        id,
        { ...failure, status: 403 },
        guard,
      ),
    ).rejects.toThrow();
    expect(
      await readRecovery(scope, memberNoteRecoveryContract, guard),
    ).toEqual(attempt);
  });
  it("retains the original encrypted attempt across view lifetimes without exposing its text in localStorage", async () => {
    const attempt = await prepare();
    await reserveRecovery(
      scope,
      id,
      attempt,
      memberNoteRecoveryContract,
      guard,
    );
    expect(
      await readRecovery(scope, memberNoteRecoveryContract, guard),
    ).toEqual(attempt);
    expect(JSON.stringify([...local.values()])).not.toContain(
      attempt.input.body,
    );
    expect(
      await readRecovery(
        memberNoteRecoveryScope({ ...actor, userId: "other-user" }, member.id),
        memberNoteRecoveryContract,
        guard,
      ),
    ).toBeNull();
  });
  it("two tabs reserve the same original command, even with different request IDs and text", async () => {
    const first = await prepare();
    const second = await prepareMemberNote(
      actor,
      member,
      "Different note",
      "30000000-0000-4000-8000-000000000002",
    );
    const results = await Promise.all(
      [first, second].map((attempt) =>
        withRecoveryCommandLock(scope, guard, () =>
          reserveRecovery(
            scope,
            attempt.input.requestId,
            attempt,
            memberNoteRecoveryContract,
            guard,
          ),
        ),
      ),
    );
    expect(results).toEqual([first, first]);
  });
  it("recovery performs only the original receipt GET and checks its exact digest and scope", async () => {
    const attempt = await prepare();
    const calls: { url: string; method: string }[] = [];
    const api = createApiClient(async (url, init) => {
      calls.push({ url: String(url), method: init?.method ?? "GET" });
      return Response.json(response(attempt));
    });
    expect(
      await recoverMemberNote(
        api,
        actor,
        attempt,
        guard,
        new AbortController().signal,
      ),
    ).toEqual(response(attempt).note);
    expect(calls).toEqual([
      {
        url: `/api/backend/core/directory/members/member-42/note-commands/${id}`,
        method: "GET",
      },
    ]);
  });
  it.each(["requestId", "tenantId", "actorUserId", "payloadDigest"])(
    "refuses a foreign %s",
    async (key) => {
      const attempt = await prepare();
      const value = response(attempt);
      expect(() =>
        requireMemberNoteReceipt(
          { ...value, [key]: "foreign" } as Parameters<
            typeof requireMemberNoteReceipt
          >[0],
          actor,
          attempt,
        ),
      ).toThrow("does not match");
    },
  );
  it("unavailable readback never clears the journal or sends a write", async () => {
    const attempt = await prepare();
    await reserveRecovery(
      scope,
      id,
      attempt,
      memberNoteRecoveryContract,
      guard,
    );
    const methods: string[] = [];
    const api = createApiClient(async (_url, init) => {
      methods.push(init?.method ?? "GET");
      return Response.json({ message: "Unavailable" }, { status: 404 });
    });
    await expect(
      recoverMemberNote(
        api,
        actor,
        attempt,
        guard,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(
      await readRecovery(scope, memberNoteRecoveryContract, guard),
    ).toEqual(attempt);
    expect(methods).toEqual(["GET"]);
  });
  it("only explicit acknowledgement retires the validated receipt", async () => {
    const attempt = await prepare();
    await reserveRecovery(
      scope,
      id,
      attempt,
      memberNoteRecoveryContract,
      guard,
    );
    requireMemberNoteReceipt(
      memberNoteCommandReceiptSchema.parse(response(attempt)),
      actor,
      attempt,
    );
    expect(
      await readRecovery(scope, memberNoteRecoveryContract, guard),
    ).toEqual(attempt);
    await acknowledgeRecovery(scope, id, guard);
    expect(
      await readRecovery(scope, memberNoteRecoveryContract, guard),
    ).toBeNull();
  });
});
