"use client";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { importPreviewBody } from "../../../../../shared/capiro/operations/legiwatch-imports";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Panel,
  TextInput,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
export function ImportUpload({
  tenantId,
  onReviewed,
}: {
  tenantId?: string;
  onReviewed: (id: string) => void;
}) {
  const [body, setBody] = useState<z.infer<typeof importPreviewBody>>(),
    [error, setError] = useState<string>();
  const generation = useRef(0),
    mutation = useCapiroMutation("legiwatch.import.preview");
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );
  const read = async (file?: File) => {
    const current = ++generation.current;
    setBody(undefined);
    setError(undefined);
    mutation.reset();
    if (!file) return;
    try {
      if (file.size > 1500000)
        throw new Error("Choose a capture file smaller than 1.5 MB.");
      const parsed = importPreviewBody.safeParse(JSON.parse(await file.text()));
      if (!parsed.success)
        throw new Error(
          "The capture must contain bounded source items and an explicit matching mapping manifest.",
        );
      if (parsed.data.targetTenantId !== tenantId)
        throw new Error(
          "This capture targets a different workspace. Select a capture mapped to your current workspace.",
        );
      if (generation.current === current) setBody(parsed.data);
    } catch (caught) {
      if (generation.current === current)
        setError(
          caught instanceof Error ? caught.message : "Could not read capture.",
        );
    }
  };
  const preview = async () => {
    if (!body) return;
    try {
      const result = await mutation.run({ body });
      onReviewed(result.run.id);
    } catch {
      /* Keep the exact capture for retry. */
    }
  };
  return (
    <Panel title="Review captured source file">
      <div className={styles.form}>
        <Field
          label="Capture and mapping manifest (.json)"
          htmlFor="import-capture"
        >
          <TextInput
            id="import-capture"
            type="file"
            accept="application/json,.json"
            disabled={!tenantId || mutation.pending}
            onChange={(event) => void read(event.target.files?.[0])}
          />
        </Field>
        {body && (
          <>
            <p>
              {body.sourceAccount} · {body.captureId} · {body.items.length}{" "}
              records
            </p>
            <p className={styles.description}>Source hash {body.sourceHash}</p>
          </>
        )}
        <ActionButton
          primary
          disabled={!body || mutation.pending}
          onClick={() => void preview()}
        >
          {mutation.pending
            ? "Preparing reconciliation…"
            : "Preview mappings and records"}
        </ActionButton>
        {(error || mutation.error) && (
          <p role="alert">{error ?? mutation.error?.message}</p>
        )}
      </div>
    </Panel>
  );
}
