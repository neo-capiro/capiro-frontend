"use client";
import { useRef, useState } from "react";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import {
  acknowledgeRecovery,
  reserveRecovery,
  RecoveryStorageError,
} from "@/shared/session/recovery/journal";
import {
  prospectIntentScope,
  verifyProspectWriter,
} from "./recovery-authority";
import { CapiroApiError } from "../../../../shared/capiro/http";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import {
  prospectDraftCreateBody,
  type ProspectDraftCreate as CreateInput,
} from "../../../../shared/capiro/operations/workspace-prospects";
import { ActionButton, Field, TextInput } from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { ProspectTemplatePicker } from "./ProspectTemplatePicker";
import { sameBlueprintPin } from "../document-templates/blueprint-adoption";

const recoveryContract = {
  schema: prospectDraftCreateBody,
  requestId: (body: CreateInput) => body.requestId,
};
export function ProspectDraftCreate({
  prospectId,
  tenantId,
  ownerId,
  userId,
  onCreated,
}: {
  prospectId: string;
  tenantId: string;
  ownerId: string;
  userId: string;
  onCreated: (id: string) => void;
}) {
  const api = useCapiro();
  const actor = { tenantId, userId, ownerId };
  const scope = prospectIntentScope(
    "prospect-workspace-create",
    actor,
    prospectId,
  );
  const retained = useRetainedIntent(
    scope,
    recoveryContract,
    async (signal, guard) => {
      await verifyProspectWriter(api, actor, signal, guard);
      const current = await api.request(
        "workspace.prospect.drafts",
        { query: { prospectId } },
        { signal },
      );
      guard();
      if (
        current.drafts.some(
          (draft) =>
            draft.tenantId !== tenantId || draft.prospectId !== prospectId,
        )
      )
        throw new Error(
          "The current document list does not match this prospect and tenant.",
        );
    },
  );
  const [title, setTitle] = useState("");
  const [pin, setPin] = useState<CreateInput["blueprintPin"]>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const working = useRef(false);
  async function create() {
    if (working.current || !retained.ready) return;
    let body: CreateInput;
    try {
      body =
        retained.record ??
        prospectDraftCreateBody.parse({
          prospectId,
          requestId: crypto.randomUUID(),
          docTitle: title,
          ...(pin ? { blueprintPin: pin } : {}),
        });
    } catch {
      setError("Enter a document title of up to 500 characters.");
      return;
    }
    working.current = true;
    setPending(true);
    setError("");
    let verified = false;
    try {
      const original = await reserveRecovery(
        scope,
        body.requestId,
        body,
        recoveryContract,
        retained.guard,
      );
      retained.install(original);
      if (original.requestId !== body.requestId) {
        setError(
          "Another view has an original draft creation. Recover that original request.",
        );
        return;
      }
      body = original;
      await retained.verify();
      verified = true;
      const draft = await api.request("workspace.prospect.create", { body });
      if (
        draft.prospectId !== prospectId ||
        draft.tenantId !== tenantId ||
        draft.ownerId !== ownerId ||
        !sameBlueprintPin(
          draft.config.documentAgent?.blueprintPin ?? undefined,
          body.blueprintPin,
        )
      )
        throw new Error(
          "The draft receipt does not match this prospect and current owner. Recover only the original request.",
        );
      retained.guard();
      await acknowledgeRecovery(scope, body.requestId, retained.guard);
      retained.install(null);
      onCreated(draft.id);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (
        !verified ||
        cause instanceof RecoveryStorageError ||
        (cause instanceof CapiroApiError && [401, 403].includes(cause.status))
      )
        retained.block(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "The original draft could not be confirmed.",
      );
    } finally {
      working.current = false;
      setPending(false);
    }
  }
  if (!retained.ready)
    return (
      <div role={retained.error ? "alert" : "status"}>
        <p>{retained.error ?? "Checking saved draft creation…"}</p>
        {retained.error && (
          <ActionButton onClick={retained.retry}>
            Retry saved draft recovery
          </ActionButton>
        )}
      </div>
    );
  return (
    <div className={styles.form}>
      <ProspectTemplatePicker
        pin={retained.record ? retained.record.blueprintPin : pin}
        disabled={pending || Boolean(retained.record)}
        onChange={setPin}
      />
      <Field label="New prospect document title" htmlFor="prospect-draft-title">
        <TextInput
          id="prospect-draft-title"
          maxLength={500}
          value={retained.record?.docTitle ?? title}
          disabled={pending || Boolean(retained.record)}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      {retained.record && (
        <p role="status">
          Original creation retained: {retained.record.requestId}. Recovery uses
          the same prospect and seed; it does not create a replacement key.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <ActionButton
        primary
        disabled={pending || (!retained.record && !title.trim())}
        onClick={() => void create()}
      >
        {pending
          ? "Creating…"
          : retained.record
            ? "Recover original draft"
            : pin
              ? "Create proposal draft"
              : "Create manual draft"}
      </ActionButton>
    </div>
  );
}
