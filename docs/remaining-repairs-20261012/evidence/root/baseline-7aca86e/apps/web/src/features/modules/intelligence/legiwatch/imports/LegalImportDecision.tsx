"use client";
import { useRef, useState } from "react";
import type { z } from "zod";
import type { stagedLegalSource } from "../../../../../shared/capiro/operations/legiwatch-research-imports";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField, SourceLink } from "../components";
import type { EvidenceScope } from "../evidence/EvidenceActions";
import styles from "../legiwatch.module.css";
export function LegalImportDecision({
  row,
  scope,
  targetFolderId,
  onClose,
  onSaved,
}: {
  row: z.infer<typeof stagedLegalSource>;
  scope: EvidenceScope;
  targetFolderId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<"imported" | "unresolved" | "excluded">(
      "unresolved",
    ),
    [reason, setReason] = useState(""),
    [basis, setBasis] = useState(""),
    [citation, setCitation] = useState(""),
    [edition, setEdition] = useState(""),
    [referenceId, setReference] = useState("");
  const [lookup, setLookup] = useState<{ citation: string; edition: string }>();
  const references = useCapiroQuery(
    "legiwatch.research.references",
    { query: { ...scope, ...lookup, code: "statute" } },
    { enabled: Boolean(lookup) },
  );
  const memberships = useCapiroQuery(
    "legiwatch.research.memberships",
    {
      query: {
        ...scope,
        folderId: scope.folderId ?? "unselected",
        includeRemoved: "true",
      },
    },
    { enabled: Boolean(scope.folderId) },
  );
  const mutation = useCapiroMutation("legiwatch.research.import.decide"),
    request = useRef<{ input: string; key: string } | undefined>(undefined);
  const selected = references.data?.rows.find(
      (item) => item.id === referenceId,
    ),
    existing = memberships.data?.find(
      (item) => item.reference_id === referenceId,
    );
  const qualified = Boolean(
    scope.folderId &&
    targetFolderId === scope.folderId &&
    selected?.complete &&
    selected.revision_id &&
    selected.edition &&
    memberships.data &&
    !existing?.removed &&
    basis.trim().length >= 8,
  );
  const save = async () => {
    const input = {
      ...scope,
      stagedId: row.id,
      expectedVersion: row.version,
      sourceHash: row.sourceHash,
      status,
      reason,
      ...(status === "imported"
        ? {
            referenceId,
            edition: selected?.edition ?? undefined,
            revisionId: selected?.revision_id ?? undefined,
            resolutionBasis: basis,
            expectedMembershipVersion: existing?.version ?? 0,
          }
        : {}),
    };
    const serialized = JSON.stringify(input);
    if (request.current?.input !== serialized)
      request.current = { input: serialized, key: crypto.randomUUID() };
    try {
      const result = await mutation.run({
        body: { ...input, requestKey: request.current.key },
      });
      if (result.status === status) onSaved();
    } catch {
      /* Same decision reuses its key after uncertain outcomes. */
    }
  };
  return (
    <Modal
      open
      title="Resolve captured statute membership"
      onOpenChange={(open) => {
        if (!open && !mutation.pending) onClose();
      }}
    >
      <div className={styles.form}>
        <pre className={styles.briefText}>
          {JSON.stringify(row.payload, null, 2)}
        </pre>
        <fieldset disabled={mutation.pending} className={styles.form}>
          <SelectField
            id="legal-import-status"
            label="Decision"
            value={status}
            onChange={(value) => {
              if (
                value === "imported" ||
                value === "unresolved" ||
                value === "excluded"
              )
                setStatus(value);
            }}
          >
            <option value="unresolved">Leave unresolved</option>
            <option value="excluded">Exclude with reason</option>
            <option value="imported">Import resolved source</option>
          </SelectField>
          <Field label="Review reason" htmlFor="legal-import-reason">
            <TextInput
              id="legal-import-reason"
              value={reason}
              maxLength={2000}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          {status === "imported" && (
            <>
              <p className={styles.banner}>
                Choose the mapped folder outside this dialog. A source edition
                and complete retained revision are required. Manually removed
                memberships remain removed.
              </p>
              <Field label="Statute citation" htmlFor="legal-import-citation">
                <TextInput
                  id="legal-import-citation"
                  value={citation}
                  onChange={(event) => setCitation(event.target.value)}
                />
              </Field>
              <Field label="Source edition" htmlFor="legal-import-edition">
                <TextInput
                  id="legal-import-edition"
                  value={edition}
                  maxLength={4}
                  onChange={(event) => setEdition(event.target.value)}
                />
              </Field>
              <ActionButton
                disabled={!/^20\d{2}$/.test(edition) || !citation.trim()}
                onClick={() => {
                  setReference("");
                  setLookup({ citation, edition });
                }}
              >
                Look up exact source edition
              </ActionButton>
              <StatusPanel
                loading={references.loading}
                error={references.error}
                onRetry={references.reload}
              >
                <SelectField
                  id="legal-import-reference"
                  label="Qualified retained reference"
                  value={referenceId}
                  onChange={setReference}
                >
                  <option value="">Choose a retained reference</option>
                  {references.data?.rows.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={!item.complete || !item.revision_id}
                    >
                      {item.title ?? item.id} ·{" "}
                      {item.edition ?? "Edition unavailable"}
                      {item.complete ? "" : " · Incomplete"}
                    </option>
                  ))}
                </SelectField>
                {selected && (
                  <>
                    <SourceLink href={selected.source_url}>
                      Review official source
                    </SourceLink>
                    <p>Revision {selected.revision_id ?? "unavailable"}</p>
                    {selected.sections?.map((section) => (
                      <details key={section.locator}>
                        <summary>{section.locator}</summary>
                        <p className={styles.briefText}>{section.text}</p>
                      </details>
                    ))}
                  </>
                )}
              </StatusPanel>
              <Field label="Resolution basis" htmlFor="legal-import-basis">
                <TextInput
                  id="legal-import-basis"
                  value={basis}
                  maxLength={2000}
                  onChange={(event) => setBasis(event.target.value)}
                />
              </Field>
              {memberships.error && (
                <p role="alert">{memberships.error.message}</p>
              )}
            </>
          )}
          <ActionButton
            primary
            disabled={
              reason.trim().length < 3 || (status === "imported" && !qualified)
            }
            onClick={() => void save()}
          >
            Save reviewed decision
          </ActionButton>
        </fieldset>
        {mutation.data && (
          <p role="status">
            {mutation.data.status} · {mutation.data.reason}
          </p>
        )}
        {mutation.error && <p role="alert">{mutation.error.message}</p>}
      </div>
    </Modal>
  );
}
