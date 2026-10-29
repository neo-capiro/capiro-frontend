import "./command-recovery-platform";
import { describe, expect, it, vi } from "vitest";
import { installPlatform, db, local } from "./command-recovery-platform";
import { reviewRecovery } from "../src/features/portfolio/client-profile/enrichment/review-recovery";
import {
  applicationAttemptSchema,
  applicationResponse,
  type ApplicationResult,
} from "../src/features/portfolio/client-profile/enrichment/review-contracts";
import { sendApplication } from "../src/features/portfolio/client-profile/enrichment/application-api";
import { createApiClient } from "../src/shared/portfolio/api/http";
installPlatform();
const clientId = "10000000-0000-4000-8000-000000000001";
const actor = { tenantId: "tenant", userId: "reviewer" };
const runId = "10000000-0000-4000-8000-000000000002";
const findingId = "10000000-0000-4000-8000-000000000003";
const requestId = "10000000-0000-4000-8000-000000000004";
const otherId = "10000000-0000-4000-8000-000000000005";
const attempt = () =>
  applicationAttemptSchema.parse({
    kind: "assign",
    runId,
    findingId,
    target: { newMatter: { title: "Private reviewed matter title" } },
    command: {
      requestId,
      expectedClientRevision: "a".repeat(64),
      findings: [{ id: findingId, revision: "b".repeat(64) }],
    },
  });
const success = (): ApplicationResult => ({
  requestId,
  status: "completed",
  applied: [findingId],
  alreadyApplied: [],
  errors: [],
  replayed: false,
});
const guard = () => {};
const journal = () => reviewRecovery(clientId, actor, guard);

describe("enrichment application recovery", () => {
  it("retains the original selection, revision and private target encrypted across lifetimes", async () => {
    await journal().reserve(attempt());
    expect(await journal().load()).toEqual({ attempt: attempt() });
    for (const records of [db.records, local])
      expect(JSON.stringify([...records.values()])).not.toContain(
        "Private reviewed",
      );
    expect(
      await reviewRecovery(
        clientId,
        { ...actor, userId: "other" },
        guard,
      ).load(),
    ).toBeNull();
    expect(await reviewRecovery(otherId, actor, guard).load()).toBeNull();
  });
  it("two tabs cannot replace an unresolved selection or request identity", async () => {
    const original = attempt();
    const changed = {
      ...original,
      command: { ...original.command, requestId: otherId },
    };
    const results = await Promise.allSettled(
      [original, changed].map((value) =>
        journal().lock(() => journal().reserve(value)),
      ),
    );
    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect((await journal().load())?.attempt).toEqual(original);
  });
  it.each(["completed", "refused", "partial"] as const)(
    "accepts a complete %s receipt only for the exact selected items",
    (status) => {
      const original = attempt();
      if (status === "partial")
        original.command.findings.push({
          id: otherId,
          revision: "c".repeat(64),
        });
      const result =
        status === "completed"
          ? success()
          : {
              ...success(),
              status,
              applied: status === "partial" ? [findingId] : [],
              errors: [
                {
                  findingId: status === "partial" ? otherId : findingId,
                  message: "Review changed",
                },
              ],
            };
      expect(applicationResponse(original).safeParse(result).success).toBe(
        true,
      );
      expect(
        applicationResponse(original).safeParse({
          ...result,
          requestId: otherId,
        }).success,
      ).toBe(false);
      expect(
        applicationResponse(original).safeParse({
          ...result,
          alreadyApplied: [findingId],
        }).success,
      ).toBe(false);
      expect(
        applicationResponse(original).safeParse({
          ...result,
          applied: [],
          errors: [],
        }).success,
      ).toBe(false);
    },
  );
  it("recovers by resending the exact original command without rereviewing changed inputs", async () => {
    const original = attempt();
    await journal().reserve(original);
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ ...success(), replayed: true }),
    );
    const saved = (await journal().load())!;
    const result = await sendApplication(
      createApiClient(fetcher),
      clientId,
      saved.attempt,
      guard,
      new AbortController().signal,
      journal().received,
    );
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      ...original.command,
      ...(original.kind === "assign" ? original.target : {}),
    });
    expect((await journal().load())?.outcome).toEqual(result);
    await journal().acknowledge(requestId);
    expect(await journal().load()).toBeNull();
  });
  it("does not settle missing or mismatched results, storage failures or authority loss", async () => {
    const original = attempt();
    await journal().reserve(original);
    await expect(journal().acknowledge(requestId)).rejects.toThrow(
      "exact application result",
    );
    await expect(
      journal().received(original, { ...success(), requestId: otherId }),
    ).rejects.toThrow();
    await expect(
      reviewRecovery(clientId, actor, () => {
        throw new Error("Revoked");
      }).acknowledge(requestId),
    ).rejects.toThrow();
    db.failWrite = true;
    await expect(journal().received(original, success())).rejects.toThrow();
    db.failWrite = false;
    expect((await journal().load())?.outcome).toBeUndefined();
  });
  it("keeps a validated late response in the original scope without granting new UI authority", async () => {
    const original = attempt();
    let active = true;
    const current = () => {
      if (!active) throw new Error("Session changed");
    };
    const owner = reviewRecovery(clientId, actor, current);
    await owner.reserve(original);
    const api = createApiClient(async () => {
      active = false;
      return Response.json(success());
    });
    await expect(
      sendApplication(
        api,
        clientId,
        original,
        current,
        new AbortController().signal,
        owner.received,
      ),
    ).rejects.toThrow("Session changed");
    expect((await journal().load())?.outcome).toEqual(success());
    expect(
      await reviewRecovery(
        clientId,
        { ...actor, userId: "new actor" },
        guard,
      ).load(),
    ).toBeNull();
  });
  it("does not overwrite an already retained result", async () => {
    const original = attempt();
    await journal().reserve(original);
    await journal().received(original, success());
    await expect(
      journal().received(original, { ...success(), replayed: true }),
    ).rejects.toThrow();
    expect((await journal().load())?.outcome).toEqual(success());
  });
});
