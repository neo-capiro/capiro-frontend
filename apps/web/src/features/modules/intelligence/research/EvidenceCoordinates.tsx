import type { z } from "zod";
import type { evidenceLocatorDetails } from "../../../../shared/capiro/operations/defense-evidence-details";

export function EvidenceCoordinates({
  details,
}: {
  details?: z.infer<typeof evidenceLocatorDetails>;
}) {
  if (!details || details.availability === "unavailable") {
    return (
      <p>
        {details?.reason ||
          "Structured source coordinates are not available for this evidence."}
      </p>
    );
  }
  const box = details.boundingBox;
  const element = details.structuredElement;
  return (
    <section aria-label="Retained source coordinates">
      <h3>Retained source coordinates</h3>
      <p>
        {details.availability}
        {details.reason && ` — ${details.reason}`}
      </p>
      <dl>
        <dt>Printed page</dt>
        <dd>{details.printedPage ?? "Not retained"}</dd>
        <dt>Table / row / column</dt>
        <dd>
          {details.tableLabel ?? "Table not retained"} ·{" "}
          {details.rowLabel ?? "Row not retained"} ·{" "}
          {details.columnLabel ?? "Column not retained"}
        </dd>
        <dt>Text offsets</dt>
        <dd>
          {details.textSpan
            ? `${details.textSpan.start}–${details.textSpan.end}`
            : "Not retained"}
        </dd>
        <dt>Bounding box</dt>
        <dd>
          {box
            ? `${box.x0}, ${box.y0} → ${box.x1}, ${box.y1} (${box.coordinateSystem})`
            : "Not retained"}
        </dd>
        {box && (
          <>
            <dt>Page dimensions</dt>
            <dd>
              {box.pageWidth ?? "Width not retained"} ×{" "}
              {box.pageHeight ?? "Height not retained"}
            </dd>
          </>
        )}
        <dt>Structured element</dt>
        <dd>
          {element
            ? `${element.elementPath}${element.elementId ? ` · ${element.elementId}` : ""}`
            : "Not retained"}
        </dd>
        {element && (
          <>
            <dt>Companion bytes SHA256</dt>
            <dd>{element.companionByteSha256}</dd>
          </>
        )}
        <dt>Source span hash</dt>
        <dd>{details.sourceSpanHash ?? "Not retained"}</dd>
      </dl>
    </section>
  );
}
