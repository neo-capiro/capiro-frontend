import { describe, expect, it, vi } from "vitest";
import {
  receiveDocumentRequest,
  receiveDocumentResponse,
} from "@capiro/meri-contracts/document-application";
import {
  binary,
  created,
  deferred,
  fixture,
  ids,
  inspected,
  jsonBytes,
  jsonResponse,
  session,
  signal,
  textContent,
  wordContent,
  workbookContent,
} from "./meri-document-fixtures";

describe("document receiving and immutable views", () => {
  it.each([
    ["txt", textContent],
    ["docx", wordContent],
    ["xlsx", workbookContent],
  ] as const)(
    "admits public %s receipts without claiming native opening",
    async (format, content) => {
      const f = fixture(content.operation);
      const port = f.workflow();
      f.responses.push(jsonResponse(created(format)));
      const reply = await port.create(content, signal());
      expect(reply.ok).toBe(true);
      if (!reply.ok) return;
      expect(reply.value.metadata.format).toBe(format);
      expect(reply.value.inspection.nativeOpened).toBe(false);
      expect(reply.value.inspection.rendered).toBe(false);
      expect(JSON.stringify(reply.value)).not.toContain("credential");
      expect(Object.isFrozen(reply.value.metadata)).toBe(true);
      expect(port.snapshot().status).toBe("idle");
    },
  );
  it("captures content synchronously before the first await", async () => {
    const f = fixture();
    const content = structuredClone(textContent);
    f.responses.push(jsonResponse(created()));
    const pending = f.workflow().create(content, signal());
    content.title = "Changed after click";
    expect((await pending).ok).toBe(true);
    expect(
      JSON.parse(f.fetcher.mock.calls[0]![1]!.body as string).request.title,
    ).toBe("Synthetic");
  });
  it("receives a full replacement revision preserving artifact and parent", async () => {
    const f = fixture();
    const port = f.workflow();
    f.responses.push(jsonResponse(created()));
    const first = await port.create(textContent, signal());
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const revision = created();
    revision.version.versionId = ids.revision;
    revision.version.parentVersionId = ids.version;
    f.responses.push(jsonResponse(revision));
    const reply = await port.revise(first.value.handle, textContent, signal());
    expect(reply.ok).toBe(true);
    if (reply.ok)
      expect(reply.value.metadata).toMatchObject({
        versionId: ids.revision,
        parentVersionId: ids.version,
        artifactId: ids.artifact,
      });
    expect(
      JSON.parse(f.fetcher.mock.calls[1]![1]!.body as string),
    ).toMatchObject({ baseVersionId: ids.version, request: textContent });
  });
  it.each([
    null,
    {},
    { ...textContent, extra: true },
    { ...textContent, content: { text: 8 } },
  ])("refuses malformed public input before dispatch", async (content) => {
    const f = fixture();
    expect(await f.workflow().create(content, signal())).toEqual({
      ok: false,
      problem: "not-dispatched",
    });
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.journal.read().status).toBe("idle");
  });
  it.each([
    ["create_word", workbookContent],
    ["create_excel", textContent],
  ] as const)(
    "does not mix server-bound %s operation families",
    async (operation, content) => {
      const f = fixture(operation);
      expect((await f.workflow().create(content, signal())).ok).toBe(false);
      expect(f.fetcher).not.toHaveBeenCalled();
    },
  );
  it("refuses foreign, cloned and disposed handles without network effects", async () => {
    const f = fixture();
    const first = f.workflow();
    const second = f.workflow();
    f.responses.push(jsonResponse(created()));
    const reply = await first.create(textContent, signal());
    expect(reply.ok).toBe(true);
    if (!reply.ok) return;
    for (const [port, handle] of [
      [first, {}],
      [first, { ...reply.value.handle }],
      [second, reply.value.handle],
    ] as const) {
      expect((await port.download(handle, signal())).ok).toBe(false);
      expect((await port.revise(handle, textContent, signal())).ok).toBe(false);
    }
    first.dispose();
    expect((await first.inspect(reply.value.handle, signal())).ok).toBe(false);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it("admits an explicitly supplied version ID and historical producer metadata", async () => {
    const f = fixture();
    const port = f.workflow();
    f.responses.push(jsonResponse(inspected()));
    const reply = await port.inspectVersion(ids.version, signal());
    expect(reply.ok).toBe(true);
    expect(f.journal.read().status).toBe("idle");
    expect(JSON.parse(f.fetcher.mock.calls[0]![1]!.body as string)).toEqual({
      versionId: ids.version,
    });
  });
  it("public request/version brands are real, not adapter DTO mocks", async () => {
    const request = receiveDocumentRequest(
      "create",
      jsonBytes({ deliveryId: "synthetic", request: textContent }),
    );
    await expect(
      receiveDocumentResponse("create", 200, jsonBytes(created()), {
        ...request,
      }),
    ).rejects.toThrow("UNADMITTED_REQUEST");
  });
});

describe("document scope and known immutable identity", () => {
  it.each(["tenantId", "actorId", "conversationId", "runId"] as const)(
    "withholds receiver-valid foreign %s",
    async (field) => {
      const f = fixture();
      const value = created();
      value.version.binding[field] =
        field.endsWith("Id") && ["conversationId", "runId"].includes(field)
          ? ids.other
          : "foreign";
      if (field === "tenantId") {
        value.version.scopes[0].tenantId = "foreign";
        value.version.object.scopes[0].tenantId = "foreign";
      }
      const admitted = receiveDocumentRequest(
        "create",
        jsonBytes({ deliveryId: "foreign-control", request: textContent }),
      );
      expect(
        await receiveDocumentResponse(
          "create",
          200,
          jsonBytes(value),
          admitted,
        ),
      ).toHaveProperty("version");
      f.responses.push(jsonResponse(value));
      expect(await f.workflow().create(textContent, signal())).toEqual({
        ok: false,
        problem: "unknown",
      });
      expect(f.journal.read().status).toBe("unresolved");
    },
  );
  it.each(["foreign", "missing", "extra"] as const)(
    "withholds %s selected-client scope",
    async (kind) => {
      const f = fixture();
      const value = created();
      if (kind === "foreign") value.version.scopes[0].resourceId = ids.other;
      if (kind === "missing") value.version.scopes[0].kind = "tenant";
      if (kind === "extra")
        value.version.scopes.push({
          ...value.version.scopes[0],
          resourceId: ids.other,
        });
      value.version.object.scopes = value.version.scopes;
      f.responses.push(jsonResponse(inspected(value)));
      expect(await f.workflow().inspectVersion(ids.version, signal())).toEqual({
        ok: false,
        problem: "read-unavailable",
      });
    },
  );
  it("rejects a native-valid revision for a different artifact", async () => {
    const f = fixture();
    const port = f.workflow();
    f.responses.push(jsonResponse(created()));
    const first = await port.create(textContent, signal());
    if (!first.ok) throw new Error("Fixture admission failed");
    const value = created();
    value.version.artifactId = ids.other;
    value.version.parentVersionId = ids.version;
    value.version.versionId = ids.revision;
    const admitted = receiveDocumentRequest(
      "revise",
      jsonBytes({
        deliveryId: "foreign-control",
        baseVersionId: ids.version,
        request: textContent,
      }),
    );
    expect(
      await receiveDocumentResponse("revise", 200, jsonBytes(value), admitted),
    ).toHaveProperty("version");
    f.responses.push(jsonResponse(value));
    expect(
      (await port.revise(first.value.handle, textContent, signal())).ok,
    ).toBe(false);
    expect(port.snapshot().status).toBe("unresolved");
  });
  it("does not replace known immutable metadata with a second receipt", async () => {
    const f = fixture();
    const port = f.workflow();
    f.responses.push(jsonResponse(inspected()));
    const first = await port.inspectVersion(ids.version, signal());
    if (!first.ok) throw new Error("Fixture admission failed");
    const changed = created();
    changed.version.artifactId = ids.other;
    f.responses.push(jsonResponse(inspected(changed)));
    expect((await port.inspect(first.value.handle, signal())).ok).toBe(false);
    f.responses.push(binary());
    expect((await port.download(first.value.handle, signal())).ok).toBe(true);
  });
  it("does not admit XLSX reads through a Word-bound host", async () => {
    const f = fixture();
    f.responses.push(jsonResponse(inspected(created("xlsx"))));
    expect((await f.workflow().inspectVersion(ids.version, signal())).ok).toBe(
      false,
    );
  });
  it("refuses a revision that reuses the immutable base version ID", async () => {
    const f = fixture();
    const port = f.workflow();
    f.responses.push(jsonResponse(created()));
    const first = await port.create(textContent, signal());
    if (!first.ok) throw new Error("Fixture admission failed");
    const value = created();
    value.version.parentVersionId = ids.version;
    f.responses.push(jsonResponse(value));
    expect(
      (await port.revise(first.value.handle, textContent, signal())).ok,
    ).toBe(false);
    expect(port.snapshot().status).toBe("unresolved");
  });
});

describe("synchronous write fences and current lifetime", () => {
  it("an interrupted revision blocks replacement writes across navigation", async () => {
    const f = fixture();
    const port = f.workflow();
    f.responses.push(jsonResponse(inspected()));
    const first = await port.inspectVersion(ids.version, signal());
    if (!first.ok) throw new Error("Fixture admission failed");
    const held = deferred<Response>();
    f.responses.push(held.promise);
    const pending = port.revise(first.value.handle, textContent, signal());
    await vi.waitFor(() => expect(f.fetcher).toHaveBeenCalledTimes(2));
    port.dispose();
    expect(await pending).toEqual({ ok: false, problem: "unknown" });
    expect(await f.workflow().create(wordContent, signal())).toEqual({
      ok: false,
      problem: "unknown",
    });
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    held.resolve(jsonResponse(created()));
  });
  it("an unparseable denial invalidates access while preserving write uncertainty", async () => {
    const f = fixture();
    f.responses.push(new Response("bad", { status: 403 }));
    expect(await f.workflow().create(textContent, signal())).toEqual({
      ok: false,
      problem: "access-lost",
    });
    expect(f.journal.read()).toMatchObject({
      status: "unresolved",
      problem: "unknown",
    });
    expect(f.onAccessLost).toHaveBeenCalledTimes(1);
  });
  it.each(["dispose", "pause"] as const)(
    "withholds verified download bytes after %s",
    async (change) => {
      const f = fixture();
      const port = f.workflow();
      f.responses.push(jsonResponse(inspected()));
      const first = await port.inspectVersion(ids.version, signal());
      if (!first.ok) throw new Error("Fixture admission failed");
      const held = deferred<Response>();
      f.responses.push(held.promise);
      const pending = port.download(first.value.handle, signal());
      await vi.waitFor(() => expect(f.fetcher).toHaveBeenCalledTimes(2));
      if (change === "dispose") port.dispose();
      else f.setAvailable(false);
      held.resolve(binary());
      expect((await pending).ok).toBe(false);
      expect(f.journal.read().status).toBe("idle");
    },
  );
  it("fences a second host before the first asynchronous hash/dispatch", async () => {
    const f = fixture();
    const hold = deferred<Response>();
    f.responses.push(hold.promise);
    const first = f.workflow().create(textContent, signal());
    expect(f.journal.read().status).toBe("pending");
    expect(await f.workflow().create(textContent, signal())).toEqual({
      ok: false,
      problem: "unknown",
    });
    await vi.waitFor(() => expect(f.fetcher).toHaveBeenCalledTimes(1));
    hold.resolve(jsonResponse(created()));
    expect((await first).ok).toBe(true);
  });
  it("does not redeliver the same completed intent after navigation or reordered keys", async () => {
    const f = fixture();
    f.responses.push(jsonResponse(created()));
    expect((await f.workflow().create(textContent, signal())).ok).toBe(true);
    expect(
      await f.workflow().create(
        {
          content: { text: "Synthetic document" },
          title: "Synthetic",
          format: "txt",
          operation: "create_word",
        },
        signal(),
      ),
    ).toEqual({ ok: false, problem: "not-dispatched" });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(
      JSON.stringify(
        f.cache.getQueryData([
          "meri",
          "document-attempt",
          ...Object.values(session.context),
        ]),
      ),
    ).not.toContain("Synthetic document");
  });
  it("retains unknown write after abort, permits explicit read, and never treats it as write proof", async () => {
    const f = fixture();
    const hold = deferred<Response>();
    f.responses.push(hold.promise);
    const caller = new AbortController();
    const port = f.workflow();
    const pending = port.create(textContent, caller.signal);
    await vi.waitFor(() => expect(f.fetcher).toHaveBeenCalledTimes(1));
    caller.abort();
    expect(await pending).toEqual({ ok: false, problem: "unknown" });
    hold.resolve(jsonResponse(created()));
    f.responses.push(jsonResponse(inspected()));
    const next = f.workflow();
    expect((await next.inspectVersion(ids.version, signal())).ok).toBe(true);
    expect(
      await next.create({ ...textContent, title: "New" }, signal()),
    ).toEqual({ ok: false, problem: "unknown" });
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    expect(next.snapshot().status).toBe("unresolved");
  });
  it.each(["UNKNOWN", "RESULT_NOT_RELEASED"] as const)(
    "retains validated %s disposition across navigation",
    async (outcome) => {
      const f = fixture();
      f.responses.push(
        jsonResponse(
          { error: { code: "DOCUMENT_RESULT_REFUSED", outcome } },
          502,
        ),
      );
      const reply = await f.workflow().create(textContent, signal());
      expect(reply).toEqual({
        ok: false,
        problem: outcome === "UNKNOWN" ? "unknown" : "result-withheld",
      });
      expect((await f.workflow().create(wordContent, signal())).ok).toBe(false);
      expect(f.fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it("keeps NOT_DISPATCHED distinct and permits a different explicit intent", async () => {
    const f = fixture();
    const port = f.workflow();
    f.responses.push(
      jsonResponse(
        { error: { code: "UNAVAILABLE", outcome: "NOT_DISPATCHED" } },
        503,
      ),
    );
    expect(await port.create(textContent, signal())).toEqual({
      ok: false,
      problem: "not-dispatched",
    });
    expect(port.snapshot().status).toBe("idle");
    f.responses.push(jsonResponse(created("docx")));
    expect((await port.create(wordContent, signal())).ok).toBe(true);
  });
  it.each(["dispose", "pause", "expiry", "clear"] as const)(
    "withholds held write completion after %s",
    async (change) => {
      const f = fixture();
      const port = f.workflow();
      const hold = deferred<Response>();
      f.responses.push(hold.promise);
      const pending = port.create(textContent, signal());
      await vi.waitFor(() => expect(f.fetcher).toHaveBeenCalledTimes(1));
      if (change === "dispose") port.dispose();
      if (change === "pause") f.setAvailable(false);
      if (change === "expiry") f.setNow(session.expiresAtMs);
      if (change === "clear") f.cache.clear();
      hold.resolve(jsonResponse(created()));
      expect((await pending).ok).toBe(false);
      if (change === "clear")
        expect(f.cache.getQueryCache().getAll()).toHaveLength(0);
      else expect(f.journal.read().status).not.toBe("idle");
    },
  );
  it("pausing refuses new reads/writes and resume makes no automatic request", async () => {
    const f = fixture();
    const port = f.workflow();
    f.setAvailable(false);
    expect((await port.create(textContent, signal())).ok).toBe(false);
    expect((await port.inspectVersion(ids.version, signal())).ok).toBe(false);
    f.setAvailable(true);
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    "revocation clears local handles with valid error body=%s",
    async (valid) => {
      const f = fixture();
      const port = f.workflow();
      f.responses.push(jsonResponse(inspected()));
      const first = await port.inspectVersion(ids.version, signal());
      if (!first.ok) throw new Error("Fixture admission failed");
      f.responses.push(
        valid
          ? jsonResponse(
              { error: { code: "UNAUTHENTICATED", outcome: "NOT_DISPATCHED" } },
              401,
            )
          : new Response("bad", { status: 401 }),
      );
      expect(await port.inspect(first.value.handle, signal())).toEqual({
        ok: false,
        problem: "access-lost",
      });
      expect(f.onAccessLost).toHaveBeenCalledTimes(1);
      expect((await port.download(first.value.handle, signal())).ok).toBe(
        false,
      );
      expect(f.fetcher).toHaveBeenCalledTimes(2);
    },
  );
});
