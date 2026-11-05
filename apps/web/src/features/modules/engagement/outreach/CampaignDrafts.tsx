"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import type { OutreachDraftArtifact } from "../../../../shared/capiro/operations/outreach-campaign-schemas";
import {
  ActionButton,
  Badge,
  Field,
  Panel,
  TextArea,
  TextInput,
  StatusPanel,
  SelectInput,
} from "../../../../shared/module-ui";
import type { useOutreachCampaign } from "./useOutreachCampaign";
import {
  campaignUnits,
  campaignProblem,
  savedEnvelope,
  historicalMessage,
} from "./campaign-model";
import { CampaignGenerationBrief } from "./CampaignGenerationBrief";
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
  const savedCount = units.filter((unit) =>
    owner.drafts.some((row) => row.generationKey === unit.key && row.current),
  ).length;
  const generateAction = (
    <ActionButton
      primary
      disabled={
        owner.busy ||
        owner.readOnly ||
        !!owner.pending ||
        !!campaignProblem(owner.state)
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
  );
  return (
    <div className={styles.stack}>
      <div className={styles.reviewSummary}>
        <div>
          <strong>
            {owner.state.mainIdea.trim() ||
              owner.state.decisions?.goal ||
              "Review your campaign"}
          </strong>
          <p>
            {owner.state.tone} · {owner.state.length} ·{" "}
            {owner.state.contextItems.length} context items
          </p>
        </div>
        {!pending && generateAction}
      </div>
      {!!units.length && (
        <div className={styles.mobileMessages}>
          <p className={styles.hint}>
            {savedCount} of {units.length} messages saved
          </p>
          <Field label="Review message" htmlFor="outreach-review-message">
            <SelectInput
              id="outreach-review-message"
              value={selected?.key ?? ""}
              onValueChange={setKey}
              options={units.map((unit) => {
                const draft = owner.drafts.find(
                  (row) => row.generationKey === unit.key,
                )?.current;
                return {
                  value: unit.key,
                  label: `${unit.name || "Recipient"} · ${draft ? `Saved v${draft.version}` : "No draft"}`,
                };
              })}
            />
          </Field>
        </div>
      )}
      <div className={styles.reviewGrid}>
        <div
          className={pending ? styles.generationSidebar : styles.reviewSidebar}
        >
          <Panel
            title={
              pending
                ? "Generating your outreach"
                : `Messages · ${units.length}`
            }
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
                  {owner.job?.items.some(
                    (item) => item.status === "unknown",
                  ) && (
                    <p role="status">
                      A result is not confirmed. Check the saved drafts; this
                      request will not be repeated automatically.
                    </p>
                  )}
                </>
              ) : (
                <p className={styles.hint}>
                  {savedCount} saved · {units.length - savedCount} need a draft
                </p>
              )}
              {!!units.length && (
                <div>
                  <ul
                    className={styles.draftRecipients}
                    aria-label="Draft recipients"
                  >
                    {units.map((unit) => {
                      const draft = owner.drafts.find(
                        (row) => row.generationKey === unit.key,
                      )?.current;
                      return (
                        <li key={unit.key}>
                          <ActionButton
                            aria-pressed={selected?.key === unit.key}
                            onClick={() => setKey(unit.key)}
                          >
                            <span>
                              <strong>{unit.name || "Recipient"}</strong>
                              <span>
                                {unit.to.map((row) => row.email).join(", ")}
                              </span>
                            </span>
                            <Badge>
                              {draft
                                ? draft.sendable
                                  ? "Saved"
                                  : "Needs attention"
                                : "No draft"}
                            </Badge>
                          </ActionButton>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </Panel>
        </div>
        {!!units.length && (
          <Panel
            title={
              selected?.name ? `Draft for ${selected.name}` : "Saved draft"
            }
            description="These are the saved versions used for delivery."
          >
            <div className={styles.fields}>
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
                    selected &&
                    owner.generate([selected.key], mode, instruction)
                  }
                />
              ) : (
                <p className={styles.hint}>
                  No saved draft for this recipient yet. Generate drafts, then
                  select this recipient to review the saved message.
                </p>
              )}
            </div>
          </Panel>
        )}
      </div>
      <details
        className={styles.briefDetails}
        open={!!campaignProblem(owner.state)}
      >
        <summary>Generation brief & options</summary>
        <div className={styles.mobileGeneration}>
          {!pending && generateAction}
        </div>
        <CampaignGenerationBrief
          state={owner.state}
          disabled={owner.busy || owner.readOnly || !!owner.pending}
          onStep={owner.navigate}
        />
      </details>
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
        <span className={styles.version}>Version {current.version}</span>
        <span className={styles.draftReadiness}>
          {current.sendable ? "Ready to send" : "Needs attention"}
        </span>
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
      <details className={styles.reviewOptions}>
        <summary>Improve & versions</summary>
        <Field label="What would you like to improve?" htmlFor="draft-improve">
          <TextArea
            id="draft-improve"
            rows={1}
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
      </details>
    </div>
  );
}
