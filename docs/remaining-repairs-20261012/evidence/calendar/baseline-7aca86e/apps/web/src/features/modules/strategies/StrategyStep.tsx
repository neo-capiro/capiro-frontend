"use client";
import { LinkWork } from "./StrategyLinkedWork";

import { useState } from "react";
import {
  nodeKinds,
  nodeStatuses,
  nodeSubjects,
  type StrategyDetail,
  type StrategyNode,
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

export function StrategyStep({
  strategy,
  node,
  onClose,
  onSaved,
}: {
  strategy: StrategyDetail;
  node?: StrategyNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(node?.title ?? "");
  const [note, setNote] = useState(node?.note ?? "");
  const [kind, setKind] = useState<(typeof nodeKinds)[number]>(
    node?.kind ?? "action",
  );
  const [subject, setSubject] = useState<(typeof nodeSubjects)[number]>(
    node?.subject ?? "deliverable",
  );
  const [status, setStatus] = useState<(typeof nodeStatuses)[number]>(
    node?.status ?? "draft",
  );
  const [owner, setOwner] = useState(node?.ownerUserId ?? "");
  const [startsOn, setStartsOn] = useState(node?.startsOn.slice(0, 10) ?? "");
  const [endsOn, setEndsOn] = useState(node?.endsOn?.slice(0, 10) ?? "");
  const [openEnded, setOpenEnded] = useState(node?.openEnded ?? false);
  const [dependencies, setDependencies] = useState(node?.dependsOnIds ?? []);
  const [tab, setTab] = useState("step");
  const [discard, setDiscard] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linking, setLinking] = useState(false);
  const people = useCapiroQuery("planner.bootstrap", {});
  const create = useCapiroMutation("strategies.step.create");
  const update = useCapiroMutation("strategies.step.update");
  const remove = useCapiroMutation("strategies.step.delete");
  const pending = create.pending || update.pending || remove.pending;
  const error = create.error ?? update.error ?? remove.error;
  async function save() {
    const body = {
      title,
      note,
      kind,
      subject,
      status,
      ownerUserId: owner || null,
      startsOn,
      endsOn: endsOn || null,
      openEnded,
      dependsOnIds: dependencies,
    };
    try {
      if (node)
        await update.run({
          params: { id: strategy.id, nodeId: node.id },
          body: { ...body, expectedUpdatedAt: node.updatedAt },
        });
      else await create.run({ params: { id: strategy.id }, body });
      onSaved();
      onClose();
    } catch {
      /* Concurrency errors preserve this exact input and server pin. */
    }
  }
  async function deleteStep() {
    if (!node) return;
    try {
      await remove.run({ params: { id: strategy.id, nodeId: node.id } });
      onSaved();
      onClose();
    } catch {
      /* Existing work is retained by the service. */
    }
  }
  return (
    <>
      <Modal
        open
        side="right"
        onOpenChange={(open) => {
          if (!open && !pending) setDiscard(true);
        }}
        title={node ? node.title : "New step"}
        description="Add a step to the working timeline."
        footer={
          <>
            <ActionButton disabled={pending} onClick={() => setDiscard(true)}>
              Cancel editing
            </ActionButton>
            <ActionButton
              primary
              disabled={
                pending ||
                !title.trim() ||
                !startsOn ||
                Boolean(endsOn && endsOn < startsOn)
              }
              onClick={save}
            >
              {pending ? "Saving…" : node ? "Save step" : "Add step"}
            </ActionButton>
          </>
        }
      >
        <div className={styles.form}>
          <div className={styles.pills}>
            {["step", "meri"].map((value) => (
              <button
                key={value}
                className={tab === value ? styles.active : ""}
                onClick={() => setTab(value)}
              >
                {value === "step" ? "Step" : "Meri"}
              </button>
            ))}
          </div>
          {tab === "meri" ? (
            <Panel title="Strategy assistant">
              <TextArea
                aria-label="Ask Meri about this step"
                placeholder="Ask about this step…"
              />
              <UnavailableAction reason="Greenfield Meri is being developed independently; its strategy assistant contract is not connected yet.">
                Send
              </UnavailableAction>
            </Panel>
          ) : (
            <>
              <Panel title="Step details">
                <div className={styles.form}>
                  <Field label="Title *" htmlFor="strategy-step-title">
                    <TextInput
                      id="strategy-step-title"
                      maxLength={300}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </Field>
                  <Field label="Description" htmlFor="strategy-step-note">
                    <TextArea
                      id="strategy-step-note"
                      maxLength={8000}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </Field>
                  <Field label="Kind" htmlFor="strategy-step-kind">
                    <SelectInput
                      id="strategy-step-kind"
                      value={kind}
                      onValueChange={(value) => setKind(value as typeof kind)}
                      options={nodeKinds.map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                  </Field>
                  <Field label="Subject" htmlFor="strategy-step-subject">
                    <SelectInput
                      id="strategy-step-subject"
                      value={subject}
                      onValueChange={(value) =>
                        setSubject(value as typeof subject)
                      }
                      options={nodeSubjects.map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                  </Field>
                  <Field label="Owner" htmlFor="strategy-step-owner">
                    <SelectInput
                      id="strategy-step-owner"
                      value={owner}
                      onValueChange={setOwner}
                      options={[
                        { value: "", label: "Unassigned" },
                        ...(people.data?.people ?? []).map((person) => ({
                          value: person.id,
                          label: person.name,
                        })),
                      ]}
                    />
                  </Field>
                  <Field label="Status" htmlFor="strategy-step-status">
                    <SelectInput
                      id="strategy-step-status"
                      value={status}
                      onValueChange={(value) =>
                        setStatus(value as typeof status)
                      }
                      options={nodeStatuses.map((value) => ({
                        value,
                        label: value.replaceAll("_", " "),
                      }))}
                    />
                  </Field>
                  <Field label="Start date *" htmlFor="strategy-step-start">
                    <TextInput
                      id="strategy-step-start"
                      type="date"
                      value={startsOn}
                      onChange={(event) => setStartsOn(event.target.value)}
                    />
                  </Field>
                  <Field
                    label="End date"
                    htmlFor="strategy-step-end"
                    error={
                      endsOn && startsOn && endsOn < startsOn
                        ? "End date must follow the start date."
                        : undefined
                    }
                  >
                    <TextInput
                      id="strategy-step-end"
                      type="date"
                      value={endsOn}
                      onChange={(event) => setEndsOn(event.target.value)}
                      disabled={openEnded}
                    />
                  </Field>
                  {kind === "risk" && (
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={openEnded}
                        onChange={(event) => {
                          setOpenEnded(event.target.checked);
                          if (event.target.checked) setEndsOn("");
                        }}
                      />
                      Ongoing risk
                    </label>
                  )}
                </div>
              </Panel>
              <Panel
                title="Prerequisite steps"
                description="Select up to 20 steps."
              >
                {strategy.nodes
                  .filter((value) => value.id !== node?.id)
                  .map((value) => (
                    <label key={value.id} className={styles.check}>
                      <input
                        type="checkbox"
                        checked={dependencies.includes(value.id)}
                        disabled={
                          dependencies.length >= 20 &&
                          !dependencies.includes(value.id)
                        }
                        onChange={(event) =>
                          setDependencies((previous) =>
                            event.target.checked
                              ? [...previous, value.id]
                              : previous.filter((id) => id !== value.id),
                          )
                        }
                      />
                      {value.title}
                    </label>
                  ))}
              </Panel>
              {node && (
                <Panel title="Existing work">
                  <ActionButton onClick={() => setLinking(true)}>
                    Link existing work
                  </ActionButton>
                  {strategy.artifacts
                    ?.filter((artifact) => artifact.nodeId === node.id)
                    .map((artifact) => (
                      <p key={artifact.id} className={styles.muted}>
                        {artifact.artifactType.replaceAll("_", " ")} ·{" "}
                        {artifact.artifactRef}
                      </p>
                    ))}
                  <ActionButton onClick={() => setDeleting(true)}>
                    Delete step
                  </ActionButton>
                </Panel>
              )}
            </>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error.message}
            </p>
          )}
        </div>
      </Modal>
      <Modal
        open={discard}
        onOpenChange={setDiscard}
        title="Discard unsaved changes?"
        footer={
          <>
            <ActionButton onClick={() => setDiscard(false)}>
              Keep editing
            </ActionButton>
            <ActionButton primary onClick={onClose}>
              Discard changes
            </ActionButton>
          </>
        }
      >
        <p>Your saved step stays unchanged until you submit this form.</p>
      </Modal>
      <Modal
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete step?"
        description="This archives the step. Existing Workspace and Outreach records remain available."
        footer={
          <>
            <ActionButton
              disabled={remove.pending}
              onClick={() => setDeleting(false)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              primary
              disabled={remove.pending}
              onClick={deleteStep}
            >
              Delete step
            </ActionButton>
          </>
        }
      >
        <p>{node?.title}</p>
        {remove.error && (
          <p role="alert" className={styles.error}>
            {remove.error.message}
          </p>
        )}
      </Modal>
      {linking && node && (
        <LinkWork
          strategyId={strategy.id}
          nodeId={node.id}
          onClose={() => setLinking(false)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
