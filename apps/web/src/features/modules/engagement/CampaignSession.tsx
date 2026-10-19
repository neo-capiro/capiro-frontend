"use client";
import { useRef, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  Panel,
  StatusPanel,
  TextArea,
  TextInput,
  UnavailableAction,
} from "../../../shared/module-ui";
import styles from "./engagement.module.css";
export function CampaignSession({
  sessionId,
  onBack,
}: {
  sessionId: string;
  onBack: () => void;
}) {
  const query = useCapiroQuery("engagement.session", { params: { sessionId } });
  const [saving, setSaving] = useState(false);
  const active = useRef(false);
  const mismatch =
    query.data &&
    (query.data.session.id !== sessionId ||
      query.data.session.currentStateVersion !==
        query.data.currentStateVersion);
  return (
    <div className={styles.stack}>
      <ActionButton
        disabled={saving}
        onClick={() => {
          if (!active.current) onBack();
        }}
      >
        ← All outreach
      </ActionButton>
      <StatusPanel
        loading={query.loading}
        error={
          mismatch
            ? "The campaign response does not match the selected campaign. Reload to confirm access."
            : query.error
        }
        onRetry={query.reload}
      >
        {query.data && !mismatch && (
          <SessionEditor
            key={`${query.data.session.id}:${query.data.currentStateVersion}`}
            sessionId={sessionId}
            state={query.data}
            onSaved={query.reload}
            onBusyChange={(busy) => {
              active.current = busy;
              setSaving(busy);
            }}
          />
        )}
      </StatusPanel>
    </div>
  );
}
type SessionState = NonNullable<
  ReturnType<typeof useCapiroQuery<"engagement.session">>["data"]
>;
function SessionEditor({
  sessionId,
  state,
  onSaved,
  onBusyChange,
}: {
  sessionId: string;
  state: SessionState;
  onSaved: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const model = useSessionEditor(sessionId, state, onSaved, onBusyChange);
  const { angle, setAngle, tone, setTone, error, busy, save } = model;
  return (
    <div className={styles.stack}>
      <div>
        <p className={styles.note}>OUTREACH CAMPAIGN</p>
        <h2>
          {state.spec.goal.topic ??
            state.session.title ??
            "New outreach campaign"}
        </h2>
        <p className={styles.muted}>
          Persisted campaign · {state.session.status}
        </p>
      </div>
      <div className={styles.tools}>
        {[
          ["Goal", state.readiness.goalReady],
          ["Sponsor", state.readiness.sponsorResolved],
          ["Targets", state.readiness.targetsReady],
          ["Context", state.readiness.contextReady],
          ["Strategy", state.readiness.strategyReady],
        ].map(([label, ready]) => (
          <Badge key={String(label)} tone={ready ? "success" : "warning"}>
            {label} · {ready ? "Ready" : "Review"}
          </Badge>
        ))}
      </div>
      <form
        aria-busy={busy}
        onSubmit={(event) => void save(event)}
        className={styles.stack}
      >
        <CampaignGoal model={model} />
        <Panel title="Strategy">
          <div className={styles.body}>
            <Field label="Campaign angle" htmlFor="campaign-angle">
              <TextArea
                id="campaign-angle"
                disabled={busy}
                maxLength={4000}
                value={angle}
                onChange={(event) => setAngle(event.target.value)}
              />
            </Field>
            <Field label="Tone" htmlFor="campaign-tone">
              <TextInput
                id="campaign-tone"
                disabled={busy}
                maxLength={120}
                value={tone}
                onChange={(event) => setTone(event.target.value)}
              />
            </Field>
          </div>
        </Panel>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <ActionButton primary type="submit" disabled={busy}>
          Save campaign decisions
        </ActionButton>
      </form>
      <Panel title="Review requirements">
        <div className={styles.body}>
          <p className={styles.muted}>
            Sponsor: {state.spec.sponsor.label ?? state.spec.sponsor.kind} ·{" "}
            {state.spec.targeting.selectedTargetRefs.length} selected targets ·
            Delivery: {state.spec.delivery.pattern.replaceAll("_", " ")}
          </p>
          {state.readiness.blockers.map((code) => (
            <p className={styles.note} key={code}>
              {code.toLowerCase().replaceAll("_", " ")}
            </p>
          ))}
          <UnavailableAction reason="Target and context selection, audited generation and send review require their remaining workflow contracts.">
            Continue to generation and review
          </UnavailableAction>
        </div>
      </Panel>
    </div>
  );
}

function useSessionEditor(
  sessionId: string,
  state: SessionState,
  onSaved: () => void,
  onBusyChange: (busy: boolean) => void,
) {
  const api = useCapiro();
  const [goal, setGoal] = useState(state.spec.goal.goal ?? ""),
    [objective, setObjective] = useState(state.spec.goal.objective ?? ""),
    [topic, setTopic] = useState(state.spec.goal.topic ?? ""),
    [why, setWhy] = useState(state.spec.goal.whyNow ?? ""),
    [angle, setAngle] = useState(state.spec.strategy.campaignAngle ?? ""),
    [tone, setTone] = useState(state.spec.strategy.tone ?? ""),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const batch = useRef<{ id: string; serialized: string } | null>(null);
  const active = useRef(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (active.current) return;
    active.current = true;
    setBusy(true);
    onBusyChange(true);
    setError(undefined);
    try {
      const commands = [
        {
          type: "SET_GOAL",
          schemaVersion: 1 as const,
          payload: { value: goal || null },
        },
        {
          type: "SET_OBJECTIVE",
          schemaVersion: 1 as const,
          payload: { value: objective || null },
        },
        {
          type: "SET_TOPIC",
          schemaVersion: 1 as const,
          payload: { value: topic || null },
        },
        {
          type: "SET_WHY_NOW",
          schemaVersion: 1 as const,
          payload: { value: why || null },
        },
        {
          type: "SET_CAMPAIGN_ANGLE",
          schemaVersion: 1 as const,
          payload: { value: angle || null },
        },
        {
          type: "SET_TONE",
          schemaVersion: 1 as const,
          payload: { value: tone || null },
        },
      ];
      const serialized = JSON.stringify(commands);
      if (!batch.current || batch.current.serialized !== serialized)
        batch.current = { id: crypto.randomUUID(), serialized };
      await api.request("engagement.session.commands", {
        params: { sessionId },
        body: {
          batchId: batch.current.id,
          expectedStateVersion: state.currentStateVersion,
          commands,
        },
      });
      batch.current = null;
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save campaign decisions.",
      );
    } finally {
      active.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  };

  return {
    goal,
    setGoal,
    objective,
    setObjective,
    topic,
    setTopic,
    why,
    setWhy,
    angle,
    setAngle,
    tone,
    setTone,
    error,
    busy,
    save,
  };
}

function CampaignGoal({
  model,
}: {
  model: ReturnType<typeof useSessionEditor>;
}) {
  const {
    goal,
    setGoal,
    objective,
    setObjective,
    topic,
    setTopic,
    why,
    setWhy,
    busy,
  } = model;
  return (
    <Panel
      title="Goal and objective"
      description="State what this campaign should accomplish."
    >
      <div className={styles.body}>
        <Field label="Topic" htmlFor="campaign-topic">
          <TextInput
            id="campaign-topic"
            disabled={busy}
            value={topic}
            maxLength={500}
            onChange={(event) => setTopic(event.target.value)}
          />
        </Field>
        <Field label="Goal" htmlFor="campaign-goal">
          <TextArea
            id="campaign-goal"
            disabled={busy}
            maxLength={2000}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
          />
        </Field>
        <Field label="Objective" htmlFor="campaign-objective">
          <TextArea
            id="campaign-objective"
            disabled={busy}
            maxLength={4000}
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
          />
        </Field>
        <Field label="Why now" htmlFor="campaign-why">
          <TextArea
            id="campaign-why"
            disabled={busy}
            maxLength={2000}
            value={why}
            onChange={(event) => setWhy(event.target.value)}
          />
        </Field>
      </div>
    </Panel>
  );
}
