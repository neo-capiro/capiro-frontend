import { it, expect } from "vitest";
import fixture from "./fixtures/federal-workbench.json";
import { proxyDocumentRequest } from "../src/shared/meri-documents/proxy";
import { readDocumentConfig } from "../src/shared/meri-documents/config";
const origin = "https://frontend.example.test",
  credential = "action_session_" + "a".repeat(43);
const environment = {
  CORE_API_BASE_URL: "https://core.example.test/api",
  MERI_API_BASE_URL: "https://meri.example.test",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  MERI_DOCUMENT_WORKFLOW_ENABLED: "true",
  MERI_DOCUMENT_OPERATION: "create_word",
};
const request = (route: string, body: unknown) =>
  new Request(origin + "/api/documents/" + route, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Meri-Action-Session": credential,
    },
    body: JSON.stringify(body),
  });
it("forwards the closed prepare request through the existing native document route", async () => {
  let calls = 0;
  const fetcher = (async (url, init) => {
    calls++;
    expect(String(url)).toBe(
      "https://meri.example.test/api/documents/federal-prepare",
    );
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer " + credential,
    );
    return Response.json(fixture.review);
  }) as typeof fetch;
  const response = await proxyDocumentRequest(
    request("federal-prepare", { selection: fixture.review.selection }),
    "federal-prepare",
    readDocumentConfig(environment),
    async () => "native-cookie-token",
    fetcher,
  );
  expect(response.status).toBe(200);
  expect(calls).toBe(1);
});
it("refuses a widened workbench body before forwarding", async () => {
  let calls = 0;
  const response = await proxyDocumentRequest(
    request("federal-prepare", {
      selection: fixture.review.selection,
      approved: true,
    }),
    "federal-prepare",
    readDocumentConfig(environment),
    async () => "native-cookie-token",
    (async () => {
      calls++;
      return Response.json({});
    }) as typeof fetch,
  );
  expect(response.status).not.toBe(200);
  expect(calls).toBe(0);
});
it("requires enabled word generation for workbench publication", async () => {
  let calls = 0;
  const response = await proxyDocumentRequest(
    request("federal-publish", {}),
    "federal-publish",
    readDocumentConfig({
      ...environment,
      MERI_DOCUMENT_OPERATION: "create_excel",
    }),
    async () => "native-cookie-token",
    (async () => {
      calls++;
      return Response.json({});
    }) as typeof fetch,
  );
  expect(response.status).toBe(503);
  expect(calls).toBe(0);
});
