import type { useClientImport } from "../lib/use-client-import";

export function ImportOutcome({
  evidence,
}: {
  evidence: ReturnType<typeof useClientImport>["evidence"];
}) {
  if (!evidence) return null;
  return (
    <section
      aria-label="Import outcomes"
      role="status"
      style={{ margin: "12px 0", fontSize: 12.5 }}
    >
      <p>
        {evidence.receipt.created} created with confirmed receipts;{" "}
        {evidence.receipt.skipped.length} skipped; {evidence.unknownIds.length}{" "}
        outcomes unknown; {evidence.unattemptedIds.length} not attempted.
      </p>
      {!!evidence.receipt.items.length && (
        <ul>
          {evidence.receipt.items.map((item) => (
            <li key={item.id}>{item.name} — created</li>
          ))}
        </ul>
      )}
      {!!evidence.receipt.skipped.length && (
        <ul>
          {evidence.receipt.skipped.map((item) => (
            <li key={item.ldaClientId}>
              LDA {item.ldaClientId}: {item.reason}
            </li>
          ))}
        </ul>
      )}
      {evidence.receipt.capMessage && <p>{evidence.receipt.capMessage}</p>}
    </section>
  );
}
