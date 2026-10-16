import { ArrowUpRight } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { FieldTable, type FieldRow } from "../../ui/FieldTable";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./sources.module.css";

export type FundingEvidenceView = {
  title: string;
  description: string;
  fields: readonly FieldRow[];
  usage: string;
};

/** 05.09 Funding evidence detail: one public source, its record fields and how it was used. */
export function FundingEvidenceScreen({
  view,
  sourceHref,
  sourcesHref,
  unavailable,
}: {
  view: FundingEvidenceView;
  sourceHref?: string | undefined;
  sourcesHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      <section
        className={`${surfaces.card} ${styles.funding}`}
        aria-label="Funding evidence"
      >
        <FieldTable
          caption={`Evidence fields for ${view.title}`}
          fieldLabel="Evidence field"
          rows={view.fields}
          shares={[300, 804]}
        />
        <h2 className={surfaces.largeTitle}>How this source was used</h2>
        <p className={surfaces.lede}>{view.usage}</p>
        <div className={ui.row}>
          <LinkAction
            variant="outline"
            href={sourceHref}
            unavailable={unavailable}
          >
            <ArrowUpRight aria-hidden /> View source in browser
          </LinkAction>
          <LinkAction
            variant="outline"
            href={sourcesHref}
            unavailable={unavailable}
          >
            Back to all sources
          </LinkAction>
        </div>
      </section>
    </div>
  );
}
