import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import { lifecycleJournal } from "../src/shared/meri-conversation-lifecycle/journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import type { ConversationLifecycleControlRequest } from "@capiro/meri-contracts/conversation-lifecycle";
import {
  conversationRoute,
  conversationBody,
} from "../src/shared/meri-conversations/input";
import {
  CONVERSATION_SKILLS,
  type ConversationStoredRequest,
  type ConversationSkillDescriptor,
} from "@capiro/meri-contracts/conversation-application";

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const binding = {
  tenantId: "synthetic",
  actorId: "actor",
  conversationId: id(1),
  runId: id(2),
  attemptId: id(3),
  workerId: id(4),
  writerFence: 1,
};
const context = { ...binding, selectedClientId: id(5) };
const run = {
  binding,
  state: "running",
  scopes: [
    {
      tenantId: binding.tenantId,
      kind: "client",
      resourceId: id(5),
      policyRevision: "p1",
    },
  ],
  createdAt: "2026-10-24T00:00:00Z",
  policyRevision: "p1",
  versions: {
    imageDigest: `sha256:${"a".repeat(64)}`,
    sdk: "0.3.295",
    cli: "2.1.295",
    contracts: "0.1.0",
    skillsDigest: "b".repeat(64),
    checkpointFormat: "0.1.0",
  },
};
const digest = (input: object) =>
  createHash("sha256")
    .update(JSON.stringify(input, Object.keys(input).sort()))
    .digest("hex");
function fixture(skill?: ConversationSkillDescriptor) {
  const lifetime = new AbortController();
  const calls: { path: string; body: unknown }[] = [];
  const general = !!skill && !skill.subjectKinds.includes("client");
  const scopedRun = {
    ...run,
    scopes: general
      ? [
          {
            tenantId: binding.tenantId,
            kind: "private-user",
            resourceId: binding.actorId,
            policyRevision: "p1",
          },
        ]
      : run.scopes,
  };
  const stored: ConversationStoredRequest = {
    requestId: id(6),
    prompt: "reviewed",
    windowRequest: skill
      ? {
          basis: "explicit",
          startInclusive: "2026-10-01T00:00:00Z",
          endExclusive: "2026-11-01T00:00:00Z",
          timezone: "UTC",
        }
      : null,
    window: skill
      ? {
          basis: "explicit",
          startInclusive: "2026-10-01T00:00:00Z",
          endExclusive: "2026-11-01T00:00:00Z",
          timezone: "UTC",
          weekStartsOn: null,
        }
      : null,
    skill: skill
      ? {
          skillId: skill.skillId,
          skillVersion: skill.version,
          manifestSha256: skill.manifestSha256,
          proseSha256: skill.proseSha256,
          catalogSha256: "c".repeat(64),
        }
      : null,
  };
  let answer = (body: ConversationLifecycleControlRequest): unknown => ({
    controlId: body.controlId,
    intent: body.intent,
    sourceBinding: binding,
    inputSha256: digest(body),
    state: "APPLIED",
    checkpointId: null,
    targetBinding: null,
    admissionReceiptId: null,
    retirementReceiptId: null,
    replayed: false,
  });
  const port = createMeriConversation({
    context: {
      ...context,
      selectedClientId: general ? null : context.selectedClientId,
    },
    credential: `action_session_${"s".repeat(43)}`,
    expiresAtMs: Date.now() + 60000,
    signal: lifetime.signal,
    isCurrent: () => !lifetime.signal.aborted,
    onAccessLost: () => lifetime.abort(),
    origin: "https://meri.invalid",
    fetchImpl: async (url, init) => {
      const path = new URL(String(url)).pathname;
      const body = JSON.parse(String(init?.body));
      calls.push({ path, body });
      if (path.endsWith("/history"))
        return Response.json({
          run: scopedRun,
          request: stored,
          events: [
            {
              contractVersion: "0.1.0",
              eventId: id(7),
              binding,
              sequence: 1,
              createdAt: run.createdAt,
              scopes: scopedRun.scopes,
              type: "run.status",
              data: { state: "running", reasonCode: null },
            },
          ],
          nextSequence: 1,
          hasMore: false,
          lastSequence: 1,
        });
      if (path.endsWith("/inspect"))
        return Response.json({
          checkpointId: body.checkpointId,
          checkpointSha256: "a".repeat(64),
          sourceBinding: binding,
          lastEventSequence: 1,
        });
      return Response.json(await answer(body));
    },
  });
  return {
    port,
    calls,
    lifetime,
    stored,
    setAnswer: (value: typeof answer) => {
      answer = value;
    },
  };
}
it.each(CONVERSATION_SKILLS)(
  "$skillId pinned version and normalized window survive readmission, steer, resume and fork selectors",
  async (skill) => {
    const f = fixture(skill);
    try {
      await f.port.history();
      const original = f.port.getSnapshot().acceptedRequest;
      expect(original).toEqual(f.stored);
      expect(Object.isFrozen(original?.skill)).toBe(true);
      await f.port.control({
        controlId: id(50),
        intent: "steer",
        text: "Keep the selected scope",
      });
      await f.port.history();
      await f.port.inspectCheckpoint({ checkpointId: id(8) });
      for (const intent of ["resume", "fork"] as const) {
        f.setAnswer((body) => ({
          controlId: body.controlId,
          intent,
          sourceBinding: binding,
          inputSha256: digest(body),
          state: "APPLIED",
          checkpointId: id(8),
          targetBinding: {
            ...binding,
            conversationId: intent === "fork" ? id(90) : binding.conversationId,
            runId: id(91),
            attemptId: id(92),
            workerId: id(93),
            writerFence: 2,
          },
          admissionReceiptId: id(94),
          retirementReceiptId: intent === "resume" ? id(95) : null,
          replayed: false,
        }));
        expect(
          await f.port.control({
            controlId: id(intent === "resume" ? 51 : 52),
            intent,
            checkpointId: id(8),
            checkpointSha256: "a".repeat(64),
          }),
        ).toMatchObject({ state: "APPLIED", intent });
        expect(f.port.getSnapshot().acceptedRequest).toEqual(original);
      }
    } finally {
      f.port.dispose();
    }
  },
);
it("lifecycle uses the same private admitted view and exact immutable request", async () => {
  const f = fixture(),
    command = {
      controlId: id(9),
      intent: "steer" as const,
      text: "Keep the same selected scope and window",
    };
  try {
    await expect(f.port.control(command)).rejects.toMatchObject({
      code: "no-admitted-run",
    });
    expect(f.calls).toHaveLength(0);
    await f.port.history();
    expect(await f.port.control(command)).toMatchObject({
      state: "APPLIED",
      intent: "steer",
    });
    expect(f.calls.at(-1)).toEqual({
      path: "/api/conversations/control",
      body: command,
    });
    expect(
      await f.port.inspectCheckpoint({ checkpointId: id(8) }),
    ).toMatchObject({ checkpointId: id(8), sourceBinding: binding });
  } finally {
    f.port.dispose();
  }
});
it.each(["scope", "hash", "target"])(
  "refuses a forged lifecycle %s receipt",
  async (changed) => {
    const f = fixture(),
      command = { controlId: id(9), intent: "pause" as const };
    f.setAnswer((body) => ({
      controlId: body.controlId,
      intent: body.intent,
      sourceBinding: {
        ...binding,
        ...(changed === "scope" ? { actorId: "foreign" } : {}),
      },
      inputSha256: changed === "hash" ? "0".repeat(64) : digest(body),
      state: "APPLIED",
      checkpointId: null,
      targetBinding:
        changed === "target" ? { ...binding, runId: id(12) } : null,
      admissionReceiptId: null,
      retirementReceiptId: null,
      replayed: false,
    }));
    try {
      await f.port.history();
      await expect(f.port.control(command)).rejects.toThrow();
    } finally {
      f.port.dispose();
    }
  },
);
it("lifecycle late success after source lifetime retirement cannot be admitted", async () => {
  const f = fixture();
  let release!: () => void;
  f.setAnswer(async () => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return {};
  });
  await f.port.history();
  const pending = f.port.control({ controlId: id(9), intent: "pause" });
  f.lifetime.abort();
  release();
  await expect(pending).rejects.toThrow();
  expect(f.port.getSnapshot().status).not.toBe("ready");
  f.port.dispose();
});
function memory() {
  const values = new Map<string, string>();
  const storage: TabStorage = {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
  syncMeriTabIdentity("session-a", storage);
  return storage;
}
it("lost controls survive reload exactly and cannot be rewritten or cross scope", () => {
  const storage = memory(),
    journal = lifecycleJournal(context, storage);
  const command = {
    controlId: id(9),
    intent: "resume" as const,
    checkpointId: id(8),
    checkpointSha256: "a".repeat(64),
  };
  journal.retain(command);
  const recovered = lifecycleJournal(context, storage);
  expect(recovered.read()).toEqual(command);
  expect(() =>
    recovered.retain({ ...command, checkpointSha256: "b".repeat(64) }),
  ).toThrow();
  expect(
    lifecycleJournal({ ...context, selectedClientId: id(99) }, storage).read(),
  ).toBeUndefined();
  syncMeriTabIdentity("session-b", storage);
  expect(() => recovered.clear(command)).toThrow();
  expect(lifecycleJournal(context, storage).read()).toBeUndefined();
});
it("fixed proxy routes receive canonical lifecycle input and reject extra authority", async () => {
  expect(conversationRoute("control")).toBe("control");
  expect(conversationRoute("checkpoints/inspect")).toBe("inspect");
  expect(conversationRoute("control/anything")).toBeUndefined();
  const request = (body: unknown) =>
    new Request("https://capiro.invalid/api/conversations/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  const command = { controlId: id(9), intent: "pause" };
  await expect(
    conversationBody(request(command), "control", new AbortController().signal),
  ).resolves.toBeInstanceOf(Uint8Array);
  await expect(
    conversationBody(
      request({ ...command, selectedClientId: id(5) }),
      "control",
      new AbortController().signal,
    ),
  ).rejects.toThrow();
});
