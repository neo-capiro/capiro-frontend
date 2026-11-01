import {
  receiveConversationSessionExpectedContext,
  type ResearchPortfolioCapture,
} from "@capiro/meri-contracts/conversation-session";

export type ResearchSelection = Readonly<{
  conversationId: string;
  scopeKind: "research_portfolio";
  scope: ResearchPortfolioCapture;
}>;

/** Use the public receiver to snapshot Core's capture, never the portfolio card or URL. */
export function researchSelection(
  account: { tenantId: string; actorId: string },
  conversationId: string,
  scope: unknown,
): ResearchSelection {
  const expected = receiveConversationSessionExpectedContext(
    new TextEncoder().encode(
      JSON.stringify({
        tenantId: account.tenantId,
        actorId: account.actorId,
        conversationId,
        selectedClientId: null,
        scopeKind: "research_portfolio",
        scope,
      }),
    ),
  );
  if (expected.scopeKind !== "research_portfolio")
    throw Error("Research context unavailable");
  return Object.freeze({
    conversationId,
    scopeKind: expected.scopeKind,
    scope: Object.freeze({ ...expected.scope }),
  });
}

export function sameResearchCapture(
  a: ResearchPortfolioCapture,
  b: ResearchPortfolioCapture,
) {
  return (
    a.kind === b.kind &&
    a.researchPortfolioId === b.researchPortfolioId &&
    a.researchPortfolioName === b.researchPortfolioName &&
    a.researchPortfolioRevision === b.researchPortfolioRevision &&
    a.scopeVersion === b.scopeVersion
  );
}

/** Only navigation intent. A fresh Core metadata read must resolve the capture. */
export function researchRoute(search: Pick<URLSearchParams, "getAll" | "has">) {
  const portfolios = search.getAll("researchPortfolioId");
  const scopes = search.getAll("scope");
  if (!portfolios.length && !scopes.includes("research_portfolio"))
    return undefined;
  const ids = search.getAll("conversationId");
  const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
  if (
    search.has("clientId") ||
    search.has("prospectId") ||
    portfolios.length > 1 ||
    scopes.length > 1 ||
    (scopes.length === 1 && scopes[0] !== "research_portfolio") ||
    (portfolios.length === 1 && !uuid.test(portfolios[0]!)) ||
    ids.length > 1 ||
    (ids.length === 1 && !uuid.test(ids[0]!)) ||
    (!ids.length && !portfolios.length)
  )
    return { state: "invalid" } as const;
  return {
    state: "research",
    conversationId: ids[0],
    portfolioId: portfolios[0],
  } as const;
}
