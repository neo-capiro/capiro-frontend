import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import fixture from "../../../tests/fixtures/federal-workbench.json";
import { FederalWorkbench } from "../../../src/features/meri/files/FederalWorkbench";
import { FederalWorkbenchAccess } from "../../../src/shared/meri-documents/federal-workbench";
import { federalTransport } from "../../../src/shared/meri-documents/workflow-transport";
import {
  idleDocumentAttempt,
  type DocumentAttempt,
} from "../../../src/shared/meri-documents/attempt-journal";
import type { DocumentLibraryAccess } from "../../../src/shared/meri-documents/library-access";
declare global {
  interface Window {
    federalCalls: { route: string; body: Record<string, unknown> }[];
  }
}
window.federalCalls = [];
let attempt: DocumentAttempt = idleDocumentAttempt;
let loseOnce = new URL(location.href).searchParams.has("unknown");
const library = {
  dispose() {},
  context: {},
  pending: () => false,
  async list() {
    return {
      ok: true,
      value: {
        scope: "conversation",
        versions: [fixture.sourceVersion, fixture.savedReview.savedDraft],
        nextCursor: null,
      },
    };
  },
  async history() {
    return {
      ok: true,
      value: {
        artifactId: fixture.savedReview.savedDraft.artifactId,
        versions: [fixture.savedReview.savedDraft],
        nextCursor: null,
      },
    };
  },
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
  async download(versionId: string) {
    const output = Object.values(fixture.publications).find(
      (p) => p.publication.version.versionId === versionId,
    );
    return {
      ok: true,
      value: {
        filename:
          output?.publication.version.filename ?? "synthetic-source.txt",
        mimeType: "text/plain; charset=utf-8",
        bytes: new TextEncoder().encode(
          output &&
            (output.output === "operative" ||
              output.output === "consolidated" ||
              output.output === "redline")
            ? fixture.review.prepared.draft.outputs[output.output]
            : JSON.stringify(fixture.source),
        ),
      },
    };
  },
} as unknown as DocumentLibraryAccess;
const fetcher = (async (url, init) => {
  const route = String(url).split("/").at(-1)!,
    body = JSON.parse(String(init?.body));
  window.federalCalls.push({ route, body });
  if (route === "federal-publish" && loseOnce) {
    loseOnce = false;
    throw Error("Synthetic interrupted acknowledgement");
  }
  return Response.json(
    route === "federal-prepare"
      ? fixture.review
      : route === "federal-load"
        ? fixture.savedReview
        : fixture.publications[
            body.output as keyof typeof fixture.publications
          ],
  );
}) as typeof fetch;
const port = new FederalWorkbenchAccess({
  library,
  session: {
    expiresAtMs: Date.now() + 300000,
    context: {
      tenantId: fixture.binding.tenantId,
      actorId: fixture.binding.actorId,
      conversationId: fixture.binding.conversationId,
      runId: fixture.binding.runId,
      selectedClientId: fixture.clientId,
    },
  },
  journal: {
    read: () => attempt,
    write: (value) => {
      attempt = value;
    },
  },
  transport: federalTransport(
    "action_session_" + "a".repeat(43),
    new AbortController().signal,
    fetcher,
  ),
  onAccessLost: () => {
    throw Error("Unexpected synthetic access loss");
  },
});
function Harness() {
  const [key, setKey] = useState(0);
  return (
    <>
      <p>
        Synthetic source and native-owner response fixture; no live legal
        source.
      </p>
      <button onClick={() => setKey((value) => value + 1)}>
        Remount workbench
      </button>
      <FederalWorkbench key={key} port={port} />
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
