import { expect, it, vi } from "vitest";
import type { RuntimeConfig } from "../src/shared/portfolio/config/config";
import { handleCapiroRequest } from "../src/shared/capiro/gateway";
import { workspaceGenerationOperations } from "../src/shared/capiro/operations/workspace-generation";

// The one reviewed request header WS-22 adds: the durable intake declares
// `Idempotency-Key`, and the gateway forwards exactly that header from the
// request's identity. These cases drive the real handler with a stub upstream,
// so the forwarded request is asserted rather than described, and the negative
// cases prove a request without a declared identity cannot send one.

const origin = "https://frontend.synthetic.invalid";
const token = "synthetic-trusted-session";
const base = "https://workspace.synthetic.invalid/workspace-api";
const draftId = "00000000-0000-4000-8000-000000000003";
const runId = "00000000-0000-4000-8000-000000000004";
const intakeKey = "ws22-intake-1a2b3c4d-fnv1a0001";
const intake = {
  goal: "Defend the 2027 program",
  blueprintVersionId: "bp-1",
  factualAttachmentIds: ["00000000-0000-4000-8000-000000000005"],
  sampleAttachmentIds: [],
  priorWorkspaceDraftIds: [],
};

function config(): RuntimeConfig {
  return {
    services: { workspace: base },
    destinations: {},
    authConfigured: true,
    issues: [],
  };
}

function dispatch(key: string, input: unknown, fetcher: typeof fetch) {
  return handleCapiroRequest(
    new Request(`${origin}/api/capiro/${key}`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        Authorization: "Bearer browser-forged-owner",
        Cookie: "session=browser-forged",
        "X-Tenant-Id": "browser-forged-tenant",
        "X-User-Id": "user_owner",
      },
      body: JSON.stringify(input),
    }),
    key,
    workspaceGenerationOperations,
    config(),
    async () => token,
    fetcher,
  );
}

it("forwards the declared request identity as exactly one Idempotency-Key header", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json(
        { draftId, runId, agentRevision: 1, status: "queued" },
        { status: 201 },
      ),
    );
  const response = await dispatch(
    "workspace.generation.intake",
    { body: intake, idempotencyKey: intakeKey },
    fetcher,
  );
  expect(response.status).toBe(201);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [url, init] = fetcher.mock.calls[0]!;
  expect(String(url)).toBe(`${base}/document-agent/intakes`);
  const headers = new Headers(init?.headers);
  expect(headers.get("idempotency-key")).toBe(intakeKey);
  expect(headers.get("authorization")).toBe(`Bearer ${token}`);
  // No browser-supplied identity, scope or alias header survives.
  for (const header of [
    "cookie",
    "origin",
    "x-tenant-id",
    "x-user-id",
    "x-idempotency-key",
  ])
    expect(headers.has(header), header).toBe(false);
  // The identity is a request header only: the backend body is the exact body.
  expect(JSON.parse(String(init?.body))).toEqual(intake);
});

it("refuses a missing or malformed declared identity instead of sending without it", async () => {
  for (const identity of [
    undefined,
    "",
    "short",
    "with space",
    "with,comma",
    "x".repeat(129),
  ]) {
    const fetcher = vi.fn<typeof fetch>();
    const response = await dispatch(
      "workspace.generation.intake",
      {
        body: intake,
        ...(identity === undefined ? {} : { idempotencyKey: identity }),
      },
      fetcher,
    );
    expect(response.status, String(identity)).toBe(400);
    expect((await response.json()) as { message: string }).toMatchObject({
      message: expect.stringMatching(/request identity|invalid fields/),
    });
    expect(fetcher, String(identity)).not.toHaveBeenCalled();
  }
});

it("cannot carry an identity through an operation that does not declare one", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const response = await dispatch(
    "workspace.generation.brief.approve",
    {
      params: { draftId },
      body: { expectedRevision: 1 },
      idempotencyKey: intakeKey,
    },
    fetcher,
  );
  expect(response.status).toBe(400);
  expect((await response.json()) as { message: string }).toMatchObject({
    message: "The request contains invalid fields.",
  });
  expect(fetcher).not.toHaveBeenCalled();
});

it("keeps ordinary operations byte and header compatible", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json({ message: "synthetic upstream" }, { status: 502 }),
    );
  const response = await dispatch(
    "workspace.generation.brief.approve",
    { params: { draftId }, body: { expectedRevision: 1 } },
    fetcher,
  );
  // The operation was accepted and forwarded (an upstream refusal is upstream).
  expect(response.status).not.toBe(400);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [url, init] = fetcher.mock.calls[0]!;
  expect(String(url)).toBe(`${base}/drafts/${draftId}/agent/brief/approve`);
  const headers = new Headers(init?.headers);
  expect(headers.has("idempotency-key")).toBe(false);
  expect(headers.get("authorization")).toBe(`Bearer ${token}`);
  expect(JSON.parse(String(init?.body))).toEqual({ expectedRevision: 1 });
});
