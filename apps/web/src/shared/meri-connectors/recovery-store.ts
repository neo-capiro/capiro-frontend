/** Same-tab duplicate prevention, never authorization. Store catalog IDs only, before dispatch. */
export function connectorRecoveryStore(
  tenantId: string,
  actorId: string,
  storage: () => Pick<Storage, "getItem" | "setItem">,
) {
  const key = `capiro-meri-connector-add-v1:${JSON.stringify([tenantId, actorId])}`;
  const unavailable = () =>
    new Error(
      "Connection recovery is unavailable in this tab. Check the current connections before starting another setup.",
    );
  const read = (): string[] => {
    try {
      const raw = storage().getItem(key);
      if (raw === null) return [];
      if (raw.length > 8192) throw unavailable();
      const ids: unknown = JSON.parse(raw);
      if (
        !Array.isArray(ids) ||
        ids.length > 100 ||
        ids.some(
          (id) =>
            typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(id),
        )
      )
        throw unavailable();
      return [...new Set(ids as string[])];
    } catch {
      throw unavailable();
    }
  };
  const write = (ids: string[]) => {
    try {
      storage().setItem(key, JSON.stringify(ids));
    } catch {
      throw unavailable();
    }
  };
  return {
    read,
    begin(catalogId: string) {
      const ids = read();
      if (ids.includes(catalogId))
        throw new Error(
          "This connection request is unresolved. Refresh the connection list before trying again.",
        );
      if (ids.length >= 100 || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(catalogId))
        throw unavailable();
      write([...ids, catalogId]);
    },
    refused(catalogId: string) {
      write(read().filter((id) => id !== catalogId));
    },
    reconcile(catalogIds: readonly string[]) {
      const pending = read();
      const remaining = pending.filter((id) => !catalogIds.includes(id));
      if (remaining.length !== pending.length) write(remaining);
      return remaining;
    },
  };
}
