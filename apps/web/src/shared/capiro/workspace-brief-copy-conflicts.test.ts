import { expect, it, vi } from "vitest";
import type { CapiroConfig } from "./config";
import type { OperationRegistry } from "./contracts";
import { handleCapiroRequest } from "./gateway";
import { createCapiroApi } from "./http";
import { capiroOperations } from "./registry";
import { cases, ids, saveBody } from "./workspace-brief-copy.fixtures";

const config: CapiroConfig = {
  services: {
    workspace: "https://workspace.example.test/workspace-api",
    core: "https://core.example.test/api",
  },
  authConfigured: true,
  issues: [],
};
const codes = [
  "WORKSPACE_BRIEF_STATE_CONFLICT",
  "WORKSPACE_BRIEF_REQUEST_CONFLICT",
  "WORKSPACE_BRIEF_COPY_CONSUMED",
  "WORKSPACE_BRIEF_COPY_LIMIT",
  "WORKSPACE_BRIEF_ATOMIC_SAVE_REQUIRED",
] as const;
const genericConflict = "The record changed. Reload it before trying again.";
type Call = { key: string; method: string; input: unknown };

it("admits a complete rich save above the old2MB envelope without truncating UTF8 content", async () => {
  const body = {
    ...saveBody,
    body: {
      blocks: [
        {
          id: "large-section",
          type: "section",
          content: "é".repeat(1_499_000),
        },
      ],
    },
  };
  const input = { params: { draftId: ids.draft, docId: ids.document }, body };
  const request = new Request(
    "https://frontend.example.test/api/capiro/workspace.brief-copy.save",
    {
      method: "POST",
      headers: {
        Origin: "https://frontend.example.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(cases[3].response));
  const response = await handleCapiroRequest(
    request,
    cases[3].key,
    capiroOperations,
    config,
    async () => "synthetic-token",
    fetcher,
  );
  expect(response.status).toBe(200);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]![1]?.body).toBe(JSON.stringify(body));
  expect(await response.json()).toEqual(cases[3].response);
});

async function invoke(call: Call, payload: unknown, status = 409) {
  const query =
    call.method === "GET"
      ? `?input=${encodeURIComponent(JSON.stringify(call.input))}`
      : "";
  const request = new Request(
    `https://frontend.example.test/api/capiro/${call.key}${query}`,
    {
      method: call.method,
      headers: {
        Origin: "https://frontend.example.test",
        "Content-Type": "application/json",
      },
      ...(call.method === "GET" ? {} : { body: JSON.stringify(call.input) }),
    },
  );
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(payload, { status }));
  const response = await handleCapiroRequest(
    request,
    call.key,
    capiroOperations,
    config,
    async () => "synthetic-token",
    fetcher,
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  return response;
}

it.each(codes)(
  "preserves only approved409code%s on each exact bridge operation",
  async (code) => {
    for (const fixture of cases) {
      const response = await invoke(fixture, {
        code,
        message: "synthetic-secret-diagnostic",
        stack: "synthetic-secret-stack",
        receipt: { tenantId: "synthetic-foreign-tenant" },
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ message: genericConflict, code });
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  },
);

it.each([
  { code: "UNAPPROVED_INTERNAL_CODE" },
  { code: "workspace_brief_state_conflict" },
  { code: [codes[0]] },
  { code: { value: codes[0] } },
  { nested: { code: codes[0] } },
  { message: codes[0] },
])(
  "never infers approved codes from malformed, unknown or nested data: %j",
  async (payload) => {
    const response = await invoke(cases[3], {
      ...payload,
      stack: "synthetic-secret",
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: genericConflict });
  },
);

it.each([400, 401, 403, 404, 422, 429, 500, 503])(
  "does not expose an approved code on native%s",
  async (status) => {
    const response = await invoke(
      cases[3],
      {
        code: codes[0],
        message: "synthetic-secret",
        stack: "synthetic-secret",
      },
      status,
    );
    expect(response.status).toBe(status);
    const payload = await response.json();
    expect(Object.keys(payload)).toEqual(["message"]);
    expect(JSON.stringify(payload)).not.toContain("synthetic-secret");
    expect(JSON.stringify(payload)).not.toContain(codes[0]);
  },
);

it.each([
  {
    key: "workspace.document.update",
    method: "PATCH",
    input: {
      params: { draftId: ids.draft, docId: ids.document },
      body: {
        body: {
          blocks: [
            { id: "ordinary", type: "section", content: "Ordinary edit" },
          ],
        },
      },
    },
  },
  {
    key: "workspace.draft.snapshot",
    method: "POST",
    input: {
      params: { draftId: ids.draft },
      body: { label: "Ordinary history" },
    },
  },
  {
    key: "calendar.commentDeadlineCalendar",
    method: "GET",
    input: { query: { dateFrom: "2026-10-01", dateTo: "2026-10-31" } },
  },
])(
  "keeps unrelated $key409 responses generic even with an approved code",
  async (call) => {
    const response = await invoke(call, {
      code: codes[4],
      message: "synthetic-secret",
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: genericConflict });
  },
);

it.each(codes)(
  "retains admitted%s in the existing browser error without private diagnostics",
  async (code) => {
    const registry: OperationRegistry = capiroOperations;
    const api = createCapiroApi(registry, {
      fetcher: async () =>
        Response.json({ message: genericConflict, code }, { status: 409 }),
    });
    await expect(
      api.request("workspace.brief-copy.save", {
        params: { draftId: ids.draft, docId: ids.document },
        body: saveBody,
      }),
    ).rejects.toMatchObject({ status: 409, message: genericConflict, code });
  },
);
