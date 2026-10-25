import { z } from "zod";
import { clientSchema } from "../session/client-contract";
import {
  requireMeriTabStorage,
  tabRecord,
  TabJournalUnavailable,
  type TabStorage,
} from "./tab-journal";
import type { ConversationAccount } from "./host-controller";

const handoff = z.strictObject({
  clientId: clientSchema.shape.id,
  draft: z.string().trim().min(1).max(32_000),
});
/** Navigation only. Source profile content is resolved by the existing session/bootstrap owners. */
export type ClientMeriHandoff = z.infer<typeof handoff>;
export function clientHandoff(
  account: ConversationAccount,
  storage?: TabStorage,
) {
  const ready = requireMeriTabStorage(storage);
  if (!ready) throw new TabJournalUnavailable();
  const record = tabRecord(
    { ...account, clientId: null, conversationId: "" },
    "handoff",
    (value) => handoff.parse(value),
    "",
    ready,
  );
  return {
    current: record.current,
    write: record.write,
    receive(clientId: string | null) {
      const value = record.read();
      if (value && value.clientId !== clientId) {
        record.clear();
        return undefined;
      }
      return value;
    },
    clear(value: ClientMeriHandoff) {
      const current = record.read();
      if (
        current?.clientId === value.clientId &&
        current.draft === value.draft
      ) {
        record.clear();
        if (record.read()) throw new TabJournalUnavailable();
      }
    },
  };
}
