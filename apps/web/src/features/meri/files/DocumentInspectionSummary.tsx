import { Fragment } from "react";
import type { DocumentInspection } from "../../../shared/meri-documents/workflow-port";
import type { ArtifactPreview } from "../../../shared/meri-documents/artifact-access";
import styles from "./files.module.css";

type Inspection = DocumentInspection | ArtifactPreview["inspection"];
function inspectionRows(
  inspection: Inspection,
): readonly (readonly [string, string | number])[] {
  switch (inspection.format) {
    case "txt":
      return [];
    case "docx":
      return [
        ["Paragraphs", inspection.details.paragraphs],
        ["Tables", inspection.details.tables],
        ["Pictures", inspection.details.pictures],
      ];
    case "xlsx":
      return [
        ["Sheets", inspection.details.sheets.join(", ")],
        ["Formulas", inspection.details.formulas],
        ["Formula cache", inspection.details.formulaCache],
      ];
    case "pptx":
      return [
        ["Slides", inspection.details.slides],
        ["Editable", "Yes"],
        ["Visual inspection", "Pending"],
      ];
    case "pdf":
      return [
        ["PDF conversion", "Completed"],
        ["Render inspection", "Pending"],
      ];
    case "zip":
      return [
        ["Archive rows", inspection.details.rows],
        ["Columns", inspection.details.columns.join(", ")],
        ["Chart included", inspection.details.chart ? "Yes" : "No"],
      ];
  }
}

export function DocumentInspectionSummary({
  inspection,
}: {
  inspection: Inspection;
}) {
  return (
    <div className={styles.stack}>
      <h3>Structural inspection</h3>
      {inspection.format === "txt" ? (
        <p className={styles.muted}>UTF-8 text; whitespace is unchanged.</p>
      ) : (
        <dl className={styles.details}>
          {inspectionRows(inspection).map(([label, value]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      {inspection.format === "xlsx" && (
        <p className={styles.notice}>
          Formula caches are unverified and require recalculation in Excel.
          Inspection does not establish calculated values.
        </p>
      )}
      <p className={styles.muted}>
        Native opening and rendering have not been verified. No rendered preview
        is available here.
      </p>
    </div>
  );
}
