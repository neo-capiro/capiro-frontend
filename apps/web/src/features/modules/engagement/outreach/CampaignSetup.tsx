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
  fixedClient = false,
}: Props & {
  clients: readonly { id: string; name: string }[];
  fixedClient?: boolean;
}) {
  return (
    <>
      <div className={styles.directionIntro}>
        <div>
          <span className={styles.eyebrow}>New outreach campaign</span>
          <h2>Reach the right people with the right message.</h2>
          <p>
            Choose your recipients, add context, and review each draft before
            sending.
          </p>
        </div>
        <ul className={styles.audienceGuide} aria-label="Recipient options">
          <li>
            <strong>Individual</strong>
            <span>One personalized email per contact</span>
          </li>
          <li>
            <strong>List</strong>
            <span>Saved contacts, each emailed individually</span>
          </li>
          <li>
            <strong>Group</strong>
            <span>All contacts receive one shared email</span>
          </li>
        </ul>
      </div>
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
    </>
  );
}

export function CampaignSetup({
  state,
  update,
  disabled,
  templates,
}: Props & {
  templates: readonly {
    id: string;
    name: string;
    description?: string | null;
    versionId?: string | null;
  }[];
}) {
  return (
    <Panel
      title="Name your campaign"
      description="A working name for this outreach, never shown to recipients."
    >
      <div className={styles.fields}>
        <Field label="Campaign name" htmlFor="outreach-name">
          <TextInput
            id="outreach-name"
            maxLength={240}
            placeholder="e.g. District briefing follow-up"
            value={state.title}
            disabled={disabled}
            onChange={(event) => update({ title: event.target.value })}
          />
        </Field>
        <fieldset className={styles.templateGallery} disabled={disabled}>
          <legend>Choose a starting point</legend>
          <p className={styles.hint}>
            Choose an available template or start from your own campaign
            context.
          </p>
          <div className={styles.templateChoices}>
            {[
              {
                id: "",
                name: "Start from scratch",
                description: "Use your own campaign context.",
              },
              ...templates,
            ].map((template) => (
              <label key={template.id} className={styles.templateChoice}>
                <input
                  type="radio"
                  name="outreach-template"
                  value={template.id}
                  checked={(state.templateId ?? "") === template.id}
                  onChange={() =>
                    update({
                      templateId: template.id || null,
                      templateVersionId:
                        templates.find((item) => item.id === template.id)
                          ?.versionId ?? null,
                    })
                  }
                />
                <span>
                  <strong>{template.name}</strong>
                  {template.description && <span>{template.description}</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
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
