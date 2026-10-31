"use client";
import Link from "next/link";
import { useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { LegiWatchTabs } from "../components";
import {
  EvidenceScopePicker,
  useEvidenceScope,
} from "../sources/EvidenceScope";
import styles from "../legiwatch.module.css";
import { BriefingReview } from "./BriefingReview";
import { EditorialSchedules } from "./EditorialSchedules";

export function BriefingsScreen() {
  const [view, setView] = useState("history");
  return (
    <div className={styles.form}>
      <LegiWatchTabs
        value={view}
        onChange={setView}
        label="Client briefing views"
        items={[
          { id: "history", label: "Prepared editions" },
          { id: "schedules", label: "Scheduled briefings" },
        ]}
      />
      {view === "history" ? <BriefingHistory /> : <EditorialSchedules />}
    </div>
  );
}
function BriefingHistory() {
  const [folderId, setFolder] = useState(""),
    [cursor, setCursor] = useState<string>(),
    [selectionId, setSelection] = useState<string>();
  const scope = useEvidenceScope(folderId);
  const history = useCapiroQuery(
    "legiwatch.briefing.history",
    { query: { ...scope.scope, cursor, limit: 20 } },
    { enabled: !folderId || Boolean(scope.selected) },
  );
  return (
    <div className={styles.form}>
      <EvidenceScopePicker
        value={folderId}
        state={scope}
        onChange={(value) => {
          setFolder(value);
          setCursor(undefined);
          setSelection(undefined);
        }}
      />
      <p className={styles.banner}>
        Choose exact retained evidence in Research, then include it in a client
        briefing. Draft preparation, edition approval and delivery are separate
        steps.
      </p>
      {selectionId ? (
        <>
          <ActionButton onClick={() => setSelection(undefined)}>
            Briefing history
          </ActionButton>
          <BriefingReview
            selectionId={selectionId}
            folderId={folderId || undefined}
          />
        </>
      ) : (
        <StatusPanel
          loading={history.loading}
          error={history.error}
          onRetry={history.reload}
        >
          <Panel
            title="Prepared editions"
            description={
              history.data?.draftLookupState
                ? `Workspace lookup: ${history.data.draftLookupState.replaceAll("_", " ")}`
                : undefined
            }
          >
            <div className={styles.list}>
              {history.data?.items.map((item) => (
                <article className={styles.listItem} key={item.id}>
                  <strong>{item.title ?? "Prepared briefing"}</strong>
                  <p className={styles.description}>
                    {item.template} · {item.state} · Created {item.createdAt} ·
                    Cutoff {item.cutoff ?? "not stated"}
                  </p>
                  <div className={styles.actions}>
                    {item.draft && (
                      <Link
                        className={styles.link}
                        href={`/modules/workspace?draftId=${encodeURIComponent(item.draft.draftId)}`}
                      >
                        Open Workspace draft
                      </Link>
                    )}
                    <ActionButton
                      disabled={!folderId || !item.draft}
                      onClick={() => setSelection(item.selectionId)}
                    >
                      Review current edition
                    </ActionButton>
                  </div>
                </article>
              ))}
            </div>
            {history.data?.items.length === 0 && (
              <p className={styles.description}>
                No prepared editions in this scope.
              </p>
            )}
          </Panel>
          <div className={styles.actions}>
            <ActionButton
              disabled={!history.data?.nextCursor}
              onClick={() => setCursor(history.data!.nextCursor!)}
            >
              Older editions
            </ActionButton>
            <ActionButton
              disabled={!cursor}
              onClick={() => setCursor(undefined)}
            >
              Newest editions
            </ActionButton>
          </div>
        </StatusPanel>
      )}
    </div>
  );
}
