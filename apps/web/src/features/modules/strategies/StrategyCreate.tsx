"use client";

import { useState } from "react";
import {
  strategyTypes,
  type StrategyDetail,
} from "../../../shared/capiro/operations/strategies-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
  UnavailableAction,
} from "../../../shared/module-ui";
import styles from "./strategies.module.css";
import { objectiveLabels } from "./strategy-model";

export function StrategyCreate({
  initialClientId = "",
  onClose,
  onCreated,
}: {
  initialClientId?: string;
  onClose: () => void;
  onCreated: (strategy: StrategyDetail) => void;
}) {
  const clients = useCapiroQuery("clients.list", {});
  const people = useCapiroQuery("planner.bootstrap", {});
  const [clientId, setClientId] = useState(initialClientId);
  const [type, setType] =
    useState<(typeof strategyTypes)[number]>("appropriations");
  const [owner, setOwner] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [title, setTitle] = useState("");
  const [discard, setDiscard] = useState(false);
  const create = useCapiroMutation("strategies.create");
  const permittedClients = (clients.data ?? []).filter(
    (client) => client.status !== "archived",
  );
  const currentClient =
    !clients.loading &&
    !clients.error &&
    permittedClients.some((client) => client.id === clientId);
  async function save() {
    if (!currentClient) return;
    try {
      const result = await create.run({
        body: {
          clientId,
          type,
          ownerUserId: owner || undefined,
          targetDate: targetDate || undefined,
          goal,
          meriContext: context,
          title: title || undefined,
        },
      });
      onCreated(result);
    } catch {
      /* Required fields and server validation remain reviewable. */
    }
  }
  const errors = clients.error ?? people.error;
  return (
    <>
      <Modal
        open
        onOpenChange={(open) => {
          if (!open && !create.pending) setDiscard(true);
        }}
        title="New strategy"
        description="Start with a clear client goal."
        footer={
          <>
            <ActionButton
              disabled={create.pending}
              onClick={() => setDiscard(true)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              primary
              disabled={create.pending || !currentClient || !goal.trim()}
              onClick={save}
            >
              {create.pending ? "Creating…" : "Create strategy"}
            </ActionButton>
          </>
        }
      >
        <div className={styles.form}>
          <Panel title="Strategy details">
            <div className={styles.grid}>
              <Field label="Client *" htmlFor="strategy-new-client">
                <SelectInput
                  id="strategy-new-client"
                  value={clientId}
                  onValueChange={setClientId}
                  options={[
                    { value: "", label: "Choose client" },
                    ...(clientId &&
                    !permittedClients.some((client) => client.id === clientId)
                      ? [
                          {
                            value: clientId,
                            label: clients.loading
                              ? "Checking selected client"
                              : "Selected client unavailable",
                          },
                        ]
                      : []),
                    ...permittedClients.map((client) => ({
                      value: client.id,
                      label: client.name,
                    })),
                  ]}
                />
              </Field>
              <Field label="Objective type *" htmlFor="strategy-new-type">
                <SelectInput
                  id="strategy-new-type"
                  value={type}
                  onValueChange={(value) => setType(value as typeof type)}
                  options={strategyTypes.map((value) => ({
                    value,
                    label: objectiveLabels[value],
                  }))}
                />
              </Field>
              <Field
                label="Owner"
                htmlFor="strategy-new-owner"
                description="Defaults to your signed-in account."
              >
                <SelectInput
                  id="strategy-new-owner"
                  value={owner}
                  onValueChange={setOwner}
                  options={[
                    { value: "", label: "Me" },
                    ...(people.data?.people ?? []).map((person) => ({
                      value: person.id,
                      label: person.name,
                    })),
                  ]}
                />
              </Field>
              <Field label="Target outcome date" htmlFor="strategy-new-target">
                <TextInput
                  id="strategy-new-target"
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                />
              </Field>
            </div>
            <Field label="Title (optional)" htmlFor="strategy-new-title">
              <TextInput
                id="strategy-new-title"
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
          </Panel>
          <Panel title="Goal and context">
            <div className={styles.form}>
              <Field
                label="Goal statement *"
                htmlFor="strategy-new-goal"
                description="Required · Up to 4,000 characters"
              >
                <TextArea
                  id="strategy-new-goal"
                  value={goal}
                  maxLength={4000}
                  onChange={(event) => setGoal(event.target.value)}
                />
              </Field>
              <Field
                label="Context for Meri"
                htmlFor="strategy-new-context"
                description="Optional · Up to 8,000 characters"
              >
                <TextArea
                  id="strategy-new-context"
                  value={context}
                  maxLength={8000}
                  onChange={(event) => setContext(event.target.value)}
                />
              </Field>
            </div>
          </Panel>
          <Panel title="Starting point">
            <label className={styles.check}>
              <input type="radio" checked readOnly />
              Create an empty timeline
            </label>
            <p className={styles.muted}>Build the working plan yourself.</p>
            <UnavailableAction reason="The new Meri strategy-drafting contract is not connected yet.">
              Draft with Meri
            </UnavailableAction>
          </Panel>
          {(create.error || errors) && (
            <p role="alert" className={styles.error}>
              {(create.error ?? errors)?.message}
            </p>
          )}
        </div>
      </Modal>
      <Modal
        open={discard}
        onOpenChange={setDiscard}
        title="Discard strategy setup?"
        description="Unsaved fields will be lost."
        footer={
          <>
            <ActionButton onClick={() => setDiscard(false)}>
              Keep editing
            </ActionButton>
            <ActionButton primary onClick={onClose}>
              Discard setup
            </ActionButton>
          </>
        }
      >
        <p>
          No strategy is created until the service acknowledges your submission.
        </p>
      </Modal>
    </>
  );
}
