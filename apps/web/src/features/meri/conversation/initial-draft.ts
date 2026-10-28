/**
 * The canonical conversation draft owner now lives in shared/meri-conversations/initial-draft.ts,
 * so a starter surface outside this feature can hand it an unsent draft without a private
 * cross-feature import. This path forwards unchanged for every existing caller.
 */
export {
  createInitialDraftOwner,
  type InitialDraftOwner,
} from "@/shared/meri-conversations/initial-draft";
