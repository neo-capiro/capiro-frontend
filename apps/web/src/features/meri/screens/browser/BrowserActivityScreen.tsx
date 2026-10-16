import { ArrowUpRight, Clock, FileText, X } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import phone from "../../ui/phone-page.module.css";
import styles from "./browser.module.css";

export type BrowserSnapshot = {
  url: string;
  site: string;
  heading: string;
  searchLabel: string;
  query: string;
  resultTitle: string;
  resultText: string;
  caption: string;
};
export type BrowserActivityView = {
  task: string;
  snapshot: BrowserSnapshot;
  activity: readonly { title: string; detail: string }[];
  filesHref?: string;
};

/** Captured, non-interactive picture of the remote page; Meri never embeds the live site. */
function SnapshotPage({
  snapshot,
  unavailable,
}: {
  snapshot: BrowserSnapshot;
  unavailable: string;
}) {
  return (
    <figure className={styles.page} aria-label="Illustrative page snapshot">
      <p className={styles.site}>{snapshot.site}</p>
      <p className={styles.siteHeading}>{snapshot.heading}</p>
      <div className={styles.snapshotField}>
        <span>{snapshot.searchLabel}</span>
        <span className={styles.snapshotInput}>{snapshot.query}</span>
      </div>
      <p className={styles.resultTitle}>{snapshot.resultTitle}</p>
      <p className={styles.resultText}>{snapshot.resultText}</p>
      <button type="button" className={ui.outline} disabled title={unavailable}>
        <FileText aria-hidden /> Open document
      </button>
      <figcaption className={styles.caption}>{snapshot.caption}</figcaption>
    </figure>
  );
}

/** 07.01 Public browser activity: what the isolated browser is doing for the current task. */
export function BrowserActivityScreen({
  view,
  unavailable,
}: {
  view: BrowserActivityView;
  unavailable: string;
}) {
  return (
    <div className={`${ui.page} ${phone.page}`}>
      <MeriPageHeading
        title="Browse official sources"
        description={`Current task: ${view.task}`}
      />
      <div className={styles.split}>
        <section className={styles.browser} aria-label="Remote browser">
          <div className={styles.navigation}>
            <ArrowUpRight aria-hidden />
            <p className={styles.url}>{view.snapshot.url}</p>
            <button
              type="button"
              className={ui.ghost}
              disabled
              title={unavailable}
            >
              Refresh
            </button>
          </div>
          <SnapshotPage snapshot={view.snapshot} unavailable={unavailable} />
        </section>
        <section className={styles.activity} aria-labelledby="browser-activity">
          <h2 id="browser-activity">Activity</h2>
          <ol>
            {view.activity.map((step) => (
              <li key={step.title}>
                <Clock aria-hidden />
                <div>
                  <p className={styles.stepTitle}>{step.title}</p>
                  <p className={ui.muted}>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <LinkAction
            variant="outline"
            href={view.filesHref}
            unavailable={unavailable}
          >
            <FileText aria-hidden /> View downloaded files
          </LinkAction>
          <button
            type="button"
            className={ui.ghost}
            disabled
            title={unavailable}
          >
            <X aria-hidden /> Stop browsing
          </button>
        </section>
      </div>
    </div>
  );
}
