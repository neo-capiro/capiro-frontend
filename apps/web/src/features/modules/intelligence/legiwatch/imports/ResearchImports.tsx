"use client";
import { useState } from "react";
import type { z } from "zod";
import type { stagedLegalSource } from "../../../../../shared/capiro/operations/legiwatch-research-imports";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import type { EvidenceScope } from "../evidence/EvidenceActions";
import {
  EvidenceScopePicker,
  useEvidenceScope,
} from "../evidence/EvidenceScope";
import styles from "../legiwatch.module.css";
import { LegalImportDecision } from "./LegalImportDecision";

export function ResearchImports() {
  const runs = useCapiroQuery("legiwatch.imports", {}),
    members = useCapiroQuery("legiwatch.folder.members", {});
  const [sourceAccount, setAccount] = useState("");
  return (
    <div className={styles.form} data-figma-node="926:183550">
      <StatusPanel
        loading={members.loading}
        error={members.error}
        onRetry={members.reload}
      >
        {members.data?.canAssignOwner ? (
          <StatusPanel
            loading={runs.loading}
            error={runs.error}
            onRetry={runs.reload}
          >
            <SelectField
              id="research-import-account"
              label="Captured source account"
              value={sourceAccount}
              onChange={setAccount}
            >
              <option value="">Choose an imported source account</option>
              {[...new Set(runs.data?.map((row) => row.sourceAccount))].map(
                (account) => (
                  <option key={account} value={account}>
                    {account}
                  </option>
                ),
              )}
            </SelectField>
            {sourceAccount && (
              <ResearchCapture
                key={sourceAccount}
                sourceAccount={sourceAccount}
              />
            )}
          </StatusPanel>
        ) : (
          <p>A workspace administrator must review imported legal sources.</p>
        )}
      </StatusPanel>
    </div>
  );
}
function ResearchCapture({ sourceAccount }: { sourceAccount: string }) {
  const [folderId, setFolder] = useState(""),
    state = useEvidenceScope(folderId),
    [selected, setSelected] = useState<string>();
  const query = useCapiroQuery("legiwatch.research.imports", {
    query: { sourceAccount },
  });
  const member = query.data?.memberships.find((row) => row.id === selected);
  return (
    <div className={styles.form}>
      <EvidenceScopePicker
        state={state}
        value={folderId}
        onChange={setFolder}
      />
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <>
            <p className={styles.banner}>{query.data.message}</p>
            <Panel title="Captured statute memberships">
              {query.data.memberships.length === 0 && (
                <p>No captured statute memberships.</p>
              )}
              {query.data.memberships.map((row) => (
                <div className={styles.row} key={row.id}>
                  <div>
                    <strong>{row.sourceId}</strong>
                    <p>
                      {query.data?.decisions.find(
                        (decision) => decision.staged_id === row.id,
                      )?.outcome.status ?? "Awaiting review"}{" "}
                      ·{" "}
                      {row.targetFolderId
                        ? "Folder mapped"
                        : "Folder mapping required"}
                    </p>
                  </div>
                  <ActionButton onClick={() => setSelected(row.id)}>
                    Review membership
                  </ActionButton>
                </div>
              ))}
            </Panel>
            <Panel title="Captured statute alerts">
              {query.data.rules.length === 0 && (
                <p>No captured statute alerts.</p>
              )}
              {query.data.rules.map((row) => (
                <StatutePromotion
                  key={`${row.id}:${row.version}`}
                  row={row}
                  scope={state.scope}
                />
              ))}
            </Panel>
          </>
        )}
      </StatusPanel>
      {member && (
        <LegalImportDecision
          key={member.id}
          row={member}
          scope={state.scope}
          targetFolderId={member.targetFolderId}
          onClose={() => setSelected(undefined)}
          onSaved={() => {
            setSelected(undefined);
            query.reload();
          }}
        />
      )}
    </div>
  );
}
function StatutePromotion({
  row,
  scope,
}: {
  row: z.infer<typeof stagedLegalSource>;
  scope: EvidenceScope;
}) {
  const preview = useCapiroMutation("legiwatch.research.import.preview"),
    promote = useCapiroMutation("legiwatch.research.import.promote"),
    [descendants, setDescendants] = useState(false),
    [reviewed, setReviewed] = useState("");
  const context = JSON.stringify({ ...scope, descendants });
  const inspect = async () => {
    try {
      await preview.run({ body: { ...scope, stagedId: row.id, descendants } });
      setReviewed(context);
    } catch {
      setReviewed("");
    }
  };
  const create = async () => {
    if (!preview.data || reviewed !== context) return;
    try {
      await promote.run({
        body: {
          ...scope,
          stagedId: row.id,
          expectedVersion: preview.data.sourceVersion,
          sourceHash: preview.data.sourceHash,
        },
      });
    } catch {
      /* No activation occurs during promotion. */
    }
  };
  return (
    <article className={styles.listItem}>
      <h3>
        {typeof row.payload.name === "string" &&
        row.payload.audit_key !== "alert-23"
          ? row.payload.name
          : row.sourceId}
      </h3>
      <details>
        <summary>Original capture</summary>
        <pre className={styles.briefText}>
          {JSON.stringify(row.payload, null, 2)}
        </pre>
      </details>
      <fieldset
        disabled={preview.pending || promote.pending}
        className={styles.form}
      >
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={descendants}
            onChange={(event) => setDescendants(event.target.checked)}
          />
          Include chapter descendants in this preview
        </label>
        <ActionButton
          disabled={!scope.sessionKey}
          onClick={() => void inspect()}
        >
          Preview captured statute targets
        </ActionButton>
        {preview.data && reviewed === context && (
          <section>
            <p className={styles.banner}>
              {preview.data.coverage.reason} · Historical matches are review
              only.
            </p>
            {preview.data.gaps.map((gap, index) => (
              <p key={index} className={styles.gap}>
                {gap.reason}
                {gap.sourceFolderId ? ` · ${gap.sourceFolderId}` : ""}
              </p>
            ))}
            {preview.data.matches.map((match) => (
              <blockquote key={match.id}>
                {match.quote}
                <p>
                  {match.bill_id} · {match.document_revision} · {match.relation}
                </p>
              </blockquote>
            ))}
            <ActionButton
              disabled={Boolean(promote.data)}
              onClick={() => void create()}
            >
              Promote inactive statute monitor
            </ActionButton>
          </section>
        )}
      </fieldset>
      {promote.data && (
        <p role="status">
          Inactive monitor retained. Review current targets and staff in
          Monitoring.
        </p>
      )}
      {(preview.error || promote.error) && (
        <p role="alert">{(preview.error ?? promote.error)?.message}</p>
      )}
    </article>
  );
}
