import {
  requireMeriTabStorage,
  TabJournalUnavailable,
  type TabScope,
  type TabStorage,
} from "../meri-conversations/tab-journal";
import { createInitialDraftOwner } from "../meri-conversations/initial-draft";

/**
 * Leave the composed message as the selected conversation's unsent draft. This sends nothing,
 * prepares nothing and creates nothing; the person still reviews and sends it themselves.
 *
 * The canonical draft owner owns the record shape, the refusal rules and the scope, storage and
 * revocation fences. The only thing a surface outside the conversation has to do is resolve its
 * own tab storage, and it must refuse an unusable tab rather than silently drop the draft.
 */
export function writeStarterDraft({
  scope,
  draft,
  storage,
}: {
  scope: TabScope;
  draft: string;
  storage?: TabStorage;
}): void {
  const ready = requireMeriTabStorage(storage);
  if (!ready) throw new TabJournalUnavailable();
  createInitialDraftOwner(scope, ready).startUnsentStarter(draft);
}
