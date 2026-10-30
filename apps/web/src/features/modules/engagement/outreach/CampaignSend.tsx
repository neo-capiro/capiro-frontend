"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { sendingMailboxesSchema } from "../../../portfolio/relationships/public";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  Panel,
  SelectInput,
} from "../../../../shared/module-ui";
import type { useOutreachCampaign } from "./useOutreachCampaign";
import { campaignUnits, savedEnvelope, sameEnvelope } from "./campaign-model";
import styles from "./outreach-workflow.module.css";
export function CampaignSend({
  owner,
}: {
  owner: ReturnType<typeof useOutreachCampaign>;
}) {
  const mailboxes = useCapiroQuery("engagement.newsletter.mailboxes", {});
  const parsed = sendingMailboxesSchema.safeParse(mailboxes.data);
  const choices = parsed.success ? parsed.data : [];
  const selected = choices.find(
    (row) => row.id === owner.state.sender.connectionId,
  );
  const [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState("");
  const units = campaignUnits(owner.state);
  const versions = units.map((unit) => {
    const artifact = owner.drafts.find((row) => row.generationKey === unit.key);
    const envelope = artifact
      ? savedEnvelope(artifact.recipientSnapshot)
      : null;
    return {
      unit: envelope ? { ...unit, ...envelope } : unit,
      version: artifact?.current,
      matches: !!envelope && sameEnvelope(unit, envelope),
    };
  });
  const current =
    versions.find((row) => row.unit.key === preview) ?? versions[0];
  const testEligible =
    !owner.readOnly &&
    !!selected &&
    !owner.dirty &&
    !owner.pending &&
    !owner.busy &&
    !!current?.version?.sendable &&
    current.matches;
  const eligible =
    !owner.readOnly &&
    !!selected &&
    !owner.dirty &&
    !owner.pending &&
    !owner.busy &&
    versions.length > 0 &&
    versions.every((row) => row.version?.sendable && row.matches);
  if (owner.pending === "send")
    return (
      <Panel
        title={owner.send?.testMode ? "Test delivery" : "Delivery status"}
        description="This reads the existing request. Checking status never sends it again."
      >
        <div className={styles.fields}>
          {!owner.send ? (
            <p role="status">
              The send outcome is not confirmed yet. No result does not prove it
              did not start.
            </p>
          ) : (
            <>
              <Badge>{owner.send.status}</Badge>
              {owner.send.testMode && (
                <p>
                  This test goes to your account email, without recipient
                  Cc/Bcc.
                </p>
              )}
              <p className={styles.hint}>
                Sent means the mail provider accepted the message. It does not
                confirm delivery to the recipient.
              </p>
              {owner.send.deliveries.map((row) => (
                <div className={styles.selected} key={row.id}>
                  <strong>
                    {row.to.map((recipient) => recipient.email).join(", ")}
                  </strong>
                  <p>{row.subject}</p>
                  <Badge>{row.status}</Badge>
                  {row.status === "unknown" ? (
                    <p>Awaiting confirmation. Do not resend this email.</p>
                  ) : (
                    row.errorMessage && <p>{row.errorMessage}</p>
                  )}
                  {!!row.cc.length && <p>Cc: {row.cc.join(", ")}</p>}
                  {!!row.bcc.length && <p>Bcc: {row.bcc.join(", ")}</p>}
                </div>
              ))}
            </>
          )}
          <div className={styles.actions}>
            <ActionButton primary disabled={owner.busy} onClick={owner.refresh}>
              Check status
            </ActionButton>
            {owner.send && (
              <ActionButton
                disabled={
                  owner.busy ||
                  !owner.send.deliveries.some((row) => row.status === "pending")
                }
                onClick={owner.cancelSend}
              >
                Cancel remaining
              </ActionButton>
            )}
            {owner.send?.testMode &&
              !owner.send.deliveries.some((row) =>
                ["unknown", "sending", "pending"].includes(row.status),
              ) && (
                <ActionButton disabled={owner.busy} onClick={owner.finishTest}>
                  Back to send review
                </ActionButton>
              )}
          </div>
        </div>
      </Panel>
    );
  return (
    <div className={styles.grid}>
      <Panel
        title="Prepared messages"
        description="Review the saved messages, sender and destinations. Sending uses these versions."
      >
        <div className={styles.fields}>
          <Field label="Preview for" htmlFor="send-preview">
            <SelectInput
              id="send-preview"
              value={current?.unit.key ?? ""}
              options={versions.map((row) => ({
                value: row.unit.key,
                label: row.unit.name,
              }))}
              onValueChange={setPreview}
            />
          </Field>
          {current && (
            <>
              <div className={styles.envelope}>
                <p>
                  <strong>To</strong>{" "}
                  {current.unit.to.map((row) => row.email).join(", ")}
                </p>
                {!!current.unit.cc.length && (
                  <p>
                    <strong>Cc</strong> {current.unit.cc.join(", ")}
                  </p>
                )}
                {!!current.unit.bcc.length && (
                  <p>
                    <strong>Bcc</strong> {current.unit.bcc.join(", ")}
                  </p>
                )}
              </div>
              {current.version ? (
                <>
                  <h3 className={styles.subject}>{current.version.subject}</h3>
                  <div className={styles.message}>{current.version.body}</div>
                  <p className={styles.hint}>
                    Saved version {current.version.version}
                  </p>
                  {!current.matches && (
                    <p role="status">
                      The saved destinations differ from your current
                      selections. Remove and re-add the changed recipient, then
                      generate a new draft before sending.
                    </p>
                  )}
                </>
              ) : (
                <p>No saved message for this recipient.</p>
              )}
            </>
          )}
        </div>
      </Panel>
      <Panel
        title="Review and send"
        description="Nothing is sent until you explicitly confirm."
      >
        <div className={styles.fields}>
          <Field label="From" htmlFor="outreach-sender">
            <SelectInput
              id="outreach-sender"
              disabled={owner.busy || !!owner.pending || mailboxes.loading}
              value={owner.state.sender.connectionId ?? ""}
              options={[
                { value: "", label: "Select a connected mailbox" },
                ...choices.map((row) => ({
                  value: row.id,
                  label: `${row.displayName ? row.displayName + " · " : ""}${row.accountEmail}`,
                })),
              ]}
              onValueChange={(value) =>
                owner.update({
                  sender: {
                    ...owner.state.sender,
                    connectionId: value || null,
                  },
                })
              }
            />
          </Field>
          {mailboxes.error && (
            <p role="alert">Sending mailboxes could not be loaded.</p>
          )}
          {!mailboxes.loading && !choices.length && (
            <p role="status">
              Connect an eligible sending mailbox in Settings before sending.
            </p>
          )}
          <p className={styles.hint}>
            Your saved email signature is included when it is enabled in your
            account.
          </p>
          <p>
            {versions.length} messages · {owner.state.attachmentIds.length}{" "}
            attachments
          </p>
          {owner.dirty && (
            <p role="status">
              Save your sender and campaign changes before sending.
            </p>
          )}
          <ActionButton
            primary
            disabled={!testEligible}
            onClick={() =>
              selected &&
              current &&
              owner.sendDrafts(true, selected, current.unit.key)
            }
          >
            Send test to my inbox
          </ActionButton>
          <p className={styles.hint}>
            This sends a real test email to your account email address.
          </p>
          <ActionButton
            primary
            disabled={!eligible}
            onClick={() => setConfirm(true)}
          >
            Review send
          </ActionButton>
        </div>
        {confirm && (
          <Modal
            open
            onOpenChange={setConfirm}
            title="Send this outreach?"
            footer={
              <>
                <ActionButton
                  disabled={owner.busy}
                  onClick={() => setConfirm(false)}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  primary
                  disabled={!eligible}
                  onClick={() => {
                    setConfirm(false);
                    if (selected) owner.sendDrafts(false, selected);
                  }}
                >
                  Send {versions.length} messages
                </ActionButton>
              </>
            }
          >
            <div className={styles.fields}>
              <p>From {selected?.accountEmail}</p>
              <p>
                This sends the reviewed saved copies to the destinations below.
                Messages already accepted by the provider cannot be recalled
                here.
              </p>
              {versions.map(({ unit }) => (
                <div key={unit.key}>
                  <strong>{unit.name}</strong>
                  <p>To: {unit.to.map((row) => row.email).join(", ")}</p>
                  {!!unit.cc.length && <p>Cc: {unit.cc.join(", ")}</p>}
                  {!!unit.bcc.length && <p>Bcc: {unit.bcc.join(", ")}</p>}
                </div>
              ))}
            </div>
          </Modal>
        )}
      </Panel>
    </div>
  );
}
