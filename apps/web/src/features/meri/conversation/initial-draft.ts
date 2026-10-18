import type { ConversationIntent } from "../../../shared/meri-conversations/query-journal";

/** Local draft consumption follows the conversation lifetime, including replacement sessions. */
export function createInitialDraftOwner() {
  let pending: { prompt: string; draft: string; edited: boolean } | null = null;
  return {
    begin(prompt: string, draft: string) {
      pending = { prompt, draft, edited: false };
    },
    edit() {
      if (pending) pending.edited = true;
    },
    hasPending: () => pending !== null,
    acknowledge(submit: ConversationIntent["submit"], draft: string) {
      if (
        !pending ||
        submit?.state !== "observed" ||
        submit.prompt !== pending.prompt
      )
        return false;
      const clear = !pending.edited && draft === pending.draft;
      pending = null;
      return clear;
    },
  };
}

export type InitialDraftOwner = ReturnType<typeof createInitialDraftOwner>;
