import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { documentQueryJournal } from "../src/shared/meri-documents/query-journal";
import {
  created,
  deferred,
  fixture,
  jsonResponse,
  session,
  signal,
  textContent,
} from "./meri-document-fixtures";

describe("canonical document uncertainty lifetime", () => {
  it.each(["clear", "dispose"] as const)(
    "withholds success after a reentrant %s during settlement",
    async (change) => {
      const f = fixture();
      const port = f.workflow();
      f.responses.push(jsonResponse(created()));
      const unsubscribe = f.cache.getQueryCache().subscribe(() => {
        if (f.fetcher.mock.calls.length && f.journal.read().status === "idle") {
          if (change === "clear") f.cache.clear();
          else port.dispose();
        }
      });
      expect((await port.create(textContent, signal())).ok).toBe(false);
      if (change === "clear")
        expect(f.cache.getQueryCache().getAll()).toHaveLength(0);
      unsubscribe();
    },
  );
  it("shares pending metadata across views with the exact same canonical context", () => {
    const cache = new QueryClient();
    const first = documentQueryJournal(cache, session.context);
    first.write({
      status: "pending",
      fingerprints: [],
      attemptId: "synthetic-attempt",
    });
    expect(documentQueryJournal(cache, { ...session.context }).read()).toEqual(
      first.read(),
    );
    expect(Object.isFrozen(first.read())).toBe(true);
  });
  it.each([
    "tenantId",
    "actorId",
    "conversationId",
    "runId",
    "selectedClientId",
  ] as const)("isolates changed %s", (field) => {
    const cache = new QueryClient();
    const first = documentQueryJournal(cache, session.context);
    first.write({
      status: "unresolved",
      problem: "unknown",
      fingerprints: ["a".repeat(64)],
    });
    expect(
      documentQueryJournal(cache, {
        ...session.context,
        [field]: "other",
      }).read().status,
    ).toBe("idle");
  });
  it("old owners cannot repopulate a cleared cache or overwrite its replacement generation", () => {
    const cache = new QueryClient();
    const first = documentQueryJournal(cache, session.context);
    cache.clear();
    first.write({ status: "pending", fingerprints: [] });
    expect(cache.getQueryCache().getAll()).toHaveLength(0);
    const replacement = documentQueryJournal(cache, session.context);
    first.write({ status: "unresolved", problem: "unknown", fingerprints: [] });
    expect(replacement.read().status).toBe("idle");
    expect(first.read().problem).toBe("access-lost");
  });
  it("a different QueryClient has no borrowed identity or pending state", () => {
    const first = documentQueryJournal(new QueryClient(), session.context);
    first.write({ status: "pending", fingerprints: [] });
    expect(
      documentQueryJournal(new QueryClient(), session.context).read().status,
    ).toBe("idle");
  });
  it("a reentrant cache-clear notification prevents dispatch before hash completion", async () => {
    const f = fixture();
    const port = f.workflow();
    const unsubscribe = f.cache.getQueryCache().subscribe(() => {
      if (f.journal.read().status === "pending") f.cache.clear();
    });
    expect((await port.create(textContent, signal())).ok).toBe(false);
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.cache.getQueryCache().getAll()).toHaveLength(0);
    unsubscribe();
  });
  it("stores only non-secret fingerprint/disposition metadata while a request is held", async () => {
    const f = fixture();
    const hold = deferred<Response>();
    f.responses.push(hold.promise);
    const pending = f.workflow().create(textContent, signal());
    await vi.waitFor(() => expect(f.fetcher).toHaveBeenCalledTimes(1));
    const data = f.cache
      .getQueryCache()
      .getAll()
      .map((query) => query.state.data);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      status: "pending",
      fingerprints: [expect.stringMatching(/^[a-f0-9]{64}$/)],
    });
    const serialized = JSON.stringify(data);
    for (const privateValue of [
      session.credential,
      "Synthetic document",
      "content",
      "request",
      "version",
      "title",
    ])
      expect(serialized).not.toContain(privateValue);
    hold.resolve(jsonResponse(created()));
    expect((await pending).ok).toBe(true);
  });
});
