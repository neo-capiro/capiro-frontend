"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import {
  prospectDraftCreateBody,
  type ProspectDraftCreate as CreateInput,
} from "../../../../shared/capiro/operations/workspace-prospects";
import { ActionButton, Field, TextInput } from "../../../../shared/module-ui";
import styles from "../workspace.module.css";

export function ProspectDraftCreate({
  prospectId,
  tenantId,
  ownerId,
  onCreated,
}: {
  prospectId: string;
  tenantId: string;
  ownerId: string;
  onCreated: (id: string) => void;
}) {
  const api = useCapiro();
  const cache = useQueryClient();
  const key = ["prospect-workspace-create", tenantId, ownerId, prospectId];
  const retained = useQuery<CreateInput | null>({
    queryKey: key,
    queryFn: async () => null,
    enabled: false,
    initialData: null,
    gcTime: Infinity,
  });
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const working = useRef(false);
  async function create() {
    if (working.current) return;
    let body: CreateInput;
    try {
      body =
        retained.data ??
        prospectDraftCreateBody.parse({
          prospectId,
          requestId: crypto.randomUUID(),
          docTitle: title,
        });
    } catch {
      setError("Enter a document title of up to 500 characters.");
      return;
    }
    working.current = true;
    setPending(true);
    setError("");
    cache.setQueryData(key, body);
    try {
      const draft = await api.request("workspace.prospect.create", { body });
      if (
        draft.prospectId !== prospectId ||
        draft.tenantId !== tenantId ||
        draft.ownerId !== ownerId
      )
        throw new Error(
          "The draft receipt does not match this prospect and current owner. Recover only the original request.",
        );
      cache.setQueryData(key, null);
      onCreated(draft.id);
    } catch (cause) {
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
  return (
    <div className={styles.form}>
      <Field label="New prospect document title" htmlFor="prospect-draft-title">
        <TextInput
          id="prospect-draft-title"
          maxLength={500}
          value={retained.data?.docTitle ?? title}
          disabled={pending || Boolean(retained.data)}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      {retained.data && (
        <p role="status">
          Original creation retained: {retained.data.requestId}. Recovery uses
          the same prospect and seed; it does not create a replacement key.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <ActionButton
        primary
        disabled={pending || (!retained.data && !title.trim())}
        onClick={() => void create()}
      >
        {pending
          ? "Creating…"
          : retained.data
            ? "Recover original draft"
            : "Create manual draft"}
      </ActionButton>
    </div>
  );
}
