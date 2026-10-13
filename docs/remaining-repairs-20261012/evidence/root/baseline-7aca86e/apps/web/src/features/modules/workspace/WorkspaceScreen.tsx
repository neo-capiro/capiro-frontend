"use client";
import { DocumentsLibrary, WorkflowCards } from "./WorkspaceLibrary";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  workspaceId,
  type WorkspaceLibraryDocument,
} from "../../../shared/capiro/operations/workspace-schemas";
import { ActionButton, Modal } from "../../../shared/module-ui";
import { HillDayEditor } from "./hillday/HillDayEditor";
import { HillDayWizard } from "./hillday/HillDayWizard";
import { NewsletterWorkflow } from "./newsletter/NewsletterWorkflow";
import { TemplateStudio } from "./templates/TemplateStudio";
import styles from "./workspace.module.css";
import { WorkspaceDraft } from "./WorkspaceDraft";
import { WorkspaceShares } from "./WorkspaceShares";
import { ProspectWorkspace } from "./prospects/ProspectWorkspace";

type View =
  | "documents"
  | "workflows"
  | "shares"
  | "templates"
  | "hillday"
  | "newsletter";
const tabs: { id: View; label: string }[] = [
  { id: "documents", label: "Documents" },
  { id: "workflows", label: "Workflows" },
  { id: "shares", label: "Client shares" },
];

export function WorkspaceScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prospect = workspaceId.safeParse(searchParams.get("prospectId"));
  const initialView = searchParams.get("view");
  const requestedView: View =
    initialView === "hillday" ||
    initialView === "templates" ||
    initialView === "newsletter" ||
    initialView === "workflows" ||
    initialView === "shares"
      ? initialView
      : "documents";
  const parsedClient = workspaceId.safeParse(searchParams.get("clientId"));
  const requestedDraft = workspaceId.safeParse(searchParams.get("draftId"));
  const clientId = parsedClient.success ? parsedClient.data : undefined;
  const [view, setView] = useState<View>(requestedView);
  const [selected, setSelected] = useState<WorkspaceLibraryDocument>();
  const [createdId, setCreatedId] = useState<string>();
  const [newDocument, setNewDocument] = useState(false);
  const [routeKey, setRouteKey] = useState(() =>
    JSON.stringify([requestedView, clientId]),
  );
  if (routeKey !== JSON.stringify([requestedView, clientId])) {
    setRouteKey(JSON.stringify([requestedView, clientId]));
    setView(requestedView);
    setSelected(undefined);
    setCreatedId(undefined);
  }
  const back = () => {
    setSelected(undefined);
    setCreatedId(undefined);
    setView("documents");
  };
  if (searchParams.has("prospectId") && !prospect.success)
    return (
      <section role="alert">
        <h1>Prospect unavailable</h1>
        <p>A canonical prospect ID is required.</p>
      </section>
    );
  if (prospect.success) {
    const base = `/modules/workspace?prospectId=${encodeURIComponent(prospect.data)}`;
    return requestedDraft.success ? (
      <WorkspaceDraft
        key={`${prospect.data}:${requestedDraft.data}`}
        id={requestedDraft.data}
        prospectId={prospect.data}
        onClose={() => router.push(base)}
      />
    ) : (
      <ProspectWorkspace
        key={prospect.data}
        prospectId={prospect.data}
        onOpen={(id) =>
          router.push(`${base}&draftId=${encodeURIComponent(id)}`)
        }
      />
    );
  }
  if (requestedDraft.success)
    return (
      <WorkspaceDraft
        id={requestedDraft.data}
        onClose={() => {
          window.location.assign("/modules/workspace");
        }}
      />
    );
  if (view === "hillday")
    return (
      <HillDayWizard
        initialClientId={clientId}
        onClose={back}
        onCreated={(id) => {
          setCreatedId(id);
          setView("documents");
        }}
      />
    );
  if (view === "newsletter")
    return <NewsletterWorkflow initialClientId={clientId} onClose={back} />;
  if (view === "templates")
    return <TemplateStudio initialClientId={clientId} onClose={back} />;
  if (createdId || selected?.kind === "hillday")
    return <HillDayEditor id={createdId ?? selected!.id} onClose={back} />;
  if (selected?.kind === "draft")
    return <WorkspaceDraft id={selected.id} onClose={back} />;
  return (
    <section className={styles.screen} data-design-node="411:112533">
      <header className={styles.heading}>
        <div>
          <h1>Workspace</h1>
        </div>
        <div className={styles.actions}>
          <ActionButton onClick={() => setView("templates")}>
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
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {view !== "shares" && <WorkflowCards onStart={setView} />}
      {view === "documents" && (
        <DocumentsLibrary clientId={clientId} onOpen={setSelected} />
      )}
      {view === "workflows" && (
        <div className={styles.info}>
          <h3>Templates and workflows</h3>
          <p>
            Start from a published campaign template or build a document using
            client meetings and supporting evidence.
          </p>
          <ActionButton onClick={() => setView("templates")}>
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
              setView("hillday");
            }}
          >
            Hill Day Schedule
          </ActionButton>
          <ActionButton
            onClick={() => {
              setNewDocument(false);
              setView("newsletter");
            }}
          >
            Newsletter
          </ActionButton>
          <ActionButton
            onClick={() => {
              setNewDocument(false);
              setView("templates");
            }}
          >
            Start from a template
          </ActionButton>
        </div>
      </Modal>
    </section>
  );
}
