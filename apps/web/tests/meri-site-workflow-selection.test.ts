import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  ConversationStoredRequest,
  ConversationSubmitRequest,
} from "@capiro/meri-contracts/conversation-application";
import { receiveConversationInputRequest } from "@capiro/meri-contracts/conversation-input";
import {
  conversationIntentJournal,
  receiveSkillSelection,
  skillSelectionFields,
  storedSubmission,
  withProcedureSelection,
  withoutDocumentRevision,
} from "../src/shared/meri-conversations/query-journal";
import { conversationTurnJournal } from "../src/shared/meri-conversations/turn-journal";
import { clearMeriConversationScope } from "../src/shared/meri-conversations/tab-journal";
import { createInitialDraftOwner } from "../src/shared/meri-conversations/initial-draft";
import {
  matchesStoredRequest,
  recoverRequest,
  sendRequest,
} from "../src/features/meri/conversation/run-commands";
import { SelectedRequestReceipt } from "../src/features/meri/conversation/SelectedRequestReceipt";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import { memoryStorage } from "./meri-preview-revision-fixtures";
import { ids, session } from "./meri-document-public-fixtures";

import { createMeriConversation } from "@capiro/meri-client/conversation";

const siteWorkflow = {
  siteId: "synthetic-site",
  workflowId: "synthetic-task",
  version: 3,
  manifestSha256: "a".repeat(64),
};
const selection = { siteWorkflow };
const request = {
  requestId: ids.other,
  prompt: "Read the synthetic task",
  ...selection,
};
const stored: ConversationStoredRequest = {
  ...request,
  skill: null,
  window: null,
  windowRequest: null,
};
const scope = {
  ...session.context,
  clientId: session.context.selectedClientId,
};
const source = {
  ...session.context,
  attemptId: ids.artifact,
  workerId: ids.version,
  writerFence: 1,
};

it("retains a closed immutable selector in the installed input contract and draft owner", () => {
  const mutable = structuredClone(selection);
  const admitted = receiveSkillSelection(mutable);
  mutable.siteWorkflow.version = 99;
  expect(admitted).toEqual(selection);
  expect(Object.isFrozen(admitted.siteWorkflow)).toBe(true);
  expect(
    receiveConversationInputRequest(
      new TextEncoder().encode(JSON.stringify(request)),
    ).siteWorkflow,
  ).toEqual(siteWorkflow);
  const storage = memoryStorage(),
    draft = createInitialDraftOwner(scope, storage);
  draft.edit(request.prompt);
  draft.selectSkill(admitted);
  expect(createInitialDraftOwner(scope, storage).selection()).toEqual(
    selection,
  );
  expect(withProcedureSelection(admitted, undefined)).toEqual(selection);
  expect(withoutDocumentRevision(admitted)).toEqual(selection);
  clearMeriConversationScope(scope, storage);
  expect(createInitialDraftOwner(scope, storage).selection()).toBeUndefined();
  expect(() => draft.selectSkill(admitted)).toThrow();
});

it.each([
  { version: 0 },
  { version: 1.5 },
  { manifestSha256: "wrong" },
  { siteId: "https://synthetic.invalid" },
  { workflowId: "" },
  { password: "never-admitted" },
  { cookies: [] },
])(
  "refuses malformed/extra workflow data before storing or sending: %j",
  (patch) => {
    const storage = memoryStorage(),
      draft = createInitialDraftOwner(scope, storage);
    expect(() =>
      draft.selectSkill({ siteWorkflow: { ...siteWorkflow, ...patch } }),
    ).toThrow();
    expect(createInitialDraftOwner(scope, storage).selection()).toBeUndefined();
  },
);

it.each([true, false])(
  "retries exact website selection after lost acknowledgement (initial=%s)",
  async (initial) => {
    const storage = memoryStorage(),
      cache = new QueryClient();
    const journal = conversationIntentJournal(cache, session.context, storage);
    const captured: ConversationSubmitRequest[] = [];
    const dispatch = vi.fn(async (input: ConversationSubmitRequest) => {
      captured.push(structuredClone(input));
      if (captured.length === 1) throw Error("lost acknowledgement");
    });
    const port = {
      submitInitial: dispatch,
      submit: dispatch,
      getSnapshot: () => ({ submit: "idle", observation: null }),
    } as unknown as MeriConversationPort;
    await expect(
      sendRequest(
        port,
        journal,
        request.prompt,
        false,
        initial,
        undefined,
        undefined,
        selection,
      ),
    ).rejects.toThrow("lost acknowledgement");
    expect(Object.isFrozen(journal.read().submit!.siteWorkflow)).toBe(true);
    cache.clear();
    const restoredCache = new QueryClient();
    try {
      const restored = conversationIntentJournal(
        restoredCache,
        session.context,
        storage,
      );
      await sendRequest(
        port,
        restored,
        "Changed draft",
        true,
        initial,
        undefined,
        undefined,
        { siteWorkflow: { ...siteWorkflow, version: 4 } },
      );
      expect(captured[0]?.siteWorkflow).toEqual(siteWorkflow);
      expect(captured[1]).toEqual(captured[0]);
      expect(restored.read().submit?.state).toBe("observed");
    } finally {
      restoredCache.clear();
    }
  },
);

it("recovers a follow-up selector and refuses a changed task, version or hash under the retained request", () => {
  const storage = memoryStorage(),
    cache = new QueryClient();
  const journal = conversationTurnJournal(
    cache,
    scope,
    scope.clientId,
    scope.conversationId,
    storage,
  );
  journal.start(
    source,
    request.prompt,
    request.requestId,
    undefined,
    selection,
  );
  cache.clear();
  const restoredCache = new QueryClient();
  try {
    const restored = conversationTurnJournal(
      restoredCache,
      scope,
      scope.clientId,
      scope.conversationId,
      storage,
    );
    expect(restored.read()).toMatchObject({ ...selection, state: "unknown" });
    for (const patch of [
      { siteId: "other-site" },
      { workflowId: "other-task" },
      { version: 4 },
      { manifestSha256: "b".repeat(64) },
    ]) {
      expect(
        restored.write({
          ...restored.read()!,
          siteWorkflow: { ...siteWorkflow, ...patch },
        }),
      ).toBe(false);
    }
    clearMeriConversationScope(scope, storage);
    expect(restored.current()).toBe(false);
  } finally {
    restoredCache.clear();
  }
});

it("canonical history restores the exact selector and a mismatched history cannot trigger a replay", async () => {
  expect(storedSubmission(stored)).toEqual(request);
  const cache = new QueryClient(),
    journal = conversationIntentJournal(cache, session.context);
  const submit = vi.fn(async () => undefined);
  const port = {
    submit,
    getSnapshot: () => ({ submit: "idle", observation: {} }),
  } as unknown as MeriConversationPort;
  try {
    await recoverRequest(port, journal, stored);
    expect(submit).toHaveBeenCalledWith(request);
    expect(matchesStoredRequest(journal.read().submit, stored)).toBe(true);
    for (const siteWorkflow of [
      undefined,
      { ...selection.siteWorkflow, version: 4 },
      { ...selection.siteWorkflow, manifestSha256: "b".repeat(64) },
    ]) {
      const changed = { ...stored, siteWorkflow };
      expect(matchesStoredRequest(journal.read().submit, changed)).toBe(false);
      await expect(recoverRequest(port, journal, changed)).rejects.toThrow();
    }
    expect(submit).toHaveBeenCalledTimes(1);
  } finally {
    cache.clear();
  }
});

it("shows website selection beside a document revision without claiming website execution", () => {
  const html = renderToStaticMarkup(
    createElement(SelectedRequestReceipt, {
      request: {
        ...stored,
        documentRevision: {
          artifactId: ids.artifact,
          versionId: ids.version,
          objectSha256: "b".repeat(64),
        },
      },
      scope: "Synthetic client",
    }),
  );
  expect(html).toContain("Applied document revision");
  expect(html).toContain("Applied website task: synthetic-task");
  expect(html).toContain("Configuration version: 3");
  expect(html).toContain("checked when it runs");
  expect(html).not.toContain(siteWorkflow.manifestSha256);
  expect(skillSelectionFields(selection)).toEqual(selection);
});

it.each(["same", "absent", "version", "hash", "added"])(
  "installed public client checks website selection on history after admission: %s",
  async (variant) => {
    const input =
      variant === "added"
        ? { requestId: request.requestId, prompt: request.prompt }
        : request;
    let saved: ConversationStoredRequest = {
      ...input,
      skill: null,
      window: null,
      windowRequest: null,
    };
    const binding = {
      tenantId: source.tenantId,
      actorId: source.actorId,
      conversationId: source.conversationId,
      runId: source.runId,
      attemptId: source.attemptId,
      workerId: source.workerId,
      writerFence: 1,
    };
    const run = {
      binding,
      state: "queued",
      scopes: [
        {
          tenantId: scope.tenantId,
          kind: "client",
          resourceId: scope.clientId,
          policyRevision: "policy1",
        },
      ],
      createdAt: "2026-10-29T00:00:00Z",
      policyRevision: "policy1",
      versions: {
        imageDigest: `sha256:${"a".repeat(64)}`,
        sdk: "0.3.295",
        cli: "2.1.295",
        contracts: "0.1.0",
        skillsDigest: "b".repeat(64),
        checkpointFormat: "0.1.0",
      },
    };
    const client = createMeriConversation({
      context: session.context,
      credential: session.credential,
      expiresAtMs: 301000,
      now: () => 1000,
      signal: new AbortController().signal,
      isCurrent: () => true,
      onAccessLost: () => undefined,
      origin: "https://synthetic.invalid",
      fetchImpl: async (url) => {
        if (String(url).endsWith("/submit"))
          return Response.json({
            run,
            requestId: request.requestId,
            lastSequence: 1,
            replayed: false,
          });
        if (String(url).endsWith("/input/admit"))
          return Response.json({
            run,
            request: saved,
            lastSequence: 1,
            replayed: false,
          });
        if (String(url).endsWith("/history"))
          return Response.json({
            run,
            request: saved,
            events: [],
            nextSequence: 1,
            hasMore: false,
            lastSequence: 1,
          });
        throw Error("Unexpected route");
      },
    });
    try {
      await client.submit(input);
      if (variant === "absent") delete saved.siteWorkflow;
      else if (variant === "version")
        saved = { ...saved, siteWorkflow: { ...siteWorkflow, version: 4 } };
      else if (variant === "hash")
        saved = {
          ...saved,
          siteWorkflow: { ...siteWorkflow, manifestSha256: "b".repeat(64) },
        };
      else if (variant === "added") saved = { ...saved, siteWorkflow };
      if (variant === "same") {
        await client.history({ after: 1, limit: 100 });
        expect(client.getSnapshot().acceptedRequest?.siteWorkflow).toEqual(
          siteWorkflow,
        );
      } else {
        await expect(client.history({ after: 1, limit: 100 })).rejects.toThrow(
          "REQUEST_MISMATCH",
        );
        expect(client.getSnapshot().status).not.toBe("ready");
      }
    } finally {
      client.dispose();
    }
  },
);
