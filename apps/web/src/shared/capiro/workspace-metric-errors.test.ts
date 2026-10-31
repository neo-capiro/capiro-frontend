import { expect, it } from "vitest";
import { serviceErrorResponse } from "./gateway-errors";
import { workspaceMetricOperations } from "./operations/workspace-metrics";
import { createCapiroApi } from "./http";
import type { OperationDefinition } from "./contracts";
import { WORKSPACE_METRIC_INCOMPLETE } from "./workspace-metric-errors";

const operation = workspaceMetricOperations["workspace.metrics.savedWork"];
const payload = {
  code: WORKSPACE_METRIC_INCOMPLETE,
  count: 999,
  message: "private text",
  tenantId: "private-id",
};
const signal = () => new AbortController().signal;
it("translates only the exact private Workspace503 into a sanitized browser incomplete observation", async () => {
  const response = await serviceErrorResponse(
    Response.json(payload, { status: 503 }),
    operation,
    signal(),
    false,
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(await response.clone().json()).toEqual({
    message: "The saved work observation is incomplete.",
    error: { code: WORKSPACE_METRIC_INCOMPLETE },
  });
  const api = createCapiroApi(workspaceMetricOperations, {
    fetcher: async () => response,
  });
  const error = await api
    .request("workspace.metrics.savedWork", {})
    .catch((e: Error) => e);
  expect(error).toMatchObject({
    status: 503,
    upstreamCode: WORKSPACE_METRIC_INCOMPLETE,
  });
  expect(JSON.stringify(error)).not.toMatch(/999|private/);
});
it.each([
  { service: "core" },
  { method: "POST" },
  { path: "/drafts/other" },
] as Partial<OperationDefinition>[])(
  "does not preserve codes outside the exact operation: %j",
  async (change) => {
    const response = await serviceErrorResponse(
      Response.json(payload, { status: 503 }),
      { ...operation, ...change },
      signal(),
      false,
    );
    expect(await response.json()).toEqual({
      message: "The service is unavailable. Please retry.",
    });
  },
);
it.each([true, false])(
  "never preserves incomplete on403, public=%s",
  async (publicCapability) => {
    const response = await serviceErrorResponse(
      Response.json(payload, { status: 403 }),
      operation,
      signal(),
      publicCapability,
    );
    expect(await response.json()).toEqual({
      message: "You do not have access to this operation.",
    });
  },
);
it("never preserves the code on a public503", async () => {
  const response = await serviceErrorResponse(
    Response.json(payload, { status: 503 }),
    operation,
    signal(),
    true,
  );
  expect(await response.json()).not.toHaveProperty("error");
});
it.each([
  "not-json",
  "null",
  "[]",
  JSON.stringify({ code: "WORKSPACE_SAVED_WORK_UNAVAILABLE" }),
  JSON.stringify({ error: { code: WORKSPACE_METRIC_INCOMPLETE } }),
])("unknown/malformed native body is unavailable: %s", async (body) => {
  const response = await serviceErrorResponse(
    new Response(body, { status: 503 }),
    operation,
    signal(),
    false,
  );
  expect(await response.json()).toEqual({
    message: "The service is unavailable. Please retry.",
  });
});
it("cancels an oversized stream before it can be interpreted as incomplete", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          JSON.stringify({ ...payload, extra: "x".repeat(4096) }),
        ),
      );
    },
    cancel() {
      cancelled = true;
    },
  });
  const response = await serviceErrorResponse(
    new Response(stream, { status: 503 }),
    operation,
    signal(),
    false,
  );
  expect(cancelled).toBe(true);
  expect(await response.json()).not.toHaveProperty("error");
});
it("propagates cancellation while the native error stream is pending", async () => {
  let cancelled = false;
  const controller = new AbortController();
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
  });
  const pending = serviceErrorResponse(
    new Response(stream, { status: 503 }),
    operation,
    controller.signal,
    false,
  );
  const rejection = expect(pending).rejects.toMatchObject({
    name: "AbortError",
  });
  controller.abort();
  await rejection;
  expect(cancelled).toBe(true);
});
