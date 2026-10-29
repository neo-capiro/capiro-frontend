import { clientSchema, type Client } from "../session/client-contract";
import type { UserPreferencesPort } from "./transport";
import { withActionDeadline } from "../meri-actions/bounded-json";
import { userPreferencesMetadata } from "@capiro/meri-client/user-preferences";

/** A preference is a suggestion. The existing client owner must admit it again. */
export async function readDefaultConversationClient({
  preferences,
  readClient,
  signal,
}: {
  preferences: Pick<UserPreferencesPort, "read">;
  readClient: (id: string, signal: AbortSignal) => Promise<Client>;
  signal: AbortSignal;
}): Promise<Client | null> {
  return withActionDeadline(
    [signal],
    async (receiving) => {
      receiving.throwIfAborted();
      const response = await preferences.read(receiving);
      receiving.throwIfAborted();
      if ("error" in response)
        throw new Error("Saved preferences are unavailable.");
      const id = response.preferences.defaultClientId;
      if (id === null) return null;
      const client = clientSchema.parse(await readClient(id, receiving));
      receiving.throwIfAborted();
      if (client.id !== id || client.status === "archived")
        throw new Error(
          "Your default client is unavailable. Choose another scope.",
        );
      return client;
    },
    userPreferencesMetadata.limits.requestMs,
  );
}
