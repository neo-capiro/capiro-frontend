"use client";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { ActionButton, StatusPanel } from "../../../../shared/module-ui";
import { useOutreachCampaign } from "./useOutreachCampaign";
import {
  CampaignDirection,
  CampaignSetup,
  CampaignContextPlan,
} from "./CampaignSetup";
import { CampaignRecipients } from "./CampaignRecipients";
import { CampaignContext } from "./CampaignContext";
import { CampaignSupporting } from "./CampaignSupporting";
import { CampaignDrafts } from "./CampaignDrafts";
import { CampaignSend } from "./CampaignSend";
import {
  OutreachWorkflowFrame,
  type OutreachStep,
} from "./OutreachWorkflowFrame";
import { recipientProblem } from "./campaign-model";
export function OutreachWorkflow({
  id,
  clientId,
  onExit,
  initialStep,
}: {
  id?: string;
  clientId: string;
  onExit: () => void;
  initialStep?: number;
}) {
  const owner = useOutreachCampaign(id, clientId, initialStep);
  const clients = useCapiroQuery("clients.list", {});
  const templates = useCapiroQuery("engagement.campaign.templates", {});
  const step = owner.state.lastStep as OutreachStep;
  const disabled =
    owner.busy ||
    !!owner.pending ||
    (owner.saved?.status !== "draft" && !!owner.saved);
  const problem = owner.readOnly
    ? undefined
    : step === 2 && !owner.state.title.trim()
      ? "Name your campaign."
      : step === 3
        ? recipientProblem(owner.state)
        : step === 4 &&
            !(owner.state.mainIdea.trim() || owner.state.decisions?.goal.trim())
          ? "Add the main idea."
          : step === 6 && (owner.pending || !owner.drafts.length)
            ? "Finish generation and review the saved drafts."
            : undefined;
  const onStep = (next: OutreachStep) => {
    if (!owner.readOnly && next > step && (next > step + 1 || problem)) return;
    owner.navigate(next);
  };
  if (owner.loading) return <StatusPanel loading />;
  if (id && !owner.saved)
    return (
      <StatusPanel
        error={owner.failure ?? "Campaign unavailable"}
        onRetry={owner.refresh}
      />
    );
  return (
    <OutreachWorkflowFrame
      title={owner.state.title || "New outreach"}
      step={step}
      busy={owner.busy}
      fenced={!!owner.pending}
      readOnly={owner.readOnly}
      saved={!owner.dirty}
      error={owner.error}
      nextDisabled={problem}
      onExit={onExit}
      onStep={onStep}
      onSave={owner.save}
    >
      {owner.pending === "save" && (
        <div role="status">
          <p>
            The save result needs confirmation. Check the saved campaign before
            continuing.
          </p>
          <ActionButton disabled={owner.busy} onClick={owner.refresh}>
            Check saved draft
          </ActionButton>
        </div>
      )}
      {owner.saved && owner.saved.status !== "draft" && (
        <p role="status">
          This campaign is {owner.saved.status}. Saved copies and delivery
          status remain available.
        </p>
      )}
      {step === 1 && (
        <StatusPanel error={clients.error} onRetry={clients.reload} />
      )}
      {step === 2 && (
        <StatusPanel error={templates.error} onRetry={templates.reload} />
      )}
      {step === 1 && (
        <CampaignDirection
          state={owner.state}
          update={owner.update}
          disabled={disabled}
          clients={clients.data ?? []}
          fixedClient={!!clientId}
        />
      )}
      {step === 2 && (
        <CampaignSetup
          state={owner.state}
          update={owner.update}
          disabled={disabled}
          templates={templates.data ?? []}
          onTemplatesReload={templates.reload}
        />
      )}
      {step === 3 && (
        <CampaignRecipients
          state={owner.state}
          update={owner.update}
          disabled={disabled}
        />
      )}
      {step === 4 && (
        <CampaignContextPlan
          state={owner.state}
          update={owner.update}
          disabled={disabled}
        />
      )}
      {step === 5 && (
        <>
          <CampaignContext
            state={owner.state}
            update={owner.update}
            disabled={disabled}
          />
          <CampaignSupporting
            state={owner.state}
            update={owner.update}
            disabled={disabled}
          />
        </>
      )}
      {step === 6 && <CampaignDrafts owner={owner} />}
      {step === 7 && <CampaignSend owner={owner} />}
    </OutreachWorkflowFrame>
  );
}
