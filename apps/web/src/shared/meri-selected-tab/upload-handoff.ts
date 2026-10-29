import type {
  AdmittedSelectedTab,
  SelectedTabShare,
  SelectedTabOutcome,
} from "@capiro/meri-contracts/selected-tab-application";
import { selectedTabOriginal } from "@capiro/meri-contracts/selected-tab-application";
import type { MeriUploadAccess } from "../meri-uploads/access";

/** Association only: the existing upload owner retains bytes, receipt, status
 * reads and uncertainty. This adapter never retries or submits a chat turn. */
export class SelectedTabUploads {
  private attempts = new Map<string, string | null>();
  constructor(
    private uploads: MeriUploadAccess,
    private changed: () => void,
  ) {}
  async accept(
    share: AdmittedSelectedTab<SelectedTabShare>,
    current: () => boolean,
  ) {
    if (!current() || this.attempts.has(share.selectionId))
      throw Error("Selected-tab selection is no longer current");
    const original = selectedTabOriginal(share);
    this.attempts.set(share.selectionId, null);
    const file = new File([new Uint8Array(original)], "shared-tab.txt", {
      type: "text/plain",
    });
    await this.uploads.add([file], (requestId) => {
      if (!current())
        throw Error("Selected-tab selection changed before upload");
      this.attempts.set(share.selectionId, requestId);
    });
    this.changed();
  }
  outcomes(): Pick<
    SelectedTabOutcome,
    "selectionId" | "state" | "requestId"
  >[] {
    return [...this.attempts].map(([selectionId, requestId]) => {
      const item = this.uploads
        .items()
        .find((row) => row.requestId === requestId);
      const state =
        item?.state === "stored"
          ? "stored"
          : requestId === null ||
              item?.state === "refused" ||
              item?.state === "removed"
            ? "refused"
            : "unknown";
      return { selectionId, requestId, state };
    });
  }
  cancelPending() {
    for (const requestId of this.attempts.values()) {
      if (
        requestId &&
        this.uploads
          .items()
          .some(
            (row) =>
              row.requestId === requestId &&
              ["declaring", "uploading"].includes(row.state),
          )
      )
        this.uploads.cancel(requestId);
    }
  }
}
