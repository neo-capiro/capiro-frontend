/** Navigation hints only: the selected conversation is admitted again by Core and Meri. */
export function conversationHref(
  subject:
    | string
    | null
    | {
        scopeKind: "client" | "general" | "research_portfolio";
        clientId: string | null;
      },
  conversationId: string,
) {
  if (
    subject &&
    typeof subject === "object" &&
    subject.scopeKind === "research_portfolio"
  )
    return `/meri?${new URLSearchParams({ scope: "research_portfolio", conversationId })}`;
  const clientId =
    typeof subject === "object" && subject !== null
      ? subject.clientId
      : subject;
  return `/meri?${new URLSearchParams(clientId === null ? { scope: "general", conversationId } : { clientId, conversationId })}`;
}

/** Keep the creation receipt as the fallback when an owned title is not loaded. */
export function conversationLabel(createdAt: string) {
  return `Conversation · ${new Date(createdAt).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`;
}

/** Search remains account-owned; keep only the current chat scope as a navigation hint. */
export function conversationSearchHref(clientId: string | null | undefined) {
  const query = new URLSearchParams(
    clientId === null ? { scope: "general" } : clientId ? { clientId } : {},
  );
  return `/meri/conversations${query.size ? `?${query}` : ""}#chat-title-search`;
}
