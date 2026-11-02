import { z } from "zod";
import { CapiroApiError } from "../../../shared/capiro/http";
import { researchConversationRow } from "../../../shared/capiro/operations/meri-research-conversation";
import { researchSelection } from "../../../shared/meri-conversations/research-context";
import {
  tabRecord,
  type TabStorage,
} from "../../../shared/meri-conversations/tab-journal";

export function receiveResearchConversation(
  raw: unknown,
  account: { tenantId: string; actorId: string },
  expected: { conversationId?: string; portfolioId?: string },
) {
  const row = researchConversationRow.parse(raw);
  if (
    row.tenantId !== account.tenantId ||
    row.userId !== account.actorId ||
    (expected.conversationId && expected.conversationId !== row.id)
  )
    throw Error("Research conversation mismatch");
  const stored = row.metadata.researchPortfolioScope;
  if (!stored || typeof stored !== "object")
    throw Error("Research capture unavailable");
  // Legacy stored metadata also carries current observations. Retain only the original capture.
  const {
    kind,
    researchPortfolioId,
    researchPortfolioName,
    researchPortfolioRevision,
    scopeVersion,
  } = stored as Record<string, unknown>;
  const selected = researchSelection(account, row.id, {
    kind,
    researchPortfolioId,
    researchPortfolioName,
    researchPortfolioRevision,
    scopeVersion,
  });
  if (
    expected.portfolioId &&
    selected.scope.researchPortfolioId !== expected.portfolioId
  )
    throw Error("Research portfolio mismatch");
  return selected;
}

/**
 * A 4xx answer (other than a cancelled request) means the gateway or Core refused before
 * writing, so no conversation exists. 5xx, transport and malformed replies stay uncertain:
 * Core may have committed the row before its response failed.
 */
export function definiteCreateRefusal(error: unknown): error is CapiroApiError {
  return (
    error instanceof CapiroApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408
  );
}

/** Existing create has no replay receipt. Persist uncertainty BEFORE dispatch and never replay it. */
export function researchLaunchOwner(
  account: { tenantId: string; actorId: string },
  portfolioId: string,
  storage: TabStorage,
) {
  const receipt = z.discriminatedUnion("state", [
    z.strictObject({ state: z.literal("unknown") }),
    z.strictObject({ state: z.literal("created"), conversationId: z.uuid() }),
  ]);
  const journal = tabRecord(
    { ...account, clientId: null, conversationId: portfolioId },
    "selection",
    (value) => receipt.parse(value),
    "research-launch",
    storage,
  );
  return {
    read: journal.read,
    async create(send: () => Promise<unknown>, signal: AbortSignal) {
      signal.throwIfAborted();
      if (journal.read()) throw Error("Research creation already attempted");
      journal.write({ state: "unknown" });
      let raw: unknown;
      try {
        raw = await send();
      } catch (error) {
        if (definiteCreateRefusal(error)) journal.clear();
        throw error;
      }
      signal.throwIfAborted();
      const selected = receiveResearchConversation(raw, account, {
        portfolioId,
      });
      journal.write({
        state: "created",
        conversationId: selected.conversationId,
      });
      return selected;
    },
  };
}
