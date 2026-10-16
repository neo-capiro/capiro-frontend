import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { StatusPill } from "../../ui/StatusPill";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./sources.module.css";

export type SourcesStateView = {
  title: string;
  description: string;
  state: {
    kind: "loading" | "unavailable";
    title: string;
    status: string;
    /** Explains what is not yet known; no source count or absence is claimed. */
    detail: string;
  };
  action: { label: string; href?: string | undefined };
};

/**
 * 05.21 Sources loading, 05.22 Sources unavailable and 05.22A retry: states of the 05.01
 * evidence screen. Neither shows source records, so neither can imply that no
 * evidence exists.
 */
export function SourcesStateScreen({
  view,
  unavailable,
}: {
  view: SourcesStateView;
  unavailable: string;
}) {
  const failed = view.state.kind === "unavailable";
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      <section
        className={`${surfaces.card} ${styles.state}`}
        aria-labelledby="sources-state"
        aria-busy={failed ? undefined : true}
        role={failed ? "alert" : "status"}
      >
        <h2 id="sources-state" className={surfaces.sectionTitle}>
          {view.state.title}
        </h2>
        <span className={styles.compactStatus}>
          <StatusPill tone={failed ? "danger" : "neutral"}>
            {view.state.status}
          </StatusPill>
        </span>
        <p className={`${surfaces.small} ${ui.muted}`}>{view.state.detail}</p>
        <LinkAction
          variant="outline"
          href={view.action.href}
          unavailable={unavailable}
        >
          {view.action.label}
        </LinkAction>
      </section>
    </div>
  );
}
