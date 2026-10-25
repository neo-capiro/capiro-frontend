import { expect, it } from "vitest";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";
import { readConfig } from "../src/shared/portfolio/config/config";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { requestFileDeletion } from "../src/features/portfolio/files/deletion";
import { actor, attempt, receiptFor } from "./files-delete-fixtures";
const config = readConfig({
  CORE_API_BASE_URL: "https://core.example.test/api",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
});
it.each([true, false])(
  "existing Portfolio proxy carries the exact deletion command or receipt request send=%s",
  async (send) => {
    const saved = await attempt(),
      calls: { method: string; url: string; body: unknown }[] = [];
    const api = createApiClient(async (url, init) => {
      const request = new Request(
        new URL(String(url), "https://preview.example.test"),
        {
          ...init,
          headers: { ...init?.headers, Origin: "https://preview.example.test" },
        },
      );
      return proxyRequest(
        request,
        "core",
        new URL(request.url).pathname
          .replace("/api/backend/core/", "")
          .split("/"),
        config,
        async () => "synthetic-token",
        async (upstream, options) => {
          calls.push({
            method: options!.method!,
            url: String(upstream),
            body: options?.body ? JSON.parse(String(options.body)) : null,
          });
          return Response.json(receiptFor(saved));
        },
      );
    });
    expect(
      await requestFileDeletion(
        api,
        actor,
        saved,
        send,
        new AbortController().signal,
        () => {},
      ),
    ).toEqual(receiptFor(saved));
    expect(calls).toEqual([
      {
        method: send ? "DELETE" : "GET",
        url: send
          ? `https://core.example.test/api/engagement/attachments/${saved.command.attachmentId}`
          : `https://core.example.test/api/engagement/attachments/deletions/${saved.command.requestId}`,
        body: send
          ? {
              schemaVersion: 1,
              requestId: saved.command.requestId,
              clientId: saved.command.clientId,
              expectedRevision: 3,
            }
          : null,
      },
    ]);
  },
);
it("cross-origin DELETE is refused without forwarding any reviewed command", async () => {
  let forwarded = false;
  const saved = await attempt();
  const response = await proxyRequest(
    new Request(
      "https://preview.example.test/api/backend/core/engagement/attachments/file",
      {
        method: "DELETE",
        headers: { Origin: "https://other.example.test" },
        body: JSON.stringify(saved.command),
      },
    ),
    "core",
    ["engagement", "attachments", saved.command.attachmentId],
    config,
    async () => "synthetic-token",
    async () => {
      forwarded = true;
      return Response.json({ ok: true });
    },
  );
  expect(response.status).toBe(403);
  expect(forwarded).toBe(false);
});
