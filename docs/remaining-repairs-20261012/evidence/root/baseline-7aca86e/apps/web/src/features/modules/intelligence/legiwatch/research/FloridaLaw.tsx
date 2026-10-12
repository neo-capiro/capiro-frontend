"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField, SourceLink } from "../components";
import type { EvidenceScope } from "../evidence/EvidenceActions";
import styles from "../legiwatch.module.css";
import { LegalDeadlines } from "./LegalDeadlines";

export function FloridaLaw({
  scope,
  rules,
  canEdit,
}: {
  scope: EvidenceScope;
  rules: boolean;
  canEdit: boolean;
}) {
  if (rules) return <LegalDeadlines scope={scope} canEdit={canEdit} />;
  return <LegalReferences scope={scope} canEdit={canEdit} />;
}
function LegalReferences({
  scope,
  canEdit,
}: {
  scope: EvidenceScope;
  canEdit: boolean;
}) {
  const [citation, setCitation] = useState(""),
    [edition, setEdition] = useState(""),
    [code, setCode] = useState<"statute" | "constitution">("statute");
  const [submitted, setSubmitted] = useState<{
    citation: string;
    edition?: string;
    code: "statute" | "constitution";
  } | null>(null);
  const query = useCapiroQuery(
    "legiwatch.research.references",
    { query: { ...scope, ...(submitted ?? {}) } },
    { enabled: Boolean(submitted) },
  );
  return (
    <div className={styles.form} data-figma-node="923:180965">
      <Panel
        title="Legal source lookup"
        description="Florida statutes and constitution. Retained editions may be incomplete or stale."
      >
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted({
              citation,
              code,
              ...(edition && code === "statute" ? { edition } : {}),
            });
          }}
        >
          <SelectField
            id="legal-code"
            label="Legal code"
            value={code}
            onChange={(value) =>
              setCode(value === "constitution" ? value : "statute")
            }
          >
            <option value="statute">Florida Statutes</option>
            <option value="constitution">Florida Constitution</option>
          </SelectField>
          <Field label="Citation or query" htmlFor="legal-citation">
            <TextInput
              id="legal-citation"
              value={citation}
              maxLength={180}
              placeholder="Enter a chapter, section or exact phrase…"
              onChange={(event) => setCitation(event.target.value)}
            />
          </Field>
          {code === "statute" && (
            <Field label="Edition (optional)" htmlFor="legal-edition">
              <TextInput
                id="legal-edition"
                value={edition}
                pattern="20[0-9]{2}"
                maxLength={4}
                placeholder="Latest retained edition"
                onChange={(event) => setEdition(event.target.value)}
              />
            </Field>
          )}
          <ActionButton primary type="submit">
            Search retained Florida law
          </ActionButton>
        </form>
      </Panel>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <>
            <p className={styles.banner}>
              {query.data.coverage.reason} · Results contain selected ingested
              references only.
            </p>
            {!query.data.rows.length && (
              <p>No retained references match this lookup.</p>
            )}
            {query.data.rows.map((row) => (
              <Panel
                key={row.id}
                title={row.title ?? row.id}
                description={`${row.code_kind ?? code} · ${row.edition ?? "Edition not recorded"}`}
              >
                <SourceLink href={row.source_url}>
                  Official legal source
                </SourceLink>
                <p className={styles.description}>
                  {row.complete
                    ? "Complete retained extraction"
                    : "Partial or unavailable retained extraction"}{" "}
                  · {row.coverage ?? "Coverage not recorded"}
                </p>
                {row.sections?.map((section) => (
                  <details key={section.locator}>
                    <summary>{section.locator}</summary>
                    <p className={styles.briefText}>{section.text}</p>
                  </details>
                ))}
                {scope.folderId && canEdit && (
                  <ReferenceMembership
                    scope={{ ...scope, folderId: scope.folderId }}
                    referenceId={row.id}
                    edition={row.edition ?? null}
                  />
                )}
              </Panel>
            ))}
          </>
        )}
      </StatusPanel>
    </div>
  );
}
function ReferenceMembership({
  scope,
  referenceId,
  edition,
}: {
  scope: EvidenceScope & { folderId: string };
  referenceId: string;
  edition: string | null;
}) {
  const query = useCapiroQuery("legiwatch.research.memberships", {
    query: { ...scope, includeRemoved: "true" },
  });
  const mutation = useCapiroMutation("legiwatch.research.membership.save");
  const [requestKey] = useState(() => crypto.randomUUID());
  const existing = query.data?.find(
    (item) => item.reference_id === referenceId,
  );
  const save = async () => {
    try {
      await mutation.run({
        body: {
          ...scope,
          referenceId,
          edition,
          expectedVersion: existing?.version ?? 0,
          remove: Boolean(existing && !existing.removed),
          requestKey: `${requestKey}:${existing?.version ?? 0}`,
        },
      });
      query.reload();
    } catch {
      /* Preserve optimistic version on conflict. */
    }
  };
  return (
    <div className={styles.form}>
      <ActionButton
        disabled={query.loading || Boolean(query.error) || mutation.pending}
        onClick={() => void save()}
      >
        {existing && !existing.removed
          ? "Remove saved legal reference"
          : "Save legal reference to folder"}
      </ActionButton>
      {(query.error || mutation.error) && (
        <p role="alert">{(mutation.error ?? query.error)?.message}</p>
      )}
    </div>
  );
}
