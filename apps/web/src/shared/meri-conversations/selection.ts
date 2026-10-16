/** A URL selector is a read/write scope hint; only the backend can admit its subject. */
export function conversationSelection(search: Pick<URLSearchParams, "getAll">) {
  const values = search.getAll("conversationId");
  if (values.length === 0) return { state: "current" } as const;
  const value = values[0];
  if (
    values.length !== 1 ||
    !value ||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value)
  )
    return { state: "invalid" } as const;
  return { state: "selected", conversationId: value } as const;
}
