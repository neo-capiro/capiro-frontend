"use client";

import { useState } from "react";
import type { HillDayDocument } from "../../../../shared/capiro/operations/workspace-schemas";
import { hillDayPhases, type HillDayPhase } from "../workspace-route";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { HillDayContext } from "./HillDayContext";
import { HillDayGeneration } from "./HillDayGeneration";
import { HillDayMeetings } from "./HillDayMeetings";
import { HillDayResolution } from "./HillDayResolution";

const steps = [
  "Template",
  "Sponsor",
  "Meetings",
  "Resolution",
  "Context",
  "Generate",
];

function SponsorStep({
  clientId,
  onClient,
  name,
  onName,
  locked,
}: {
  clientId: string;
  onClient: (id: string, name: string) => void;
  name: string;
  onName: (name: string) => void;
  locked: boolean;
}) {
  const [search, setSearch] = useState("");
  const clients = useCapiroQuery("workspace.clients", {
    query: { q: search, limit: 50 },
  });
  return (
    <div className={styles.sponsorLayout}>
      <div className={styles.form}>
        <StatusPanel
          loading={clients.loading}
          error={clients.error}
          onRetry={clients.reload}
        >
          <div className={styles.clientList}>
            <TextInput
              aria-label="Search Portfolio clients"
              value={search}
              placeholder="Search Portfolio clients…"
              onChange={(event) => setSearch(event.target.value)}
            />
            {clients.data?.items.map((client) => (
              <button
                className={`${styles.clientRow} ${client.id === clientId ? styles.selected : ""}`}
                key={client.id}
                disabled={locked}
                onClick={() => onClient(client.id, client.name)}
              >
                <span className={styles.monogram}>{client.mono}</span>
                <span>
                  {client.name}
                  <small>
                    {client.description ?? "Client"} ·{" "}
                    {client.objectiveCount ?? "Unavailable"} objectives ·{" "}
                    {client.officeCount} offices
                  </small>
                </span>
                {client.id === clientId && <span aria-label="Selected">✓</span>}
              </button>
            ))}
          </div>
        </StatusPanel>
        <Field
          label="Document name"
          htmlFor="hillday-document-name"
          description="Editable now and after generation."
        >
          <TextInput
            id="hillday-document-name"
            value={name}
            maxLength={200}
            onChange={(event) => onName(event.target.value)}
          />
        </Field>
      </div>
      <aside className={styles.info}>
        <h3>What the sponsor supplies</h3>
        <strong>Calendar scope</strong>
        <p>Only this client’s events appear in the picker.</p>
        <strong>Objectives</strong>
        <p>
          Focus is written against the client’s Portfolio objectives and live
          Strategies.
        </p>
        <strong>Engagement history</strong>
        <p>Prior meetings and commitments supply context.</p>
        <strong>Branding</strong>
        <p>The client profile provides the schedule identity.</p>
      </aside>
    </div>
  );
}

export function HillDayWizard({
  onClose,
  onCreated,
  initialClientId = "",
  existing,
  phase,
  onResume,
}: {
  onClose: () => void;
  onCreated: (document: { id: string; clientId: string }) => void;
  initialClientId?: string;
  existing?: HillDayDocument;
  phase?: HillDayPhase;
  onResume: (
    document: { id: string; clientId: string },
    phase: HillDayPhase,
  ) => void;
}) {
  const [localStep, setLocalStep] = useState(0);
  const step = phase ? hillDayPhases.indexOf(phase) : localStep;
  const [blueprintId, setBlueprintId] = useState("");
  const [clientId, setClientId] = useState(
    existing?.client.id ?? initialClientId,
  );
  const [name, setName] = useState(existing?.name ?? "");
  const [createdDocument, setCreatedDocument] = useState<
    | {
        id: string;
        clientId: string;
      }
    | undefined
  >(existing ? { id: existing.id, clientId: existing.client.id } : undefined);
  const documentId = createdDocument?.id ?? "";
  const [meetings, setMeetings] = useState<
    { meetingId: string; title: string }[]
  >(
    existing?.sections.map((section) => ({
      meetingId: section.meetingId,
      title: section.member,
    })) ?? [],
  );
  function setStep(next: number) {
    setLocalStep(next);
    if (createdDocument) onResume(createdDocument, hillDayPhases[next]!);
  }
  const blueprints = useCapiroQuery("workspace.hillday.blueprints", {});
  const create = useCapiroMutation("workspace.hillday.create");
  const update = useCapiroMutation("workspace.hillday.update");
  const pending = create.pending || update.pending;
  const available =
    blueprints.data?.blueprints.filter((blueprint) => blueprint.implemented) ??
    [];
  const chosenBlueprint = blueprintId || available[0]?.id || "";
  async function next() {
    if (step === 1 && !documentId) {
      try {
        const result = await create.run({
          body: {
            blueprintId: chosenBlueprint,
            clientId,
            name: name.trim(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
        setCreatedDocument({ id: result.id, clientId: result.client.id });
        setStep(2);
        onResume({ id: result.id, clientId: result.client.id }, "meetings");
      } catch {
        /* No transition until the server acknowledges creation. */
      }
      return;
    }
    if (step === 1 && documentId) {
      try {
        await update.run({
          params: { id: documentId },
          body: { name: name.trim() },
        });
        setStep(2);
      } catch {
        /* Keep the prior document name until the save succeeds. */
      }
      return;
    }
    setStep(Math.min(5, step + 1));
  }
  return (
    <section className={styles.wizard} data-design-node="411:116749">
      <header className={styles.wizardHeader}>
        <div className={styles.actions}>
          <ActionButton onClick={onClose}>←</ActionButton>
          <div>
            <h2>{existing ? "Resume document" : "New document"}</h2>
            <span className={styles.footnote}>
              Hill Day Schedule · {name || "Choose a sponsor"}
            </span>
          </div>
        </div>
        <ol className={styles.steps}>
          {steps.map((label, index) => (
            <li
              key={label}
              className={index === step ? styles.current : ""}
              aria-current={index === step ? "step" : undefined}
            >
              <span>{index < step ? "✓" : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </header>
      <h1 className={styles.wizardTitle}>
        {
          [
            "What are you making?",
            "Who is the sponsor?",
            "Which meetings go in the packet?",
            "Confirm what we resolved",
            "Add what we don’t know",
            "Generate the packet",
          ][step]
        }
      </h1>
      {(create.error || update.error) && (
        <p role="alert" className={styles.error}>
          {(create.error ?? update.error)?.message}
        </p>
      )}
      {documentId && (
        <p className={styles.footnote}>
          Draft saved. Its sponsor and blueprint are fixed; the document name
          remains editable.
        </p>
      )}
      <div className={styles.wizardBody}>
        {step === 0 && (
          <StatusPanel
            loading={blueprints.loading}
            error={blueprints.error}
            onRetry={blueprints.reload}
          >
            <div className={styles.templateGrid}>
              {available.map((blueprint) => (
                <button
                  className={styles.templateCard}
                  style={{
                    textAlign: "left",
                    borderColor:
                      chosenBlueprint === blueprint.id ? "#171717" : undefined,
                  }}
                  key={blueprint.id}
                  disabled={Boolean(documentId)}
                  onClick={() => setBlueprintId(blueprint.id)}
                  aria-pressed={chosenBlueprint === blueprint.id}
                >
                  <img src="/figma/modules/workspace-calendar.svg" alt="" />
                  <h3>{blueprint.name}</h3>
                  <p>Directory · Portfolio · Intelligence</p>
                </button>
              ))}
            </div>
          </StatusPanel>
        )}
        {step === 1 && (
          <SponsorStep
            locked={Boolean(documentId)}
            clientId={clientId}
            onClient={(id, label) => {
              setClientId(id);
              setName(`${label} Hill Day Schedule`);
            }}
            name={name}
            onName={setName}
          />
        )}
        {step === 2 && (
          <HillDayMeetings
            id={documentId}
            clientId={clientId}
            saved={existing}
            onSaved={(rows) => {
              setMeetings(rows);
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <HillDayResolution id={documentId} onContinue={() => setStep(4)} />
        )}
        {step === 4 && (
          <HillDayContext
            id={documentId}
            meetings={meetings}
            onContinue={() => setStep(5)}
          />
        )}
        {step === 5 && (
          <HillDayGeneration
            id={documentId}
            clientId={createdDocument?.clientId ?? clientId}
            onOpen={() => {
              if (createdDocument) onCreated(createdDocument);
            }}
          />
        )}
      </div>
      <footer className={styles.wizardFooter}>
        <p>
          {
            [
              "Blueprint decides the questions and sections.",
              "Calendar and objectives come from the sponsor.",
              "Choose meetings before resolving attendees.",
              "Unresolved attendees remain visible in the packet.",
              "Context is optional. Threads outside the selected window stay excluded.",
              "Generation progress is recorded by Workspace.",
            ][step]
          }
        </p>
        <div className={styles.actions}>
          <ActionButton
            disabled={step === 0}
            onClick={() => setStep(Math.max(0, step - 1))}
          >
            Back
          </ActionButton>
          {step < 2 && (
            <ActionButton
              primary
              disabled={
                pending ||
                (step === 0 ? !chosenBlueprint : !clientId || !name.trim())
              }
              onClick={next}
            >
              {pending
                ? documentId
                  ? "Saving…"
                  : "Creating…"
                : step === 1
                  ? "Open calendar →"
                  : "Continue →"}
            </ActionButton>
          )}
        </div>
      </footer>
    </section>
  );
}

/** Resume only after the current service has admitted the saved document. */
export function HillDayResume({
  id,
  expectedClientId,
  phase,
  onClose,
  onCreated,
  onResume,
}: {
  id: string;
  expectedClientId?: string;
  phase: HillDayPhase;
  onClose: () => void;
  onCreated: (document: { id: string; clientId: string }) => void;
  onResume: (
    document: { id: string; clientId: string },
    phase: HillDayPhase,
  ) => void;
}) {
  const query = useCapiroQuery("workspace.hillday.document", {
    params: { id },
  });
  const mismatch =
    query.data &&
    (query.data.id.toLowerCase() !== id.toLowerCase() ||
      (expectedClientId &&
        query.data.client.id.toLowerCase() !== expectedClientId.toLowerCase()));
  return (
    <StatusPanel
      loading={query.loading}
      error={
        mismatch
          ? "The returned document does not match this link or its client scope."
          : query.error
      }
      onRetry={query.reload}
    >
      {query.data && !mismatch && (
        <HillDayWizard
          existing={query.data}
          phase={phase}
          onClose={onClose}
          onCreated={onCreated}
          onResume={onResume}
        />
      )}
    </StatusPanel>
  );
}
