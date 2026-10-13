"use client";
import { useState } from "react";
import type { z } from "zod";
import type { researchSearchBody } from "../../../../../shared/capiro/operations/legiwatch-research-schemas";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField, SourceLink } from "../components";
import type { EvidenceScope } from "../evidence/EvidenceActions";
import { EvidenceBasketActions } from "../evidence/EvidenceBasket";
import { EvidenceDialogs } from "../evidence/EvidenceDialogs";
import { useEvidenceSelection } from "../evidence/use-evidence-selection";
import styles from "../legiwatch.module.css";
import { ResearchDraft } from "./ResearchDraft";
import { ResearchVersions } from "./ResearchVersions";

type SearchInput = z.infer<typeof researchSearchBody>;
export function ResearchSearch({ scope }: { scope: EvidenceScope }) {
  const [input, setInput] = useState<SearchInput | null>(null);
  return (
    <div className={styles.form}>
      <ResearchSearchForm
        initialSession={scope.sessionKey ?? ""}
        onSearch={(body) => setInput({ ...scope, ...body, jurisdiction: "FL" })}
      />
      {input ? (
        <ResearchResults key={JSON.stringify(input)} input={input} />
      ) : (
        <Panel
          title="Full-text evidence and citations"
          description="Search retained Florida legislative text using an explicit session. Inspect official versions and exact source revisions before preparing a cited draft."
        >
          <p>Choose a session to begin.</p>
        </Panel>
      )}
    </div>
  );
}
function ResearchSearchForm({
  initialSession,
  onSearch,
}: {
  initialSession: string;
  onSearch: (input: SearchInput) => void;
}) {
  const [sessionKey, setSession] = useState(initialSession),
    [query, setQuery] = useState("");
  const [policy, setPolicy] = useState<SearchInput["versionPolicy"]>(
    "current_extractions",
  );
  const [kind, setKind] = useState<SearchInput["kind"]>("all"),
    [stage, setStage] = useState<SearchInput["versionStage"]>("all");
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch({
          sessionKey,
          query,
          versionPolicy: policy,
          versionStage: stage,
          kind,
        });
      }}
    >
      <div className={styles.filters}>
        <Field label="Florida session" htmlFor="research-session">
          <TextInput
            id="research-session"
            required
            maxLength={60}
            value={sessionKey}
            placeholder="Exact source session key"
            onChange={(event) => setSession(event.target.value)}
          />
        </Field>
        <Field label="Search retained text" htmlFor="research-query">
          <TextInput
            id="research-query"
            maxLength={2000}
            value={query}
            placeholder="Search exact source text…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <SelectField
          id="research-policy"
          label="Version policy"
          value={policy}
          onChange={(value) => setPolicy(value as SearchInput["versionPolicy"])}
        >
          <option value="current_extractions">Current extractions</option>
          <option value="any_retained">Any retained version</option>
          <option value="newest_dated_text">Newest dated text</option>
        </SelectField>
      </div>
      <div className={styles.filters}>
        <SelectField
          id="research-kind"
          label="Document kind"
          value={kind}
          onChange={(value) => setKind(value as SearchInput["kind"])}
        >
          <option value="all">All kinds</option>
          <option value="text">Bill text</option>
          <option value="amendment">Amendments</option>
          <option value="supplement">Supplements</option>
        </SelectField>
        <SelectField
          id="research-stage"
          label="Stage"
          value={stage}
          onChange={(value) => setStage(value as SearchInput["versionStage"])}
        >
          <option value="all">All retained stages</option>
          <option value="enrolled">Enrolled</option>
          <option value="chaptered">Chaptered</option>
        </SelectField>
        <ActionButton primary type="submit" disabled={!sessionKey.trim()}>
          Search retained text
        </ActionButton>
      </div>
    </form>
  );
}
function ResearchResults({ input }: { input: SearchInput }) {
  const [draftOpen, setDraftOpen] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(),
    [billId, setBillId] = useState<string | null>(null);
  const selection = useEvidenceSelection();
  const query = useCapiroQuery("legiwatch.research.search", {
    body: { ...input, cursor },
  });
  const scope = {
    folderId: input.folderId,
    clientId: input.clientId,
    sessionKey: input.sessionKey,
  };
  return (
    <div className={styles.form}>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <>
            <p className={styles.banner}>
              {query.data.message} · {query.data.coverage.reason} ·{" "}
              {query.data.scanned} retained documents inspected on this page.{" "}
              {query.data.coverage.complete
                ? "Selected source scope is complete."
                : "Source coverage is partial."}
            </p>
            {!query.data.items.length && (
              <p>No matching passages on this page.</p>
            )}
            {query.data.items.map((item) => (
              <Panel
                key={item.id}
                title={`${item.billIdentifier} · ${item.billTitle}`}
              >
                <div className={styles.meta}>
                  <Badge>{item.kind}</Badge>
                  <Badge>
                    {item.complete
                      ? "Complete extraction"
                      : "Partial extraction"}
                  </Badge>
                  <span>{item.publishedDate ?? "Undated source"}</span>
                </div>
                <blockquote className={styles.briefText}>
                  {item.excerpt.quote}
                </blockquote>
                <p className={styles.description}>
                  Revision {item.revision} · Retained {item.observedAt}
                </p>
                <div className={styles.actions}>
                  <SourceLink href={item.sourceUrl}>Official source</SourceLink>
                  <ActionButton
                    onClick={() =>
                      selection.setExact({ kind: "research", id: item.id })
                    }
                  >
                    Open retained full text
                  </ActionButton>
                  <ActionButton onClick={() => setBillId(item.billId)}>
                    Compare versions
                  </ActionButton>
                </div>
              </Panel>
            ))}
            <div className={styles.actions}>
              <ActionButton
                disabled={!cursor}
                onClick={() => setCursor(undefined)}
              >
                Restart search
              </ActionButton>
              <ActionButton
                disabled={!query.data.cursor}
                onClick={() => setCursor(query.data!.cursor!)}
              >
                Next inspected page
              </ActionButton>
            </div>
          </>
        )}
      </StatusPanel>
      <EvidenceBasketActions selection={selection} />
      <ActionButton
        disabled={!selection.refs.length || selection.refs.length > 10}
        onClick={() => setDraftOpen(true)}
      >
        Save cited research draft
      </ActionButton>
      {draftOpen && (
        <ResearchDraft
          scope={scope}
          refs={selection.refs}
          onClose={() => setDraftOpen(false)}
        />
      )}
      <EvidenceDialogs
        selection={selection}
        scope={scope}
        reload={query.reload}
      />
      {billId && (
        <ResearchVersions
          scope={scope}
          billId={billId}
          onClose={() => setBillId(null)}
        />
      )}
    </div>
  );
}
