"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./research.module.css";
export function ResearchDrafts({ portfolio }: { portfolio: ResearchDetail }) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const artifactId = search.get("artifactId") ?? "";
  const [input, setInput] = useState(artifactId);
  function open(id: string) {
    const next = new URLSearchParams(search);
    next.set("artifactId", id);
    router.replace(`${pathname}?${next}`);
  }
  return (
    <Panel
      title="Saved research drafts"
      description="Open a brief or meeting draft from its Meri receipt. Saved versions remain private to their owner and retain their Research Portfolio source lineage."
    >
      <div className={`${styles.content} ${styles.form}`}>
        <Field label="Saved draft ID" htmlFor="research-draft-id">
          <TextInput
            id="research-draft-id"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Field>
        <ActionButton
          disabled={!input.trim()}
          onClick={() => open(input.trim())}
        >
          Open saved draft
        </ActionButton>
        {artifactId && (
          <DraftEditor
            key={`${portfolio.id}:${artifactId}`}
            portfolio={portfolio}
            artifactId={artifactId}
            onOpen={open}
          />
        )}
      </div>
    </Panel>
  );
}
function DraftEditor({
  portfolio,
  artifactId,
  onOpen,
}: {
  portfolio: ResearchDetail;
  artifactId: string;
  onOpen: (id: string) => void;
}) {
  const query = useCapiroQuery("research.drafts.read", {
    params: { id: portfolio.id, artifactId },
  });
  const save = useCapiroMutation("research.drafts.version");
  const [text, setText] = useState<string>();
  const current =
    query.data?.artifactId === artifactId &&
    query.data.portfolioId === portfolio.id
      ? query.data
      : undefined;
  const draft = text ?? current?.bodyText ?? "";
  const editable = Boolean(
    current &&
    portfolio.lifecycle === "active" &&
    !query.error &&
    !query.loading &&
    !save.pending &&
    !save.error,
  );
  async function createVersion() {
    if (!editable) return;
    try {
      const result = await save.run({
        params: { artifactId },
        body: { bodyText: draft },
      });
      onOpen(result.id);
    } catch {
      /* The existing version owner has no idempotent retry contract. */
    }
  }
  return (
    <>
      <StatusPanel
        loading={query.loading}
        error={
          query.error ||
          save.error ||
          (query.data && !current
            ? "The saved draft does not match this Research Portfolio."
            : undefined)
        }
        onRetry={query.reload}
      />
      {current && (
        <>
          <h3>{current.title}</h3>
          <p>
            {current.reviewStatus.replaceAll("_", " ")} ·{" "}
            {new Date(current.createdAt).toLocaleString()}
          </p>
          {current.parentArtifactId && (
            <ActionButton onClick={() => onOpen(current.parentArtifactId!)}>
              Open previous version
            </ActionButton>
          )}
          <Field label="Draft text" htmlFor="research-draft-text">
            <TextArea
              id="research-draft-text"
              rows={22}
              value={draft}
              readOnly={!editable}
              maxLength={500000}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          <ActionButton
            primary
            disabled={!editable || draft === current.bodyText}
            onClick={() => void createVersion()}
          >
            Save new version
          </ActionButton>
          {save.error && (
            <p role="status">
              The save result is unconfirmed. Your edited text is retained.
              Refresh the recorded versions before deciding whether to save
              again.
            </p>
          )}
          <ActionButton
            disabled={query.loading || save.pending}
            onClick={query.reload}
          >
            Refresh recorded versions
          </ActionButton>
          <ul>
            {current.childVersions.map((version) => (
              <li key={version.artifactId}>
                <ActionButton onClick={() => onOpen(version.artifactId)}>
                  Open version saved{" "}
                  {new Date(version.createdAt).toLocaleString()}
                </ActionButton>{" "}
                · {version.reviewStatus.replaceAll("_", " ")}
              </li>
            ))}
          </ul>
          {current.childVersionsHasMore && (
            <p>Showing the newest 20 versions derived from this draft.</p>
          )}
          <details>
            <summary>Saved original text</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{current.bodyText}</pre>
          </details>
        </>
      )}
    </>
  );
}
