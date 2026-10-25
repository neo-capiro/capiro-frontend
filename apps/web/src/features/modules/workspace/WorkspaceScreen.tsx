"use client";
import { DocumentsLibrary, WorkflowCards } from "./WorkspaceLibrary";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { WorkspaceLibraryDocument } from "../../../shared/capiro/operations/workspace-schemas";
import { ActionButton, Modal } from "../../../shared/module-ui";
import { HillDayEditor } from "./hillday/HillDayEditor";
import { HillDayWizard } from "./hillday/HillDayWizard";
import { NewsletterWorkflow } from "./newsletter/NewsletterWorkflow";
import { TemplateStudio } from "./templates/TemplateStudio";
import styles from "./workspace.module.css";
import { WorkspaceDraft } from "./WorkspaceDraft";
import { WorkspaceShares } from "./WorkspaceShares";
import { ProspectWorkspace } from "./prospects/ProspectWorkspace";
import { RichNewsletterEditor } from "./rich-newsletter/RichNewsletterEditor";
import { BriefCopyRoute } from "./brief-copy/BriefCopyRoute";
import {
  readWorkspaceRoute,
  workspaceHref,
  type WorkspaceView,
} from "./workspace-route";

const tabs: { id: WorkspaceView; label: string }[] = [
  { id: "documents", label: "Documents" },
  { id: "workflows", label: "Workflows" },
  { id: "shares", label: "Client shares" },
];

export function WorkspaceScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const route = readWorkspaceRoute(searchParams);
  const [newDocument, setNewDocument] = useState(false);
  if (route.kind === "invalid")
    return (
      <section role="alert">
        <h1>Workspace unavailable</h1>
        <p>This link contains invalid or conflicting document references.</p>
      </section>
    );
  if (route.kind === "brief-copy") return <BriefCopyRoute />;
  const clientId = route.clientId;
  const navigate = (view: WorkspaceView) =>
    router.push(workspaceHref({ kind: "view", view, clientId }));
  const back = () => navigate("documents");
  const openDocument = (row: Pick<WorkspaceLibraryDocument, "id" | "kind">) =>
    router.push(
      workspaceHref(
        row.kind === "hillday"
          ? { kind: "hillday", hilldayId: row.id, clientId }
          : { kind: "draft", draftId: row.id, clientId },
      ),
    );
  if (route.kind === "prospect")
    return (
      <ProspectWorkspace
        key={route.prospectId}
        prospectId={route.prospectId}
        onOpen={(id) =>
          router.push(
            workspaceHref({
              kind: "draft",
              draftId: id,
              prospectId: route.prospectId,
              clientId,
            }),
          )
        }
      />
    );
  if (route.kind === "draft")
    return (
      <WorkspaceDraft
        key={`${route.prospectId ?? "ordinary"}:${route.draftId}:${clientId ?? "general"}`}
        id={route.draftId}
        prospectId={route.prospectId}
        expectedClientId={clientId}
        onClose={() =>
          route.prospectId
            ? router.push(
                workspaceHref({
                  kind: "prospect",
                  prospectId: route.prospectId,
                  clientId,
                }),
              )
            : back()
        }
      />
    );
  if (route.kind === "hillday")
    return (
      <HillDayEditor
        key={`${route.hilldayId}:${clientId ?? "general"}`}
        id={route.hilldayId}
        expectedClientId={clientId}
        onClose={back}
      />
    );
  const view = route.view;
  if (view === "rich-newsletter")
    return (
      <RichNewsletterEditor key={clientId ?? "unassigned"} onClose={back} />
    );
  if (view === "hillday")
    return (
      <HillDayWizard
        initialClientId={clientId}
        onClose={back}
        onCreated={(id) => openDocument({ kind: "hillday", id })}
      />
    );
  if (view === "newsletter")
    return <NewsletterWorkflow initialClientId={clientId} onClose={back} />;
  if (view === "templates")
    return <TemplateStudio initialClientId={clientId} onClose={back} />;
  return (
    <section className={styles.screen} data-design-node="411:112533">
      <header className={styles.heading}>
        <div>
          <h1>Workspace</h1>
        </div>
        <div className={styles.actions}>
          <ActionButton
            onClick={() =>
              router.push(
                `/meri/files${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ""}`,
              )
            }
          >
            Meri files
          </ActionButton>
          <ActionButton onClick={() => navigate("rich-newsletter")}>
            Rich newsletter preview
          </ActionButton>
          <ActionButton onClick={() => navigate("templates")}>
            Template Studio
          </ActionButton>
          <ActionButton primary onClick={() => setNewDocument(true)}>
            + New document
          </ActionButton>
        </div>
      </header>
      <div className={styles.pills} role="group" aria-label="Workspace views">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={view === tab.id ? styles.active : ""}
            aria-pressed={view === tab.id}
            onClick={() => navigate(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {view !== "shares" && <WorkflowCards onStart={navigate} />}
      {view === "documents" && (
        <DocumentsLibrary clientId={clientId} onOpen={openDocument} />
      )}
      {view === "workflows" && (
        <div className={styles.info}>
          <h3>Templates and workflows</h3>
          <p>
            Start from a published campaign template or build a document using
            client meetings and supporting evidence.
          </p>
          <ActionButton onClick={() => navigate("templates")}>
            Open Template Studio
          </ActionButton>
        </div>
      )}
      {view === "shares" && <WorkspaceShares />}
      <Modal
        open={newDocument}
        onOpenChange={setNewDocument}
        title="New document"
        description="Choose a workflow to get started."
        footer={
          <ActionButton onClick={() => setNewDocument(false)}>
            Cancel
          </ActionButton>
        }
      >
        <div className={styles.form}>
          <ActionButton
            onClick={() => {
              setNewDocument(false);
              navigate("hillday");
            }}
          >
            Hill Day Schedule
          </ActionButton>
          <ActionButton
            onClick={() => {
              setNewDocument(false);
              navigate("newsletter");
            }}
          >
            Newsletter
          </ActionButton>
          <ActionButton
            onClick={() => {
              setNewDocument(false);
              navigate("templates");
            }}
          >
            Start from a template
          </ActionButton>
        </div>
      </Modal>
    </section>
  );
}
