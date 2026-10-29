import { describe, it, expect } from "vitest";
import fixture from "./fixtures/federal-workbench.json";
import { FederalWorkbenchAccess } from "../src/shared/meri-documents/federal-workbench";
import { federalTransport } from "../src/shared/meri-documents/workflow-transport";
import type { DocumentLibraryAccess } from "../src/shared/meri-documents/library-access";
import {
  idleDocumentAttempt,
  type DocumentAttempt,
} from "../src/shared/meri-documents/attempt-journal";
import { receiveFederalRequest } from "@capiro/meri-contracts/federal-workbench";
const encode = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
const { selection } = receiveFederalRequest(
  "federal-prepare",
  encode({ selection: fixture.review.selection }),
);
function setup() {
  let attempt: DocumentAttempt = idleDocumentAttempt,
    current = true,
    lost = 0,
    fail = false,
    tamper = false,
    foreign = false;
  const requests: { route: string; body: Record<string, unknown> }[] = [],
    life = new AbortController();
  const context = {
    tenantId: fixture.binding.tenantId,
    actorId: fixture.binding.actorId,
    conversationId: fixture.binding.conversationId,
    runId: fixture.binding.runId,
    selectedClientId: fixture.clientId,
  };
  const library = {
    dispose() {},
    async inspect() {
      return {
        ok: true,
        value: {
          kind: "generated",
          mimeType: "text/plain; charset=utf-8",
          objectSha256: fixture.sourceVersion.object.sha256,
        },
      };
    },
    async download() {
      return {
        ok: true,
        value: {
          filename: "source.txt",
          mimeType: "text/plain; charset=utf-8",
          bytes: encode(
            tamper ? { ...fixture.source, text: "changed" } : fixture.source,
          ),
        },
      };
    },
  } as unknown as DocumentLibraryAccess;
  const fetcher = (async (url, init) => {
    const route = String(url).split("/").at(-1)!,
      body = JSON.parse(String(init?.body));
    requests.push({ route, body });
    if (fail) throw Error("Synthetic lost acknowledgement");
    const result = structuredClone(
      route === "federal-prepare"
        ? fixture.review
        : route === "federal-load"
          ? fixture.savedReview
          : fixture.publications[
              body.output as keyof typeof fixture.publications
            ],
    );
    if (route === "federal-publish") {
      const publication = result as typeof fixture.publications.draft;
      if (body.baseVersionId)
        publication.publication.version.parentVersionId = body.baseVersionId;
      if (foreign)
        publication.publication.version.binding.actorId =
          "00000000-0000-4000-8000-000000000999";
    }
    return Response.json(result);
  }) as typeof fetch;
  const port = new FederalWorkbenchAccess({
    library,
    session: { context, expiresAtMs: Date.now() + 60000 },
    transport: federalTransport(
      "action_session_" + "a".repeat(43),
      life.signal,
      fetcher,
    ),
    journal: {
      read: () => attempt,
      write: (value) => {
        attempt = value;
      },
    },
    isCurrent: () => current,
    onAccessLost: () => {
      lost++;
    },
  });
  return {
    port,
    requests,
    life,
    attempt: () => attempt,
    lost: () => lost,
    setFail: (v: boolean) => {
      fail = v;
    },
    tamper: () => {
      tamper = true;
    },
    foreign: () => {
      foreign = true;
    },
    revoke: () => {
      current = false;
    },
  };
}
describe("federal review session", () => {
  it("reads exact retained source, prepares and publishes through the actual public receiver", async () => {
    const x = setup(),
      signal = new AbortController().signal;
    const source = await x.port.source(selection.versionId, signal);
    expect(source.source.text).toBe(fixture.source.text);
    const review = await x.port.prepare(selection, signal);
    const result = await x.port.publish(review, "operative", signal);
    expect(result.revisionSha256).toBe(review.prepared.revisionSha256);
    expect(x.attempt().status).toBe("idle");
    expect(x.requests.map((x) => x.route)).toEqual([
      "federal-prepare",
      "federal-publish",
    ]);
    await expect(x.port.publish(review, "operative", signal)).rejects.toThrow(
      "already been submitted",
    );
    expect(x.requests).toHaveLength(2);
  });
  it("recovers the same delivery and rejects a different output before another request", async () => {
    const x = setup(),
      signal = new AbortController().signal,
      review = await x.port.prepare(selection, signal);
    x.setFail(true);
    await expect(x.port.publish(review, "operative", signal)).rejects.toThrow();
    const original = x.requests.at(-1)!.body;
    expect(x.attempt().status).toBe("unresolved");
    await expect(x.port.publish(review, "redline", signal)).rejects.toThrow(
      "original",
    );
    expect(x.requests).toHaveLength(2);
    x.setFail(false);
    await x.port.publish(review, "operative", signal);
    expect(x.requests.at(-1)!.body).toEqual(original);
    expect(x.attempt().status).toBe("idle");
  });
  it("edited preparation keeps the selected saved parent and its previous reviewed hash", async () => {
    const x = setup(),
      signal = new AbortController().signal;
    const saved = await x.port.load(
      fixture.savedReview.savedDraft.versionId,
      fixture.savedReview.savedDraft.object.sha256,
      signal,
    );
    const review = await x.port.prepare(selection, signal, saved);
    await x.port.publish(review, "draft", signal);
    expect(x.requests.at(-1)!.body.baseVersionId).toBe(
      fixture.savedReview.savedDraft.versionId,
    );
    expect(x.requests.at(-1)!.body.baseRevisionSha256).toBe(
      fixture.savedReview.prepared.revisionSha256,
    );
  });
  it("refuses changed source bytes", async () => {
    const x = setup();
    x.tamper();
    await expect(
      x.port.source(selection.versionId, new AbortController().signal),
    ).rejects.toThrow();
    expect(x.requests).toHaveLength(0);
  });
  it("current account refusal prevents dispatch", async () => {
    const x = setup();
    x.revoke();
    await expect(
      x.port.prepare(selection, new AbortController().signal),
    ).rejects.toThrow("current");
    expect(x.requests).toHaveLength(0);
    expect(x.lost()).toBe(1);
  });
  it("a foreign-account publication is withheld and leaves the original attempt unresolved", async () => {
    const x = setup(),
      signal = new AbortController().signal,
      review = await x.port.prepare(selection, signal);
    x.foreign();
    await expect(x.port.publish(review, "operative", signal)).rejects.toThrow(
      "account changed",
    );
    expect(x.attempt().status).toBe("unresolved");
    expect(x.lost()).toBe(1);
  });
  it("disposal aborts future reads without sending a request", async () => {
    const x = setup();
    x.port.dispose();
    await expect(
      x.port.prepare(selection, new AbortController().signal),
    ).rejects.toThrow();
    expect(x.requests).toHaveLength(0);
  });
});
