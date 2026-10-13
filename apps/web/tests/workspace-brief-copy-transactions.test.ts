import { describe, expect, it } from "vitest";
import { createCapiroApi } from "../src/shared/capiro/http";
import { capiroOperations } from "../src/shared/capiro/registry";
import {
  readCopyDocument,
  submitCopyIntent,
} from "../src/features/modules/workspace/brief-copy/transactions";
import {
  copyBody,
  copyDetail,
  copyIds,
  copyIntent,
  copyResult,
  copyScope,
  copySource,
  copyState,
  saveIntent,
} from "./workspace-brief-copy-fixtures";
import { testIdentity } from "../test/browser/fixtures";

function harness(
  overrides: Record<string, unknown | ((input: unknown) => unknown)> = {},
) {
  const requests: { key: string; input: unknown; method: string }[] = [];
  const controller = new AbortController();
  const replies: Record<string, unknown> = {
    "me.read": testIdentity,
    "workspace.brief-copy.state": copyState,
    "workspace.brief-copy.detail": copyDetail,
    "workspace.brief-copy.create": copyResult(),
    "workspace.brief-copy.save": copyResult("save_brief_copy"),
    ...overrides,
  };
  const api = createCapiroApi(capiroOperations, {
    fetcher: async (url, options) => {
      const target = new URL(String(url), "http://closed.synthetic");
      const key = decodeURIComponent(target.pathname.split("/").at(-1)!);
      const input: unknown =
        options?.method === "GET"
          ? JSON.parse(target.searchParams.get("input")!)
          : JSON.parse(String(options?.body));
      requests.push({ key, input, method: options?.method ?? "GET" });
      const response =
        typeof replies[key] === "function"
          ? await (replies[key] as (value: unknown) => unknown)(input)
          : replies[key];
      if (response instanceof Response) return response;
      if (response === undefined)
        throw new Error(`No synthetic response for ${key}`);
      return Response.json(response);
    },
  });
  return {
    api,
    requests,
    controller,
    lifetime: {
      signal: controller.signal,
      guard: () => controller.signal.throwIfAborted(),
    },
  };
}
const writes = (requests: ReturnType<typeof harness>["requests"]) =>
  requests.filter(({ method }) => method !== "GET");
describe("atomic copied-tab request lifetime", () => {
  it("sends only the exact copy command after current actor and destination reads, with zero Core writes", async () => {
    const h = harness();
    expect(
      await submitCopyIntent(h.api, copyScope, copyIntent, h.lifetime),
    ).toEqual(copyResult());
    expect(writes(h.requests)).toEqual([
      {
        key: "workspace.brief-copy.create",
        method: "POST",
        input: {
          params: { draftId: copyIds.draft },
          body: copyIntent.command.body,
        },
      },
    ]);
    expect(h.requests.map(({ key }) => key)).toEqual([
      "me.read",
      "workspace.brief-copy.state",
      "workspace.brief-copy.create",
    ]);
  });
  it("sends full rich JSON through atomic save, never legacy PATCH or snapshot", async () => {
    const h = harness();
    await submitCopyIntent(h.api, copyScope, saveIntent, h.lifetime);
    expect(writes(h.requests)).toEqual([
      {
        key: "workspace.brief-copy.save",
        method: "POST",
        input: {
          params: { draftId: copyIds.draft, docId: copyIds.document },
          body: saveIntent.command.body,
        },
      },
    ]);
  });
  it("replays the original baseline and full input without replacing them with a newer current hash", async () => {
    const newerState = { ...copyState, stateHash: "1".repeat(64) };
    const newerBody = {
      ...copyBody,
      blocks: [
        { ...copyBody.blocks[0]!, content: "Later independent edit" },
        ...copyBody.blocks.slice(1),
      ],
    };
    const h = harness({
      "workspace.brief-copy.state": newerState,
      "workspace.brief-copy.detail": {
        ...copyDetail,
        stateHash: newerState.stateHash,
        document: { ...copyDetail.document, body: newerBody },
      },
      "workspace.brief-copy.save": {
        ...copyResult("save_brief_copy"),
        replayed: true,
      },
    });
    const receipt = await submitCopyIntent(
      h.api,
      copyScope,
      saveIntent,
      h.lifetime,
    );
    const fresh = await readCopyDocument(
      h.api,
      copyScope,
      receipt.receipt.documentId,
      copySource,
      h.lifetime,
    );
    expect(receipt.receipt.stateHash).not.toBe(fresh.state.stateHash);
    expect(fresh.detail.document.body).toEqual(newerBody);
    expect(writes(h.requests)[0]!.input).toEqual({
      params: { draftId: copyIds.draft, docId: copyIds.document },
      body: saveIntent.command.body,
    });
  });
  for (const status of [403, 404, 503])
    it(`does not dispatch from a failed current destination ${status} read`, async () => {
      const h = harness({
        "workspace.brief-copy.state": () =>
          Response.json(
            { message: "Current destination unavailable" },
            { status },
          ),
      });
      await expect(
        submitCopyIntent(h.api, copyScope, copyIntent, h.lifetime),
      ).rejects.toThrow();
      expect(writes(h.requests)).toEqual([]);
    });
  for (const field of [
    "tenantId",
    "draftId",
    "prospectId",
    "clientId",
  ] as const)
    it(`does not dispatch after current ${field} replacement`, async () => {
      const h = harness({
        "workspace.brief-copy.state": { ...copyState, [field]: copyIds.other },
      });
      await expect(
        submitCopyIntent(h.api, copyScope, copyIntent, h.lifetime),
      ).rejects.toThrow();
      expect(writes(h.requests)).toEqual([]);
    });
  it("does not dispatch after Clerk actor replacement even when the DB user is unchanged", async () => {
    const h = harness({
      "me.read": {
        ...testIdentity,
        user: { ...testIdentity.user, clerkUserId: "other-clerk-actor" },
      },
    });
    await expect(
      submitCopyIntent(h.api, copyScope, copyIntent, h.lifetime),
    ).rejects.toThrow();
    expect(writes(h.requests)).toEqual([]);
  });
  it("does not submit a save against a different immutable source", async () => {
    const h = harness({
      "workspace.brief-copy.detail": {
        ...copyDetail,
        document: {
          ...copyDetail.document,
          sourceBriefVersion: { ...copySource, versionId: copyIds.other },
        },
      },
    });
    await expect(
      submitCopyIntent(h.api, copyScope, saveIntent, h.lifetime),
    ).rejects.toThrow();
    expect(writes(h.requests)).toEqual([]);
  });
  it("rejects canceled held reads before dispatch and canceled held receipts before admission", async () => {
    for (const key of [
      "workspace.brief-copy.state",
      "workspace.brief-copy.create",
    ]) {
      let release!: () => void;
      let entered!: () => void;
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const hold = new Promise<void>((resolve) => {
        release = resolve;
      });
      const h = harness({
        [key]: async () => {
          entered();
          await hold;
          return key.endsWith("state") ? copyState : copyResult();
        },
      });
      const pending = submitCopyIntent(
        h.api,
        copyScope,
        copyIntent,
        h.lifetime,
      );
      await started;
      h.controller.abort();
      release();
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(writes(h.requests)).toHaveLength(key.endsWith("state") ? 0 : 1);
    }
  });
  it("does not automatically repeat a lost command or interpret a mismatched receipt as success", async () => {
    for (const response of [
      () => {
        throw new TypeError("lost receipt");
      },
      {
        ...copyResult(),
        receipt: { ...copyResult().receipt, actorId: "other-user" },
      },
    ]) {
      const h = harness({ "workspace.brief-copy.create": response });
      await expect(
        submitCopyIntent(h.api, copyScope, copyIntent, h.lifetime),
      ).rejects.toThrow();
      expect(writes(h.requests)).toHaveLength(1);
    }
  });
  it("keeps a qualified state conflict distinct from generic/request conflicts", async () => {
    const h = harness({
      "workspace.brief-copy.create": () =>
        Response.json(
          { message: "Changed", code: "WORKSPACE_BRIEF_STATE_CONFLICT" },
          { status: 409 },
        ),
    });
    await expect(
      submitCopyIntent(h.api, copyScope, copyIntent, h.lifetime),
    ).rejects.toMatchObject({
      status: 409,
      code: "WORKSPACE_BRIEF_STATE_CONFLICT",
    });
    expect(writes(h.requests)).toHaveLength(1);
  });
});
