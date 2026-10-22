"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkspaceDraftDocument } from "../../../shared/capiro/operations/workspace-documents";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Panel,
  SelectInput,
  StatusPanel,
} from "../../../shared/module-ui";

export function DraftClientAssociation({
  draft,
  disabled = false,
  onBound,
}: {
  draft: WorkspaceDraftDocument;
  disabled?: boolean;
  onBound: (draft: WorkspaceDraftDocument) => void;
}) {
  const held = draft.clientAssociation === "held";
  const clients = useCapiroQuery("workspace.clients", {}, { enabled: held });
  const update = useCapiroMutation("workspace.draft.update");
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState<string>();
  const writing = useRef(false);
  const scope = useRef(0);
  useEffect(
    () => () => {
      scope.current += 1;
    },
    [draft.id],
  );
  if (!held) return null;
  async function bind() {
    if (!clientId || disabled || writing.current || update.pending) return;
    const attempt = scope.current;
    const selected = clientId;
    writing.current = true;
    setError(undefined);
    try {
      const bound = await update.run({
        params: { id: draft.id },
        body: { clientId: selected },
      });
      if (scope.current !== attempt) return;
      if (
        bound.id !== draft.id ||
        bound.clientId !== selected ||
        bound.clientAssociation === "held"
      )
        throw new Error(
          "The client association was not confirmed. Refresh this document before continuing.",
        );
      onBound(bound);
    } catch (failure) {
      if (scope.current === attempt)
        setError(
          failure instanceof Error
            ? failure.message
            : "The client could not be associated.",
        );
    } finally {
      writing.current = false;
    }
  }
  return (
    <Panel title="Choose a client to continue">
      <p>
        This saved document needs a verified client association before sharing
        or staging. Your draft remains available to edit.
      </p>
      <StatusPanel
        loading={clients.loading}
        error={clients.error}
        onRetry={clients.reload}
      >
        <Field label="Client" htmlFor={`workspace-draft-client-${draft.id}`}>
          <SelectInput
            id={`workspace-draft-client-${draft.id}`}
            value={clientId}
            disabled={disabled || update.pending}
            onValueChange={setClientId}
            options={[
              { value: "", label: "Choose a client" },
              ...(clients.data?.items ?? []).map((client) => ({
                value: client.id,
                label: client.name,
              })),
            ]}
          />
        </Field>
        <ActionButton
          primary
          disabled={!clientId || disabled || update.pending}
          onClick={bind}
        >
          {update.pending ? "Associating…" : "Associate client"}
        </ActionButton>
      </StatusPanel>
      {error && <p role="alert">{error}</p>}
    </Panel>
  );
}
