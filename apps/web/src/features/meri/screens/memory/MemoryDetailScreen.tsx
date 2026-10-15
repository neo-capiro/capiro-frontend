import { ArrowUpRight, Sparkle } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { FieldTable, type FieldRow } from "../../ui/FieldTable";
import { SourceCard, type SourceSummary } from "../../ui/SourceCard";
import { Notice } from "../../ui/Notice";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./memory.module.css";

export type MemoryDetailView = {
  title: string;
  description: string;
  fact: string;
  fields: readonly FieldRow[];
  evidence: readonly SourceSummary[];
  conflict: { title: string; detail: string };
};

/** 05.05 Memory detail and provenance: one approved fact, its governance and supporting evidence. */
export function MemoryDetailScreen({
  view,
  compareHref,
  correctionHref,
  evidenceHref,
  unavailable,
}: {
  view: MemoryDetailView;
  compareHref?: string | undefined;
  correctionHref?: string | undefined;
  evidenceHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      <div className={ui.row}>
        <LinkAction
          variant="outline"
          href={compareHref}
          unavailable={unavailable}
        >
          Compare conflicting evidence
        </LinkAction>
      </div>
      <div className={styles.detailLayout}>
        <section className={surfaces.card} aria-labelledby="memory-fact">
          <h2 id="memory-fact" className={surfaces.statTitle}>
            {view.fact}
          </h2>
          <FieldTable
            caption="Memory governance"
            fieldLabel="Field"
            rows={view.fields}
            shares={[170, 334]}
          />
          <LinkAction
            variant="primary"
            href={correctionHref}
            unavailable={unavailable}
          >
            <Sparkle aria-hidden fill="currentColor" /> Propose a correction
          </LinkAction>
        </section>
        <section className={surfaces.panel} aria-labelledby="memory-evidence">
          <h2 id="memory-evidence" className={surfaces.largeTitle}>
            Supporting evidence
          </h2>
          {view.evidence.map((source) => (
            <div key={source.id} className={surfaces.stretch}>
              <SourceCard
                source={source}
                action={
                  <LinkAction
                    variant="ghost"
                    href={evidenceHref}
                    unavailable={unavailable}
                  >
                    <ArrowUpRight aria-hidden /> View evidence
                  </LinkAction>
                }
              />
            </div>
          ))}
          <div className={surfaces.stretch}>
            <Notice tone="warning" title={view.conflict.title}>
              {view.conflict.detail}
            </Notice>
          </div>
          <p className={`${surfaces.small} ${ui.muted}`}>
            Conversation notes and working files remain separate from approved
            institutional memory.
          </p>
        </section>
      </div>
    </div>
  );
}
