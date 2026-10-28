import { z } from "zod";
import {
  requireMeriTabStorage,
  tabRecord,
  TabJournalUnavailable,
  type TabScope,
  type TabStorage,
} from "../meri-conversations/tab-journal";

/**
 * The conversation's own draft record, written from the shared layer because the Portfolio
 * feature may not import the Meri conversation feature and the shared layer may not import a
 * feature at all. The shape must stay identical to the mounted reader in
 * features/meri/conversation/initial-draft.ts (strictObject of draft/revision/pending/reserved
 * plus an optional selection): that reader refuses a record whose keys differ. The round trip
 * is covered by tests/meri-starters.test.ts, which writes here and reads with the real owner.
 */
const starterDraftState = z.strictObject({
  draft: z.string(),
  revision: z.number().int().nonnegative().safe(),
  pending: z.unknown().nullable(),
  reserved: z.unknown().nullable(),
  selection: z.unknown().optional(),
});
type StarterDraftState = z.infer<typeof starterDraftState>;

/**
 * Leave the composed message as the selected conversation's unsent draft. This sends nothing,
 * prepares nothing and creates nothing; the person still reviews and sends it themselves.
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
  const record = tabRecord(
    scope,
    "draft",
    (value) => starterDraftState.parse(value),
    "",
    ready,
  );
  const current: StarterDraftState | undefined = record.read();
  if (current?.pending)
    throw new Error(
      "This conversation has an unresolved message. Recover it before starting a draft.",
    );
  if (current?.draft.trim())
    throw new Error(
      "This conversation already holds an unsent draft. Clear it before starting another.",
    );
  record.write({
    ...(current ?? { pending: null, reserved: null, revision: 0 }),
    draft,
    revision: (current?.revision ?? 0) + 1,
  });
}
