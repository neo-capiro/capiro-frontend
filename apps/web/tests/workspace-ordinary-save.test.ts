import { expect, it, vi } from "vitest";
import {
  ordinarySaveBody,
  ordinaryDraftState,
  workspaceDocumentOperations,
} from "../src/shared/capiro/operations/workspace-documents";
import { createCapiroApi } from "../src/shared/capiro/http";
import { handleCapiroRequest } from "../src/shared/capiro/gateway";
import {
  bindOrdinaryReceipt,
  bindOrdinaryState,
  captureOrdinarySave,
  ordinaryInput,
  ordinaryRequestHash,
  ordinaryRecoveryContract,
} from "../src/features/modules/workspace/ordinary-save/ordinary-save";
import {
  scope,
  state,
  ordinary,
  receipt,
  requestId,
  otherId,
} from "./workspace-ordinary-save-fixtures";

const capture = () =>
  captureOrdinarySave(
    state(),
    {
      title: "Authored title",
      names: ["Body"],
      sections: { Body: "<p><strong>Authored</strong> é</p>" },
    },
    requestId,
  );

it("captures the editing baseline and only supported edits, preserving formatted UTF8 exactly", () => {
  const baseline = state();
  const input = ordinaryInput(baseline);
  input.title = "Changed";
  input.sections.Body = "<p><strong>Authored</strong> é</p>";
  const body = captureOrdinarySave(baseline, input, requestId);
  expect(body.expectedStateHash).toBe(baseline.stateHash);
  expect(body).toEqual({
    requestId,
    expectedClientId: null,
    expectedStateHash: baseline.stateHash,
    label: "Manual save",
    draft: { docTitle: "Changed", config: { sectionContent: input.sections } },
  });
  expect(body).not.toHaveProperty("documents");
  expect(body.draft.config).not.toHaveProperty("unknown");
  expect(baseline.draft.documents[0]!.body.unknown).toEqual({
    preserved: true,
  });
});

it.each([
  { documents: [] },
  { expectedClientId: undefined },
  { expectedClientId: "not-a-uuid" },
  { expectedStateHash: "bad" },
  { requestId: "bad" },
  { label: "a".repeat(201) },
  { draft: { docTitle: "New", clientId: otherId } },
  {
    draft: {
      docTitle: "New",
      config: { sectionContent: {}, sections: ["New"] },
    },
  },
])("rejects unsupported or malformed request fields %j", (extra) => {
  expect(ordinarySaveBody.safeParse({ ...capture(), ...extra }).success).toBe(
    false,
  );
});

it("rejects oversized UTF8 payloads without truncation", () => {
  const sections = Object.fromEntries(
    Array.from({ length: 11 }, (_, n) => [String(n), "é".repeat(50_000)]),
  );
  expect(() =>
    captureOrdinarySave(
      state(),
      { title: "Large", names: Object.keys(sections), sections },
      requestId,
    ),
  ).toThrow();
});

it("validates the real producer receipt binding including canonical request hash and exact replay", async () => {
  const body = capture();
  const response = receipt(body, ordinary(), true);
  expect(await ordinaryRequestHash(scope, body)).toBe(
    response.receipt.requestHash,
  );
  expect(await bindOrdinaryReceipt(response, scope, body)).toEqual(response);
});

it.each([
  "tenantId",
  "actorId",
  "draftId",
  "clientId",
  "requestId",
  "requestHash",
  "versionId",
] as const)(
  "refuses a mismatched %s receipt instead of confirming a save",
  async (field) => {
    const body = capture();
    const response = receipt(body);
    Object.assign(response.receipt, {
      [field]: field === "requestHash" ? "0".repeat(64) : otherId,
    });
    await expect(bindOrdinaryReceipt(response, scope, body)).rejects.toThrow();
  },
);

it("refuses changed payload under the original request identity", async () => {
  const original = capture();
  const changed = {
    ...original,
    draft: { ...original.draft, docTitle: "Changed payload" },
  };
  await expect(
    bindOrdinaryReceipt(receipt(original), scope, changed),
  ).rejects.toThrow();
  expect(() =>
    ordinaryRecoveryContract.validateUpdate!(
      { body: original, names: ["Body"] },
      { body: changed, names: ["Body"] },
    ),
  ).toThrow("original request");
});

it("allows only an outcome addition to the retained original body", () => {
  const original = { body: capture(), names: ["Body"] };
  const confirmed = {
    ...original,
    outcome: { kind: "saved" as const, response: receipt(original.body) },
  };
  expect(() =>
    ordinaryRecoveryContract.validateUpdate!(original, confirmed),
  ).not.toThrow();
  expect(() =>
    ordinaryRecoveryContract.validateUpdate!(confirmed, {
      ...original,
      outcome: { kind: "conflict" },
    }),
  ).toThrow();
});

it.each([
  { tenantId: otherId },
  { draftId: otherId },
  { clientId: otherId },
  { draft: { ...ordinary(), id: otherId } },
  { draft: { ...ordinary(), tenantId: otherId } },
  { draft: { ...ordinary(), clientId: otherId } },
  { draft: { ...ordinary(), prospectId: otherId } },
])("rejects a foreign state before editor hydration %j", (extra) => {
  expect(() => bindOrdinaryState({ ...state(), ...extra }, scope)).toThrow();
});

it("uses the registered GET state and one atomic POST with the exact producer body", async () => {
  const body = capture();
  const upstream = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(state()))
    .mockResolvedValueOnce(Response.json(receipt(body)));
  const browser = vi.fn<typeof fetch>(async (url, init) =>
    handleCapiroRequest(
      new Request(`https://frontend.example.test${String(url)}`, {
        ...init,
        headers: { ...init?.headers, Origin: "https://frontend.example.test" },
      }),
      String(url).split("/api/capiro/")[1]!.split("?")[0]!,
      workspaceDocumentOperations,
      {
        services: { workspace: "https://workspace.example.test/workspace-api" },
        authConfigured: true,
        issues: [],
      },
      async () => "synthetic-token",
      upstream,
    ),
  );
  const api = createCapiroApi(workspaceDocumentOperations, {
    fetcher: browser,
  });
  const current = await api.request("workspace.draft.state", {
    params: { id: scope.draftId },
  });
  expect(ordinaryDraftState.parse(current).stateHash).toBe(state().stateHash);
  await api.request("workspace.draft.save", {
    params: { id: scope.draftId },
    body,
  });
  expect(upstream.mock.calls).toHaveLength(2);
  expect(
    upstream.mock.calls.map(([url, init]) => [String(url), init?.method]),
  ).toEqual([
    [
      `https://workspace.example.test/workspace-api/drafts/${scope.draftId}/state`,
      "GET",
    ],
    [
      `https://workspace.example.test/workspace-api/drafts/${scope.draftId}/save`,
      "POST",
    ],
  ]);
  expect(upstream.mock.calls[1]![1]?.body).toBe(JSON.stringify(body));
});

it.each([
  "WORKSPACE_SAVE_STATE_CONFLICT",
  "WORKSPACE_SAVE_REQUEST_CONFLICT",
  "WORKSPACE_SAVE_CLIENT_CONFLICT",
])(
  "relays native %s through the real gateway and client without private message text",
  async (code) => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { code, message: "Private upstream diagnostic" },
          { status: 409 },
        ),
      );
    const browser = vi.fn<typeof fetch>(async (url, init) =>
      handleCapiroRequest(
        new Request(`https://frontend.example.test${String(url)}`, {
          ...init,
          headers: {
            ...init?.headers,
            Origin: "https://frontend.example.test",
          },
        }),
        "workspace.draft.save",
        workspaceDocumentOperations,
        {
          services: {
            workspace: "https://workspace.example.test/workspace-api",
          },
          authConfigured: true,
          issues: [],
        },
        async () => "synthetic-token",
        upstream,
      ),
    );
    const api = createCapiroApi(workspaceDocumentOperations, {
      fetcher: browser,
    });
    const failure = await api
      .request("workspace.draft.save", {
        params: { id: scope.draftId },
        body: capture(),
      })
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({ status: 409, code });
    expect((failure as Error).message).not.toContain(
      "Private upstream diagnostic",
    );
  },
);
it.each([
  { status: 503, payload: { code: "WORKSPACE_SAVE_STATE_CONFLICT" } },
  { status: 409, payload: { code: "UNKNOWN_CONFLICT" } },
  {
    status: 409,
    payload: { code: { value: "WORKSPACE_SAVE_STATE_CONFLICT" } },
  },
  {
    status: 409,
    payload: {
      code: "WORKSPACE_SAVE_STATE_CONFLICT",
      oversized: "x".repeat(5000),
    },
  },
])(
  "does not promote generic/malformed/unbounded native failures to a definite refusal: $status",
  async ({ status, payload }) => {
    const result = await handleCapiroRequest(
      new Request(
        "https://frontend.example.test/api/capiro/workspace.draft.save",
        {
          method: "POST",
          headers: {
            Origin: "https://frontend.example.test",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            params: { id: scope.draftId },
            body: capture(),
          }),
        },
      ),
      "workspace.draft.save",
      workspaceDocumentOperations,
      {
        services: { workspace: "https://workspace.example.test/workspace-api" },
        authConfigured: true,
        issues: [],
      },
      async () => "synthetic-token",
      async () => Response.json(payload, { status }),
    );
    expect(await result.json()).not.toHaveProperty("code");
  },
);
it("does not relay ordinary save codes on the existing PATCH operation", async () => {
  const api = createCapiroApi(workspaceDocumentOperations, {
    fetcher: async () =>
      Response.json({ code: "WORKSPACE_SAVE_STATE_CONFLICT" }, { status: 409 }),
  });
  await expect(
    api.request("workspace.draft.update", {
      params: { id: scope.draftId },
      body: { docTitle: "Title" },
    }),
  ).rejects.toMatchObject({ status: 409, code: undefined });
});
