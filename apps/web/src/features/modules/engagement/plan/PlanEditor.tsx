"use client";
import { useRef, useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import {
  engagementPlanCreateBody,
  engagementPlanPatchBody,
  type EngagementPlan,
} from "../../../../shared/capiro/operations/engagement-plans";
import {
  ActionButton,
  Field,
  Modal,
  TextInput,
} from "../../../../shared/module-ui";
import type { PlanCommands } from "./usePlanCommands";
import styles from "./plan.module.css";

export function NewPlan({
  clientId,
  clientName,
  commands,
  onClose,
}: {
  clientId: string;
  clientName: string;
  commands: PlanCommands;
  onClose: () => void;
}) {
  const api = useCapiro();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const requestId = useRef(crypto.randomUUID());
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      const body = engagementPlanCreateBody.parse({
        clientId,
        requestId: requestId.current,
        title,
      });
      if (
        await commands.run({
          label: "Plan creation",
          request: () => api.request("engagement.plans.create", { body }),
          expected: {
            clientId,
            creation: {
              operation: "create_plan",
              requestId: body.requestId,
              planVersion: 1,
            },
          },
        })
      )
        onClose();
    } catch {
      setError("Enter a plan title of 1–200 characters.");
    }
  }
  return (
    <Modal
      open
      title="New engagement plan"
      description={`Create a manual draft for ${clientName}. Other plans are preserved.`}
      onOpenChange={(open) => {
        if (!open && !commands.blocked) onClose();
      }}
    >
      <form className={styles.stack} onSubmit={(event) => void submit(event)}>
        <Field label="Plan title" htmlFor="new-engagement-plan-title">
          <TextInput
            id="new-engagement-plan-title"
            required
            maxLength={200}
            value={title}
            disabled={commands.blocked}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <p className={styles.muted}>
          The client is fixed after creation. Office selection is unavailable;
          this draft starts without office references.
        </p>
        {(error || commands.error) && (
          <p role="alert">{error ?? commands.error}</p>
        )}
        {commands.uncertain && (
          <p role="status">
            Creation is unconfirmed. Reconcile the original request; changing it
            could create a different plan. Keep this view open; the original
            request is retained only while this view remains open.
          </p>
        )}
        <div className={styles.tools}>
          <ActionButton
            type="button"
            disabled={commands.blocked}
            onClick={onClose}
          >
            Cancel
          </ActionButton>
          <ActionButton primary type="submit" disabled={commands.blocked}>
            {commands.busy ? "Creating…" : "Create draft plan"}
          </ActionButton>
          {commands.canReconcile && (
            <ActionButton
              type="button"
              disabled={commands.busy}
              onClick={() =>
                void commands.reconcile().then((saved) => {
                  if (saved) onClose();
                })
              }
            >
              Reconcile original creation
            </ActionButton>
          )}
        </div>
      </form>
    </Modal>
  );
}

export function PlanTitleEditor({
  plan,
  commands,
}: {
  plan: EngagementPlan;
  commands: PlanCommands;
}) {
  const api = useCapiro();
  const [title, setTitle] = useState(plan.title);
  const [error, setError] = useState<string>();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      const body = engagementPlanPatchBody.parse({
        expectedPlanVersion: plan.version,
        title,
      });
      await commands.run({
        label: "Plan title",
        request: () =>
          api.request("engagement.plans.update", {
            params: { planId: plan.id },
            body,
          }),
        expected: {
          clientId: plan.clientId,
          planId: plan.id,
          version: plan.version + (body.title === plan.title ? 0 : 1),
          title: body.title,
        },
      });
    } catch {
      setError("Enter a plan title of 1–200 characters.");
    }
  }
  return (
    <form className={styles.tools} onSubmit={(event) => void submit(event)}>
      <Field label="Plan title" htmlFor="engagement-plan-title">
        <TextInput
          id="engagement-plan-title"
          required
          maxLength={200}
          value={title}
          disabled={commands.blocked || plan.lifecycle === "archived"}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <ActionButton
        type="submit"
        disabled={commands.blocked || plan.lifecycle === "archived"}
      >
        Save title
      </ActionButton>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
