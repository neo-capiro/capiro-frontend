import { readMeriConnectionConfig } from "../meri-actions/connection-config";
import { firstChatCoreRequest } from "../capiro/operations/meri-first-chat";

/** Opt-in is a serving prerequisite; native acceptance remains with the runtime owner. */
export function readConversationConfig(
  env: Record<string, string | undefined>,
) {
  const config = readMeriConnectionConfig(env);
  const selectedClient = firstChatCoreRequest.shape.clientId.safeParse(
    env.MERI_FIRST_CHAT_CLIENT_ID,
  );
  return {
    enabled: config.conversationEnabled,
    baseUrl: config.baseUrl,
    requestOrigin: config.requestOrigin,
    firstChatBootstrapEnabled:
      config.conversationEnabled &&
      env.MERI_FIRST_CHAT_BOOTSTRAP_ENABLED === "true",
    firstChatBootstrapClientId: selectedClient.success
      ? selectedClient.data
      : undefined,
  };
}
