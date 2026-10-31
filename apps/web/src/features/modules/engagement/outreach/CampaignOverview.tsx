"use client";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  PageHeader,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import { useOutreachCampaign } from "./useOutreachCampaign";
import {
  campaignProblem,
  campaignUnits,
  recipientProblem,
} from "./campaign-model";
import { readableStatus, type CampaignCategory } from "./outreach-list-model";
import styles from "./outreach-overview.module.css";

type Owner = ReturnType<typeof useOutreachCampaign>;
const emptyDecisions = {
  goal: "",
  objective: "",
  topic: "",
  whyNow: "",
  campaignAngle: "",
};
export function CampaignOverview({
  id,
  clientId,
  onExit,
  onContinue,
}: {
  id: string;
  clientId: string;
  onExit: (category?: CampaignCategory) => void;
  onContinue: (step?: number) => void;
}) {
  const owner = useOutreachCampaign(id, clientId);
  if (owner.loading) return <StatusPanel loading />;
  if (!owner.saved)
    return (
      <>
        <ActionButton onClick={() => onExit()}>← All outreach</ActionButton>
        <StatusPanel
          error={owner.failure ?? "Campaign unavailable"}
          onRetry={owner.refresh}
        />
      </>
    );
  const category =
    owner.saved.category ??
    (owner.saved.status === "draft"
      ? "drafts"
      : owner.saved.status === "sent"
        ? "sent"
        : "attention");
  const recorded = readableStatus(
    owner.saved.recordedSendStatus ??
      (owner.saved.status === "draft" ? null : owner.saved.status),
  );
  return (
    <section className={styles.screen} aria-label="Campaign overview">
      <PageHeader
        title={owner.state.title}
        description={
          category === "drafts"
            ? `Campaign decisions · ${recorded}`
            : category === "sent"
              ? "Recorded sent outreach"
              : "Campaign requires attention"
        }
      />
      <ActionButton
        className={styles.back}
        disabled={owner.busy}
        onClick={() => onExit(category)}
      >
        ← All outreach
      </ActionButton>
      {category === "drafts" ? (
        <CampaignDecisions owner={owner} onContinue={onContinue} />
      ) : (
        <CampaignRecord
          owner={owner}
          category={category}
          recorded={recorded}
          onExit={() => onExit(category)}
        />
      )}
    </section>
  );
}
function CampaignDecisions({
  owner,
  onContinue,
}: {
  owner: Owner;
  onContinue: (step?: number) => void;
}) {
  const decisions = owner.state.decisions ?? emptyDecisions;
  const disabled = owner.busy || !!owner.pending || owner.readOnly;
  const contextReady =
    owner.state.contextItems.length > 0 ||
    (owner.state.contextSelections?.length ?? 0) > 0;
  const update = (key: keyof typeof decisions, value: string) =>
    owner.update({ decisions: { ...decisions, [key]: value } });
  const fields = (keys: readonly [keyof typeof decisions, string, number][]) =>
    keys.map(([key, label, max]) => (
      <Field key={key} label={label} htmlFor={`decision-${key}`}>
        <TextInput
          id={`decision-${key}`}
          value={decisions[key]}
          maxLength={max}
          disabled={disabled}
          onChange={(event) => update(key, event.target.value)}
        />
      </Field>
    ));
  const requirements = [
    ["Goal", !!(decisions.goal.trim() || owner.state.mainIdea.trim())],
    ["Sponsor", true],
    ["Targets", !recipientProblem(owner.state)],
    ["Context", contextReady],
    ["Strategy", !!decisions.campaignAngle.trim()],
  ] as const;
  const ready =
    !campaignProblem(owner.state) &&
    requirements.every(([, complete]) => complete);
  return (
    <>
      <div className={`${styles.card} ${styles.form}`}>
        <div className={styles.readiness}>
          {requirements.map(([label, complete]) => (
            <span
              className={`${styles.status} ${complete ? "" : styles.attention}`}
              key={label}
            >
              {label} · {complete ? "Ready" : "Review"}
            </span>
          ))}
        </div>
        <div className={styles.columns}>
          <div>
            {fields([
              ["goal", "Goal", 2000],
              ["objective", "Objective", 4000],
              ["topic", "Topic", 500],
            ])}
          </div>
          <div>
            {fields([
              ["whyNow", "Why now", 2000],
              ["campaignAngle", "Campaign angle", 4000],
            ])}
            <Field label="Tone" htmlFor="decision-tone">
              <select
                id="decision-tone"
                value={owner.state.tone}
                disabled={disabled}
                onChange={(event) =>
                  owner.update({
                    tone: event.target.value as typeof owner.state.tone,
                  })
                }
              >
                <option value="professional">Clear and professional</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
                <option value="concise">Concise</option>
              </select>
            </Field>
          </div>
        </div>
        {owner.error && (
          <p role="alert" className={styles.error}>
            {owner.error}
          </p>
        )}
        <div className={styles.actions}>
          <ActionButton
            primary
            disabled={disabled || !owner.dirty}
            onClick={owner.save}
          >
            Save campaign decisions
          </ActionButton>
          {owner.pending === "save" && (
            <ActionButton disabled={owner.busy} onClick={owner.refresh}>
              Check saved draft
            </ActionButton>
          )}
        </div>
      </div>
      <div className={styles.card}>
        <h2>Review requirements</h2>
        <p>
          Sponsor:{" "}
          {owner.saved?.client?.name ??
            (owner.state.clientId ? "Selected client" : "My firm")}{" "}
          · {campaignUnits(owner.state).length} selected targets · Workflow{" "}
          {owner.saved?.status === "draft" ? "active" : owner.saved?.status}
        </p>
        <p className={styles.subtitle}>
          {ready
            ? "Review the selected recipients and context before generating this campaign."
            : "Finish choosing targets and context before generating and reviewing this campaign."}
        </p>
        <div className={styles.actions}>
          <ActionButton
            className={styles.continueGeneration}
            disabled={disabled || owner.dirty || !ready}
            onClick={() => onContinue(6)}
          >
            Continue to generation and review
          </ActionButton>
          <ActionButton
            disabled={disabled || owner.dirty}
            onClick={() => onContinue(ready ? 5 : 1)}
          >
            Choose recipients and context
          </ActionButton>
        </div>
        <p className={styles.hint}>
          Saving decisions does not send mail. Review each generated message
          before sending.
        </p>
      </div>
    </>
  );
}
function CampaignRecord({
  owner,
  category,
  recorded,
  onExit,
}: {
  owner: Owner;
  category: "sent" | "attention";
  recorded: string;
  onExit: () => void;
}) {
  const deliveryId = owner.saved!.delivery?.id;
  const record = useCapiroQuery(
    "engagement.outreach.record",
    { params: { id: owner.saved!.id } },
    { enabled: category === "sent" && !deliveryId },
  );
  const delivery = useCapiroQuery(
    "engagement.campaign.sendStatus",
    { params: { id: deliveryId ?? owner.saved!.id } },
    { enabled: category === "sent" && !!deliveryId },
  );
  const matches =
    record.data?.id.toLowerCase() === owner.saved!.id.toLowerCase() &&
    (record.data?.client?.id ?? null)?.toLowerCase() ===
      owner.state.clientId?.toLowerCase();
  const deliveryMatches =
    delivery.data?.id === deliveryId &&
    delivery.data?.outreachRecordId.toLowerCase() ===
      owner.saved!.id.toLowerCase() &&
    !delivery.data?.testMode;
  const loading = deliveryId ? delivery.loading : record.loading;
  const readError = deliveryId ? delivery.error : record.error;
  const verified = deliveryId ? deliveryMatches : matches;
  if (category === "sent" && (loading || readError || !verified))
    return (
      <StatusPanel
        loading={loading}
        error={
          readError ??
          (!loading
            ? "The recorded outreach does not match this campaign."
            : undefined)
        }
        onRetry={deliveryId ? delivery.reload : record.reload}
      />
    );
  const sentDeliveries =
    delivery.data?.deliveries.filter((item) => item.status === "sent") ?? [];
  const sentSubject = deliveryId
    ? [...new Set(sentDeliveries.map((item) => item.subject))].join(" · ")
    : record.data?.subject;
  const recipientCount = deliveryId
    ? new Set(
        sentDeliveries.flatMap((item) =>
          item.to.map((to) => to.email.toLowerCase()),
        ),
      ).size
    : (owner.saved?.recipientCount ?? record.data?.recipients?.length ?? 0);
  return (
    <>
      {category === "attention" && (
        <div className={styles.notice}>
          The recorded send status is {recorded}. Review the recorded outcome
          before starting new outreach.
        </div>
      )}
      <div className={`${styles.card} ${styles.form}`}>
        <h2>
          {category === "sent"
            ? "Sent outreach record"
            : "Review campaign status"}
        </h2>
        {category === "sent" ? (
          <>
            <ReadValue label="Campaign" value={owner.state.title} />
            <ReadValue
              label="Recorded recipients"
              value={`${recipientCount} recipients`}
            />
            <ReadValue
              label="Subject"
              value={sentSubject || "No recorded subject"}
            />
            <p className={styles.subtitle}>
              This is the sent version. Editing, resending and retrying delivery
              are not offered here.
            </p>
          </>
        ) : (
          <>
            <ReadValue label="Returned send status" value={recorded} />
            <ReadValue
              label="Campaign workflow"
              value={`${owner.saved?.status === "draft" ? "Active" : readableStatus(owner.saved?.status ?? null)} · Separate from sending`}
            />
            <p className={styles.subtitle}>
              {recorded === "Unknown"
                ? "The delivery outcome is unknown. Do not resend this email."
                : "Review the campaign record before starting any new outreach."}
            </p>
          </>
        )}
        <div className={styles.actions}>
          <ActionButton onClick={onExit}>
            {category === "sent"
              ? "Back to sent campaigns"
              : "Back to needs attention"}
          </ActionButton>
        </div>
      </div>
    </>
  );
}
function ReadValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={styles.hint}>{label}</p>
      <div className={styles.readValue}>{value}</div>
    </div>
  );
}
