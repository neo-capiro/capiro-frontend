"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseStrategyIntake } from "@capiro/shared/strategy-intake";
import type { StrategyDetail } from "@/shared/capiro/operations/strategies-schemas";
import { useCapiroMutation, useCapiroQuery } from "@/shared/capiro/queries";
import { ActionButton, Field, Modal, SelectInput } from "@/shared/module-ui";
import {
  ObjectiveFields,
  useObjectiveEditorSession,
  ObjectiveEditorActions,
  ObjectiveEditorFeedback,
  ObjectiveReadyConfirmation,
} from "@/features/portfolio/objectives/strategy-intake-public";

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
  const [clientId, setClientId] = useState(initialClientId);
  const [discard, setDiscard] = useState(false);
  const [nextClient, setNextClient] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const permitted = (clients.data ?? []).filter(
    (client) => client.status !== "archived",
  );
  const current =
    !clients.loading &&
    !clients.error &&
    permitted.some((client) => client.id === clientId);
  return (
    <>
      <Modal
        open
        onOpenChange={(open) => {
          if (!open) setDiscard(true);
        }}
        title="New strategy"
        description="Start with the same saved answers used in Objectives."
      >
        <Field label="Client · Required" htmlFor="strategy-intake-client">
          <SelectInput
            id="strategy-intake-client"
            value={clientId}
            disabled={busy || clients.loading}
            onValueChange={(next) => {
              if (!clientId) setClientId(next);
              else if (next !== clientId) setNextClient(next);
            }}
            options={[
              { value: "", label: "Choose client" },
              ...permitted.map((client) => ({
                value: client.id,
                label: client.name,
              })),
            ]}
          />
        </Field>
        {clients.error && (
          <p role="alert">
            Clients could not be loaded.{" "}
            <button onClick={clients.reload}>Retry clients</button>
          </p>
        )}
        {current && (
          <StrategySetup
            key={clientId}
            clientId={clientId}
            onCreated={onCreated}
            onBusy={setBusy}
          />
        )}
        <ActionButton onClick={() => setDiscard(true)}>Cancel</ActionButton>
      </Modal>
      <Modal
        open={discard || nextClient !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDiscard(false);
            setNextClient(null);
          }
        }}
        title={nextClient !== null ? "Change client?" : "Leave strategy setup?"}
        description="Saved Objectives remain available. Unsaved fields will be lost."
        footer={
          <>
            <ActionButton
              onClick={() => {
                setDiscard(false);
                setNextClient(null);
              }}
            >
              Keep editing
            </ActionButton>
            <ActionButton
              disabled={nextClient !== null && busy}
              onClick={() => {
                if (nextClient !== null) {
                  setClientId(nextClient);
                  setNextClient(null);
                  setBusy(false);
                } else onClose();
              }}
            >
              {nextClient !== null
                ? "Discard and change client"
                : "Leave setup"}
            </ActionButton>
          </>
        }
      >
        <p>
          A save already sent may still complete. Reopen Objectives to recover
          saved answers.
        </p>
      </Modal>
    </>
  );
}

function StrategySetup({
  clientId,
  onCreated,
  onBusy,
}: {
  clientId: string;
  onCreated: (strategy: StrategyDetail) => void;
  onBusy: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"meri" | "empty">("meri");
  const [error, setError] = useState("");
  const create = useCapiroMutation("strategies.create");
  const session = useObjectiveEditorSession({
    clientId,
    onSaved: (objective) => {
      router.push(
        `/portfolio/${clientId}/objectives?objective=${objective.id}`,
      );
    },
  });
  const busy = session.mutation.isPending || create.pending;
  useEffect(() => {
    onBusy(busy);
    return () => onBusy(false);
  }, [busy, onBusy]);
  async function createEmpty() {
    try {
      const intake = parseStrategyIntake(session.fields.strategyIntake, {
        requireComplete: true,
      });
      const result = await create.run({
        body: {
          clientId,
          type: intake.type,
          goal: intake.goal,
          meriContext: intake.meriContext,
          ownerUserId: intake.ownerUserId,
          targetDate: intake.targetDate ?? undefined,
        },
      });
      onCreated(result);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Strategy could not be created.",
      );
    }
  }
  return (
    <>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (mode === "meri") session.submit("save");
          else void createEmpty();
        }}
      >
        <ObjectiveFields
          fields={session.fields}
          onChange={session.setFields}
          disabled={busy}
          presentation="dialog"
        />
        <fieldset disabled={busy}>
          <legend>Starting point</legend>
          <label>
            <input
              type="radio"
              name="strategy-start"
              checked={mode === "meri"}
              onChange={() => setMode("meri")}
            />{" "}
            Fill with Meri
          </label>
          <label>
            <input
              type="radio"
              name="strategy-start"
              checked={mode === "empty"}
              onChange={() => setMode("empty")}
            />{" "}
            Empty timeline
          </label>
        </fieldset>
        {mode === "meri" ? (
          <>
            <p>
              Save these answers as an Objective, then review and start
              generation. Prepare Planner remains a separate action.
            </p>
            <ObjectiveEditorFeedback session={session} />
            <ObjectiveEditorActions session={session} />
          </>
        ) : (
          <ActionButton primary disabled={busy} type="submit">
            Create empty timeline
          </ActionButton>
        )}
        {(error || create.error) && (
          <p role="alert">{error || create.error?.message}</p>
        )}
        <Link href={`/portfolio/${clientId}/objectives`}>
          Resume a saved Objective
        </Link>
      </form>
      <ObjectiveReadyConfirmation session={session} />
    </>
  );
}
