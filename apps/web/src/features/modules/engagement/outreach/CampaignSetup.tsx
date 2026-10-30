"use client";

import type { OutreachCampaignState } from "../../../../shared/capiro/operations/outreach-campaign-schemas";
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
}: Props & {
  clients: readonly { id: string; name: string }[];
}) {
  return (
    <Panel
      title="Who is this outreach for?"
      description="Choose the direction and the client context for this campaign."
    >
      <div className={styles.fields}>
        <div
          className={styles.actions}
          role="group"
          aria-label="Outreach direction"
        >
          <ActionButton
            disabled={disabled}
            primary={state.direction === "on-behalf"}
            aria-pressed={state.direction === "on-behalf"}
            onClick={() => update({ direction: "on-behalf" })}
          >
            On behalf of a client
          </ActionButton>
          <ActionButton
            disabled={disabled}
            primary={state.direction === "to-clients"}
            aria-pressed={state.direction === "to-clients"}
            onClick={() => update({ direction: "to-clients" })}
          >
            To clients
          </ActionButton>
        </div>
        <Field
          label="Client context"
          htmlFor="outreach-client"
          description="Only information you are allowed to access is available to this campaign."
        >
          <SelectInput
            id="outreach-client"
            disabled={disabled}
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
  );
}

export function CampaignSetup({
  state,
  update,
  disabled,
  templates,
}: Props & {
  templates: readonly { id: string; name: string; versionId?: string | null }[];
}) {
  return (
    <Panel
      title="Campaign setup"
      description="Name your campaign and choose a starting point."
    >
      <div className={styles.fields}>
        <Field label="Campaign name" htmlFor="outreach-name">
          <TextInput
            id="outreach-name"
            maxLength={240}
            value={state.title}
            disabled={disabled}
            onChange={(event) => update({ title: event.target.value })}
          />
        </Field>
        <Field label="Template" htmlFor="outreach-template">
          <SelectInput
            id="outreach-template"
            disabled={disabled}
            value={state.templateId ?? ""}
            options={[
              { value: "", label: "Start from scratch" },
              ...templates.map((template) => ({
                value: template.id,
                label: template.name,
              })),
            ]}
            onValueChange={(value) =>
              update({
                templateId: value || null,
                templateVersionId:
                  templates.find((template) => template.id === value)
                    ?.versionId ?? null,
              })
            }
          />
        </Field>
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
      description="Keep the main idea separate from the facts and recipient-specific notes you add next."
    >
      <Field label="Main idea" htmlFor="outreach-main-idea">
        <TextArea
          id="outreach-main-idea"
          maxLength={8000}
          rows={6}
          value={state.mainIdea}
          disabled={disabled}
          onChange={(event) => update({ mainIdea: event.target.value })}
        />
      </Field>
    </Panel>
  );
}
