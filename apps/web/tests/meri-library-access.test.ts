import { expect, it, vi } from "vitest";
import { createDocumentLibraryAccess } from "../src/shared/meri-documents/library-access";
import { proxyDocumentRequest } from "../src/shared/meri-documents/proxy";
import { created, session, ids } from "./meri-document-public-fixtures";

const signal = () => new AbortController().signal;
const origin = "https://frontend.synthetic.invalid";
const config = {
  enabled: false,
  readEnabled: true,
  operation: null,
  baseUrl: "https://meri.synthetic.invalid",
  requestOrigin: origin,
};

it.each(["list", "history"] as const)(
  "the actual proxy forwards the closed %s read while creation is disabled",
  async (route) => {
    const body =
      route === "list"
        ? { scope: "owner", limit: 25, cursor: null }
        : { versionId: ids.version, limit: 25, cursor: null };
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ synthetic: true }),
    );
    const request = new Request(`${origin}/api/documents/${route}`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "X-Meri-Action-Session": session.credential,
      },
      body: JSON.stringify(body),
    });
    expect(
      (
        await proxyDocumentRequest(
          request,
          route,
          config,
          async () => "native",
          fetcher,
        )
      ).status,
    ).toBe(200);
    expect(await new Response(fetcher.mock.calls[0]?.[1]?.body).json()).toEqual(
      body,
    );
    expect(
      new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("authorization"),
    ).toBe(`Bearer ${session.credential}`);
  },
);

it("public list/history receivers admit metadata through the installed facade without implicitly inspecting or downloading", async () => {
  const version = created().version;
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    Response.json(
      String(url).endsWith("list")
        ? { scope: "owner", versions: [version], nextCursor: null }
        : {
            artifactId: version.artifactId,
            anchorVersionId: version.versionId,
            headVersionId: version.versionId,
            versions: [version],
            nextCursor: null,
          },
    ),
  );
  const port = createDocumentLibraryAccess({
    credential: session.credential,
    context: session.context,
    lifetime: signal(),
    onAccessLost: vi.fn(),
    fetcher,
  });
  expect(
    (await port.list({ scope: "owner", limit: 25, cursor: null }, signal())).ok,
  ).toBe(true);
  expect(
    (
      await port.history(
        { versionId: version.versionId, limit: 25, cursor: null },
        signal(),
      )
    ).ok,
  ).toBe(true);
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    "/api/documents/list",
    "/api/documents/history",
  ]);
  port.dispose();
});

it.each(["actor", "conversation", "client"])(
  "refuses metadata from a substituted %s context and ends the current connection",
  async (field) => {
    const version = created().version;
    if (field === "actor") version.binding.actorId = "another-actor";
    if (field === "conversation") version.binding.conversationId = ids.other;
    if (field === "client") {
      version.scopes[0]!.resourceId = ids.other;
      version.object.scopes[0]!.resourceId = ids.other;
    }
    const scope =
      field === "conversation"
        ? "conversation"
        : field === "client"
          ? "client"
          : "owner";
    const lost = vi.fn(),
      fetcher = vi.fn<typeof fetch>(async () =>
        Response.json({ scope, versions: [version], nextCursor: null }),
      );
    const port = createDocumentLibraryAccess({
      credential: session.credential,
      context: session.context,
      lifetime: signal(),
      onAccessLost: lost,
      fetcher,
    });
    expect(
      (await port.list({ scope, limit: 25, cursor: null }, signal())).ok,
    ).toBe(false);
    expect(lost).toHaveBeenCalledOnce();
    port.dispose();
  },
);

it("current refusal discards metadata and invokes the access-loss owner", async () => {
  const lost = vi.fn();
  const port = createDocumentLibraryAccess({
    credential: session.credential,
    context: session.context,
    lifetime: signal(),
    onAccessLost: lost,
    fetcher: async () => new Response("private upstream text", { status: 403 }),
  });
  const result = await port.list(
    { scope: "owner", limit: 25, cursor: null },
    signal(),
  );
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain("private upstream");
  expect(lost).toHaveBeenCalledOnce();
  port.dispose();
});
