"use client";
import { useState } from "react";
import Link from "next/link";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  initials,
  memberName,
  useMemberOptions,
} from "@/features/portfolio/index/public";
import {
  portfolioStages,
  isPortfolioStage,
  stageLabel,
  prospectListSchema,
  type Prospect,
  type StageCatalog,
} from "./contracts";
import type { z } from "zod";
import { StageEditor } from "./StageEditor";
import styles from "./pipeline.module.css";
type PipelineData = z.infer<typeof prospectListSchema>;
export function ProspectPipeline({
  data,
  catalog,
  error,
  onClose,
}: {
  data: PipelineData;
  catalog: StageCatalog | null | undefined;
  error: Error | null;
  onClose: () => void;
}) {
  const [moving, setMoving] = useState<{ record: Prospect; stage?: string }>();
  const [dragId, setDragId] = useState<string>();
  const owners = useMemberOptions();
  const legacy = data.prospects.filter((row) => !isPortfolioStage(row.stage));
  function card(record: Prospect) {
    const canMove = Boolean(
      catalog &&
      (isPortfolioStage(record.stage) || catalog.allowLegacyTransitions),
    );
    const owner = owners.data?.find(
      (member) => member.id === record.ownerUserId,
    );
    const summary = [
      record.serviceHypothesis || record.description,
      record.geography,
      record.nextAction,
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <article
        className={styles.pipelineCard}
        key={record.id}
        draggable={canMove}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", record.id);
          setDragId(record.id);
        }}
        onDragEnd={() => setDragId(undefined)}
      >
        <div className={styles.pipelineCardHeading}>
          <h3>
            <Link href={`/portfolio/prospects/${record.id}`}>
              {record.displayName}
            </Link>
          </h3>
          <button
            type="button"
            className={styles.pipelineMoveButton}
            aria-label="Change stage"
            title={canMove ? "Change stage" : "Stage updates unavailable"}
            disabled={!canMove}
            onClick={() => setMoving({ record })}
          >
            {/* The local design asset is the card's drag handle. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/design/411-44335-imgDragHandle.svg" alt="" />
          </button>
        </div>
        <p className={styles.pipelineCardSummary}>
          {summary || "Company details unavailable"}
        </p>
        <div className={styles.pipelineCardMeta}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/design/411-44335-imgEllipse.svg" alt="" />
          {owner && (
            <span
              className={styles.pipelineOwner}
              title={`Owner: ${memberName(owner)}`}
              aria-label={`Owner: ${memberName(owner)}`}
            >
              {initials(memberName(owner))}
            </span>
          )}
        </div>
      </article>
    );
  }
  return (
    <>
      <Dialog
        open
        wide
        title="Pipeline"
        eyebrow="Portfolio prospects"
        headerActions={
          <span className={styles.pipelineSummary}>
            Weighted pipeline and win rate unavailable
          </span>
        }
        className={styles.pipelineDialog}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <div className={styles.pipelineBoard}>
          {(!catalog ||
            error ||
            data.counts.visible > data.prospects.length) && (
            <div className={styles.pipelineNotices}>
              {!catalog && (
                <p role="status">
                  Stage updates are unavailable. You can open prospects to edit
                  company details and next steps.
                </p>
              )}
              <QueryState error={error} />
              {data.counts.visible > data.prospects.length && (
                <p role="status">
                  Showing the latest {data.prospects.length} of{" "}
                  {data.counts.visible} matching prospects. Counts include all
                  matches.
                </p>
              )}
            </div>
          )}
          <div
            className={styles.pipeline}
            role="region"
            aria-label="Pipeline stages"
            tabIndex={0}
          >
            {portfolioStages.map((stage) => {
              const records = data.prospects.filter(
                (row) => row.stage === stage,
              );
              const count = data.counts.byStage[stage] ?? 0;
              return (
                <section
                  className={styles.pipelineColumn}
                  data-empty={records.length === 0}
                  key={stage}
                  onDragOver={(event) => {
                    if (dragId) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const record = data.prospects.find(
                      (row) =>
                        row.id === dragId &&
                        row.id === event.dataTransfer.getData("text/plain"),
                    );
                    if (record && record.stage !== stage)
                      setMoving({ record, stage });
                    setDragId(undefined);
                  }}
                >
                  <header className={styles.pipelineColumnHeader}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/design/411-44335-imgEllipse.svg" alt="" />
                    <h3>{stageLabel(stage)}</h3>
                    <span className={styles.pipelineCount}>{count}</span>
                    {stage === "identified" && catalog ? (
                      <Link
                        className={styles.pipelineAdd}
                        href="/portfolio/prospects?new=1"
                        aria-label="Add prospect"
                        title="Add prospect to Identified"
                      >
                        +
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={styles.pipelineAdd}
                        disabled
                        aria-label={`Add prospect to ${stageLabel(stage)} unavailable`}
                        title="New prospects start in Identified"
                      >
                        +
                      </button>
                    )}
                  </header>
                  {records.map(card)}
                  {records.length === 0 && (
                    <p className={styles.pipelineEmpty}>
                      {count ? "Not in loaded results" : "No prospects"}
                    </p>
                  )}
                </section>
              );
            })}
            {legacy.length > 0 && (
              <section className={styles.pipelineColumn} data-empty={false}>
                <header className={styles.pipelineColumnHeader}>
                  <h3>Previous stages</h3>
                </header>
                <p className={styles.pipelineEmpty}>
                  Existing stage values are preserved until migration.
                </p>
                {legacy.map(card)}
              </section>
            )}
          </div>
        </div>
        <footer className={styles.pipelineFooter}>
          Archived · {data.counts.dismissed}
        </footer>
      </Dialog>
      {moving && (
        <StageEditor
          record={moving.record}
          catalog={catalog}
          initialStage={moving.stage}
          onClose={() => setMoving(undefined)}
        />
      )}
    </>
  );
}
