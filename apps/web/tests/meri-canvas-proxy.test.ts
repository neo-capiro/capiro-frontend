import { expect, it, vi } from "vitest";
import { proxyDocumentRequest } from "../src/shared/meri-documents/proxy";
import { readDocumentConfig } from "../src/shared/meri-documents/config";
import {
  created,
  ids,
  textContent,
  session,
} from "./meri-document-public-fixtures";

const origin = "https://frontend.example.test";
const config = readDocumentConfig({
  CORE_API_BASE_URL: "https://core.example.test/api",
  MERI_API_BASE_URL: "https://meri.example.test",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  MERI_CONVERSATION_WORKFLOW_ENABLED: "true",
});
const selection = {
  artifactId: ids.artifact,
  versionId: ids.version,
  objectSha256: created().version.object.sha256,
};
const request = (
  route: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  new Request(`${origin}/api/documents/${route}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Meri-Action-Session": session.credential,
      ...headers,
    },
  });

it.each(["canvas-read", "canvas-save"])(
  "forwards %s through the admitted conversation session without enabling unrelated generation",
  async (route) => {
    const body =
      route === "canvas-read"
        ? { selection }
        : {
            selection,
            deliveryId: "synthetic-canvas-save",
            request: textContent,
          };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ saved: true }));
    expect(config.enabled).toBe(false);
    expect(config.readEnabled).toBe(true);
    const response = await proxyDocumentRequest(
      request(route, body),
      route,
      config,
      async () => "native-token",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      `https://meri.example.test/api/documents/${route}`,
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      credentials: "omit",
      headers: { Authorization: `Bearer ${session.credential}` },
    });
    expect(
      new TextDecoder().decode(fetcher.mock.calls[0]?.[1]?.body as Uint8Array),
    ).toBe(JSON.stringify(body));
  },
);

it.each<Record<string, string>>([
  { Origin: "https://other.example.test" },
  { authorization: "Bearer browser-authority" },
])(
  "refuses browser authority/cross-origin input before dispatch",
  async (headers) => {
    const fetcher = vi.fn<typeof fetch>();
    const response = await proxyDocumentRequest(
      request("canvas-read", { selection }, headers),
      "canvas-read",
      config,
      async () => "native-token",
      fetcher,
    );
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("refuses non-Word content and caller-provided provenance without dispatch", async () => {
  for (const extra of [
    { evidence: [] },
    {
      request: {
        operation: "create_excel",
        format: "xlsx",
        title: "Synthetic",
        content: { sheets: [] },
      },
    },
  ]) {
    const fetcher = vi.fn<typeof fetch>();
    const body = {
      selection,
      deliveryId: "synthetic-canvas-save",
      request: textContent,
      ...extra,
    };
    const response = await proxyDocumentRequest(
      request("canvas-save", body),
      "canvas-save",
      config,
      async () => "native-token",
      fetcher,
    );
    expect(response.status).toBe(502);
    expect(fetcher).not.toHaveBeenCalled();
  }
});
