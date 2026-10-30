"use client";
import { useState, type ReactNode } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { ActionButton, StatusPanel } from "../../../shared/module-ui";
import { NewsletterDestination } from "./NewsletterDestination";
import { newsletterRecordKind } from "./newsletter-route";
import { OutreachWorkflow } from "./outreach/OutreachWorkflow";
import { OutreachList } from "./outreach/OutreachList";
import { OutreachDraft } from "./outreach/OutreachDraft";
import { CampaignOverview } from "./outreach/CampaignOverview";
import type { CampaignCategory } from "./outreach/outreach-list-model";

type Selection = {
  id: string;
  kind: "draft" | "campaign";
  overview: boolean;
  step?: number;
} | null;
function navigate(selection: Selection) {
  const url = new URL(window.location.href);
  for (const key of [
    "draft",
    "session",
    "create",
    "detail",
    "step",
    "campaignRequest",
    "generationRequest",
    "sendRequest",
    "outreachSave",
  ])
    url.searchParams.delete(key);
  if (selection?.id === "new") url.searchParams.set("create", selection.kind);
  else if (selection)
    url.searchParams.set(
      selection.kind === "draft" ? "draft" : "session",
      selection.id,
    );
  if (selection?.overview) url.searchParams.set("detail", "overview");
  if (selection?.step) url.searchParams.set("step", String(selection.step));
  window.history.replaceState(window.history.state, "", url);
}
/** Selected records are classified before mounting any editor. Core owns all writes. */
export function OutreachView({
  clientId,
  initialDraft,
  initialSession,
  initialCreate = false,
  directoryContext = false,
  listHeader,
  overview = false,
  initialStep,
  campaignCreate = false,
  draftSavePending = false,
}: {
  clientId: string;
  initialDraft?: string;
  initialSession?: string;
  initialCreate?: boolean;
  directoryContext?: boolean;
  listHeader?: ReactNode;
  overview?: boolean;
  initialStep?: number;
  campaignCreate?: boolean;
  draftSavePending?: boolean;
}) {
  const [selection, setSelection] = useState<Selection>(() =>
    initialDraft
      ? { id: initialDraft, kind: "draft", overview, step: initialStep }
      : initialSession
        ? { id: initialSession, kind: "campaign", overview, step: initialStep }
        : initialCreate
          ? {
              id: "new",
              kind: campaignCreate ? "campaign" : "draft",
              overview: !campaignCreate,
            }
          : null,
  );
  const [category, setCategory] = useState<CampaignCategory>("drafts");
  const selectedRecord = useCapiroQuery(
    "engagement.outreach.record",
    { params: { id: selection?.id ?? "" } },
    { enabled: selection?.kind === "draft" && selection.id !== "new" },
  );
  const open = (next: Selection) => {
    setSelection(next);
    navigate(next);
  };
  const back = (nextCategory?: CampaignCategory) => {
    if (nextCategory) setCategory(nextCategory);
    open(null);
  };
  if (selection?.kind === "draft" && selection.id !== "new") {
    const row = selectedRecord.data;
    const mismatch =
      row &&
      (row.id.toLowerCase() !== selection.id.toLowerCase() ||
        (clientId && row.client?.id.toLowerCase() !== clientId.toLowerCase()));
    if (selectedRecord.loading || selectedRecord.error || !row || mismatch)
      return (
        <>
          <ActionButton onClick={() => back()}>← All outreach</ActionButton>
          <StatusPanel
            loading={selectedRecord.loading}
            error={
              mismatch
                ? "The returned outreach does not match this client scope."
                : (selectedRecord.error ??
                  (!selectedRecord.loading
                    ? "Outreach record unavailable."
                    : undefined))
            }
            onRetry={selectedRecord.reload}
          />
        </>
      );
    const kind = newsletterRecordKind(row);
    if (kind !== "ordinary")
      return (
        <NewsletterDestination
          destination={
            kind === "candidate"
              ? { kind: "record", id: row.id }
              : { kind: "invalid" }
          }
          onBack={() => back()}
        />
      );
    if (selection.overview)
      return (
        <OutreachDraft
          key={row.id}
          record={row}
          initialPending={draftSavePending}
          clientId={clientId}
          onExit={() => back()}
          onContinue={(id) => open({ id, kind: "campaign", overview: true })}
        />
      );
  }
  if (selection?.id === "new" && selection.kind === "draft")
    return (
      <OutreachDraft
        clientId={clientId}
        initialPending={draftSavePending}
        onExit={() => back()}
        onContinue={(id) => open({ id, kind: "campaign", overview: true })}
      />
    );
  if (selection?.overview)
    return (
      <CampaignOverview
        key={selection.id}
        id={selection.id}
        clientId={clientId}
        onExit={back}
        onContinue={(step) => open({ ...selection, overview: false, step })}
      />
    );
  if (selection)
    return (
      <OutreachWorkflow
        key={selection.id}
        id={selection.id === "new" ? undefined : selection.id}
        clientId={clientId}
        initialStep={selection.step}
        onExit={() => back()}
      />
    );
  return (
    <>
      {directoryContext && (
        <p>Choose a current directory recipient in the Recipients step.</p>
      )}
      <OutreachList
        clientId={clientId}
        scopeControl={listHeader}
        initialCategory={category}
        onCreate={() => open({ id: "new", kind: "draft", overview: true })}
        onCampaign={(id) => open({ id, kind: "campaign", overview: true })}
        onRecord={(row) => open({ id: row.id, kind: "draft", overview: true })}
      />
    </>
  );
}
