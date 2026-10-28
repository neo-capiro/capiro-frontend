/**
 * Installed-contract acceptance for the native procedure catalog read and the native procedure
 * selection — Wave5 MO01/ST16.
 *
 * Everything here runs against the installed immutable @capiro/meri-contracts 0.1.26 package: the
 * canonical closed `procedure` member is part of that artifact, so this is the ordinary (non
 * source-stage) proof. The catalog read goes through the REAL operation registry and the REAL
 * transport with only the boundary answer stubbed, and every listed selector is put back through the
 * canonical public receiver before it is trusted.
 */
import { expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  CONVERSATION_SKILLS,
  receiveConversationRequest,
} from "@capiro/meri-contracts/conversation-application";
import { capiroOperations } from "../src/shared/capiro/registry";
import { createCapiroApi } from "../src/shared/capiro/http";
import {
  ProcedureCatalogUnavailable,
  loadProcedureCatalog,
  procedureSelectorSchema,
  receiveProcedureCatalog,
  selectorIdentity,
  type ProcedureCatalogRefusal,
} from "../src/shared/capiro/operations/meri-procedures";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";
import { sendRequest } from "../src/features/meri/conversation/run-commands";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import {
  conversationIntentJournal,
  receiveSkillSelection,
  storedSubmission,
  submissionIdentity,
  withProcedureSelection,
  type ConversationSkillSelection,
} from "../src/shared/meri-conversations/query-journal";
import {
  conversationTurnJournal,
  recoverConversationTurn,
} from "../src/shared/meri-conversations/turn-journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const tenant = "synthetic-tenant";
const firmRow = "0b7f0e2c-1a44-4c9b-9d2f-2a7b5c1e6f30";
const builtinIds = [
  "briefing",
  "draft",
  "bill_analysis",
  "hearing_prep",
  "coalition_letter",
  "amendment_tracker",
] as const;
/** Fixture digests in the reviewed shape; no canonical digest is restated in product or test code. */
const digest = (seed: string) => {
  let hex = "";
  for (let index = 0; index < 64; index += 1)
    hex += ((seed.charCodeAt(index % seed.length) + index) % 16).toString(16);
  return hex;
};
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
const builtinSelector = (index: number) => ({
  source: "builtin" as const,
  id: builtinIds[index]!,
  version: 1,
  manifestDigest: digest(`builtin:${builtinIds[index]}`),
});
const firmSelector = {
  source: "firm" as const,
  recordId: firmRow,
  version: 3,
  manifestDigest: digest("firm:case-brief"),
};
/** The exact Core projection shape from GET /clio/procedure-catalog, six built-ins first. */
function catalogPayload(payloadTenant = tenant) {
  const entries = [
    ...builtinIds.map((builtin, index) => ({
      selector: builtinSelector(index),
      display: {
        id: builtin,
        canonicalId: builtin,
        label: builtin,
        purpose: `Built-in ${builtin}`,
        scopes: ["general"],
      },
    })),
    {
      selector: firmSelector,
      display: {
        id: firmRow,
        canonicalId: "firm.case_brief",
        label: "Case brief",
        purpose: "Drafts the case brief from the record",
        scopes: ["client", "general"],
      },
    },
    {
      selector: { ...firmSelector, recordId: id(11), version: 1 },
      display: {
        id: id(11),
        canonicalId: "firm.hearing_memo",
        label: "Hearing memo",
        purpose: null,
        scopes: [],
      },
    },
  ];
  return {
    version: 1,
    tenantId: payloadTenant,
    generatedAt: 1_780_000_000_000,
    entries,
    counts: { builtin: builtinIds.length, firm: 2, total: entries.length },
  };
}

/** The current boundary: the real registry and transport, only the answered bytes are synthetic. */
function boundary(payload: unknown) {
  const calls: Array<{ url: string; method?: string }> = [];
  const api = createCapiroApi(capiroOperations, {
    fetcher: (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), method: init?.method });
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch,
  });
  return { api, calls };
}
function refusalOf(value: unknown, expectedTenant = tenant) {
  try {
    receiveProcedureCatalog(value, { tenantId: expectedTenant });
  } catch (error) {
    return error instanceof ProcedureCatalogUnavailable
      ? error.reason
      : `other: ${String(error)}`;
  }
  return "accepted" as const;
}

const scope = {
  tenantId: tenant,
  actorId: "actor",
  clientId: null,
  conversationId: id(1),
};
const context = { ...scope, selectedClientId: null, runId: id(2) };
const source = {
  ...context,
  attemptId: id(3),
  workerId: id(4),
  writerFence: 1,
};
const work = {
  entry: "start-work" as const,
  jobKind: "research" as const,
  deliverables: ["Current bill text"],
  dependencies: ["Prior client briefing"],
};
const pin = {
  skillId: CONVERSATION_SKILLS[0]!.skillId,
  skillVersion: CONVERSATION_SKILLS[0]!.version,
};
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
  syncMeriTabIdentity("synthetic-session", storage);
  return storage;
}

it("registers the catalog read on the production operation registry", () => {
  const operation = capiroOperations["meri.procedures.catalog"];
  expect(operation.service).toBe("core");
  expect(operation.method).toBe("GET");
  expect(operation.path).toBe("/clio/procedure-catalog");
  // A read body is refused by the registered contract itself.
  expect(operation.request.safeParse({ body: {} }).success).toBe(false);
  expect(operation.request.safeParse({}).success).toBe(true);
});

it("reads the catalog through the current registry and transport and lists only admissible selectors", async () => {
  const { api, calls } = boundary(catalogPayload());
  const catalog = await loadProcedureCatalog(api, { tenantId: tenant });
  expect(calls).toHaveLength(1);
  expect(calls[0]!.url).toBe(
    `/api/capiro/meri.procedures.catalog?input=${encodeURIComponent("{}")}`,
  );
  expect(calls[0]!.method).toBe("GET");
  expect(catalog.counts).toEqual({ builtin: 6, firm: 2, total: 8 });
  expect(
    catalog.entries.filter((entry) => entry.selector.source === "builtin"),
  ).toHaveLength(6);
  // Every listed selector is one the canonical receiver actually admits, so nothing offered here is
  // an unavailable-only choice, and the exact selector survives the round trip unchanged.
  for (const entry of catalog.entries)
    expect(withProcedureSelection({}, entry.selector).procedure).toEqual(
      entry.selector,
    );
  expect(selectorIdentity(catalog.entries[6]!.selector)).toBe(
    `firm:${firmRow}:3:${digest("firm:case-brief")}`,
  );
  // An accepted catalog is frozen, and it carries no authority-bearing member at all.
  expect(Object.isFrozen(catalog.entries)).toBe(true);
  expect(Object.isFrozen(catalog.entries[0]!.selector)).toBe(true);
  expect(Object.keys(catalog.entries[0]!).sort()).toEqual([
    "display",
    "selector",
  ]);
  expect(Object.keys(catalog.entries[0]!.display).sort()).toEqual([
    "canonicalId",
    "id",
    "label",
    "purpose",
    "scopes",
  ]);
});

it("closes the six built-in identities and refuses any other", () => {
  for (const index of builtinIds.keys())
    expect(
      procedureSelectorSchema.safeParse(builtinSelector(index)).success,
    ).toBe(true);
  expect(
    procedureSelectorSchema.safeParse({
      ...builtinSelector(1),
      id: "not_a_builtin",
    }).success,
  ).toBe(false);
  expect(
    procedureSelectorSchema.safeParse({
      source: "builtin",
      id: "draft",
      version: 1,
    }).success,
  ).toBe(false);
});

it("refuses a catalog that is not this tenant's own, or that disagrees with itself", () => {
  const current = catalogPayload();
  const cases: Array<[string, unknown, ProcedureCatalogRefusal]> = [
    [
      "another tenant's projection",
      catalogPayload("other-tenant"),
      "foreign-tenant",
    ],
    [
      "a contract version we do not read",
      { ...current, version: 2 },
      "malformed",
    ],
    ["missing counts", { ...current, counts: undefined }, "malformed"],
    [
      "counts that do not match the entries",
      { ...current, counts: { builtin: 6, firm: 2, total: 9 } },
      "inconsistent",
    ],
    [
      "one selector offered twice",
      {
        ...current,
        entries: [...current.entries, current.entries[0]!],
        counts: { builtin: 7, firm: 2, total: 9 },
      },
      "inconsistent",
    ],
    [
      "an entry carrying execution authority",
      {
        ...current,
        entries: [
          {
            ...current.entries[0]!,
            selector: { ...builtinSelector(0), allowedTools: ["*"] },
          },
          ...current.entries.slice(1),
        ],
      },
      "malformed",
    ],
    [
      "a display carrying a budget and an approval",
      {
        ...current,
        entries: [
          {
            ...current.entries[0]!,
            display: {
              ...current.entries[0]!.display,
              budget: { cents: 5_000 },
              approval: "prepared",
            },
          },
          ...current.entries.slice(1),
        ],
      },
      "malformed",
    ],
    ["not an object at all", "<html>catalog</html>", "malformed"],
    ["an empty body", {}, "malformed"],
  ];
  for (const [name, payload, expected] of cases)
    expect(`${name}: ${refusalOf(payload)}`).toBe(`${name}: ${expected}`);
  // The same payload for its own tenant is accepted, so the refusals above are the receiver deciding.
  expect(refusalOf(current)).toBe("accepted");
});

it("accepts the canonical procedure on the installed receiver and refuses anything else", () => {
  const admitted = receiveConversationRequest(
    "submit",
    bytes({
      requestId: id(5),
      prompt: "Draft the brief",
      procedure: builtinSelector(1),
    }),
  );
  expect(admitted.procedure).toEqual(builtinSelector(1));
  expect(
    receiveConversationRequest(
      "submit",
      bytes({
        requestId: id(5),
        prompt: "Draft the brief",
        procedure: firmSelector,
      }),
    ).procedure,
  ).toEqual(firmSelector);
  for (const invalid of [
    { ...builtinSelector(1), id: "not_a_builtin" },
    { ...builtinSelector(1), manifestDigest: "abc" },
    { ...builtinSelector(1), version: 0 },
    { ...builtinSelector(1), allowedTools: ["*"] },
    { ...firmSelector, recordId: "" },
    { source: "builtin", version: 1, manifestDigest: digest("x") },
  ])
    expect(() =>
      receiveConversationRequest(
        "submit",
        bytes({
          requestId: id(5),
          prompt: "Draft the brief",
          procedure: invalid,
        }),
      ),
    ).toThrow();
  // The canonical submit contract makes the static skill pin and the procedure mutually exclusive.
  expect(() =>
    receiveSkillSelection({ skill: pin, procedure: builtinSelector(1) }),
  ).toThrow();
  // The procedure keeps the requested window and replaces only the skill pin.
  expect(
    withProcedureSelection(
      { skill: pin, windowRequest: { basis: "unbounded" } },
      builtinSelector(2),
    ),
  ).toEqual({
    procedure: builtinSelector(2),
    windowRequest: { basis: "unbounded" },
  });
  expect(
    withProcedureSelection({ procedure: builtinSelector(2) }, undefined),
  ).toEqual({});
  // This installed package predates the work definition, so a selection carrying one is refused
  // here: the combined work-and-procedure qualification belongs to the successor cohort.
  expect(() =>
    receiveConversationRequest(
      "submit",
      bytes({ requestId: id(5), prompt: "Start the research", work }),
    ),
  ).toThrow();
});

it("carries the exact selector from the unsent draft through the send funnel and the journal", async () => {
  const cache = new QueryClient();
  const journal = conversationIntentJournal(cache, context);
  const selection: ConversationSkillSelection = withProcedureSelection(
    { windowRequest: { basis: "unbounded" } },
    firmSelector,
  );
  const captured: Array<Record<string, unknown>> = [];
  const port = {
    submitInitial: async (request: Record<string, unknown>) => {
      expect(journal.read().submit).toMatchObject(selection);
      captured.push(structuredClone(request));
    },
    getSnapshot: () => ({ submit: "idle" }),
  } as unknown as MeriConversationPort;
  try {
    await sendRequest(
      port,
      journal,
      "Draft the case brief",
      false,
      true,
      undefined,
      undefined,
      selection,
    );
    expect(captured[0]!.procedure).toEqual(firmSelector);
    const retained = journal.read().submit!;
    expect(retained.procedure).toEqual(firmSelector);
    expect(retained.windowRequest).toEqual({ basis: "unbounded" });
    expect(Object.isFrozen(retained.procedure)).toBe(true);
    // A stored replay re-sends the same selector, and the retained identity is byte-identical.
    const replayed = storedSubmission({
      requestId: retained.requestId,
      prompt: retained.prompt,
      skill: null,
      window: null,
      windowRequest: { basis: "unbounded" },
      procedure: firmSelector,
    });
    expect(replayed.procedure).toEqual(firmSelector);
    expect(submissionIdentity(replayed)).toBe(
      submissionIdentity({
        requestId: retained.requestId,
        prompt: retained.prompt,
        procedure: firmSelector,
        windowRequest: { basis: "unbounded" },
      }),
    );
  } finally {
    cache.clear();
  }
});

it("retains the exact requestId and selector across an uncertain turn and refuses a changed one", async () => {
  const storage = memory();
  const cache = new QueryClient();
  const draft = createInitialDraftOwner(scope, storage);
  draft.edit("Draft the case brief");
  draft.selectSkill({ procedure: firmSelector });
  const journal = conversationTurnJournal(
    cache,
    scope,
    null,
    scope.conversationId,
    storage,
  );
  journal.start(source, draft.draft(), id(6), undefined, {
    procedure: firmSelector,
  });
  await expect(
    recoverConversationTurn(journal, async () => {
      throw Error("lost response");
    }),
  ).rejects.toThrow();
  cache.clear();
  const restoredCache = new QueryClient();
  try {
    const restored = conversationTurnJournal(
      restoredCache,
      scope,
      null,
      scope.conversationId,
      storage,
    );
    expect(restored.read()).toMatchObject({
      requestId: id(6),
      procedure: firmSelector,
      state: "unknown",
    });
    expect(restored.read()!.procedure).toEqual(firmSelector);
    // A changed selector is not the retained request and cannot rewrite it.
    expect(
      restored.write({
        ...restored.read()!,
        procedure: { ...firmSelector, version: 4 },
      }),
    ).toBe(false);
    expect(
      restored.write({
        ...restored.read()!,
        procedure: { ...firmSelector, manifestDigest: digest("firm:changed") },
      }),
    ).toBe(false);
    expect(
      restored.write({
        ...restored.read()!,
        procedure: { ...firmSelector, recordId: id(13) },
      }),
    ).toBe(false);
    // Replacing the tab session retires the retained selector with the rest of the identity.
    syncMeriTabIdentity("replacement-session", storage);
    expect(restored.current()).toBe(false);
    expect(createInitialDraftOwner(scope, storage).selection()).toBeUndefined();
  } finally {
    restoredCache.clear();
  }
});

it("keeps ordinary fast chat free of the member and does not narrow the existing choosers", async () => {
  const cache = new QueryClient();
  const plainJournal = conversationIntentJournal(cache, context);
  const captured: Array<Record<string, unknown>> = [];
  try {
    await sendRequest(
      {
        submitInitial: async (request: Record<string, unknown>) => {
          captured.push(structuredClone(request));
        },
        getSnapshot: () => ({ submit: "idle" }),
      } as unknown as MeriConversationPort,
      plainJournal,
      "Ordinary fast chat",
      false,
      true,
    );
    expect(captured[0]).not.toHaveProperty("procedure");
    expect(captured[0]).not.toHaveProperty("work");
    expect(plainJournal.read().submit).not.toHaveProperty("procedure");
  } finally {
    cache.clear();
  }
  // The installed catalogue every skill launcher offers is still the chooser's own, unabridged.
  const identities = CONVERSATION_SKILLS.map((entry) => entry.skillId);
  expect(new Set(identities).size).toBe(identities.length);
  expect(identities.length).toBeGreaterThanOrEqual(14);
  expect(new Set(builtinIds).size).toBe(6);
});
