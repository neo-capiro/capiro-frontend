import type { ProspectFileCopyReceipt } from "./contracts";
export function CopyResult({ receipt }: { receipt: ProspectFileCopyReceipt }) {
  if (receipt.status === "pending")
    return (
      <p role="status">
        The original copy is pending. Check its result or explicitly retry the
        same reviewed copy.
      </p>
    );
  return (
    <div role="status" className="stack">
      <p>The private file copy completed. The prospect upload is unchanged.</p>
      {receipt.available ? (
        <>
          <p>
            Copy status: {receipt.result!.lifecycleStatus}. Scan:{" "}
            {receipt.result!.scanStatus ?? "unavailable"}.
          </p>
          <p>
            The client file library checks current readiness and access before
            opening the file.
          </p>
        </>
      ) : (
        <p>
          The completed copy is no longer available to you. This history will
          not recreate it.
        </p>
      )}
    </div>
  );
}
