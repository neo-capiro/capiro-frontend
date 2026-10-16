import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { FieldTable, type FieldRow } from "../../ui/FieldTable";
import { Notice } from "../../ui/Notice";
import { LinkAction } from "../../ui/LinkAction";
import surfaces from "../../ui/surfaces.module.css";
import ui from "../../ui/meri-ui.module.css";
import styles from "./memory.module.css";

export type MemoryApprovedView = {
  description: string;
  review: string;
  fact: string;
  fields: readonly FieldRow[];
};

/** 05.08 Approved memory outcome: the reviewed fact is canonical; the previous fact stays as history. */
export function MemoryApprovedScreen({
  view,
  evidenceHref,
  memoryHref,
  unavailable,
}: {
  view: MemoryApprovedView;
  evidenceHref?: string | undefined;
  memoryHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Briefing preference updated"
        description={view.description}
      />
      <div role="status">
        <Notice tone="success" title="Review complete">
          {view.review}
        </Notice>
      </div>
      <section
        className={`${surfaces.card} ${styles.outcome}`}
        aria-labelledby="canonical-memory"
      >
        <h2 id="canonical-memory">{view.fact}</h2>
        <FieldTable
          caption="Governance of the approved memory"
          fieldLabel="Governance field"
          rows={view.fields}
          shares={[300, 804]}
        />
        <LinkAction
          variant="outline"
          href={evidenceHref}
          unavailable={unavailable}
        >
          View evidence
        </LinkAction>
        <LinkAction variant="ghost" href={memoryHref} unavailable={unavailable}>
          Back to memory
        </LinkAction>
      </section>
    </div>
  );
}
