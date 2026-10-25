import Link from "next/link";
import type { ClientBriefCopyReceipt } from "@/shared/capiro/operations/workspace-client-brief-copy";

export function CopyResult({ receipt }: { receipt: ClientBriefCopyReceipt }) {
  return (
    <>
      <p role="status">
        {receipt.available
          ? "Workspace confirmed this private client draft was created."
          : "Workspace confirmed this copy completed. The draft is no longer available; this action will not recreate it."}
      </p>
      {receipt.available && (
        <Link
          className="button"
          href={`/modules/workspace?draftId=${receipt.draftId}`}
        >
          Open private client draft
        </Link>
      )}
    </>
  );
}
