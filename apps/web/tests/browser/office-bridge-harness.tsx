import { StrictMode, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { IntentsDecideRequest } from "@capiro/meri-client/intents";
import { ConversationIntents } from "../../src/features/meri/conversation/intents/ConversationIntents";
import { IntentApprovalsEnabled } from "../../src/features/meri/conversation/intents/approvals-enabled";
import { OfficeEditing } from "../../src/features/meri/office/OfficeEditing";
import { DocumentRevisionLink } from "../../src/features/meri/files/DocumentRevisionLink";
import { syncMeriTabIdentity } from "../../src/shared/meri-conversations/tab-journal";
import type { IntentsAccess } from "../../src/shared/meri-intents/access";
import type { DocumentLibraryAccess } from "../../src/shared/meri-documents/library-access";
import {
  conversationId,
  officeDecideResponse,
  officeDocument,
  officeEditFixture,
  officeListResponse,
  viewer,
  type OfficeResult,
} from "../office-edit-fixture";
import "../../src/app/globals.css";

// The page's identity boundary primes the tab journal in production (MeriTabSession); the harness does the same.
syncMeriTabIdentity("synthetic-identity");

/** The scripted Core/Meri answers: the entry inspects the exact version, the list shows Meri's proposal, Apply
 * answers the applied version once and replays it afterwards; nothing here is a network or a real owner. */
function Harness() {
  const [events, setEvents] = useState<string[]>([]);
  const [status, setStatus] =
    useState<OfficeResult["proposalStatus"]>("proposed");
  const [client] = useState(() => new QueryClient());
  // The scripted owner's durable state: mutated by the scripted decide, never by a render.
  const owner = useRef<{ status: OfficeResult["proposalStatus"] }>({
    status: "proposed",
  });
  const [context] = useState(() => ({
    tenantId: viewer.tenantId,
    actorId: viewer.actorId,
    conversationId,
    selectedClientId: null,
    runId: "00000000-0000-4000-8000-000000000003",
  }));
  const note = (value: string) => setEvents((old) => [...old, value]);
  const library = {
    context,
    pending: () => false,
    dispose() {},
    async inspect(versionId: string) {
      note(`inspect:${versionId.slice(-4)}`);
      return {
        ok: true as const,
        value: {
          kind: "generated" as const,
          versionId,
          artifactId: officeDocument.artifactId,
          objectSha256: officeDocument.objectSha256,
          filename: officeDocument.filename,
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          bytes: 4321,
          createdAt: "2026-11-01T00:00:00.000Z",
          generationStatus: "draft" as const,
          previewStatus: "pending" as const,
          inspection: {
            sha256: officeDocument.objectSha256,
            bytes: 4321,
            format: "docx" as const,
            nativeOpened: false,
            rendered: false,
            recalculated: false,
            members: [],
            details: {},
          },
        },
      };
    },
  } as unknown as DocumentLibraryAccess;
  const [access] = useState<IntentsAccess>(() => ({
    async list() {
      note("list");
      return {
        kind: "ok",
        value: officeListResponse(officeEditFixture(owner.current.status)),
      };
    },
    async decide(request: IntentsDecideRequest) {
      note(`decide:${request.decision}`);
      if (
        request.decision === "approved" &&
        owner.current.status === "proposed"
      ) {
        owner.current.status = "applied";
        setStatus("applied");
      }
      if (
        request.decision === "rejected" &&
        owner.current.status === "proposed"
      ) {
        owner.current.status = "rejected";
        setStatus("rejected");
      }
      return { kind: "ok", value: officeDecideResponse(owner.current.status) };
    },
  }));
  return (
    <QueryClientProvider client={client}>
      <main style={{ padding: 24 }}>
        <h1>Same-document Office bridge</h1>
        <section aria-label="Files">
          <DocumentRevisionLink
            port={library}
            versionId={officeDocument.versionId}
            office
          />
        </section>
        <IntentApprovalsEnabled.Provider value>
          <OfficeEditing enabled account={viewer}>
            <ConversationIntents access={access} scope={context} />
          </OfficeEditing>
        </IntentApprovalsEnabled.Provider>
        <output aria-label="Service operations">{events.join(",")}</output>
        <output aria-label="Proposal status">{status}</output>
      </main>
    </QueryClientProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
