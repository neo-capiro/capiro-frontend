"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import type { OutreachDraftArtifact } from "../../../../shared/capiro/operations/outreach-campaign-schemas";
import {
  ActionButton,
  Badge,
  Field,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
  StatusPanel,
} from "../../../../shared/module-ui";
import type { useOutreachCampaign } from "./useOutreachCampaign";
import {
  campaignUnits,
  campaignProblem,
  savedEnvelope,
  historicalMessage,
} from "./campaign-model";
import styles from "./outreach-workflow.module.css";
type Owner = ReturnType<typeof useOutreachCampaign>;
export function CampaignDrafts({ owner }: { owner: Owner }) {
  const units = campaignUnits(owner.state);
  const [key, setKey] = useState(units[0]?.key ?? "");
  const selected = units.find((unit) => unit.key === key) ?? units[0];
  const artifact = owner.drafts.find(
    (row) => row.generationKey === selected?.key,
  );
  const current = artifact?.current;
  const envelope = artifact
    ? savedEnvelope(artifact.recipientSnapshot)
    : selected;
  const pending = owner.pending === "generation";
  const settled =
    owner.job?.job.status === "canceled" ||
    owner.job?.items.every((item) =>
      ["done", "held", "failed", "canceled"].includes(item.status),
    );
  return (
    <div className={styles.stack}>
      <Panel
        title={pending ? "Generating your outreach" : "Generate & review"}
        description="Each recipient gets a separate working context. Review every saved message before sending."
      >
        <div className={styles.fields}>
          {pending ? (
            <>
              <div role="status">
                {owner.job
                  ? `${owner.job.items.filter((row) => row.status === "done").length} of ${owner.job.items.length} drafts completed`
                  : "Checking the generation request…"}
              </div>
              {owner.job?.items.map((row) => (
                <div className={styles.choice} key={row.id}>
                  <span>
                    {units.find((unit) => unit.key === row.recipientKey)
                      ?.name ?? "Recipient"}
                  </span>
                  <Badge>
                    {row.status.replace("sdk_", "").replaceAll("_", " ")}
                  </Badge>
                </div>
              ))}
              <div className={styles.actions}>
                <ActionButton disabled={owner.busy} onClick={owner.refresh}>
                  Check status
                </ActionButton>
                <ActionButton
                  disabled={
                    owner.busy ||
                    owner.readOnly ||
                    !owner.receipt ||
                    !owner.job?.items.some(
                      (item) => item.status === "sdk_pending",
                    )
                  }
                  onClick={owner.continueGeneration}
                >
                  Continue remaining drafts
                </ActionButton>
                <ActionButton
                  disabled={!owner.receipt || settled}
                  onClick={owner.cancelGeneration}
                >
                  Cancel generation
                </ActionButton>
                {settled && (
                  <ActionButton
                    primary
                    disabled={owner.busy}
                    onClick={owner.finishGeneration}
                  >
                    Review drafts
                  </ActionButton>
                )}
              </div>
              {owner.job?.items.some((item) => item.status === "unknown") && (
                <p role="status">
                  A result is not confirmed. Check the saved drafts; this
                  request will not be repeated automatically.
                </p>
              )}
            </>
          ) : (
            <div className={styles.actions}>
              <ActionButton
                primary
                disabled={
                  owner.busy || owner.readOnly || !!campaignProblem(owner.state)
                }
                onClick={() =>
                  owner.generate(
                    units.map((unit) => unit.key),
                    "generate",
                  )
                }
              >
                Generate drafts
              </ActionButton>
              <span className={styles.hint}>
                {units.length} {units.length === 1 ? "message" : "messages"} ·
                one active recipient at a time
              </span>
            </div>
          )}
        </div>
      </Panel>
      {!!units.length && (
        <Panel
          title="Saved draft"
          description="These are the saved versions used for delivery."
        >
          <div className={styles.fields}>
            <Field label="Preview for" htmlFor="draft-recipient">
              <SelectInput
                id="draft-recipient"
                value={selected?.key ?? ""}
                options={units.map((unit) => ({
                  value: unit.key,
                  label: unit.name,
                }))}
                onValueChange={setKey}
              />
            </Field>
            {envelope && (
              <div className={styles.envelope}>
                <p>
                  <strong>To</strong>{" "}
                  {envelope.to.map((row) => row.email).join(", ")}
                </p>
                {!!envelope.cc.length && (
                  <p>
                    <strong>Cc</strong> {envelope.cc.join(", ")}
                  </p>
                )}
                {!!envelope.bcc.length && (
                  <p>
                    <strong>Bcc</strong> {envelope.bcc.join(", ")}
                  </p>
                )}
              </div>
            )}
            {current && artifact ? (
              <DraftEditor
                key={current.id}
                artifact={artifact}
                disabled={owner.busy || owner.readOnly || !!owner.pending}
                onSave={(subject, body) =>
                  owner.editDraft(artifact, subject, body)
                }
                onGenerate={(mode, instruction) =>
                  selected && owner.generate([selected.key], mode, instruction)
                }
              />
            ) : (
              <p className={styles.hint}>
                No saved draft for this recipient yet.
              </p>
            )}
          </div>
        </Panel>
      )}
      {owner.saved && !owner.drafts.length && (
        <HistoricalMessage
          id={owner.saved.id}
          clientId={owner.saved.state.clientId}
        />
      )}
    </div>
  );
}
function HistoricalMessage({
  id,
  clientId,
}: {
  id: string;
  clientId: string | null;
}) {
  const result = useCapiroQuery("engagement.outreach.record", {
    params: { id },
  });
  const message = result.data
    ? historicalMessage(result.data, { id, clientId })
    : null;
  if (result.loading || result.error)
    return (
      <StatusPanel
        loading={result.loading}
        error={result.error}
        onRetry={result.reload}
      />
    );
  if (!message) return null;
  return (
    <Panel
      title="Previously saved message"
      description="This historical copy is available to read. It is not a versioned draft ready for delivery."
    >
      <div className={styles.fields}>
        <h3 className={styles.subject}>{message.subject || "No subject"}</h3>
        <div className={styles.message}>{message.body}</div>
      </div>
    </Panel>
  );
}
function DraftEditor({
  artifact,
  disabled,
  onSave,
  onGenerate,
}: {
  artifact: OutreachDraftArtifact;
  disabled: boolean;
  onSave: (subject: string, body: string) => void;
  onGenerate: (mode: "regenerate" | "improve", instruction?: string) => void;
}) {
  const current = artifact.current!;
  const [editing, setEditing] = useState(false),
    [subject, setSubject] = useState(current.subject),
    [body, setBody] = useState(current.body),
    [instruction, setInstruction] = useState("");
  return (
    <div className={styles.fields}>
      <div className={styles.actions}>
        <Badge>Version {current.version}</Badge>
        <Badge>{current.sendable ? "Ready to send" : "Needs attention"}</Badge>
        {current.model && <span className={styles.hint}>{current.model}</span>}
      </div>
      {editing ? (
        <>
          <Field label="Subject" htmlFor="draft-subject">
            <TextInput
              id="draft-subject"
              value={subject}
              maxLength={300}
              disabled={disabled}
              onChange={(event) => setSubject(event.target.value)}
            />
          </Field>
          <Field label="Message" htmlFor="draft-body">
            <TextArea
              id="draft-body"
              rows={14}
              value={body}
              maxLength={40000}
              disabled={disabled}
              onChange={(event) => setBody(event.target.value)}
            />
          </Field>
          <div className={styles.actions}>
            <ActionButton
              primary
              disabled={
                disabled ||
                (subject === current.subject && body === current.body)
              }
              onClick={() => onSave(subject, body)}
            >
              Save edited draft
            </ActionButton>
            <ActionButton
              disabled={disabled}
              onClick={() => {
                setEditing(false);
                setSubject(current.subject);
                setBody(current.body);
              }}
            >
              Cancel edit
            </ActionButton>
          </div>
        </>
      ) : (
        <>
          <h3 className={styles.subject}>{current.subject}</h3>
          <div className={styles.message}>{current.body}</div>
          <ActionButton disabled={disabled} onClick={() => setEditing(true)}>
            Edit draft
          </ActionButton>
        </>
      )}
      {current.contextNote && (
        <p className={styles.hint}>{current.contextNote}</p>
      )}
      {!!current.auditChecks.length && (
        <ul>
          {current.auditChecks.map((check, index) => (
            <li key={index}>
              {check.code.replaceAll("_", " ")} · {check.severity}
            </li>
          ))}
        </ul>
      )}
      <Field label="What would you like to improve?" htmlFor="draft-improve">
        <TextArea
          id="draft-improve"
          rows={2}
          value={instruction}
          maxLength={2000}
          disabled={disabled}
          onChange={(event) => setInstruction(event.target.value)}
        />
      </Field>
      <div className={styles.actions}>
        <ActionButton
          disabled={disabled || editing || !instruction.trim()}
          onClick={() => onGenerate("improve", instruction)}
        >
          Improve draft
        </ActionButton>
        <ActionButton
          disabled={disabled || editing}
          onClick={() => onGenerate("regenerate")}
        >
          Regenerate
        </ActionButton>
      </div>
      <p className={styles.hint}>
        {artifact.history.length} saved{" "}
        {artifact.history.length === 1 ? "version" : "versions"}. Regenerating
        keeps the previous versions.
      </p>
    </div>
  );
}
