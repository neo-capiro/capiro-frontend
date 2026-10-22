/** Navigation hints only: the selected conversation is admitted again by Core and Meri. */
export function conversationHref(clientId: string, conversationId: string) {
  return `/meri?${new URLSearchParams({ clientId, conversationId })}`;
}

/** No public title exists yet. Display the creation receipt without inventing a title. */
export function conversationLabel(createdAt: string) {
  return `Conversation · ${new Date(createdAt).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`;
}
