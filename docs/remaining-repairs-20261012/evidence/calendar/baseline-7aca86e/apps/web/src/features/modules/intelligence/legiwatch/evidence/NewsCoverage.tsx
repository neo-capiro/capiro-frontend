"use client";
import type { z } from "zod";
import type {
  newsItem,
  newsPage,
} from "../../../../../shared/capiro/operations/legiwatch-evidence-schemas";
import { ActionButton, Badge, Panel } from "../../../../../shared/module-ui";
import { SourceLink } from "../components";
import styles from "../legiwatch.module.css";
import type { useEvidenceSelection } from "./use-evidence-selection";

type NewsPage = z.infer<typeof newsPage>;
type Selection = ReturnType<typeof useEvidenceSelection>;
export function NewsCoverage({
  data,
  selection,
  canSave,
}: {
  data: NewsPage;
  selection: Selection;
  canSave: boolean;
}) {
  return (
    <div className={styles.form}>
      <Panel title="Source-linked coverage" description={data.coverageMessage}>
        <div className={styles.list}>
          {data.items.map((item) => (
            <NewsEvidenceRow
              key={item.id}
              item={item}
              selection={selection}
              canSave={canSave}
            />
          ))}
          {!data.items.length && (
            <p className={styles.description}>
              No retained articles match this window and filter.
            </p>
          )}
        </div>
      </Panel>
      <Panel
        title="Publisher coverage"
        description="Retained article counts describe available evidence. They do not certify feed health."
      >
        <div className={styles.list}>
          {data.coverage.map((source, index) => (
            <article
              className={styles.listItem}
              key={`${source.publisher}:${index}`}
            >
              <div className={styles.row}>
                <strong>{source.publisher}</strong>
                <Badge>{source.intake.status.replaceAll("_", " ")}</Badge>
              </div>
              <p className={styles.description}>
                {source.retained.articles} retained ·{" "}
                {source.retained.fullTextArticles} full text · Last observed{" "}
                {source.retained.latestObservedAt ?? "not available"}
              </p>
              {source.intake.feeds.map((feed) => (
                <p key={feed.url} className={styles.description}>
                  {feed.publisher}: {feed.status} ·{" "}
                  {feed.observedAt ?? "not checked"}
                  {feed.reason ? ` · ${feed.reason}` : ""}
                  {feed.primaryFailure ? ` · ${feed.primaryFailure}` : ""}
                </p>
              ))}
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
function NewsEvidenceRow({
  item,
  selection,
  canSave,
}: {
  item: z.infer<typeof newsItem>;
  selection: Selection;
  canSave: boolean;
}) {
  return (
    <article className={styles.listItem}>
      <div className={styles.row}>
        <strong>{item.title}</strong>
        <ActionButton
          onClick={() => selection.setExact({ kind: "news", id: item.id })}
        >
          Exact source
        </ActionButton>
      </div>
      <p className={styles.description}>
        {item.publisher} ·{" "}
        {item.published_at
          ? `Published ${item.published_at}`
          : "Publication time not stated"}{" "}
        · Observed {item.observed_at}
      </p>
      {item.summary && <p>{item.summary}</p>}
      <div className={styles.actions}>
        <Badge>
          {item.body_complete ? "Full text retained" : "Partial text"}
        </Badge>
        <Badge>{item.rights}</Badge>
        <SourceLink href={item.source_url}>Attributed publisher</SourceLink>
        <ActionButton
          disabled={!canSave}
          title={!canSave ? "Choose an editable folder first." : undefined}
          onClick={() =>
            selection.setTracking({
              kind: "news",
              id: item.id,
              version: item.tracking_version ?? 0,
              saved: item.saved,
            })
          }
        >
          {item.saved ? "Remove from folder" : "Save to folder"}
        </ActionButton>
      </div>
    </article>
  );
}
