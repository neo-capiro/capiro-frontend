import type { DocumentInspection } from "../../../shared/meri-documents/workflow-port";
import styles from "./files.module.css";

export function DocumentInspectionSummary({
  inspection,
}: {
  inspection: DocumentInspection;
}) {
  return (
    <div className={styles.stack}>
      <h3>Structural inspection</h3>
      {inspection.format === "docx" ? (
        <dl className={styles.details}>
          <dt>Paragraphs</dt>
          <dd>{inspection.details.paragraphs}</dd>
          <dt>Tables</dt>
          <dd>{inspection.details.tables}</dd>
          <dt>Pictures</dt>
          <dd>{inspection.details.pictures}</dd>
        </dl>
      ) : inspection.format === "xlsx" ? (
        <>
          <dl className={styles.details}>
            <dt>Sheets</dt>
            <dd>{inspection.details.sheets.join(", ")}</dd>
            <dt>Formulas</dt>
            <dd>{inspection.details.formulas}</dd>
            <dt>Formula cache</dt>
            <dd>{inspection.details.formulaCache}</dd>
          </dl>
          <p className={styles.notice}>
            Formula caches are unverified and require recalculation in Excel.
            Inspection does not establish calculated values.
          </p>
        </>
      ) : (
        <p className={styles.muted}>UTF-8 text; whitespace is unchanged.</p>
      )}
      <p className={styles.muted}>
        Native opening and rendering have not been verified. No Office preview
        is available here.
      </p>
    </div>
  );
}
