"use client";

import type { OutreachCampaignState } from "../../../../shared/capiro/operations/outreach-campaign-schemas";
import type { ClassicOutreachTemplate } from "../../../../shared/capiro/operations/outreach-template-catalog";
import { CampaignTemplates } from "./CampaignTemplates";
import {
  ActionButton,
  Field,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "./outreach-workflow.module.css";

type Props = {
  state: OutreachCampaignState;
  update: (patch: Partial<OutreachCampaignState>) => void;
  disabled: boolean;
};

export function CampaignDirection({
  state,
  update,
  disabled,
  clients,
  fixedClient = false,
}: Props & {
  clients: readonly { id: string; name: string }[];
  fixedClient?: boolean;
}) {
  return (
    <>
      <Panel title="Who is this outreach for?">
        <div className={styles.fields}>
          <div
            className={styles.directionChoices}
            role="group"
            aria-label="Outreach direction"
          >
            <ActionButton
              disabled={disabled}
              className={styles.directionChoice}
              aria-pressed={state.direction === "on-behalf"}
              onClick={() => update({ direction: "on-behalf" })}
            >
              <span className={styles.directionTitle}>
                <span className={styles.directionPortrait} aria-hidden="true" />
                <strong>On behalf of a client</strong>
              </span>
              <span>
                Reach offices, partners, or other contacts for a client or your
                firm.
              </span>
            </ActionButton>
            <ActionButton
              disabled={disabled}
              className={styles.directionChoice}
              aria-pressed={state.direction === "to-clients"}
              onClick={() => update({ direction: "to-clients" })}
            >
              <span className={styles.directionTitle}>
                <span className={styles.directionGroup} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <strong>To clients</strong>
              </span>
              <span>
                Send updates and communications directly to your clients.
              </span>
            </ActionButton>
          </div>
          <Field
            label="Client context"
            htmlFor="outreach-client"
            description="Choose My firm / no client for firm-level outreach."
          >
            <SelectInput
              id="outreach-client"
              disabled={disabled || fixedClient}
              value={state.clientId ?? ""}
              onValueChange={(value) => update({ clientId: value || null })}
              options={[
                { value: "", label: "My firm / no client" },
                ...clients.map((client) => ({
                  value: client.id,
                  label: client.name,
                })),
              ]}
            />
          </Field>
        </div>
      </Panel>
      <section className={styles.recipientGuide}>
        <h3>Choose recipients in the next steps</h3>
        <ul
          className={styles.recipientExplainers}
          aria-label="Recipient options"
        >
          <li>
            <strong>Individual</strong>
            <span>One email per contact.</span>
          </li>
          <li>
            <strong>List</strong>
            <span>A saved audience, with separate emails.</span>
          </li>
          <li>
            <strong>Group</strong>
            <span>One shared email with To, Cc and Bcc.</span>
          </li>
        </ul>
        <p className={styles.hint}>
          You can mix individuals, lists and groups in one campaign. Review each
          draft before sending.
        </p>
      </section>
    </>
  );
}

export function CampaignSetup({
  state,
  update,
  disabled,
  templates,
  onTemplatesReload = () => undefined,
}: Props & {
  templates: readonly ClassicOutreachTemplate[];
  onTemplatesReload?: () => void;
}) {
  return (
    <Panel>
      <div className={styles.fields}>
        <Field
          label="Campaign name"
          htmlFor="outreach-name"
          description="Internal name · recipients will not see this."
        >
          <TextInput
            id="outreach-name"
            maxLength={240}
            placeholder="e.g. District briefing follow-up"
            value={state.title}
            disabled={disabled}
            onChange={(event) => update({ title: event.target.value })}
          />
        </Field>
        <CampaignTemplates
          templates={templates}
          selectedId={state.templateId}
          disabled={disabled}
          onReload={onTemplatesReload}
          onSelect={(id) => update({ templateId: id, templateVersionId: null })}
        />
        <div className={styles.grid}>
          <Field label="Tone" htmlFor="outreach-tone">
            <SelectInput
              id="outreach-tone"
              value={state.tone}
              disabled={disabled}
              options={[
                { value: "professional", label: "Professional" },
                { value: "friendly", label: "Friendly" },
                { value: "formal", label: "Formal" },
                { value: "concise", label: "Concise" },
              ]}
              onValueChange={(value) =>
                update({ tone: value as OutreachCampaignState["tone"] })
              }
            />
          </Field>
          <Field label="Length" htmlFor="outreach-length">
            <SelectInput
              id="outreach-length"
              value={state.length}
              disabled={disabled}
              options={[
                { value: "short", label: "Short" },
                { value: "standard", label: "Standard" },
                { value: "long", label: "Long" },
              ]}
              onValueChange={(value) =>
                update({ length: value as OutreachCampaignState["length"] })
              }
            />
          </Field>
        </div>
      </div>
    </Panel>
  );
}

export function CampaignContextPlan({ state, update, disabled }: Props) {
  return (
    <Panel
      title="What should this campaign accomplish?"
      description="Tell us the main idea and what you want recipients to do."
    >
      <Field
        label="Main idea"
        htmlFor="outreach-main-idea"
        description="Include your purpose, the ask, and why now."
      >
        <TextArea
          id="outreach-main-idea"
          maxLength={8000}
          rows={6}
          value={state.mainIdea}
          disabled={disabled}
          onChange={(event) => update({ mainIdea: event.target.value })}
        />
      </Field>
      <ul
        className={styles.recipientExplainers}
        aria-label="Campaign planning guidance"
      >
        <li>
          <strong>Purpose</strong>
          <span>What do you want to discuss?</span>
        </li>
        <li>
          <strong>Ask</strong>
          <span>What should the recipient do?</span>
        </li>
        <li>
          <strong>Timing</strong>
          <span>Why is this relevant now?</span>
        </li>
      </ul>
      <div className={styles.contextHint}>
        <strong>Add facts in the next step</strong>
        <p>
          Supporting documents, bills, and past emails belong in Context
          builder. Personal notes can be added to recipients.
        </p>
      </div>
    </Panel>
  );
}
